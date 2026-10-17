import mongoose from 'mongoose';
import { normalizarTexto } from '@diag/shared';

const cie10Schema = new mongoose.Schema(
  {
    codigo: { type: String, required: true, unique: true, uppercase: true, trim: true },
    descripcion: { type: String, required: true, trim: true, maxlength: 500 },
    codigoNormalizado: { type: String, required: true, index: true },
    descripcionNormalizada: { type: String, required: true, index: true },
    capitulo: { type: String, trim: true },
    // Jerarquía CIE-10: 0 capítulo, 1 bloque, 2 categoría, 3-5 subcategoría.
    nivel: { type: Number, default: null, index: true },
    padre: { type: String, trim: true, default: null, index: true },
    hijos: { type: Number, default: 0 },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true }
);

cie10Schema.pre('validate', function preValidar(next) {
  if (this.codigo) this.codigoNormalizado = normalizarTexto(this.codigo);
  if (this.descripcion) this.descripcionNormalizada = normalizarTexto(this.descripcion);
  next();
});

export const Cie10 = mongoose.model('Cie10', cie10Schema);
