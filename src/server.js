import { crearApp } from './app.js';
import { conectarDB } from './config/db.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { User } from './models/User.js';
import { Cie10 } from './models/Cie10.js';
import { RegistroEpidemiologico } from './models/RegistroEpidemiologico.js';
import { generarRegistrosDemo } from './services/seedDemo.js';

async function asegurarAdminInicial() {
  const existentes = await User.estimatedDocumentCount();
  if (existentes > 0) return;
  const passwordHash = await User.hashPassword(env.adminPassword);
  await User.create({
    nombre: 'Administrador',
    email: env.adminEmail,
    passwordHash,
    rol: 'admin',
  });
  logger.info(`Usuario admin creado: ${env.adminEmail}`);
}

async function sembrarDemoSiCorresponde() {
  if (!env.useMemoryDb || !env.seedDemo) return;
  const registros = await RegistroEpidemiologico.estimatedDocumentCount();
  if (registros > 0) return;
  const resultado = await generarRegistrosDemo(400);
  logger.info(
    `Demo en memoria generada: ${resultado.registros} registros. Acceso: ${env.adminEmail} / ${env.adminPassword}`
  );
}

async function avisarCatalogoVacio() {
  const total = await Cie10.estimatedDocumentCount();
  if (total === 0) {
    logger.warn(
      'Catálogo CIE-10 vacío. Ejecuta "npm run seed:cie10" (demo) o importa el archivo oficial en Admin → Catálogo CIE-10.'
    );
  }
}

async function iniciar() {
  await conectarDB();
  await asegurarAdminInicial();
  await sembrarDemoSiCorresponde();
  await avisarCatalogoVacio();
  const app = crearApp();
  app.listen(env.port, () => {
    logger.info(`API escuchando en http://localhost:${env.port}`);
  });
}

iniciar().catch((error) => {
  logger.error({ err: error }, 'No se pudo iniciar la API');
  process.exit(1);
});
