import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';
import { TIPO_ATENCION_ETIQUETAS } from '@diag/shared';
import { INDICE_EDAD_IGNORADA_EPI14 } from './reports.js';

const RUTA_PLANTILLA_EPI14 = fileURLToPath(new URL('../../formato/EPI 14.xlsx', import.meta.url));
const FILA_INICIAL_ENFERMEDADES_EPI14 = 8;
const FILA_FINAL_ENFERMEDADES_EPI14 = 29;
const COLUMNA_TOTAL_HOMBRES_EPI14 = 29;
const COLUMNA_TOTAL_MUJERES_EPI14 = 30;
const COLUMNA_TOTAL_GENERAL_EPI14 = 31;

const BORDE = {
  top: { style: 'thin', color: { argb: 'FF94A3B8' } },
  left: { style: 'thin', color: { argb: 'FF94A3B8' } },
  bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
  right: { style: 'thin', color: { argb: 'FF94A3B8' } },
};

function clave(sexo, grupo) {
  return `${sexo}|${grupo}`;
}

export async function generarEpi13Excel(matriz) {
  const libro = new ExcelJS.Workbook();
  libro.creator = 'Sistema de Registros Epidemiológicos';
  libro.created = matriz.generadoEn || new Date();

  const hoja = libro.addWorksheet('EPI13', {
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    views: [{ state: 'frozen', ySplit: 4 }],
  });

  const totalColumnas = 2 + matriz.grupos.length * 2 + 1;

  hoja.mergeCells(1, 1, 1, totalColumnas);
  const titulo = hoja.getCell(1, 1);
  titulo.value = matriz.titulo || 'EPI13 - Enfermedades de notificación obligatoria';
  titulo.font = { bold: true, size: 14 };
  titulo.alignment = { horizontal: 'center' };

  hoja.mergeCells(2, 1, 2, totalColumnas);
  const subtitulo = hoja.getCell(2, 1);
  subtitulo.value = `Filtros: ${matriz.descripcionFiltros || 'Sin filtros'}`;
  subtitulo.font = { size: 10, italic: true };
  subtitulo.alignment = { horizontal: 'center' };

  hoja.mergeCells(3, 1, 3, totalColumnas);
  const generado = hoja.getCell(3, 1);
  generado.value = `Generado: ${new Date(matriz.generadoEn || Date.now()).toLocaleString('es-CL')} · Total de casos: ${matriz.totales.total}`;
  generado.font = { size: 10 };
  generado.alignment = { horizontal: 'center' };

  const filaGrupos = hoja.getRow(4);
  const filaSexos = hoja.getRow(5);

  filaGrupos.getCell(1).value = 'Código';
  filaGrupos.getCell(2).value = 'Enfermedad (CIE-10)';
  hoja.mergeCells(4, 1, 5, 1);
  hoja.mergeCells(4, 2, 5, 2);

  matriz.grupos.forEach((grupo, indice) => {
    const columna = 3 + indice * 2;
    filaGrupos.getCell(columna).value = grupo;
    hoja.mergeCells(4, columna, 4, columna + 1);
    filaSexos.getCell(columna).value = 'M';
    filaSexos.getCell(columna + 1).value = 'F';
  });

  const columnaTotal = totalColumnas;
  filaGrupos.getCell(columnaTotal).value = 'Total';
  hoja.mergeCells(4, columnaTotal, 5, columnaTotal);

  [filaGrupos, filaSexos].forEach((fila) => {
    fila.eachCell({ includeEmpty: true }, (celda) => {
      celda.font = { bold: true, size: 10 };
      celda.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      celda.border = BORDE;
    });
  });

  let numeroFila = 6;
  for (const registro of matriz.filas) {
    const fila = hoja.getRow(numeroFila);
    fila.getCell(1).value = registro.codigo;
    fila.getCell(2).value = registro.descripcion;
    matriz.grupos.forEach((grupo, indice) => {
      const columna = 3 + indice * 2;
      fila.getCell(columna).value = registro.celdas[clave('M', grupo)] || 0;
      fila.getCell(columna + 1).value = registro.celdas[clave('F', grupo)] || 0;
    });
    fila.getCell(columnaTotal).value = registro.total;
    fila.getCell(columnaTotal).font = { bold: true };

    fila.eachCell({ includeEmpty: true }, (celda) => {
      celda.border = BORDE;
      celda.alignment = celda.column >= 3 ? { horizontal: 'center' } : undefined;
      celda.font = celda.column === 1 ? { bold: true } : celda.font;
      if (registro.enLista === false)
        celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    });
    numeroFila += 1;
  }

  const filaTotales = hoja.getRow(numeroFila);
  filaTotales.getCell(1).value = '';
  filaTotales.getCell(2).value = 'TOTAL';
  matriz.grupos.forEach((grupo, indice) => {
    const columna = 3 + indice * 2;
    filaTotales.getCell(columna).value = matriz.totales.celdas[clave('M', grupo)] || 0;
    filaTotales.getCell(columna + 1).value = matriz.totales.celdas[clave('F', grupo)] || 0;
  });
  filaTotales.getCell(columnaTotal).value = matriz.totales.total;
  filaTotales.eachCell({ includeEmpty: true }, (celda) => {
    celda.font = { bold: true };
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE68A' } };
    celda.border = BORDE;
    if (celda.column >= 3) celda.alignment = { horizontal: 'center' };
  });

  hoja.getColumn(1).width = 12;
  hoja.getColumn(2).width = 52;
  for (let columna = 3; columna <= columnaTotal; columna += 1) {
    hoja.getColumn(columna).width = 7;
  }

  const casillaFiltros = hoja.getCell(numeroFila + 2, 1);
  casillaFiltros.value = `Total masculino: ${matriz.totales.totalM} · Total femenino: ${matriz.totales.totalF}${
    matriz.filtros?.tipoAtencion
      ? ` · Tipo: ${TIPO_ATENCION_ETIQUETAS[matriz.filtros.tipoAtencion] || matriz.filtros.tipoAtencion}`
      : ''
  }`;
  casillaFiltros.font = { size: 10 };

  const buffer = await libro.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function extraerCodigosEpi14(texto) {
  const codigos = [];
  const regex = /\(([A-Z]\d{2}(?:\.\d+)?)\)/gi;
  let coincidencia;
  while ((coincidencia = regex.exec(texto)) !== null) {
    codigos.push(coincidencia[1].toUpperCase());
  }
  return codigos;
}

function combinarConteosEpi14(conteos, codigos) {
  const total = INDICE_EDAD_IGNORADA_EPI14 + 1;
  const acumulado = { H: new Array(total).fill(0), M: new Array(total).fill(0) };

  for (const [codigo, conteo] of Object.entries(conteos)) {
    const coincide = codigos.some(
      (esperado) => codigo === esperado || codigo.startsWith(`${esperado}.`)
    );
    if (!coincide) continue;

    for (let indice = 0; indice < total; indice += 1) {
      acumulado.H[indice] += conteo.H[indice] || 0;
      acumulado.M[indice] += conteo.M[indice] || 0;
    }
  }

  return acumulado;
}

function aplicarDatosEpi14(hoja, datos) {
  hoja.name = `SEMANA ${datos.semana}`;
  hoja.getCell('Y4').value = datos.anio;
  hoja.getCell('AE4').value = datos.semana;

  const total = INDICE_EDAD_IGNORADA_EPI14 + 1;
  for (
    let fila = FILA_INICIAL_ENFERMEDADES_EPI14;
    fila <= FILA_FINAL_ENFERMEDADES_EPI14;
    fila += 1
  ) {
    const descripcion = String(hoja.getCell(fila, 2).value ?? '');
    const codigos = extraerCodigosEpi14(descripcion);
    if (!codigos.length) continue;

    const conteo = combinarConteosEpi14(datos.conteos || {}, codigos);
    let totalHombres = 0;
    let totalMujeres = 0;

    for (let indice = 0; indice < total; indice += 1) {
      const columnaHombres = 3 + indice * 2;
      const columnaMujeres = columnaHombres + 1;
      hoja.getCell(fila, columnaHombres).value = conteo.H[indice];
      hoja.getCell(fila, columnaMujeres).value = conteo.M[indice];
      totalHombres += conteo.H[indice];
      totalMujeres += conteo.M[indice];
    }

    hoja.getCell(fila, COLUMNA_TOTAL_HOMBRES_EPI14).value = totalHombres;
    hoja.getCell(fila, COLUMNA_TOTAL_MUJERES_EPI14).value = totalMujeres;
    hoja.getCell(fila, COLUMNA_TOTAL_GENERAL_EPI14).value = totalHombres + totalMujeres;
  }
}

export async function generarEpi14Excel(datos) {
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.readFile(RUTA_PLANTILLA_EPI14);

  aplicarDatosEpi14(libro.worksheets[0], datos);

  const buffer = await libro.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function valorCeldaEpi14(valor) {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'object') {
    if (Array.isArray(valor.richText)) return valor.richText.map((parte) => parte.text).join('');
    if (valor.text !== undefined) return String(valor.text);
    if (valor.result !== undefined && valor.result !== null) return valor.result;
    return '';
  }
  return valor;
}

function colorCeldaEpi14(celda) {
  const relleno = celda.fill;
  if (relleno && relleno.type === 'pattern' && relleno.fgColor) {
    const argb = relleno.fgColor.argb;
    if (typeof argb === 'string' && argb.length >= 6 && argb.slice(-6).toUpperCase() !== 'FFFFFF') {
      return argb.slice(-6);
    }
  }
  return null;
}

function construirGridEpi14(hoja) {
  const merges = Object.values(hoja._merges || {});
  const maestras = new Map();
  const cubiertas = new Set();

  for (const merge of merges) {
    maestras.set(`${merge.top}:${merge.left}`, {
      rowspan: merge.bottom - merge.top + 1,
      colspan: merge.right - merge.left + 1,
    });
    for (let fila = merge.top; fila <= merge.bottom; fila += 1) {
      for (let columna = merge.left; columna <= merge.right; columna += 1) {
        if (fila === merge.top && columna === merge.left) continue;
        cubiertas.add(`${fila}:${columna}`);
      }
    }
  }

  const filas = [];
  for (let fila = 1; fila <= hoja.rowCount; fila += 1) {
    const celdas = [];
    for (let columna = 1; columna <= hoja.columnCount; columna += 1) {
      const clave = `${fila}:${columna}`;
      if (cubiertas.has(clave)) {
        celdas.push(null);
        continue;
      }

      const celda = hoja.getCell(fila, columna);
      const merge = maestras.get(clave);
      celdas.push({
        valor: valorCeldaEpi14(celda.value),
        colspan: merge ? merge.colspan : 1,
        rowspan: merge ? merge.rowspan : 1,
        negrita: Boolean(celda.font && celda.font.bold),
        centrado: (celda.alignment && celda.alignment.horizontal === 'center') || Boolean(merge),
        fondo: colorCeldaEpi14(celda),
      });
    }
    filas.push(celdas);
  }
  return filas;
}

export async function obtenerPreviewEpi14(datos) {
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.readFile(RUTA_PLANTILLA_EPI14);

  const hoja = libro.worksheets[0];
  aplicarDatosEpi14(hoja, datos);

  return {
    anio: datos.anio,
    semana: datos.semana,
    nombreHoja: hoja.name,
    filas: construirGridEpi14(hoja),
  };
}
