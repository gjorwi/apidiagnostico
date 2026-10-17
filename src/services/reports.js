import { ordenarGrupos, rangoFechasLocales, calcularSemanaEpidemiologica } from '@diag/shared';
import { RegistroEpidemiologico } from '../models/RegistroEpidemiologico.js';

export const RANGOS_EDAD_EPI14 = [
  [0, 0],
  [1, 4],
  [5, 6],
  [7, 9],
  [10, 11],
  [12, 14],
  [15, 19],
  [20, 24],
  [25, 44],
  [45, 59],
  [60, 64],
  [65, Number.POSITIVE_INFINITY],
];

export const INDICE_EDAD_IGNORADA_EPI14 = RANGOS_EDAD_EPI14.length;

export function indiceGrupoEpi14(edad) {
  const numero = Number(edad);
  if (!Number.isFinite(numero) || numero < 0) return INDICE_EDAD_IGNORADA_EPI14;
  for (let indice = 0; indice < RANGOS_EDAD_EPI14.length; indice += 1) {
    const [minimo, maximo] = RANGOS_EDAD_EPI14[indice];
    if (numero >= minimo && numero <= maximo) return indice;
  }
  return INDICE_EDAD_IGNORADA_EPI14;
}

export function construirFiltrosReporte(query = {}) {
  const filtros = {};

  if (query.anioEpidemiologico) filtros.anioEpidemiologico = query.anioEpidemiologico;

  if (query.semanaDesde || query.semanaHasta) {
    filtros.semanaEpidemiologica = {};
    if (query.semanaDesde) filtros.semanaEpidemiologica.$gte = query.semanaDesde;
    if (query.semanaHasta) filtros.semanaEpidemiologica.$lte = query.semanaHasta;
  }

  if (query.tipoAtencion) filtros.tipoAtencion = query.tipoAtencion;
  if (query.sexo) filtros.sexo = query.sexo;

  const codigos = Array.isArray(query.codigos)
    ? query.codigos.map((codigo) => String(codigo).toUpperCase())
    : [];
  if (codigos.length) filtros['cie10.codigo'] = { $in: codigos };

  const rango = rangoFechasLocales(query.fechaDesde, query.fechaHasta);
  if (rango.desde || rango.hasta) {
    filtros.fechaAtencion = {};
    if (rango.desde) filtros.fechaAtencion.$gte = rango.desde;
    if (rango.hasta) filtros.fechaAtencion.$lte = rango.hasta;
  }

  return filtros;
}

export function pivotEpi13(agrupados, settings) {
  const etiquetasExtra = new Set();
  const filasMapa = new Map();

  const obtenerFila = (codigo, descripcion) => {
    if (!filasMapa.has(codigo)) {
      filasMapa.set(codigo, {
        codigo,
        descripcion,
        celdas: {},
        totalM: 0,
        totalF: 0,
        total: 0,
        enLista: false,
      });
    }
    const fila = filasMapa.get(codigo);
    if (descripcion && !fila.descripcion) fila.descripcion = descripcion;
    return fila;
  };

  for (const item of agrupados) {
    const { codigo, descripcion, sexo, grupoEtario } = item._id;
    if (!codigo || !sexo || !grupoEtario) continue;

    const fila = obtenerFila(codigo, descripcion);
    const clave = `${sexo}|${grupoEtario}`;
    fila.celdas[clave] = (fila.celdas[clave] || 0) + item.total;
    if (sexo === 'M') fila.totalM += item.total;
    else if (sexo === 'F') fila.totalF += item.total;
    fila.total += item.total;

    if (!settings.gruposEtarios.includes(grupoEtario)) etiquetasExtra.add(grupoEtario);
  }

  const filas = [];
  const codigosConfigurados = new Set();

  for (const enfermedad of settings.enfermedadesNotificables || []) {
    const codigo = String(enfermedad.codigo).toUpperCase();
    codigosConfigurados.add(codigo);
    const fila = filasMapa.get(codigo) || {
      codigo,
      descripcion: enfermedad.descripcion,
      celdas: {},
      totalM: 0,
      totalF: 0,
      total: 0,
    };
    if (!fila.descripcion) fila.descripcion = enfermedad.descripcion;
    fila.enLista = true;
    filas.push(fila);
  }

  const restantes = [...filasMapa.values()]
    .filter((fila) => !codigosConfigurados.has(fila.codigo))
    .sort((a, b) => a.codigo.localeCompare(b.codigo));
  filas.push(...restantes);

  const grupos = ordenarGrupos([
    ...new Set([...(settings.gruposEtarios || []), ...etiquetasExtra]),
  ]);

  const totales = { celdas: {}, totalM: 0, totalF: 0, total: 0 };
  for (const fila of filas) {
    for (const [clave, valor] of Object.entries(fila.celdas)) {
      totales.celdas[clave] = (totales.celdas[clave] || 0) + valor;
    }
    totales.totalM += fila.totalM;
    totales.totalF += fila.totalF;
    totales.total += fila.total;
  }

  return {
    titulo: settings.titulo,
    grupos,
    filas,
    totales,
    generadoEn: new Date(),
  };
}

