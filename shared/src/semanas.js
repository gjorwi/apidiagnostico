import { getISOWeek, getISOWeekYear } from 'date-fns';

const RE_FECHA = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/;

export function aFechaLocal(valor) {
  if (valor instanceof Date) {
    if (Number.isNaN(valor.getTime())) return null;
    return new Date(valor.getFullYear(), valor.getMonth(), valor.getDate(), 12, 0, 0, 0);
  }
  if (typeof valor === 'string') {
    const limpio = valor.trim();
    const coincidencia = RE_FECHA.exec(limpio);
    if (coincidencia) {
      const fecha = new Date(
        Number(coincidencia[1]),
        Number(coincidencia[2]) - 1,
        Number(coincidencia[3]),
        12,
        0,
        0,
        0
      );
      return Number.isNaN(fecha.getTime()) ? null : fecha;
    }
    const fecha = new Date(limpio);
    if (Number.isNaN(fecha.getTime())) return null;
    return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 12, 0, 0, 0);
  }
  return null;
}

export function calcularSemanaEpidemiologica(fecha) {
  const fechaLocal = aFechaLocal(fecha);
  if (!fechaLocal) return null;
  return {
    semanaEpidemiologica: getISOWeek(fechaLocal),
    anioEpidemiologico: getISOWeekYear(fechaLocal),
    anio: fechaLocal.getFullYear(),
    mes: fechaLocal.getMonth() + 1,
  };
}

export function rangoFechasLocales(desde, hasta) {
  const rango = {};
  const fechaDesde = aFechaLocal(desde);
  if (fechaDesde) {
    rango.desde = new Date(
      fechaDesde.getFullYear(),
      fechaDesde.getMonth(),
      fechaDesde.getDate(),
      0,
      0,
      0,
      0
    );
  }
  const fechaHasta = aFechaLocal(hasta);
  if (fechaHasta) {
    rango.hasta = new Date(
      fechaHasta.getFullYear(),
      fechaHasta.getMonth(),
      fechaHasta.getDate(),
      23,
      59,
      59,
      999
    );
  }
  return rango;
}

export function formatearFecha(fecha) {
  const fechaLocal = aFechaLocal(fecha);
  if (!fechaLocal) return '';
  const anio = fechaLocal.getFullYear();
  const mes = String(fechaLocal.getMonth() + 1).padStart(2, '0');
  const dia = String(fechaLocal.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}
