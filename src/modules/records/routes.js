import { Router } from 'express';
import { registroCreateSchema, registroUpdateSchema, registroFiltrosSchema } from '@diag/shared';
import { RegistroEpidemiologico } from '../../models/RegistroEpidemiologico.js';
import { Cie10 } from '../../models/Cie10.js';
import { AppError, asyncHandler } from '../../middleware/errors.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermiso } from '../../middleware/permisos.js';
import { validar, validarObjectId } from '../../middleware/validate.js';
import { registrarAuditoria } from '../../services/audit.js';
import { rangoFechasLocales } from '@diag/shared';

const router = Router();

router.use(requireAuth);

async function resolverCie10(codigo, descripcion) {
  const codigoLimpio = String(codigo).trim().toUpperCase();
  const existente = await Cie10.findOne({ codigo: codigoLimpio });
  if (existente) return { codigo: existente.codigo, descripcion: existente.descripcion };
  if (descripcion) return { codigo: codigoLimpio, descripcion: String(descripcion).trim() };
  throw new AppError(
    `El código CIE-10 "${codigoLimpio}" no existe en el catálogo`,
    400,
    'CIE10_NO_ENCONTRADO'
  );
}

function construirFiltros(query) {
  const filtros = {};
  if (query.sexo) filtros.sexo = query.sexo;
  if (query.grupoEtario) filtros.grupoEtario = query.grupoEtario;
  if (query.codigo) filtros['cie10.codigo'] = String(query.codigo).toUpperCase();
  if (query.tipoAtencion) filtros.tipoAtencion = query.tipoAtencion;
  if (query.anioEpidemiologico) filtros.anioEpidemiologico = query.anioEpidemiologico;
  if (query.semanaEpidemiologica) filtros.semanaEpidemiologica = query.semanaEpidemiologica;

  const rango = rangoFechasLocales(query.fechaDesde, query.fechaHasta);
  if (rango.desde || rango.hasta) {
    filtros.fechaAtencion = {};
    if (rango.desde) filtros.fechaAtencion.$gte = rango.desde;
    if (rango.hasta) filtros.fechaAtencion.$lte = rango.hasta;
  }
  return filtros;
}

function serializar(registro) {
  const objeto = registro.toObject ? registro.toObject() : registro;
  return {
    id: String(objeto._id),
    sexo: objeto.sexo,
    edad: objeto.edad,
    grupoEtario: objeto.grupoEtario,
    cie10: objeto.cie10,
    tipoAtencion: objeto.tipoAtencion,
    fechaAtencion: objeto.fechaAtencion,
    semanaEpidemiologica: objeto.semanaEpidemiologica,
    anioEpidemiologico: objeto.anioEpidemiologico,
    anio: objeto.anio,
    mes: objeto.mes,
    creadoPor: objeto.creadoPor,
    createdAt: objeto.createdAt,
    updatedAt: objeto.updatedAt,
  };
}

function puedeEditar(usuario, registro) {
  if (usuario.rol === 'admin' || usuario.rol === 'supervisor') return true;
  return String(registro.creadoPor?._id || registro.creadoPor) === String(usuario._id);
}

router.get(
  '/',
  requirePermiso('records.read'),
  validar(registroFiltrosSchema, 'query'),
  asyncHandler(async (req, res) => {
    const { pagina, limite, orden } = req.query;
    const filtros = construirFiltros(req.query);
    const ordenamiento = orden === 'antiguo' ? { fechaAtencion: 1 } : { fechaAtencion: -1 };

    const [total, registros] = await Promise.all([
      RegistroEpidemiologico.countDocuments(filtros),
      RegistroEpidemiologico.find(filtros)
        .sort(ordenamiento)
        .skip((pagina - 1) * limite)
        .limit(limite)
        .populate('creadoPor', 'nombre email'),
    ]);

    res.json({
      datos: registros.map(serializar),
      total,
      pagina,
      paginas: Math.max(1, Math.ceil(total / limite)),
    });
  })
);

router.post(
  '/',
  requirePermiso('records.create'),
  validar(registroCreateSchema),
  asyncHandler(async (req, res) => {
    const { sexo, edad, codigo, descripcion, tipoAtencion, fechaAtencion } = req.body;
    const cie10 = await resolverCie10(codigo, descripcion);

    const registro = await RegistroEpidemiologico.create({
      sexo,
      edad,
      cie10,
      tipoAtencion,
      fechaAtencion,
      creadoPor: req.usuario._id,
    });

    await registrarAuditoria({
      req,
      accion: 'crear',
      entidad: 'registro',
      entidadId: registro._id,
      despues: serializar(registro),
    });

    res.status(201).json({ registro: serializar(registro) });
  })
);

router.get(
  '/:id',
  validarObjectId(),
  requirePermiso('records.read'),
  asyncHandler(async (req, res) => {
    const registro = await RegistroEpidemiologico.findById(req.params.id).populate(
      'creadoPor',
      'nombre email'
    );
    if (!registro) throw new AppError('Registro no encontrado', 404, 'NO_ENCONTRADO');
    res.json({ registro: serializar(registro) });
  })
);

router.patch(
  '/:id',
  validarObjectId(),
  requirePermiso('records.edit'),
  validar(registroUpdateSchema),
  asyncHandler(async (req, res) => {
    const registro = await RegistroEpidemiologico.findById(req.params.id);
    if (!registro) throw new AppError('Registro no encontrado', 404, 'NO_ENCONTRADO');
    if (!puedeEditar(req.usuario, registro)) {
      throw new AppError('Solo puedes editar tus propios registros', 403, 'SIN_PERMISO');
    }

    const antes = serializar(registro);
    const { sexo, edad, codigo, descripcion, tipoAtencion, fechaAtencion } = req.body;

    if (sexo !== undefined) registro.sexo = sexo;
    if (edad !== undefined) registro.edad = edad;
    if (tipoAtencion !== undefined) registro.tipoAtencion = tipoAtencion;
    if (fechaAtencion !== undefined) registro.fechaAtencion = fechaAtencion;
    if (codigo !== undefined) registro.cie10 = await resolverCie10(codigo, descripcion);
    else if (descripcion !== undefined) registro.cie10.descripcion = descripcion;

    await registro.save();

    await registrarAuditoria({
      req,
      accion: 'actualizar',
      entidad: 'registro',
      entidadId: registro._id,
      antes,
      despues: serializar(registro),
    });

    res.json({ registro: serializar(registro) });
  })
);

router.delete(
  '/:id',
  validarObjectId(),
  requirePermiso('records.delete'),
  asyncHandler(async (req, res) => {
    const registro = await RegistroEpidemiologico.findById(req.params.id);
    if (!registro) throw new AppError('Registro no encontrado', 404, 'NO_ENCONTRADO');

    const antes = serializar(registro);
    await registro.deleteOne();

    await registrarAuditoria({
      req,
      accion: 'eliminar',
      entidad: 'registro',
      entidadId: registro._id,
      antes,
    });

    res.json({ ok: true });
  })
);

export default router;
