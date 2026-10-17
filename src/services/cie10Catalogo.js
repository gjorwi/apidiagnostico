import {
  normalizarTexto,
  normalizarCodigoCie10,
  limpiarDescripcionCie10,
} from '@diag/shared';

// Palabras que llegan sin tilde a causa de la extracción del archivo original.
// Solo se corrigen las formas defectuosas; las correctas no se tocan.
const CORRECCIONES_TILDES = [
  [/\bmetabolicas\b/g, 'metabólicas'],
  [/\bMetabolicas\b/g, 'Metabólicas'],
  [/\bcongenitas\b/g, 'congénitas'],
  [/\bCongenitas\b/g, 'Congénitas'],
  [/\bcongenita\b/g, 'congénita'],
  [/\bCongenita\b/g, 'Congénita'],
  [/\bsindromes\b/g, 'síndromes'],
  [/\bSindromes\b/g, 'Síndromes'],
  [/\bmalformacion\b/g, 'malformación'],
  [/\bMalformacion\b/g, 'Malformación'],
  [/\bcordon\b/g, 'cordón'],
  [/\bCordon\b/g, 'Cordón'],
  [/\blesion\b/g, 'lesión'],
  [/\bLesion\b/g, 'Lesión'],
  [/\bosea\b/g, 'ósea'],
  [/\bOsea\b/g, 'Ósea'],
  [/\boftalmoplejia\b/g, 'oftalmoplejía'],
  [/\bOftalmoplejia\b/g, 'Oftalmoplejía'],
  [/\bacido\b/g, 'ácido'],
  [/\bAcido\b/g, 'Ácido'],
];

// Descripciones que en el archivo original quedaron cortadas (se perdió la
// primera parte del texto, en varios casos por una palabra con tilde).
const DESCRIPCIONES_CORREGIDAS = {
  'H49-H52':
    'Trastornos de los músculos oculares, del movimiento binocular, de la acomodación y de la refracción',
  'A50-A64': 'Infecciones con modo de transmisión predominantemente sexual',
  'R70-R79': 'Hallazgos anormales en el examen de sangre, sin diagnóstico',
  'C00-C75':
    'Tumores malignos, declarados o presuntos como primarios, de sitios especificados, excepto de los tejidos linfáticos, hematopoyéticos y afines',
  'C00-C14': 'Tumores malignos del labio, de la cavidad bucal y de la faringe',
  'C30-C39': 'Tumores malignos de los órganos respiratorios e intratorácicos',
  O860: 'Infección de herida quirúrgica obstétrica',
};

function corregirTildes(texto) {
  let resultado = texto;
  for (const [patron, reemplazo] of CORRECCIONES_TILDES) {
    resultado = resultado.replace(patron, reemplazo);
  }
  return resultado;
}

export function normalizarDescripcionCie10(codigo, descripcion) {
  const directa = DESCRIPCIONES_CORREGIDAS[codigo];
  if (directa) return directa;
  return corregirTildes(limpiarDescripcionCie10(descripcion));
}

function padreDeNodo(nodo) {
  for (let nivel = 5; nivel >= 0; nivel -= 1) {
    const referencia = nodo[`code_${nivel}`];
    if (referencia !== undefined && referencia !== null && referencia !== '') {
      return normalizarCodigoCie10(referencia);
    }
  }
  return null;
}

// Convierte el arreglo de docs/codes.json en documentos listos para Mongo:
// normaliza códigos y descripciones, resuelve el padre y cuenta los hijos.
export function construirNodosCie10(datos) {
  const nodos = datos.map((nodo) => {
    const codigo = normalizarCodigoCie10(nodo.code);
    const descripcion = normalizarDescripcionCie10(codigo, nodo.description);
    return {
      codigo,
      descripcion,
      codigoNormalizado: normalizarTexto(codigo),
      descripcionNormalizada: normalizarTexto(descripcion),
      capitulo: nodo.code_0 ? normalizarCodigoCie10(nodo.code_0) : codigo,
      nivel: Number(nodo.level) || 0,
      padre: padreDeNodo(nodo),
      hijos: 0,
      activo: true,
    };
  });

  const existentes = new Set(nodos.map((nodo) => nodo.codigo));
  let referenciasInvalidas = 0;
  for (const nodo of nodos) {
    if (nodo.padre && !existentes.has(nodo.padre)) {
      nodo.padre = null;
      referenciasInvalidas += 1;
    }
  }

  const conteoHijos = new Map();
  for (const nodo of nodos) {
    if (nodo.padre) conteoHijos.set(nodo.padre, (conteoHijos.get(nodo.padre) || 0) + 1);
  }
  for (const nodo of nodos) {
    nodo.hijos = conteoHijos.get(nodo.codigo) || 0;
  }

  return { nodos, referenciasInvalidas };
}

// Reporte de defectos encontrados en el archivo original (sin modificarlo).
export function auditarCie10(datos) {
  const codigos = new Set(datos.map((nodo) => normalizarCodigoCie10(nodo.code)));
  const reporte = {
    total: datos.length,
    guionesSuaves: [],
    descripcionesCorregidas: [],
    tildesCorregidas: [],
    espaciosSobrantes: [],
    codigosNormalizados: [],
    referenciasHuerfanas: [],
  };

  for (const nodo of datos) {
    const codigo = normalizarCodigoCie10(nodo.code);
    const descripcion = String(nodo.description ?? '');
    const limpia = limpiarDescripcionCie10(descripcion);

    if (descripcion.includes('\u00AD')) reporte.guionesSuaves.push(codigo);
    if (descripcion !== descripcion.trim()) reporte.espaciosSobrantes.push(codigo);
    if (String(nodo.code ?? '') !== codigo) reporte.codigosNormalizados.push(codigo);

    if (DESCRIPCIONES_CORREGIDAS[codigo]) {
      reporte.descripcionesCorregidas.push({
        codigo,
        original: limpia,
        corregida: DESCRIPCIONES_CORREGIDAS[codigo],
      });
    } else if (corregirTildes(limpia) !== limpia) {
      reporte.tildesCorregidas.push({ codigo, original: limpia, corregida: corregirTildes(limpia) });
    }

    const padre = padreDeNodo(nodo);
    if (padre && !codigos.has(padre)) reporte.referenciasHuerfanas.push({ codigo, padre });
  }

  return reporte;
}
