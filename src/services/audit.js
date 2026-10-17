import { AuditLog } from '../models/AuditLog.js';
import { logger } from '../config/logger.js';

export async function registrarAuditoria({ req, accion, entidad, entidadId, antes, despues }) {
  try {
    await AuditLog.create({
      usuario: req?.usuario?._id,
      usuarioEmail: req?.usuario?.email,
      accion,
      entidad,
      entidadId: entidadId ? String(entidadId) : undefined,
      antes,
      despues,
      ip: req?.ip,
      userAgent: req?.headers?.['user-agent'],
    });
  } catch (error) {
    logger.warn({ error: error.message, accion, entidad }, 'No se pudo registrar auditoría');
  }
}
