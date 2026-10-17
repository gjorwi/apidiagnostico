export function normalizarTexto(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function escaparRegex(valor) {
  return String(valor).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Normaliza un código CIE-10: sin espacios, en mayúsculas y con un único
// tipo de guion (los archivos oficiales mezclan guion, guion medio y guion bajo).
export function normalizarCodigoCie10(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor)
    .trim()
    .toUpperCase()
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, '-')
    .replace(/\s+/g, '');
}

// Limpia una descripción que viene de un PDF/Excel: quita guiones suaves
// (U+00AD) insertados por partición de palabras y normaliza los espacios.
export function limpiarDescripcionCie10(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor)
    .replace(/[\u00AD\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
