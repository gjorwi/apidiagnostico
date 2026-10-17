import { AppError } from './errors.js';

export function requirePermiso(...permisos) {
  return (req, _res, next) => {
    const asignados = req.permisos || [];
    const autorizado = permisos.every((permiso) => asignados.includes(permiso));
    if (!autorizado) {
      return next(new AppError('No tienes permisos para esta acción', 403, 'SIN_PERMISO'));
    }
    next();
  };
}

export function requireAlgunPermiso(...permisos) {
  return (req, _res, next) => {
    const asignados = req.permisos || [];
    const autorizado = permisos.some((permiso) => asignados.includes(permiso));
    if (!autorizado) {
      return next(new AppError('No tienes permisos para esta acción', 403, 'SIN_PERMISO'));
    }
    next();
  };
}
