import mongoose from 'mongoose';

const auditSchema = new mongoose.Schema(
  {
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    usuarioEmail: { type: String, trim: true },
    accion: { type: String, required: true, trim: true },
    entidad: { type: String, required: true, trim: true },
    entidadId: { type: String, trim: true },
    antes: { type: mongoose.Schema.Types.Mixed },
    despues: { type: mongoose.Schema.Types.Mixed },
    ip: { type: String, trim: true },
    userAgent: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditSchema.index({ createdAt: -1 });
auditSchema.index({ entidad: 1, entidadId: 1 });
auditSchema.index({ usuario: 1, createdAt: -1 });

export const AuditLog = mongoose.model('AuditLog', auditSchema);
