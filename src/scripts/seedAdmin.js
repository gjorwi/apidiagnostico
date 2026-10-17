import { conectarDB, desconectarDB } from '../config/db.js';
import { env } from '../config/env.js';
import { User } from '../models/User.js';

async function ejecutar() {
  await conectarDB();
  const existente = await User.findOne({ email: env.adminEmail.toLowerCase() });

  if (existente) {
    if (!existente.activo || existente.rol !== 'admin') {
      existente.activo = true;
      existente.rol = 'admin';
      await existente.save();
      console.log(`Admin reactivado: ${env.adminEmail}`);
    } else {
      console.log(`El admin ya existe: ${env.adminEmail}`);
    }
  } else {
    const passwordHash = await User.hashPassword(env.adminPassword);
    await User.create({
      nombre: 'Administrador',
      email: env.adminEmail.toLowerCase(),
      passwordHash,
      rol: 'admin',
    });
    console.log(`Admin creado: ${env.adminEmail}`);
  }

  await desconectarDB();
}

ejecutar().catch(async (error) => {
  console.error('Error en seedAdmin:', error.message);
  await desconectarDB().catch(() => {});
  process.exit(1);
});
