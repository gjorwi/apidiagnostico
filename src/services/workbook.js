import { Readable } from 'node:stream';
import ExcelJS from 'exceljs';
import { normalizarTexto } from '@diag/shared';
import { AppError } from '../middleware/errors.js';

export function valorCelda(celda) {
  const valor = celda?.value;
  if (valor === null || valor === undefined) return '';
  if (valor instanceof Date) return valor;
  if (typeof valor === 'object') {
    if (Array.isArray(valor.richText)) return valor.richText.map((parte) => parte.text).join('');
    if (valor.text !== undefined) return valor.text;
    if (valor.result !== undefined) return valor.result;
    if (valor.hyperlink !== undefined) return valor.text || valor.hyperlink;
    return String(valor);
  }
  return valor;
}

export function numeroDeSerieExcelAFecha(serial) {
  const dias = Number(serial);
  if (!Number.isFinite(dias) || dias <= 0 || dias > 200000) return null;
  const milisegundos = Math.round((dias - 25569) * 86400 * 1000);
  const fecha = new Date(milisegundos);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

export async function leerFilas(buffer, nombreArchivo) {
  const libro = new ExcelJS.Workbook();
  if (/\.csv$/i.test(nombreArchivo || '')) {
    const stream = Readable.from(buffer);
    await libro.csv.read(stream);
  } else {
    await libro.xlsx.load(buffer);
  }

  const hoja = libro.worksheets[0];
  if (!hoja) throw new AppError('El archivo no contiene hojas', 400, 'ARCHIVO_INVALIDO');

  const filas = [];
  hoja.eachRow({ includeEmpty: false }, (fila, numero) => {
    const valores = [];
    fila.eachCell({ includeEmpty: true }, (celda, columna) => {
      valores[columna - 1] = valorCelda(celda);
    });
    filas.push({ numero, valores });
  });
  return filas;
}

export function mapearEncabezados(filaEncabezado, aliasPorCampo) {
  const indices = {};
  filaEncabezado.valores.forEach((valor, indice) => {
    const normalizado = normalizarTexto(valor);
    if (!normalizado) return;
    for (const [campo, alias] of Object.entries(aliasPorCampo)) {
      if (indices[campo] !== undefined) continue;
      if (alias.includes(normalizado)) indices[campo] = indice;
    }
  });
  return indices;
}
