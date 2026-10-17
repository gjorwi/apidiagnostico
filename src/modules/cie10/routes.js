import { Router } from 'express';
import multer from 'multer';
import { normalizarTexto, escaparRegex, normalizarCodigoCie10 } from '@diag/shared';
import { Cie10 } from '../../models/Cie10.js';
import { AppError, asyncHandler } from '../../middleware/errors.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermiso } from '../../middleware/permisos.js';
import { validar } from '../../middleware/validate.js';
import { registrarAuditoria } from '../../services/audit.js';
import { importarCie10DesdeBuffer } from '../../services/cie10Import.js';
import { z } from 'zod';

const router = Router();

const subida = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

const cie10CreateSchema = z.object({
  codigo: z.string().trim().min(1).max(20),
  descripcion: z.string().trim().min(1).max(500),
  capitulo: z.string().trim().max(200).optional(),
  activo: z.boolean().optional().default(true),
});

const cie10UpdateSchema = cie10CreateSchema.partial();

router.use(requireAuth);

router.get(
  '/search',
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || '').trim();
    const limite = Math.min(50, Math.max(1, Number(req.query.limite) || 20));
    // Excluye capítulos y bloques (nivel 0/1): solo son navegables, no diagnósticos.
    const filtros = { activo: true, nivel: { $nin: [0, 1] } };

    if (q) {
      const normalizado = normalizarTexto(q);
      const regexCodigo = new RegExp(`^${escaparRegex(normalizado)}`);
      const regexDescripcion = new RegExp(escaparRegex(normalizado));
      filtros.$or = [{ codigoNormalizado: regexCodigo }, { descripcionNormalizada: regexDescripcion }];
    }

    const [resultados, total] = await Promise.all([
      Cie10.find(filtros).select('codigo descripcion capitulo -_id').sort({ codigo: 1 }).limit(limite).lean(),
      Cie10.countDocuments({ activo: true, nivel: { $nin: [0, 1] } }),
    ]);

    res.json({ resultados, total });
  })
);

// Árbol jerárquico. Sin `padre` devuelve los capítulos; con `padre` los hijos
// directos de ese código, para desplegar nivel a nivel desde la web.
router.get(
  '/arbol',
  asyncHandler(async (req, res) => {
    const padre = req.query.padre ? normalizarCodigoCie10(String(req.query.padre)) : null;
    const filtro = padre ? { padre } : { nivel: 0 };

    const nodos = await Cie10.find({ ...filtro, activo: true })
      .select('codigo descripcion nivel hijos capitulo -_id')
      .sort({ codigo: 1 })
      .lean();

    res.json({ padre, nodos });
  })
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const pagina = Math.max(1, Number(req.query.pagina) || 1);
    const limite = Math.min(100, Math.max(1, Number(req.query.limite) || 20));
    const q = String(req.query.q || '').trim();

    const filtros = {};
    if (q) {
      const normalizado = normalizarTexto(q);
      const regex = new RegExp(escaparRegex(normalizado));
      filtros.$or = [{ codigoNormalizado: regex }, { descripcionNormalizada: regex }];
    }

    const [total, datos] = await Promise.all([
      Cie10.countDocuments(filtros),
      Cie10.find(filtros)
        .sort({ codigo: 1 })
        .skip((pagina - 1) * limite)
        .limit(limite)
        .lean(),
    ]);

    res.json({ datos, total, pagina, paginas: Math.max(1, Math.ceil(total / limite)) });
  })
);

router.post(
  '/',
  requirePermiso('catalog.manage'),
  validar(cie10CreateSchema),
  asyncHandler(async (req, res) => {
    const { codigo, descripcion, capitulo, activo } = req.body;
    const existente = await Cie10.findOne({ codigo: codigo.toUpperCase() });
    if (existente) throw new AppError('El código ya existe en el catálogo', 409, 'DUPLICADO');

    const documento = await Cie10.create({ codigo, descripcion, capitulo, activo });
    await registrarAuditoria({
      req,
      accion: 'crear',
      entidad: 'cie10',
      entidadId: documento._id,
      despues: { codigo: documento.codigo, descripcion: documento.descripcion },
    });
    res.status(201).json({ codigo: documento });
  })
);

router.patch(
  '/:codigo',
  requirePermiso('catalog.manage'),
  validar(cie10UpdateSchema),
  asyncHandler(async (req, res) => {
    const documento = await Cie10.findOne({ codigo: req.params.codigo.toUpperCase() });
    if (!documento) throw new AppError('Código no encontrado', 404, 'NO_ENCONTRADO');

    const antes = { codigo: documento.codigo, descripcion: documento.descripcion, activo: documento.activo };
    const { codigo, descripcion, capitulo, activo } = req.body;
    if (codigo !== undefined) documento.codigo = codigo;
    if (descripcion !== undefined) documento.descripcion = descripcion;
    if (capitulo !== undefined) documento.capitulo = capitulo;
    if (activo !== undefined) documento.activo = activo;
    await documento.save();

    await registrarAuditoria({
      req,
      accion: 'actualizar',
      entidad: 'cie10',
      entidadId: documento._id,
      antes,
      despues: { codigo: documento.codigo, descripcion: documento.descripcion, activo: documento.activo },
    });

    res.json({ codigo: documento });
  })
);

router.delete(
  '/:codigo',
  requirePermiso('catalog.manage'),
  asyncHandler(async (req, res) => {
    const documento = await Cie10.findOne({ codigo: req.params.codigo.toUpperCase() });
    if (!documento) throw new AppError('Código no encontrado', 404, 'NO_ENCONTRADO');

    await documento.deleteOne();
    await registrarAuditoria({
      req,
      accion: 'eliminar',
      entidad: 'cie10',
      entidadId: documento._id,
      antes: { codigo: documento.codigo, descripcion: documento.descripcion },
    });
    res.json({ ok: true });
  })
);

router.post(
  '/import',
  requirePermiso('catalog.manage'),
  subida.single('archivo'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError('Debes adjuntar un archivo Excel o CSV', 400, 'ARCHIVO_REQUERIDO');

    const reemplazar = String(req.body?.reemplazar ?? '').toLowerCase() === 'true';
    const resultado = await importarCie10DesdeBuffer(req.file.buffer, req.file.originalname, {
      reemplazar,
    });
    await registrarAuditoria({
      req,
      accion: 'importar',
      entidad: 'cie10',
      despues: resultado,
    });
    res.json({ resultado });
  })
);

export default router;
