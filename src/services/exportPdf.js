import PDFDocument from 'pdfkit';

const MARGEN = 24;
const ALTO_FILA = 14;
const ALTO_ENCABEZADO = 26;

function clave(sexo, grupo) {
  return `${sexo}|${grupo}`;
}

export function generarEpi13Pdf(matriz) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: MARGEN,
      bufferPages: true,
      info: { Title: matriz.titulo || 'EPI13' },
    });

    const trozos = [];
    doc.on('data', (t) => trozos.push(t));
    doc.on('end', () => resolve(Buffer.concat(trozos)));
    doc.on('error', reject);

    const anchoUtil = doc.page.width - MARGEN * 2;
    const anchoCodigo = 52;
    const anchoEnfermedad = Math.max(150, anchoUtil * 0.3);
    const anchoTotal = 44;
    const columnasNumericas = Math.max(1, matriz.grupos.length * 2);
    const anchoGrupo = Math.max(
      14,
      (anchoUtil - anchoCodigo - anchoEnfermedad - anchoTotal) / columnasNumericas
    );
    const xGrupos = MARGEN + anchoCodigo + anchoEnfermedad;
    const limiteInferior = doc.page.height - MARGEN - 22;

    let y = MARGEN;

    const siguienteLinea = (alto) => {
      y += alto;
    };

    const dibujarTitulo = () => {
      doc.font('Helvetica-Bold').fontSize(13);
      doc.text(matriz.titulo || 'EPI13 - Enfermedades de notificación obligatoria', MARGEN, y, {
        width: anchoUtil,
        align: 'center',
      });
      siguienteLinea(16);

      doc.font('Helvetica-Oblique').fontSize(8);
      doc.text(`Filtros: ${matriz.descripcionFiltros || 'Sin filtros'}`, MARGEN, y, {
        width: anchoUtil,
        align: 'center',
      });
      siguienteLinea(11);

      doc.font('Helvetica').fontSize(8);
      const fecha = new Date(matriz.generadoEn || Date.now()).toLocaleString('es-CL');
      doc.text(
        `Generado: ${fecha}  ·  Total de casos: ${matriz.totales.total}  ·  M: ${matriz.totales.totalM}  ·  F: ${matriz.totales.totalF}`,
        MARGEN,
        y,
        { width: anchoUtil, align: 'center' }
      );
      siguienteLinea(14);
    };

    const dibujarEncabezadoTabla = () => {
      const yInicio = y;
      doc.rect(MARGEN, yInicio, anchoUtil, ALTO_ENCABEZADO).fillAndStroke('#e2e8f0', '#94a3b8');

      doc.font('Helvetica-Bold').fontSize(7);
      doc.text('Código', MARGEN + 2, yInicio + 9, { width: anchoCodigo - 4 });
      doc.text('Enfermedad (CIE-10)', MARGEN + anchoCodigo + 2, yInicio + 9, {
        width: anchoEnfermedad - 4,
      });

      matriz.grupos.forEach((grupo, indice) => {
        const x = xGrupos + indice * anchoGrupo * 2;
        doc.rect(x, yInicio, anchoGrupo * 2, ALTO_ENCABEZADO).stroke('#94a3b8');
        doc.font('Helvetica-Bold').fontSize(6.5);
        doc.text(grupo, x, yInicio + 3, { width: anchoGrupo * 2, align: 'center' });
        doc.text('M', x, yInicio + 14, { width: anchoGrupo, align: 'center' });
        doc.text('F', x + anchoGrupo, yInicio + 14, { width: anchoGrupo, align: 'center' });
      });

      const xTotal = xGrupos + matriz.grupos.length * anchoGrupo * 2;
      doc.rect(xTotal, yInicio, anchoTotal, ALTO_ENCABEZADO).stroke('#94a3b8');
      doc.font('Helvetica-Bold').fontSize(7);
      doc.text('Total', xTotal, yInicio + 9, { width: anchoTotal, align: 'center' });

      y = yInicio + ALTO_ENCABEZADO;
    };

    const dibujarFila = (fila, opciones = {}) => {
      const yInicio = y;
      if (opciones.total) {
        doc.rect(MARGEN, yInicio, anchoUtil, ALTO_FILA).fillAndStroke('#fde68a', '#94a3b8');
      } else if (fila.enLista === false) {
        doc.rect(MARGEN, yInicio, anchoUtil, ALTO_FILA).fillAndStroke('#f8fafc', '#cbd5e1');
      } else {
        doc.rect(MARGEN, yInicio, anchoUtil, ALTO_FILA).stroke('#cbd5e1');
      }

      doc.font(opciones.total ? 'Helvetica-Bold' : 'Helvetica').fontSize(7);
      doc.text(fila.codigo || '', MARGEN + 2, yInicio + 3.5, { width: anchoCodigo - 4 });
      doc.text(fila.descripcion || '', MARGEN + anchoCodigo + 2, yInicio + 3.5, {
        width: anchoEnfermedad - 4,
        lineBreak: false,
        ellipsis: true,
      });

      matriz.grupos.forEach((grupo, indice) => {
        const x = xGrupos + indice * anchoGrupo * 2;
        doc.rect(x, yInicio, anchoGrupo * 2, ALTO_FILA).stroke('#cbd5e1');
        const valorM = fila.celdas?.[clave('M', grupo)] || 0;
        const valorF = fila.celdas?.[clave('F', grupo)] || 0;
        doc.text(String(valorM), x, yInicio + 3.5, { width: anchoGrupo, align: 'center' });
        doc.text(String(valorF), x + anchoGrupo, yInicio + 3.5, {
          width: anchoGrupo,
          align: 'center',
        });
      });

      const xTotal = xGrupos + matriz.grupos.length * anchoGrupo * 2;
      doc.rect(xTotal, yInicio, anchoTotal, ALTO_FILA).stroke('#cbd5e1');
      doc.font('Helvetica-Bold').text(String(fila.total), xTotal, yInicio + 3.5, {
        width: anchoTotal,
        align: 'center',
      });

      y = yInicio + ALTO_FILA;
    };

    const verificarEspacio = (alto) => {
      if (y + alto > limiteInferior) {
        doc.addPage();
        y = MARGEN;
        dibujarEncabezadoTabla();
      }
    };

    dibujarTitulo();
    dibujarEncabezadoTabla();

    for (const fila of matriz.filas) {
      verificarEspacio(ALTO_FILA);
      dibujarFila(fila);
    }

    verificarEspacio(ALTO_FILA);
    dibujarFila(
      {
        codigo: '',
        descripcion: 'TOTAL',
        celdas: matriz.totales.celdas,
        total: matriz.totales.total,
      },
      { total: true }
    );

    const rango = doc.bufferedPageRange();
    for (let i = rango.start; i < rango.start + rango.count; i += 1) {
      doc.switchToPage(i);
      doc.font('Helvetica').fontSize(7);
      doc.text(`Página ${i - rango.start + 1} de ${rango.count}`, MARGEN, doc.page.height - MARGEN - 8, {
        width: anchoUtil,
        align: 'right',
      });
    }

    doc.end();
  });
}