export function describirFiltros(query = {}) {
  const partes = [];
  if (query.anioEpidemiologico) partes.push(`Año epidemiológico ${query.anioEpidemiologico}`);
  if (query.semanaDesde || query.semanaHasta) {
    const desde = query.semanaDesde || 1;
    const hasta = query.semanaHasta || query.semanaDesde || 53;
    partes.push(`Semanas ${desde} a ${hasta}`);
  }
  if (query.tipoAtencion) partes.push(`Atención: ${query.tipoAtencion}`);
  if (query.sexo) partes.push(`Sexo: ${query.sexo === 'M' ? 'Masculino' : 'Femenino'}`);
  if (query.fechaDesde || query.fechaHasta) {
    partes.push(`Fechas: ${query.fechaDesde || 'inicio'} a ${query.fechaHasta || 'hoy'}`);
  }
  if (query.codigos?.length) partes.push(`CIE-10: ${query.codigos.join(', ')}`);
  return partes.length ? partes.join(' · ') : 'Sin filtros';
}

export async function generarEpi13(query, settings) {
  const filtros = construirFiltrosReporte(query);
  const agrupados = await RegistroEpidemiologico.aggregate([
    { $match: filtros },
    {
      $group: {
        _id: {
          codigo: '$cie10.codigo',
          descripcion: '$cie10.descripcion',
          sexo: '$sexo',
          grupoEtario: '$grupoEtario',
        },
        total: { $sum: 1 },
      },
    },
  ]);

  const matriz = pivotEpi13(agrupados, settings);
  matriz.filtros = { ...query };
  delete matriz.filtros.formato;
  delete matriz.filtros.pagina;
  delete matriz.filtros.limite;
  matriz.descripcionFiltros = describirFiltros(query);
  return matriz;
}

export async function generarEpi14(fecha) {
  const calculo = calcularSemanaEpidemiologica(fecha) || calcularSemanaEpidemiologica(new Date());
  const { anioEpidemiologico, semanaEpidemiologica } = calculo;

  const agrupados = await RegistroEpidemiologico.aggregate([
    { $match: { anioEpidemiologico, semanaEpidemiologica } },
    {
      $group: {
        _id: { codigo: '$cie10.codigo', sexo: '$sexo', edad: '$edad' },
        total: { $sum: 1 },
      },
    },
  ]);

  const conteos = {};
  for (const item of agrupados) {
    const codigo = String(item._id.codigo || '').toUpperCase();
    if (!codigo) continue;

    const columnaSexo = item._id.sexo === 'F' ? 'M' : 'H';
    const indice = indiceGrupoEpi14(item._id.edad);

    if (!conteos[codigo]) {
      conteos[codigo] = {
        H: new Array(INDICE_EDAD_IGNORADA_EPI14 + 1).fill(0),
        M: new Array(INDICE_EDAD_IGNORADA_EPI14 + 1).fill(0),
      };
    }
    conteos[codigo][columnaSexo][indice] += item.total;
  }

  return {
    anio: anioEpidemiologico,
    semana: semanaEpidemiologica,
    anioCalendario: calculo.anio,
    mes: calculo.mes,
    conteos,
  };
}

export async function generarResumen() {
  const [total, porTipoAtencion, porSexo, topDiagnosticos, porSemana] = await Promise.all([
    RegistroEpidemiologico.countDocuments(),
    RegistroEpidemiologico.aggregate([
      { $group: { _id: '$tipoAtencion', total: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]),
    RegistroEpidemiologico.aggregate([{ $group: { _id: '$sexo', total: { $sum: 1 } } }]),
    RegistroEpidemiologico.aggregate([
      {
        $group: {
          _id: { codigo: '$cie10.codigo', descripcion: '$cie10.descripcion' },
          total: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          codigo: '$_id.codigo',
          descripcion: '$_id.descripcion',
          total: 1,
        },
      },
    ]),
    RegistroEpidemiologico.aggregate([
      {
        $group: {
          _id: {
            anioEpidemiologico: '$anioEpidemiologico',
            semanaEpidemiologica: '$semanaEpidemiologica',
          },
          total: { $sum: 1 },
        },
      },
      { $sort: { '_id.anioEpidemiologico': -1, '_id.semanaEpidemiologica': -1 } },
      { $limit: 12 },
      {
        $project: {
          _id: 0,
          anioEpidemiologico: '$_id.anioEpidemiologico',
          semanaEpidemiologica: '$_id.semanaEpidemiologica',
          total: 1,
        },
      },
    ]),
  ]);

  return {
    total,
    porTipoAtencion: porTipoAtencion.map((item) => ({ tipo: item._id, total: item.total })),
    porSexo: porSexo.map((item) => ({ sexo: item._id, total: item.total })),
    topDiagnosticos,
    porSemana: porSemana.reverse(),
  };
}
