import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { conectarDB, desconectarDB } from '../config/db.js';
import { importarCie10DesdeBuffer } from '../services/cie10Import.js';
import { sembrarCie10Demo } from '../services/cie10Demo.js';

const RAIZ_REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

async function existe(ruta) {
  try {
    await access(ruta);
    return true;
  } catch {
    return false;
  }
}

async function resolverArchivo(archivo) {
  const candidatos = [
    path.resolve(process.cwd(), archivo),
    path.resolve(RAIZ_REPO, archivo),
  ];
  for (const candidato of candidatos) {
    if (await existe(candidato)) return candidato;
  }
  return candidatos[0];
}

async function ejecutar() {
  const argumentos = process.argv.slice(2);
  const limpiar = argumentos.some((arg) => arg === '--limpiar' || arg === '--reset');
  const archivo = argumentos.find((arg) => !arg.startsWith('--'));

  await conectarDB();

  if (archivo) {
    const ruta = await resolverArchivo(archivo);
    const buffer = await readFile(ruta);
    const resultado = await importarCie10DesdeBuffer(buffer, ruta, { reemplazar: limpiar });
    console.log(
      `${limpiar ? 'Catálogo vaciado y ' : ''}importadas ${resultado.importadas} de ${resultado.procesadas} filas.`
    );
    if (resultado.reporte) {
      const { guionesSuaves, descripcionesCorregidas, tildesCorregidas, espaciosSobrantes } =
        resultado.reporte;
      console.log(
        `Correcciones: ${guionesSuaves.length} guiones suaves, ${descripcionesCorregidas.length} descripciones reconstruidas, ` +
          `${tildesCorregidas.length} tildes, ${espaciosSobrantes.length} con espacios sobrantes.`
      );
    }
    if (resultado.errores?.length) {
      console.log(`Errores (${resultado.errores.length}):`);
      resultado.errores.slice(0, 20).forEach((error) => {
        console.log(`  Fila ${error.fila}: ${error.mensaje}`);
      });
    }
  } else {
    const resultado = await sembrarCie10Demo();
    console.log(
      `Catálogo demo: ${resultado.insertados} insertados, ${resultado.actualizados} actualizados (${resultado.total} códigos).`
    );
    console.log(
      'Para importar el catálogo oficial desde cero: npm run seed:cie10:oficial'
    );
  }

  await desconectarDB();
}

ejecutar().catch(async (error) => {
  console.error('Error en seedCie10:', error.message);
  await desconectarDB().catch(() => {});
  process.exit(1);
});
