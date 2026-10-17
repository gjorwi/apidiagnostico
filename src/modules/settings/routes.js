import { Router } from 'express';
import { settingsEpi13Schema, ordenarGrupos } from '@diag/shared';
import { asyncHandler } from '../../middleware/errors.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermiso } from '../../middleware/permisos.js';
import { validar } from '../../middleware/validate.js';
import { registrarAuditoria } from '../../services/audit.js';
import { obtenerSettingsEpi13, guardarSettingsEpi13 } from '../../services/settings.js';

const router = Router();

router.use(requireAuth);

router.get(
  '/epi13',
  asyncHandler(async (_req, res) => {
    res.json({ settings: await obtenerSettingsEpi13() });
  })
);

router.put(
  '/epi13',
  requirePermiso('settings.manage'),
  validar(settingsEpi13Schema),
  asyncHandler(async (req, res) => {
    const antes = await obtenerSettingsEpi13();
    const valor = {
      ...req.body,
      gruposEtarios: ordenarGrupos(req.body.gruposEtarios),
    };
    const settings = await guardarSettingsEpi13(valor);
    await registrarAuditoria({
      req,
      accion: 'actualizar',
      entidad: 'configuracion',
      entidadId: 'epi13',
      antes,
      despues: settings,
    });
    res.json({ settings });
  })
);

export default router;
