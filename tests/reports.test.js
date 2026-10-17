import { describe, it, expect } from 'vitest';
import { pivotEpi13, describirFiltros, indiceGrupoEpi14 } from '../src/services/reports.js';

const SETTINGS = {
  titulo: 'EPI13 Test',
  gruposEtarios: ['<1', '1-4', '5-9', '65+'],
  enfermedadesNotificables: [{ codigo: 'I10', descripcion: 'Hipertensión esencial' }],
};

describe('pivotEpi13', () => {
  it('construye la matriz con celdas por sexo y grupo etario', () => {
    const agrupados = [
      {
        _id: { codigo: 'I10', descripcion: 'Hipertensión esencial', sexo: 'M', grupoEtario: '65+' },
        total: 3,
      },
      {
        _id: { codigo: 'I10', descripcion: 'Hipertensión esencial', sexo: 'F', grupoEtario: '65+' },
        total: 2,
      },
      {
        _id: { codigo: 'E11.9', descripcion: 'Diabetes tipo 2', sexo: 'F', grupoEtario: '1-4' },
        total: 1,
      },
    ];

    const matriz = pivotEpi13(agrupados, SETTINGS);

    expect(matriz.grupos).toEqual(['<1', '1-4', '5-9', '65+']);
    expect(matriz.filas).toHaveLength(2);

    const hipertension = matriz.filas[0];
    expect(hipertension.codigo).toBe('I10');
    expect(hipertension.enLista).toBe(true);
    expect(hipertension.celdas['M|65+']).toBe(3);
    expect(hipertension.celdas['F|65+']).toBe(2);
    expect(hipertension.totalM).toBe(3);
    expect(hipertension.totalF).toBe(2);
    expect(hipertension.total).toBe(5);

    const diabetes = matriz.filas[1];
    expect(diabetes.enLista).toBe(false);
    expect(diabetes.total).toBe(1);

    expect(matriz.totales.celdas['F|1-4']).toBe(1);
    expect(matriz.totales.total).toBe(6);
    expect(matriz.totales.totalM).toBe(3);
    expect(matriz.totales.totalF).toBe(3);
  });

  it('mantiene enfermedades configuradas aunque no tengan casos', () => {
    const matriz = pivotEpi13([], SETTINGS);
    expect(matriz.filas).toHaveLength(1);
    expect(matriz.filas[0].codigo).toBe('I10');
    expect(matriz.filas[0].total).toBe(0);
  });

  it('agrega grupos desconocidos encontrados en los datos', () => {
    const agrupados = [
      {
        _id: { codigo: 'I10', descripcion: 'Hipertensión', sexo: 'M', grupoEtario: '30-39' },
        total: 4,
      },
    ];
    const matriz = pivotEpi13(agrupados, SETTINGS);
    expect(matriz.grupos).toContain('30-39');
    expect(matriz.filas[0].celdas['M|30-39']).toBe(4);
  });
});

describe('indiceGrupoEpi14', () => {
  it('clasifica por edad exacta en las columnas del formato EPI 14', () => {
    expect(indiceGrupoEpi14(0)).toBe(0);
    expect(indiceGrupoEpi14(4)).toBe(1);
    expect(indiceGrupoEpi14(5)).toBe(2);
    expect(indiceGrupoEpi14(6)).toBe(2);
    expect(indiceGrupoEpi14(14)).toBe(5);
    expect(indiceGrupoEpi14(30)).toBe(8);
    expect(indiceGrupoEpi14(64)).toBe(10);
    expect(indiceGrupoEpi14(65)).toBe(11);
    expect(indiceGrupoEpi14('desconocido')).toBe(12);
  });
});

describe('describirFiltros', () => {
  it('describe los filtros aplicados', () => {
    const texto = describirFiltros({
      anioEpidemiologico: 2026,
      semanaDesde: 1,
      semanaHasta: 10,
      tipoAtencion: 'consulta',
    });
    expect(texto).toContain('2026');
    expect(texto).toContain('Semanas 1 a 10');
    expect(texto).toContain('consulta');
  });

  it('indica cuando no hay filtros', () => {
    expect(describirFiltros({})).toBe('Sin filtros');
  });
});
