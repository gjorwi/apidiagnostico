import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES } from '@diag/shared';

const userSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 160,
    },
    passwordHash: { type: String, required: true, select: false },
    rol: { type: String, enum: ROLES, required: true },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.methods.verificarPassword = function verificarPassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.methods.aJSON = function aJSON() {
  return {
    id: String(this._id),
    nombre: this.nombre,
    email: this.email,
    rol: this.rol,
    activo: this.activo,
    createdAt: this.createdAt,
  };
};

userSchema.statics.hashPassword = function hashPassword(password) {
  return bcrypt.hash(password, 10);
};

export const User = mongoose.model('User', userSchema);
