import jwt from 'jsonwebtoken';
import { permisosDeRol } from '@diag/shared';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { AppError } from './errors.js';

export const COOKIE_ACCESO = 'diag_access';
export const COOKIE_REFRESH = 'diag_refresh';
export const RUTA_REFRESH = '/api/auth';

export function firmarAcceso(usuario) {
  return jwt.sign({ sub: String(usuario._id), rol: usuario.rol }, env.jwtSecret, {
    expiresIn: `${env.accesoMinutos}m`,
  });
}

export function firmarRefresh(usuario) {
  return jwt.sign({ sub: String(usuario._id), tipo: 'refresh' }, env.jwtRefreshSecret, {
    expiresIn: `${env.refreshDias}d`,
  });
}

const baseCookie = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.cookiesSeguras,
  path: '/',
};

export function opcionesCookieAcceso() {
  return { ...baseCookie, maxAge: env.accesoMinutos * 60 * 1000 };
}

export function opcionesCookieRefresh() {
  return { ...baseCookie, path: RUTA_REFRESH, maxAge: env.refreshDias * 24 * 60 * 60 * 1000 };
}

export function limpiarCookiesSesion(res) {
  res.clearCookie(COOKIE_ACCESO, { ...baseCookie });
  res.clearCookie(COOKIE_REFRESH, { ...baseCookie, path: RUTA_REFRESH });
}

export function verificarRefresh(token) {
  return jwt.verify(token, env.jwtRefreshSecret);
}

export async function requireAuth(req, _res, next) {
  try {
    let token = req.cookies?.[COOKIE_ACCESO];
    const cabecera = req.headers.authorization;
    if (!token && cabecera?.startsWith('Bearer ')) token = cabecera.slice(7);
    if (!token) throw new AppError('Sesión requerida', 401, 'NO_AUTENTICADO');

    let payload;
    try {
      payload = jwt.verify(token, env.jwtSecret);
    } catch {
      throw new AppError('Sesión expirada', 401, 'TOKEN_EXPIRADO');
    }

    const usuario = await User.findById(payload.sub);
    if (!usuario || !usuario.activo) {
      throw new AppError('Usuario inactivo o inexistente', 401, 'USUARIO_INVALIDO');
    }

    req.usuario = usuario;
    req.permisos = permisosDeRol(usuario.rol);
    next();
  } catch (error) {
    next(error);
  }
}
