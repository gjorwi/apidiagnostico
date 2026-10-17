import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema(
  {
    clave: { type: String, required: true, unique: true, trim: true },
    valor: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

export const Setting = mongoose.model('Setting', settingSchema);
