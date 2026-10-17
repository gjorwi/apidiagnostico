import { Router } from 'express';
import multer from 'multer';
import ExcelJS from 'exceljs';
import {
  normalizarTexto,
  calcularGrupoEtario,
  calcularSemanaEpidemiologica,
  importFilaSchema,
} from '@diag/shared';
import { RegistroEpidemiologico } from '../../models/RegistroEpidemiologico.js';
import { Cie10 } from '../../models/Cie10.js';
import { AppError, asyncHandler } from '../../middleware/errors.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermiso } from '../../middleware/permisos.js';
import { registrarAuditoria } from '../../services/audit.js';
import { leerFilas, mapearEncabezados, numeroDeSerieExcelAFecha } from '../../services/workbook.js';

const router = Router();

const subida = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

const MAX_FILAS = 5000;

const ALIAS = {
  sexo: ['sexo', 'genero'],
  edad: ['edad', 'anos', 'anio', 'años'],
  codigo: ['codigo', 'cie10', 'codigo cie10', 'codigo_cie10', 'cie-10', 'diagnostico'],
  tipoAtencion: ['tipo atencion', 'tipo_atencion', 'tipo de atencion', 'tipo', 'atencion'],
  fechaAtencion: ['fecha atencion', 'fecha_atencion', 'fecha de atencion', 'fecha'],
};

function normalizarSexo(valor) {
  const normalizado = normalizarTexto(valor);
  if (['m', 'masculino', 'hombre', 'varon', 'male', '1'].includes(normalizado)) return 'M';
  if (['f', 'femenino', 'mujer', 'dama', 'female', '2'].includes(normalizado)) return 'F';
  return null;
}

function normalizarTipoAtencion(valor) {
  const normalizado = normalizarTexto(valor);
  if (normalizado.startsWith('consult')) return 'consulta';
  if (normalizado.startsWith('emerg')) return 'emergencia';
  if (normalizado.startsWith('hospital')) return 'hospitalizacion';
  return null;
}

