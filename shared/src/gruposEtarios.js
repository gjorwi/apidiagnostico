export const GRUPOS_ETARIOS_DEFECTO = [
  '<1',
  '1-4',
  '5-9',
  '10-14',
  '15-19',
  '20-24',
  '25-34',
  '35-44',
  '45-54',
  '55-64',
  '65+',
];

export function rangoDeGrupo(etiqueta) {
  if (typeof etiqueta !== 'string') return null;
  const limpio = etiqueta.trim();
  const menor = /^<\s*(\d+)$/.exec(limpio);
  if (menor) return { min: 0, max: Number(menor[1]) - 1 };
  const mayor = /^(\d+)\s*\+$/.exec(limpio);
  if (mayor) return { min: Number(mayor[1]), max: Number.POSITIVE_INFINITY };
  const rango = /^(\d+)\s*-\s*(\d+)$/.exec(limpio);
  if (rango) return { min: Number(rango[1]), max: Number(rango[2]) };
  return null;
}

export function ordenarGrupos(grupos) {
  return [...grupos].sort((a, b) => {
    const rangoA = rangoDeGrupo(a);
    const rangoB = rangoDeGrupo(b);
    if (!rangoA && !rangoB) return 0;
    if (!rangoA) return 1;
    if (!rangoB) return -1;
    return rangoA.min - rangoB.min;
  });
}

export function calcularGrupoEtario(edad, grupos = GRUPOS_ETARIOS_DEFECTO) {
  const numero = Number(edad);
  if (!Number.isFinite(numero) || numero < 0) return 'Desconocido';
  for (const etiqueta of ordenarGrupos(grupos)) {
    const rango = rangoDeGrupo(etiqueta);
    if (rango && numero >= rango.min && numero <= rango.max) return etiqueta;
  }
  return 'Desconocido';
}
