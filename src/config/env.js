import 'dotenv/config';

const aBooleano = (valor, porDefecto = false) => {
  if (valor === undefined || valor === null || valor === '') return porDefecto;
  return String(valor).toLowerCase() === 'true';
};

const aLista = (valor) =>
  String(valor || '')
    .split(',')
    .map((elemento) => elemento.trim())
    .filter(Boolean);

const MONGO_URI_POR_DEFECTO = 'mongodb://127.0.0.1:27017/diagnosticos';

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  // Acepta MONGO_URI o MONGODB_URI (alias habitual en plataformas como Render).
  mongoUri: process.env.MONGO_URI || process.env.MONGODB_URI || MONGO_URI_POR_DEFECTO,
  mongoDbName: process.env.MONGO_DB_NAME || '',
  useMemoryDb: aBooleano(process.env.USE_MEMORY_DB),
  seedDemo: aBooleano(process.env.SEED_DEMO, true),
  jwtSecret: process.env.JWT_SECRET || 'secreto-acceso-desarrollo-cambiar',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'secreto-refresh-desarrollo-cambiar',
  accesoMinutos: Number(process.env.ACCESO_MINUTOS || 15),
  refreshDias: Number(process.env.REFRESH_DIAS || 7),
  webOrigins: aLista(
    process.env.WEB_ORIGINS || process.env.WEB_ORIGIN || 'http://localhost:3000'
  ),
  cookiesSeguras: aBooleano(process.env.COOKIES_SEGURAS, process.env.NODE_ENV === 'production'),
  adminEmail: process.env.ADMIN_EMAIL || 'admin@diagnosticos.local',
  adminPassword: process.env.ADMIN_PASSWORD || 'Admin1234',
};

export const esProduccion = env.nodeEnv === 'production';
