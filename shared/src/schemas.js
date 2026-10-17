import { z } from 'zod';
import { SEXOS, TIPOS_ATENCION } from './constantes.js';
import { ROLES } from './permisos.js';
import { aFechaLocal } from './semanas.js';

const fechaObligatoria = z.preprocess(
  (valor) => {
    if (valor === '' || valor === null || valor === undefined) return undefined;
    const fecha = aFechaLocal(valor);
    return fecha ?? valor;
  },
  z.date({ required_error: 'La fecha es obligatoria', invalid_type_error: 'Fecha inválida' })
);

const fechaOpcional = z.preprocess(
  (valor) => {
    if (valor === '' || valor === null || valor === undefined) return undefined;
    const fecha = aFechaLocal(valor);
    return fecha ?? valor;
  },
  z.date({ invalid_type_error: 'Fecha inválida' }).optional()
);

export const registroCreateSchema = z.object({
  sexo: z.enum(SEXOS, { errorMap: () => ({ message: 'Sexo debe ser M o F' }) }),
  edad: z.coerce
    .number({ invalid_type_error: 'Edad inválida' })
    .int('La edad debe ser un número entero')
    .min(0, 'La edad no puede ser negativa')
    .max(130, 'La edad máxima es 130'),
  codigo: z.string({ required_error: 'El código CIE-10 es obligatorio' }).trim().min(1).max(20),
  descripcion: z.string().trim().max(400).optional(),
  tipoAtencion: z.enum(TIPOS_ATENCION, {
    errorMap: () => ({ message: 'Tipo de atención inválido' }),
  }),
  fechaAtencion: fechaObligatoria,
});

export const registroUpdateSchema = registroCreateSchema.partial();

export const registroFiltrosSchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(20),
  sexo: z.enum(SEXOS).optional(),
  grupoEtario: z.string().trim().max(20).optional(),
  codigo: z.string().trim().max(20).optional(),
  tipoAtencion: z.enum(TIPOS_ATENCION).optional(),
  anioEpidemiologico: z.coerce.number().int().min(2000).max(2100).optional(),
  semanaEpidemiologica: z.coerce.number().int().min(1).max(53).optional(),
  fechaDesde: fechaOpcional,
  fechaHasta: fechaOpcional,
  orden: z.enum(['reciente', 'antiguo']).default('reciente'),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

export const cambioPasswordSchema = z.object({
  passwordActual: z.string().min(1, 'La contraseña actual es obligatoria'),
  passwordNueva: z.string().min(8, 'La nueva contraseña debe tener al menos 8 caracteres'),
});

export const usuarioCreateSchema = z.object({
  nombre: z.string().trim().min(2, 'El nombre es obligatorio').max(120),
  email: z.string().trim().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  rol: z.enum(ROLES, { errorMap: () => ({ message: 'Rol inválido' }) }),
  activo: z.boolean().optional().default(true),
});

export const usuarioUpdateSchema = usuarioCreateSchema.partial();

export const importFilaSchema = registroCreateSchema.omit({ descripcion: true });

export const reporteEpi13QuerySchema = z.object({
  anioEpidemiologico: z.coerce.number().int().min(2000).max(2100).optional(),
  semanaDesde: z.coerce.number().int().min(1).max(53).optional(),
  semanaHasta: z.coerce.number().int().min(1).max(53).optional(),
  fechaDesde: fechaOpcional,
  fechaHasta: fechaOpcional,
  tipoAtencion: z.enum(TIPOS_ATENCION).optional(),
  sexo: z.enum(SEXOS).optional(),
  codigos: z
    .string()
    .trim()
    .optional()
    .transform((valor) =>
      valor
        ? valor
            .split(',')
            .map((codigo) => codigo.trim())
            .filter(Boolean)
        : undefined
    ),
  formato: z.enum(['xlsx', 'pdf']).optional(),
});

export const reporteEpi14QuerySchema = z.object({
  fecha: fechaOpcional,
  formato: z.enum(['xlsx']).optional(),
});

export const grupoEpi13Schema = z.object({
  etiqueta: z.string().trim().min(1).max(20),
  min: z.coerce.number().int().min(0),
  max: z.coerce.number().int().min(0),
});

export const enfermedadEpi13Schema = z.object({
  codigo: z.string().trim().min(1).max(20),
  descripcion: z.string().trim().min(1).max(400),
});

export const settingsEpi13Schema = z.object({
  gruposEtarios: z.array(z.string().trim().min(1).max(20)).min(1, 'Debe existir al menos un grupo'),
  enfermedadesNotificables: z.array(enfermedadEpi13Schema).default([]),
  titulo: z.string().trim().max(200).optional(),
});
