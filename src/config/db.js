import mongoose from 'mongoose';
import { env } from './env.js';

let memoryServer = null;

export async function conectarDB() {
  let uri = env.mongoUri;
  if (env.useMemoryDb) {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create({ instance: { dbName: 'diagnosticos' } });
    uri = memoryServer.getUri('diagnosticos');
    console.log('[db] MongoDB en memoria iniciada (solo desarrollo)');
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  console.log(`[db] Conectado a MongoDB: ${mongoose.connection.name}`);
  return mongoose.connection;
}

export async function desconectarDB() {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}
