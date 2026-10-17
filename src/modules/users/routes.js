import { Router } from 'express';
import { usuarioCreateSchema, usuarioUpdateSchema } from '@diag/shared';
import { User } from '../../models/User.js';
import { AppError, asyncHandler } from '../../middleware/errors.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermiso } from '../../middleware/permisos.js';
import { validar, validarObjectId } from '../../middleware/validate.js';
import { registrarAuditoria } from '../../services/audit.js';

const router = Router();

router.use(requireAuth, requirePermiso('users.manage'));

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const pagina = Math.max(1, Number(req.query.pagina) || 1);
    const limite = Math.min(100, Math.max(1, Number(req.query.limite) || 20));
    const q = String(req.query.q || '').trim();

    const filtros = {};
    if (q) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filtros.$or = [{ nombre: regex }, { email: regex }];
    }

    const [total, usuarios] = await Promise.all([
      User.countDocuments(filtros),
      User.find(filtros)
        .sort({ createdAt: -1 })
        .skip((pagina - 1) * limite)
        .limit(limite),
    ]);

    res.json({
      datos: usuarios.map((usuario) => usuario.aJSON()),
      total,
      pagina,
      paginas: Math.max(1, Math.ceil(total / limite)),
    });
  })
);

router.post(
  '/',
  validar(usuarioCreateSchema),
  asyncHandler(async (req, res) => {
    const { nombre, email, password, rol, activo } = req.body;
    const passwordHash = await User.hashPassword(password);
    const usuario = await User.create({
      nombre,
      email: email.toLowerCase(),
      passwordHash,
      rol,
      activo,
    });

    await registrarAuditoria({
      req,
      accion: 'crear',
      entidad: 'usuario',
      entidadId: usuario._id,
      despues: usuario.aJSON(),
    });

    res.status(201).json({ usuario: usuario.aJSON() });
  })
);

router.patch(
  '/:id',
  validarObjectId(),
  validar(usuarioUpdateSchema),
  asyncHandler(async (req, res) => {
    const usuario = await User.findById(req.params.id);
    if (!usuario) throw new AppError('Usuario no encontrado', 404, 'NO_ENCONTRADO');

    const antes = usuario.aJSON();
    const { nombre, email, password, rol, activo } = req.body;

    if (nombre !== undefined) usuario.nombre = nombre;
    if (email !== undefined) usuario.email = email.toLowerCase();
    if (rol !== undefined) usuario.rol = rol;
    if (activo !== undefined) usuario.activo = activo;
    if (password) usuario.passwordHash = await User.hashPassword(password);

    await usuario.save();

    await registrarAuditoria({
      req,
      accion: 'actualizar',
      entidad: 'usuario',
      entidadId: usuario._id,
      antes,
      despues: usuario.aJSON(),
    });

    res.json({ usuario: usuario.aJSON() });
  })
);

router.delete(
  '/:id',
  validarObjectId(),
  asyncHandler(async (req, res) => {
    if (String(req.params.id) === String(req.usuario._id)) {
      throw new AppError('No puedes desactivar tu propio usuario', 400, 'OPERACION_INVALIDA');
    }

    const usuario = await User.findById(req.params.id);
    if (!usuario) throw new AppError('Usuario no encontrado', 404, 'NO_ENCONTRADO');

    const antes = usuario.aJSON();
    usuario.activo = false;
    await usuario.save();

    await registrarAuditoria({
      req,
      accion: 'desactivar',
      entidad: 'usuario',
      entidadId: usuario._id,
      antes,
      despues: usuario.aJSON(),
    });

    res.json({ usuario: usuario.aJSON() });
  })
);

export default router;
