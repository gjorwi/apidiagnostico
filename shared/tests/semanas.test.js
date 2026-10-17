import { describe, it, expect } from 'vitest';
import {
  calcularSemanaEpidemiologica,
  aFechaLocal,
  formatearFecha,
  rangoFechasLocales,
} from '../src/semanas.js';

describe('calcularSemanaEpidemiologica', () => {
  it('calcula semana y año ISO para una fecha normal', () => {
    const resultado = calcularSemanaEpidemiologica('2026-03-10');
    expect(resultado).toEqual({
      semanaEpidemiologica: 11,
      anioEpidemiologico: 2026,
      anio: 2026,
      mes: 3,
    });
  });

  it('asigna semana 1 de 2026 a un día de diciembre de 2025', () => {
    const resultado = calcularSemanaEpidemiologica('2025-12-29');
    expect(resultado.semanaEpidemiologica).toBe(1);
    expect(resultado.anioEpidemiologico).toBe(2026);
    expect(resultado.anio).toBe(2025);
    expect(resultado.mes).toBe(12);
  });

  it('asigna semana 53 de 2026 a un día de enero de 2027', () => {
    const resultado = calcularSemanaEpidemiologica('2027-01-01');
    expect(resultado.semanaEpidemiologica).toBe(53);
    expect(resultado.anioEpidemiologico).toBe(2026);
    expect(resultado.anio).toBe(2027);
    expect(resultado.mes).toBe(1);
  });

  it('no desplaza el día por zona horaria al parsear strings', () => {
    const fecha = aFechaLocal('2026-03-10');
    expect(fecha.getDate()).toBe(10);
    expect(fecha.getMonth()).toBe(2);
    expect(fecha.getFullYear()).toBe(2026);
  });

  it('devuelve null para entradas inválidas', () => {
    expect(calcularSemanaEpidemiologica('no-es-fecha')).toBeNull();
    expect(calcularSemanaEpidemiologica(null)).toBeNull();
  });
});

describe('formatearFecha', () => {
  it('formatea en YYYY-MM-DD', () => {
    expect(formatearFecha('2026-07-04T15:30:00.000Z')).toBe('2026-07-04');
  });
});

describe('rangoFechasLocales', () => {
  it('construye límites del día local', () => {
    const rango = rangoFechasLocales('2026-01-05', '2026-01-06');
    expect(rango.desde.getHours()).toBe(0);
    expect(rango.hasta.getHours()).toBe(23);
    expect(rango.hasta.getMinutes()).toBe(59);
  });
});
