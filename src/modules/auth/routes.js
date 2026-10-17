import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { loginSchema, cambioPasswordSchema, permisosDeRol } from '@diag/shared';
import { User } from '../../models/User.js';
import { env } from '../../config/env.js';
import { AppError, asyncHandler } from '../../middleware/errors.js';
import { validar } from '../../middleware/validate.js';
import {
  COOKIE_ACCESO,
  COOKIE_REFRESH,
  firmarAcceso,
  firmarRefresh,
  limpiarCookiesSesion,
  opcionesCookieAcceso,
  opcionesCookieRefresh,
  requireAuth,
  verificarRefresh,
} from '../../middleware/auth.js';
import { registrarAuditoria } from '../../services/audit.js';

const router = Router();

const limitadorLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { codigo: 'DEMASIADOS_INTENTOS', mensaje: 'Demasiados intentos, intente más tarde' } },
});

function iniciarSesion(res, usuario) {
  const token = firmarAcceso(usuario);
  const refreshToken = firmarRefresh(usuario);
  res.cookie(COOKIE_ACCESO, token, opcionesCookieAcceso());
  res.cookie(COOKIE_REFRESH, refreshToken, opcionesCookieRefresh());
  return { token, refreshToken, expiraEn: env.accesoMinutos * 60 };
}

router.post(
  '/login',
  limitadorLogin,
  validar(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const usuario = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');

    if (!usuario || !usuario.activo) {
      await registrarAuditoria({
        req,
        accion: 'login_fallido',
        entidad: 'sesion',
        despues: { email },
      });
      throw new AppError('Credenciales inválidas', 401, 'CREDENCIALES_INVALIDAS');
    }

    const valida = await usuario.verificarPassword(password);
    if (!valida) {
      await registrarAuditoria({
        req: { ...req, usuario },
        accion: 'login_fallido',
        entidad: 'sesion',
        entidadId: usuario._id,
        despues: { email },
      });
      throw new AppError('Credenciales inválidas', 401, 'CREDENCIALES_INVALIDAS');
    }

    const sesion = iniciarSesion(res, usuario);
    await registrarAuditoria({
      req: { ...req, usuario },
      accion: 'login',
      entidad: 'sesion',
      entidadId: usuario._id,
    });

    res.json({ usuario: usuario.aJSON(), permisos: permisosDeRol(usuario.rol), ...sesion });
  })
);

router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[COOKIE_REFRESH] || req.body?.refreshToken;
    if (!token) throw new AppError('Sesión requerida', 401, 'NO_AUTENTICADO');

    let payload;
    try {
      payload = verificarRefresh(token);
    } catch {
      limpiarCookiesSesion(res);
      throw new AppError('Sesión expirada', 401, 'TOKEN_EXPIRADO');
    }

    const usuario = await User.findById(payload.sub);
    if (!usuario || !usuario.activo) {
      limpiarCookiesSesion(res);
      throw new AppError('Usuario inactivo o inexistente', 401, 'USUARIO_INVALIDO');
    }

    const sesion = iniciarSesion(res, usuario);
    res.json({ usuario: usuario.aJSON(), permisos: permisosDeRol(usuario.rol), ...sesion });
  })
);

router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    limpiarCookiesSesion(res);
    await registrarAuditoria({ req, accion: 'logout', entidad: 'sesion' });
    res.json({ ok: true });
  })
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ usuario: req.usuario.aJSON(), permisos: req.permisos });
  })
);

router.put(
  '/password',
  requireAuth,
  validar(cambioPasswordSchema),
  asyncHandler(async (req, res) => {
    const { passwordActual, passwordNueva } = req.body;
    const usuario = await User.findById(req.usuario._id).select('+passwordHash');
    const valida = await usuario.verificarPassword(passwordActual);
    if (!valida) throw new AppError('La contraseña actual no es correcta', 400, 'PASSWORD_INCORRECTA');

    usuario.passwordHash = await User.hashPassword(passwordNueva);
    await usuario.save();
    await registrarAuditoria({
      req,
      accion: 'cambio_password',
      entidad: 'usuario',
      entidadId: usuario._id,
    });
    res.json({ ok: true });
  })
);

export default router;
