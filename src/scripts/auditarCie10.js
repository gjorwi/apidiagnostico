import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditarCie10 } from '../services/cie10Catalogo.js';

const RAIZ_REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

async function ejecutar() {
  const argumento = process.argv[2] || 'docs/codes.json';
  const ruta = path.isAbsolute(argumento) ? argumento : path.resolve(RAIZ_REPO, argumento);
  const datos = JSON.parse(await readFile(ruta, 'utf8'));
  const reporte = auditarCie10(datos);

  console.log(`Archivo: ${ruta}`);
  console.log(`Nodos: ${reporte.total}`);
  console.log('');
  console.log(`Guiones suaves (U+00AD): ${reporte.guionesSuaves.length}`);
  reporte.guionesSuaves.forEach((codigo) => console.log(`  ${codigo}`));
  console.log('');
  console.log(`Descripciones reconstruidas: ${reporte.descripcionesCorregidas.length}`);
  reporte.descripcionesCorregidas.forEach((item) =>
    console.log(`  ${item.codigo}\n    antes:  ${item.original}\n    ahora:  ${item.corregida}`)
  );
  console.log('');
  console.log(`Tildes corregidas: ${reporte.tildesCorregidas.length}`);
  reporte.tildesCorregidas.forEach((item) =>
    console.log(`  ${item.codigo}\n    antes:  ${item.original}\n    ahora:  ${item.corregida}`)
  );
  console.log('');
  console.log(`Espacios sobrantes en descripciones: ${reporte.espaciosSobrantes.length} (${reporte.espaciosSobrantes.join(', ')})`);
  console.log(`Códigos normalizados (espacios/guiones): ${reporte.codigosNormalizados.length} (${reporte.codigosNormalizados.join(', ')})`);
  console.log(`Referencias padre huérfanas: ${reporte.referenciasHuerfanas.length}`);
}

ejecutar().catch((error) => {
  console.error('Error al auditar el catálogo:', error.message);
  process.exit(1);
});
