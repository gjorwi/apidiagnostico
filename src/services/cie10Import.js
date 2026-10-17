import { normalizarTexto } from '@diag/shared';
import { Cie10 } from '../models/Cie10.js';
import { AppError } from '../middleware/errors.js';
import { leerFilas, mapearEncabezados } from './workbook.js';
import { construirNodosCie10, auditarCie10 } from './cie10Catalogo.js';

const ALIAS = {
  codigo: ['codigo', 'cie10', 'codigo cie10', 'codigo_cie10', 'cie-10', 'cod'],
  descripcion: ['descripcion', 'glosa', 'nombre', 'enfermedad', 'diagnostico'],
  capitulo: ['capitulo', 'grupo', 'categoria'],
};

function pareceJson(buffer) {
  const inicio = buffer.toString('utf8', 0, 200).trimStart();
  return inicio.startsWith('[') || inicio.startsWith('{');
}

async function escribirEnLotes(documentos) {
  const tamanoLote = 1000;
  for (let i = 0; i < documentos.length; i += tamanoLote) {
    const operaciones = documentos.slice(i, i + tamanoLote).map((documento) => ({
      updateOne: {
        filter: { codigo: documento.codigo },
        update: { $set: documento },
        upsert: true,
      },
    }));
    await Cie10.bulkWrite(operaciones, { ordered: false });
  }
}

// Importa el catálogo jerárquico oficial (docs/codes.json): normaliza códigos,
// descripciones con defectos y reconstruye la estructura padre/hijos.
export async function importarCie10DesdeJson(buffer) {
  let datos;
  try {
    datos = JSON.parse(buffer.toString('utf8'));
  } catch {
    throw new AppError('El archivo JSON no es válido', 400, 'JSON_INVALIDO');
  }
  if (!Array.isArray(datos) || !datos.length) {
    throw new AppError('El JSON no contiene una lista de códigos', 400, 'JSON_VACIO');
  }

  const { nodos, referenciasInvalidas } = construirNodosCie10(datos);
  await escribirEnLotes(nodos);

  return {
    procesadas: datos.length,
    importadas: nodos.length,
    errores: [],
    referenciasInvalidas,
    reporte: auditarCie10(datos),
  };
}

async function importarTablaCie10(buffer, nombreArchivo) {
  const filas = await leerFilas(buffer, nombreArchivo);
  if (filas.length < 2) {
    throw new AppError('El archivo no contiene datos', 400, 'ARCHIVO_VACIO');
  }

  const indices = mapearEncabezados(filas[0], ALIAS);
  if (indices.codigo === undefined || indices.descripcion === undefined) {
    throw new AppError(
      'El archivo debe incluir columnas de código y descripción (ej: CODIGO, DESCRIPCION)',
      400,
      'COLUMNAS_FALTANTES'
    );
  }

  const documentos = [];
  const errores = [];

  for (const fila of filas.slice(1)) {
    const codigo = String(fila.valores[indices.codigo] ?? '').trim().toUpperCase();
    const descripcion = String(fila.valores[indices.descripcion] ?? '').trim();
    const capitulo =
      indices.capitulo !== undefined ? String(fila.valores[indices.capitulo] ?? '').trim() : '';

    if (!codigo && !descripcion) continue;
    if (!codigo || !descripcion) {
      errores.push({ fila: fila.numero, mensaje: 'Código o descripción vacíos' });
      continue;
    }

    documentos.push({
      codigo,
      descripcion,
      capitulo: capitulo || undefined,
      codigoNormalizado: normalizarTexto(codigo),
      descripcionNormalizada: normalizarTexto(descripcion),
      activo: true,
    });
  }

  await escribirEnLotes(documentos);

  return {
    procesadas: filas.length - 1,
    importadas: documentos.length,
    errores,
  };
}

// Punto de entrada único. Acepta el catálogo jerárquico en JSON o una tabla
// Excel/CSV. Con `reemplazar` borra la colección antes de cargar (desde cero).
export async function importarCie10DesdeBuffer(buffer, nombreArchivo, { reemplazar = false } = {}) {
  if (reemplazar) await Cie10.deleteMany({});

  const esJson = /\.json$/i.test(nombreArchivo || '') || pareceJson(buffer);
  if (esJson) return importarCie10DesdeJson(buffer);

  return importarTablaCie10(buffer, nombreArchivo);
}

export async function limpiarCatalogoCie10() {
  const resultado = await Cie10.deleteMany({});
  return { eliminados: resultado.deletedCount || 0 };
}
