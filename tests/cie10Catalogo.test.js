import { describe, it, expect } from 'vitest';
import {
  construirNodosCie10,
  auditarCie10,
  normalizarDescripcionCie10,
} from '../src/services/cie10Catalogo.js';

const DATOS = [
  { level: 0, code: 'J00-J99', description: 'Enfermedades del sistema respiratorio' },
  { level: 1, code: 'J09-J18 ', description: 'Influenza [gripe] y neumonía ', code_0: 'J00-J99' },
  { level: 2, code: 'J10', description: 'Influenza debida a otro virus ­identificado', code_1: 'J09–J18', code_0: 'J00-J99' },
];

describe('construirNodosCie10', () => {
  it('normaliza códigos con espacios y guiones y resuelve el padre', () => {
    const { nodos, referenciasInvalidas } = construirNodosCie10(DATOS);
    expect(referenciasInvalidas).toBe(0);

    const capitulo = nodos.find((n) => n.codigo === 'J00-J99');
    expect(capitulo.padre).toBe(null);
    expect(capitulo.capitulo).toBe('J00-J99');
    expect(capitulo.nivel).toBe(0);

    const bloque = nodos.find((n) => n.codigo === 'J09-J18');
    expect(bloque.padre).toBe('J00-J99');
    expect(bloque.hijos).toBe(1);

    const categoria = nodos.find((n) => n.codigo === 'J10');
    expect(categoria.padre).toBe('J09-J18');
    expect(categoria.capitulo).toBe('J00-J99');
    expect(categoria.codigoNormalizado).toBe('j10');
  });

  it('quita guiones suaves y recupera tildes perdidas', () => {
    const { nodos } = construirNodosCie10(DATOS);
    const categoria = nodos.find((n) => n.codigo === 'J10');
    expect(categoria.descripcion).toBe('Influenza debida a otro virus identificado');

    expect(normalizarDescripcionCie10('E00-E89', 'Enfermedades endocrinas y metabolicas')).toBe(
      'Enfermedades endocrinas y metabólicas'
    );
    expect(normalizarDescripcionCie10('O860', 'nfección de herida quirúrgica obstétrica')).toBe(
      'Infección de herida quirúrgica obstétrica'
    );
  });

  it('cuenta los hijos directos', () => {
    const { nodos } = construirNodosCie10(DATOS);
    const bloque = nodos.find((n) => n.codigo === 'J09-J18');
    expect(bloque.hijos).toBe(1);
    const capitulo = nodos.find((n) => n.codigo === 'J00-J99');
    expect(capitulo.hijos).toBe(1);
  });
});

describe('auditarCie10', () => {
  it('reporta los defectos por acento y de extracción', () => {
    const reporte = auditarCie10(DATOS);
    expect(reporte.total).toBe(3);
    expect(reporte.guionesSuaves).toContain('J10');
    expect(reporte.espaciosSobrantes).toContain('J09-J18');
    expect(reporte.codigosNormalizados).toContain('J09-J18');
    expect(reporte.referenciasHuerfanas).toHaveLength(0);
  });
});
