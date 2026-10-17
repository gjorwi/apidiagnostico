import { ZodError } from 'zod';
import mongoose from 'mongoose';

export class AppError extends Error {
  constructor(mensaje, status = 400, codigo = 'ERROR', detalles = undefined) {
    super(mensaje);
    this.status = status;
    this.codigo = codigo;
    this.detalles = detalles;
  }
}

export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

export function notFound(req, res) {
  res.status(404).json({
    error: { codigo: 'NO_ENCONTRADA', mensaje: `Ruta no encontrada: ${req.method} ${req.originalUrl}` },
  });
}

export function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: { codigo: err.codigo, mensaje: err.message, detalles: err.detalles },
    });
  }

  if (err instanceof ZodError) {
    const detalles = err.issues.map((issue) => ({
      campo: issue.path.join('.'),
      mensaje: issue.message,
    }));
    return res.status(400).json({ error: { codigo: 'VALIDACION', mensaje: 'Datos inválidos', detalles } });
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const detalles = Object.values(err.errors).map((item) => ({
      campo: item.path,
      mensaje: item.message,
    }));
    return res.status(400).json({ error: { codigo: 'VALIDACION', mensaje: 'Datos inválidos', detalles } });
  }

  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({
      error: { codigo: 'ID_INVALIDO', mensaje: `Identificador inválido: ${err.value}` },
    });
  }

  if (err?.code === 11000) {
    const campos = Object.keys(err.keyPattern || {}).join(', ');
    return res.status(409).json({
      error: { codigo: 'DUPLICADO', mensaje: `Ya existe un registro con el mismo valor en: ${campos}` },
    });
  }

  req.log?.error({ err }, 'Error no controlado');
  return res.status(500).json({
    error: { codigo: 'INTERNO', mensaje: 'Error interno del servidor' },
  });
}
