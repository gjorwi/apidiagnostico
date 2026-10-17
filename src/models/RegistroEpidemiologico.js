import mongoose from 'mongoose';
import {
  SEXOS,
  TIPOS_ATENCION,
  calcularGrupoEtario,
  calcularSemanaEpidemiologica,
} from '@diag/shared';

const registroSchema = new mongoose.Schema(
  {
    sexo: { type: String, enum: SEXOS, required: true },
    edad: { type: Number, required: true, min: 0, max: 130 },
    grupoEtario: { type: String, required: true, trim: true },
    cie10: {
      codigo: { type: String, required: true, uppercase: true, trim: true },
      descripcion: { type: String, required: true, trim: true, maxlength: 400 },
    },
    tipoAtencion: { type: String, enum: TIPOS_ATENCION, required: true },
    fechaAtencion: { type: Date, required: true },
    semanaEpidemiologica: { type: Number, required: true, min: 1, max: 53 },
    anioEpidemiologico: { type: Number, required: true },
    anio: { type: Number, required: true },
    mes: { type: Number, required: true, min: 1, max: 12 },
    creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

registroSchema.pre('validate', function preValidar(next) {
  if (Number.isFinite(this.edad)) {
    this.grupoEtario = calcularGrupoEtario(this.edad);
  }
  if (this.fechaAtencion) {
    const calculo = calcularSemanaEpidemiologica(this.fechaAtencion);
    if (calculo) {
      this.semanaEpidemiologica = calculo.semanaEpidemiologica;
      this.anioEpidemiologico = calculo.anioEpidemiologico;
      this.anio = calculo.anio;
      this.mes = calculo.mes;
    }
  }
  next();
});

registroSchema.index({ 'cie10.codigo': 1, fechaAtencion: -1 });
registroSchema.index({
  sexo: 1,
  grupoEtario: 1,
  'cie10.codigo': 1,
  anioEpidemiologico: 1,
  semanaEpidemiologica: 1,
});
registroSchema.index({ tipoAtencion: 1, fechaAtencion: -1 });
registroSchema.index({ anioEpidemiologico: 1, semanaEpidemiologica: 1 });
registroSchema.index({ creadoPor: 1, createdAt: -1 });

export const RegistroEpidemiologico = mongoose.model(
  'RegistroEpidemiologico',
  registroSchema
);
