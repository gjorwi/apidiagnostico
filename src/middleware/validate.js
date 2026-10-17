import mongoose from 'mongoose';
import { AppError } from './errors.js';

export function validar(schema, fuente = 'body') {
  return (req, _res, next) => {
    const resultado = schema.safeParse(req[fuente]);
    if (!resultado.success) {
      const detalles = resultado.error.issues.map((issue) => ({
        campo: issue.path.join('.'),
        mensaje: issue.message,
      }));
      return next(new AppError('Datos inválidos', 400, 'VALIDACION', detalles));
    }
    req[fuente] = resultado.data;
    next();
  };
}

export function validarObjectId(parametro = 'id') {
  return (req, _res, next) => {
    const valor = req.params[parametro];
    if (!mongoose.isValidObjectId(valor)) {
      return next(new AppError(`Identificador inválido: ${valor}`, 400, 'ID_INVALIDO'));
    }
    next();
  };
}
