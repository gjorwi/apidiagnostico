import { describe, it, expect } from 'vitest';
import {
  calcularGrupoEtario,
  ordenarGrupos,
  rangoDeGrupo,
  GRUPOS_ETARIOS_DEFECTO,
} from '../src/gruposEtarios.js';

describe('calcularGrupoEtario', () => {
  it('clasifica límites de cada grupo', () => {
    expect(calcularGrupoEtario(0)).toBe('<1');
    expect(calcularGrupoEtario(1)).toBe('1-4');
    expect(calcularGrupoEtario(4)).toBe('1-4');
    expect(calcularGrupoEtario(5)).toBe('5-9');
    expect(calcularGrupoEtario(24)).toBe('20-24');
    expect(calcularGrupoEtario(25)).toBe('25-34');
    expect(calcularGrupoEtario(64)).toBe('55-64');
    expect(calcularGrupoEtario(65)).toBe('65+');
    expect(calcularGrupoEtario(105)).toBe('65+');
  });

  it('devuelve Desconocido para edades inválidas', () => {
    expect(calcularGrupoEtario(-1)).toBe('Desconocido');
    expect(calcularGrupoEtario('abc')).toBe('Desconocido');
  });

  it('respeta grupos personalizados', () => {
    expect(calcularGrupoEtario(30, ['<18', '18-59', '60+'])).toBe('18-59');
  });
});

describe('rangoDeGrupo', () => {
  it('interpreta etiquetas <n, n-m y n+', () => {
    expect(rangoDeGrupo('<1')).toEqual({ min: 0, max: 0 });
    expect(rangoDeGrupo('10-14')).toEqual({ min: 10, max: 14 });
    expect(rangoDeGrupo('65+')).toEqual({ min: 65, max: Number.POSITIVE_INFINITY });
    expect(rangoDeGrupo('invalido')).toBeNull();
  });
});

describe('ordenarGrupos', () => {
  it('ordena por edad mínima', () => {
    const desordenados = ['65+', '5-9', '<1', '1-4'];
    expect(ordenarGrupos(desordenados)).toEqual(['<1', '1-4', '5-9', '65+']);
  });

  it('el listado por defecto ya está ordenado', () => {
    expect(ordenarGrupos(GRUPOS_ETARIOS_DEFECTO)).toEqual(GRUPOS_ETARIOS_DEFECTO);
  });
});