function fechaDesdeCelda(valor) {
  if (valor instanceof Date) {
    const esMedianocheUTC =
      valor.getUTCHours() === 0 &&
      valor.getUTCMinutes() === 0 &&
      valor.getUTCSeconds() === 0 &&
      valor.getUTCMilliseconds() === 0;
    const obtener = esMedianocheUTC ? 'getUTC' : 'get';
    const anio = valor[`${obtener}FullYear`]();
    const mes = String(valor[`${obtener}Month`]() + 1).padStart(2, '0');
    const dia = String(valor[`${obtener}Date`]()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }
  if (typeof valor === 'number') {
    const fecha = numeroDeSerieExcelAFecha(valor);
    return fecha ? fechaDesdeCelda(fecha) : String(valor);
  }
  return String(valor ?? '').trim();
}

export async function generarPlantillaImportacion() {
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet('Registros');
  hoja.columns = [
    { header: 'SEXO', key: 'sexo', width: 10 },
    { header: 'EDAD', key: 'edad', width: 10 },
    { header: 'CODIGO', key: 'codigo', width: 16 },
    { header: 'TIPO_ATENCION', key: 'tipoAtencion', width: 20 },
    { header: 'FECHA_ATENCION', key: 'fechaAtencion', width: 18 },
  ];
  hoja.getRow(1).font = { bold: true };
  hoja.addRow(['M', 34, 'E11.9', 'consulta', '2026-01-15']);
  hoja.addRow(['F', 67, 'I10', 'emergencia', '2026-01-16']);

  hoja.dataValidations.add('A2:A2000', {
    type: 'list',
    allowBlank: false,
    formulae: ['"M,F"'],
  });
  hoja.dataValidations.add('D2:D2000', {
    type: 'list',
    allowBlank: false,
    formulae: ['"consulta,emergencia,hospitalizacion"'],
  });

  const buffer = await libro.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

router.use(requireAuth, requirePermiso('imports.run'));

router.get(
  '/plantilla',
  asyncHandler(async (_req, res) => {
    const buffer = await generarPlantillaImportacion();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename="plantilla-registros.xlsx"');
    res.send(buffer);
  })
);

router.post(
  '/registros',
  subida.single('archivo'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError('Debes adjuntar un archivo Excel o CSV', 400, 'ARCHIVO_REQUERIDO');

    const filas = await leerFilas(req.file.buffer, req.file.originalname);
    if (filas.length < 2) throw new AppError('El archivo no contiene datos', 400, 'ARCHIVO_VACIO');
    if (filas.length - 1 > MAX_FILAS) {
      throw new AppError(
        `El archivo supera el máximo de ${MAX_FILAS} filas por carga`,
        400,
        'ARCHIVO_MUY_GRANDE'
      );
    }

    const indices = mapearEncabezados(filas[0], ALIAS);
    const columnasRequeridas = ['sexo', 'edad', 'codigo', 'tipoAtencion', 'fechaAtencion'];
    const faltantes = columnasRequeridas.filter((campo) => indices[campo] === undefined);
    if (faltantes.length) {
      throw new AppError(
        `Faltan columnas obligatorias: ${faltantes.join(', ')}. Descarga la plantilla para ver el formato esperado.`,
        400,
        'COLUMNAS_FALTANTES'
      );
    }

    const errores = [];
    const validas = [];
    const codigosEnArchivo = new Set();

    for (const fila of filas.slice(1)) {
      const datos = {
        sexo: normalizarSexo(fila.valores[indices.sexo]),
        edad: fila.valores[indices.edad],
        codigo: String(fila.valores[indices.codigo] ?? '').trim().toUpperCase(),
        tipoAtencion: normalizarTipoAtencion(fila.valores[indices.tipoAtencion]),
        fechaAtencion: fechaDesdeCelda(fila.valores[indices.fechaAtencion]),
      };

      const resultado = importFilaSchema.safeParse(datos);
      if (!resultado.success) {
        const mensaje = resultado.error.issues.map((issue) => issue.message).join('; ');
        errores.push({ fila: fila.numero, mensaje });
        continue;
      }

      validas.push({ fila: fila.numero, datos: resultado.data });
      codigosEnArchivo.add(resultado.data.codigo);
    }

    let codigosExistentes = new Set();
    if (codigosEnArchivo.size) {
      const encontrados = await Cie10.find({
        codigo: { $in: [...codigosEnArchivo] },
        activo: true,
      })
        .select('codigo descripcion')
        .lean();
      codigosExistentes = new Map(encontrados.map((item) => [item.codigo, item.descripcion]));
    }

    const documentos = [];
    for (const { fila, datos } of validas) {
      const descripcion = codigosExistentes.get(datos.codigo);
      if (!descripcion) {
        errores.push({ fila, mensaje: `El código CIE-10 "${datos.codigo}" no existe en el catálogo` });
        continue;
      }

      const calculo = calcularSemanaEpidemiologica(datos.fechaAtencion);
      documentos.push({
        sexo: datos.sexo,
        edad: datos.edad,
        grupoEtario: calcularGrupoEtario(datos.edad),
        cie10: { codigo: datos.codigo, descripcion },
        tipoAtencion: datos.tipoAtencion,
        fechaAtencion: datos.fechaAtencion,
        semanaEpidemiologica: calculo.semanaEpidemiologica,
        anioEpidemiologico: calculo.anioEpidemiologico,
        anio: calculo.anio,
        mes: calculo.mes,
        creadoPor: req.usuario._id,
      });
    }

    let insertadas = 0;
    if (documentos.length) {
      const creados = await RegistroEpidemiologico.insertMany(documentos, { ordered: false });
      insertadas = creados.length;
    }

    const resumen = {
      procesadas: filas.length - 1,
      validas: validas.length,
      insertadas,
      errores: errores.slice(0, 300),
      erroresTotales: errores.length,
    };

    await registrarAuditoria({
      req,
      accion: 'importar',
      entidad: 'importacion',
      despues: { archivo: req.file.originalname, ...resumen, errores: resumen.erroresTotales },
    });

    res.json({ resumen });
  })
);

export default router;
