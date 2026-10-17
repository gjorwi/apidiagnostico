import mongoose from 'mongoose';
import { env } from './env.js';

let memoryServer = null;

const OPCIONES_CONEXION = {
  serverSelectionTimeoutMS: 15000,
  connectTimeoutMS: 15000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
};

function esAtlas(uri) {
  return uri.startsWith('mongodb+srv://') || uri.includes('mongodb.net');
}

async function conectarConReintentos(uri, opciones, intentos = 3) {
  let ultimoError;
  for (let intento = 1; intento <= intentos; intento += 1) {
    try {
      await mongoose.connect(uri, opciones);
      return;
    } catch (error) {
      ultimoError = error;
      if (intento < intentos) {
        const espera = intento * 2000;
        console.warn(
          `[db] Intento ${intento} fallido (${error.message}). Reintentando en ${espera} ms…`
        );
        await new Promise((resolve) => setTimeout(resolve, espera));
      }
    }
  }
  throw ultimoError;
}

export async function conectarDB() {
  let uri = env.mongoUri;

  if (env.useMemoryDb) {
    if (env.nodeEnv === 'production') {
      console.warn('[db] USE_MEMORY_DB=true en producción: los datos se perderán al reiniciar.');
    }
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create({ instance: { dbName: 'diagnosticos' } });
    uri = memoryServer.getUri('diagnosticos');
    console.log('[db] MongoDB en memoria iniciada (solo desarrollo)');
  }

  const opciones = { ...OPCIONES_CONEXION };
  if (env.mongoDbName) opciones.dbName = env.mongoDbName;

  const esLocal = /mongodb:\/\/(127\.0\.0\.1|localhost)/.test(uri);
  const intentos = env.useMemoryDb || esLocal ? 1 : 3;

  try {
    await conectarConReintentos(uri, opciones, intentos);
  } catch (error) {
    const pista =
      !env.useMemoryDb && !esLocal
        ? ' Revisa MONGO_URI (MongoDB Atlas) y que la IP del servidor esté en Network Access.'
        : '';
    throw new Error(`No se pudo conectar a MongoDB.${pista} Detalle: ${error.message}`);
  }

  console.log(
    `[db] Conectado a MongoDB: ${mongoose.connection.name}${esAtlas(uri) ? ' (Atlas)' : ''}`
  );
  return mongoose.connection;
}

export async function desconectarDB() {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}
