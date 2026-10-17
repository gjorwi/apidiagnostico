import { conectarDB, desconectarDB } from '../config/db.js';
import { RegistroEpidemiologico } from '../models/RegistroEpidemiologico.js';
import { generarRegistrosDemo, PASSWORD_DEMO } from '../services/seedDemo.js';
import { env } from '../config/env.js';

async function ejecutar() {
  await conectarDB();

  const existentes = await RegistroEpidemiologico.estimatedDocumentCount();
  if (existentes > 0) {
    console.log(`Ya existen ${existentes} registros; se omitió la generación demo.`);
    await desconectarDB();
    return;
  }

  const cantidad = Number(process.argv[2]) || 400;
  const resultado = await generarRegistrosDemo(cantidad);

  console.log('Datos demo generados:');
  console.log(`  Registros: ${resultado.registros}`);
  console.log(`  Admin:      ${env.adminEmail} / ${env.adminPassword}`);
  console.log(`  Digitador:  digitador@diagnosticos.local / ${PASSWORD_DEMO}`);
  console.log(`  Analista:   analista@diagnosticos.local / ${PASSWORD_DEMO}`);
  console.log(`  Supervisor: supervisor@diagnosticos.local / ${PASSWORD_DEMO}`);

  await desconectarDB();
}

ejecutar().catch(async (error) => {
  console.error('Error en seedDemo:', error.message);
  await desconectarDB().catch(() => {});
  process.exit(1);
});
