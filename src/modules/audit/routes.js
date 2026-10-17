import { Router } from 'express';
import { AuditLog } from '../../models/AuditLog.js';
import { asyncHandler } from '../../middleware/errors.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermiso } from '../../middleware/permisos.js';
import { rangoFechasLocales } from '@diag/shared';

const router = Router();

router.use(requireAuth, requirePermiso('audit.view'));

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const pagina = Math.max(1, Number(req.query.pagina) || 1);
    const limite = Math.min(100, Math.max(1, Number(req.query.limite) || 30));

    const filtros = {};
    if (req.query.entidad) filtros.entidad = String(req.query.entidad);
    if (req.query.accion) filtros.accion = String(req.query.accion);
    if (req.query.usuario) filtros.usuarioEmail = String(req.query.usuario);

    const rango = rangoFechasLocales(req.query.desde, req.query.hasta);
    if (rango.desde || rango.hasta) {
      filtros.createdAt = {};
      if (rango.desde) filtros.createdAt.$gte = rango.desde;
      if (rango.hasta) filtros.createdAt.$lte = rango.hasta;
    }

    const [total, registros] = await Promise.all([
      AuditLog.countDocuments(filtros),
      AuditLog.find(filtros)
        .populate('usuario', 'nombre email rol')
        .sort({ createdAt: -1 })
        .skip((pagina - 1) * limite)
        .limit(limite)
        .lean(),
    ]);

    res.json({
      datos: registros,
      total,
      pagina,
      paginas: Math.max(1, Math.ceil(total / limite)),
    });
  })
);

export default router;
