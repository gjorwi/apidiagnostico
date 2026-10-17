import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import {
  generarEpi13Excel,
  generarEpi14Excel,
  obtenerPreviewEpi14,
} from '../src/services/exportExcel.js';
import { generarEpi13Pdf } from '../src/services/exportPdf.js';

const MATRIZ = {
  titulo: 'EPI13 Test',
  descripcionFiltros: 'Año epidemiológico 2026 · Semanas 1 a 2',
  grupos: ['<1', '1-4', '65+'],
  filas: [
    {
      codigo: 'I10',
      descripcion: 'Hipertensión esencial',
      celdas: { 'M|65+': 3, 'F|65+': 2 },
      totalM: 3,
      totalF: 2,
      total: 5,
      enLista: true,
    },
    {
      codigo: 'E11.9',
      descripcion: 'Diabetes mellitus tipo 2',
      celdas: { 'F|1-4': 1 },
      totalM: 0,
      totalF: 1,
      total: 1,
      enLista: false,
    },
  ],
  totales: { celdas: { 'M|65+': 3, 'F|65+': 2, 'F|1-4': 1 }, totalM: 3, totalF: 3, total: 6 },
  generadoEn: new Date('2026-01-15T12:00:00Z'),
};

describe('generarEpi13Excel', () => {
  it('genera un archivo xlsx válido', async () => {
    const buffer = await generarEpi13Excel(MATRIZ);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(1000);
    expect(buffer.subarray(0, 2).toString('utf8')).toBe('PK');
  });
});

describe('generarEpi14Excel', () => {
  it('rellena la plantilla con los conteos y la semana seleccionada', async () => {
    const datos = {
      anio: 2026,
      semana: 12,
      conteos: {
        J00: {
          H: [1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0],
          M: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
      },
    };

    const buffer = await generarEpi14Excel(datos);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.subarray(0, 2).toString('utf8')).toBe('PK');

    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(buffer);
    const hoja = libro.worksheets[0];

    expect(hoja.name).toBe('SEMANA 12');
    expect(hoja.getCell('Y4').value).toBe(2026);
    expect(hoja.getCell('AE4').value).toBe(12);

    expect(hoja.getCell(8, 3).value).toBe(1);
    expect(hoja.getCell(8, 4).value).toBe(0);
    expect(hoja.getCell(8, 5).value).toBe(2);
    expect(hoja.getCell(8, 29).value).toBe(6);
    expect(hoja.getCell(8, 30).value).toBe(0);
    expect(hoja.getCell(8, 31).value).toBe(6);
  });
});

describe('obtenerPreviewEpi14', () => {
  it('construye la grilla de la plantilla con los datos cargados', async () => {
    const datos = {
      anio: 2026,
      semana: 12,
      conteos: {
        J00: {
          H: [1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0],
          M: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
      },
    };

    const preview = await obtenerPreviewEpi14(datos);
    expect(preview.semana).toBe(12);
    expect(preview.anio).toBe(2026);
    expect(preview.nombreHoja).toBe('SEMANA 12');
    expect(preview.filas.length).toBeGreaterThan(30);

    const filaJ00 = preview.filas[7];
    expect(filaJ00[1].valor).toBe('Rinofaringitis Aguda (J00)');
    expect(filaJ00[2].valor).toBe(1);
    expect(filaJ00[3].valor).toBe(0);
    expect(filaJ00[4].valor).toBe(2);
    expect(filaJ00[28].valor).toBe(6);
  });
});

describe('generarEpi13Pdf', () => {
  it('genera un archivo pdf válido', async () => {
    const buffer = await generarEpi13Pdf(MATRIZ);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.subarray(0, 5).toString('utf8')).toBe('%PDF-');
  });
});
