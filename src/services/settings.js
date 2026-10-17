import { GRUPOS_ETARIOS_DEFECTO } from '@diag/shared';
import { Setting } from '../models/Setting.js';

export const CLAVE_EPI13 = 'epi13';

export const EPI13_DEFECTO = {
  titulo: 'EPI13 - Enfermedades de notificación obligatoria',
  gruposEtarios: [...GRUPOS_ETARIOS_DEFECTO],
  enfermedadesNotificables: [],
};

export async function obtenerSettingsEpi13() {
  const documento = await Setting.findOne({ clave: CLAVE_EPI13 }).lean();
  return {
    ...EPI13_DEFECTO,
    ...(documento?.valor || {}),
  };
}

export async function guardarSettingsEpi13(valor) {
  const documento = await Setting.findOneAndUpdate(
    { clave: CLAVE_EPI13 },
    { $set: { valor } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();
  return { ...EPI13_DEFECTO, ...documento.valor };
}
