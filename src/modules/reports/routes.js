import { Router } from 'express';
import { reporteEpi13QuerySchema, reporteEpi14QuerySchema } from '@diag/shared';
import { asyncHandler } from '../../middleware/errors.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermiso } from '../../middleware/permisos.js';
import { validar } from '../../middleware/validate.js';
import { registrarAuditoria } from '../../services/audit.js';
import { obtenerSettingsEpi13 } from '../../services/settings.js';
import { generarEpi13, generarEpi14, generarResumen } from '../../services/reports.js';
import {
  generarEpi13Excel,
  generarEpi14Excel,
  obtenerPreviewEpi14,
} from '../../services/exportExcel.js';
import { generarEpi13Pdf } from '../../services/exportPdf.js';

const router = Router();

router.use(requireAuth);

router.get(
  '/epi13',
  requirePermiso('reports.view'),
  validar(reporteEpi13QuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const settings = await obtenerSettingsEpi13();
    const matriz = await generarEpi13(req.query, settings);
    res.json({ reporte: matriz });
  })
);

router.get(
  '/resumen',
  requirePermiso('reports.view'),
  asyncHandler(async (_req, res) => {
    res.json({ resumen: await generarResumen() });
  })
);

router.get(
  '/epi14',
  requirePermiso('reports.view'),
  validar(reporteEpi14QuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const datos = await generarEpi14(req.query.fecha);
    res.json({ reporte: await obtenerPreviewEpi14(datos) });
  })
);

router.get(
  '/epi14/export',
  requirePermiso('reports.export'),
  validar(reporteEpi14QuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const datos = await generarEpi14(req.query.fecha);
    const buffer = await generarEpi14Excel(datos);
    const fecha = new Date().toISOString().slice(0, 10);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="epi14-${fecha}.xlsx"`);
    res.send(buffer);

    await registrarAuditoria({
      req,
      accion: 'exportar',
      entidad: 'reporte',
      despues: { reporte: 'epi14', fecha: req.query.fecha, semana: datos.semana },
    });
  })
);

router.get(
  '/export',
  requirePermiso('reports.export'),
  validar(reporteEpi13QuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const formato = req.query.formato === 'pdf' ? 'pdf' : 'xlsx';
    const settings = await obtenerSettingsEpi13();
    const matriz = await generarEpi13(req.query, settings);
    const fecha = new Date().toISOString().slice(0, 10);

    if (formato === 'pdf') {
      const buffer = await generarEpi13Pdf(matriz);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="epi13-${fecha}.pdf"`);
      res.send(buffer);
    } else {
      const buffer = await generarEpi13Excel(matriz);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', `attachment; filename="epi13-${fecha}.xlsx"`);
      res.send(buffer);
    }

    await registrarAuditoria({
      req,
      accion: 'exportar',
      entidad: 'reporte',
      despues: { formato, filtros: req.query },
    });
  })
);

export default router;
