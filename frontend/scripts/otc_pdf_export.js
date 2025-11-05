import { showLoader, hideLoader } from './loader.js';
import { circuitosParroquias } from './home/select_populator.js';
import { getApiBaseUrlAsync } from './config.js';

async function exportOtcToPdf() {
    showLoader();
    await new Promise(resolve => setTimeout(resolve, 0));

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'l', // 'l' para landscape (horizontal)
            unit: 'mm',
            format: 'a4'
        });

        const API_BASE_URL = await getApiBaseUrlAsync();
        const caseStats = await fetch(`${API_BASE_URL}/casos/stats/consejo-comunal`).then(res => res.json());
        const caseCounts = caseStats.reduce((map, item) => {
            const key = item._id || item.consejo_comunal;
            if (key) {
                map[key.trim().toLowerCase()] = item.count;
            }
            return map;
        }, {});

        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 10;
        let y = 0;
        let currentPageNum = 1;

        function addHeader(doc) {
            const imgGDC_url = '../../../img/GDCSF.png';
            const imgGOB_url = '../../../img/GOBIERNO.png';
            const titulo = `ORGANIZACIÓN TERRITORIAL DE CARACAS`;

            doc.addImage(imgGDC_url, 'PNG', margin, margin, 30, 15);
            doc.addImage(imgGOB_url, 'PNG', pageWidth - margin - 30, margin, 30, 15);

            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            const textWidth = doc.getStringUnitWidth(titulo) * doc.getFontSize() / doc.internal.scaleFactor;
            doc.text(titulo, (pageWidth - textWidth) / 2, margin + 10);
            y = margin + 30; // Reset y position after header
        }

        function addFooter(doc, pageNum) {
            const pageHeight = doc.internal.pageSize.getHeight();
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            const footerText = `Página ${pageNum}`;
            const textWidth = doc.getStringUnitWidth(footerText) * doc.getFontSize() / doc.internal.scaleFactor;
            doc.text(footerText, (pageWidth - textWidth) / 2, pageHeight - margin);
        }

        addHeader(doc);
        addFooter(doc, currentPageNum);

        const checkY = (requiredHeight) => {
            if (y + requiredHeight > doc.internal.pageSize.getHeight() - margin - 10) {
                doc.addPage();
                currentPageNum++;
                addHeader(doc);
                addFooter(doc, currentPageNum);
            }
        };

        const circuitos = Object.keys(circuitosParroquias);

        for (const circuito of circuitos) {
            checkY(12);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(`${circuito}`, margin, y);
            y += 8;

            const parroquias = circuitosParroquias[circuito];
            for (const parroquia of parroquias) {
                let parroquiaCaseCount = 0;
                const comunas = await fetch(`${API_BASE_URL}/comunas/parroquia/${parroquia}`).then(res => res.json());

                for (const comuna of comunas) {
                    let comunaCaseCount = 0;
                    for (const consejo of comuna.consejos_comunales) {
                        comunaCaseCount += caseCounts[consejo.nombre.trim().toLowerCase()] || 0;
                    }
                    parroquiaCaseCount += comunaCaseCount;
                }

                checkY(10);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bolditalic');
                doc.text(`Parroquia ${parroquia} (${parroquiaCaseCount} ${parroquiaCaseCount === 1 ? 'caso' : 'casos'})`, margin + 6, y);
                y += 7;

                for (const comuna of comunas) {
                    let comunaCaseCount = 0;
                    for (const consejo of comuna.consejos_comunales) {
                        comunaCaseCount += caseCounts[consejo.nombre.trim().toLowerCase()] || 0;
                    }

                    checkY(8);
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'italic');
                    doc.text(`Comuna ${comuna.nombre} (${comunaCaseCount} ${comunaCaseCount === 1 ? 'caso' : 'casos'})`, margin + 12, y);
                    y += 6;

                    const countXPosition = pageWidth - margin - 30; // Posición X fija para los recuentos

                    for (const consejo of comuna.consejos_comunales) {
                        checkY(6);
                        const count = caseCounts[consejo.nombre.trim().toLowerCase()] || 0;
                        const countText = `(${count} ${count === 1 ? 'caso' : 'casos'})`;
                        
                        doc.setFontSize(8);
                        doc.setFont('helvetica', 'normal');
                        
                        // Dibujar el nombre del consejo comunal
                        doc.text(`-Consejo Comunal ${consejo.nombre}`, margin + 18, y);
                        
                        // Dibujar el recuento de casos en la posición X fija
                        doc.text(countText, countXPosition, y, { align: 'right' });
                        
                        y += 4;
                    }
                }
            }
        }

        doc.save('organizacion_territorial_casos.pdf');
    } catch (error) {
        console.error("Error al generar el PDF de OTC:", error);
        alert("Ocurrió un error al generar el PDF: " + error.message);
    } finally {
        hideLoader();
    }
}

const exportOtcPdfBtn = document.getElementById('export-otc-pdf');
if (exportOtcPdfBtn) {
    exportOtcPdfBtn.addEventListener('click', exportOtcToPdf);
}

async function exportNoTocadasToPdf() {
    showLoader();
    await new Promise(resolve => setTimeout(resolve, 0));

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'l', // 'l' para landscape (horizontal)
            unit: 'mm',
            format: 'a4'
        });

        const API_BASE_URL = await getApiBaseUrlAsync();
        const comunasNoTocadas = await fetch(`${API_BASE_URL}/comunas/stats/no-contactadas`).then(res => res.json());

        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 10;
        let y = 0;
        let currentPageNum = 1;

        function addHeader(doc) {
            const imgGDC_url = '../../../img/GDCSF.png';
            const imgGOB_url = '../../../img/GOBIERNO.png';
            const titulo = `COMUNIDADES NO ABORDADAS`;

            doc.addImage(imgGDC_url, 'PNG', margin, margin, 30, 15);
            doc.addImage(imgGOB_url, 'PNG', pageWidth - margin - 30, margin, 30, 15);

            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            const textWidth = doc.getStringUnitWidth(titulo) * doc.getFontSize() / doc.internal.scaleFactor;
            doc.text(titulo, (pageWidth - textWidth) / 2, margin + 10);
            y = margin + 30; // Reset y position after header
        }

        function addFooter(doc, pageNum) {
            const pageHeight = doc.internal.pageSize.getHeight();
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            const footerText = `Página ${pageNum}`;
            const textWidth = doc.getStringUnitWidth(footerText) * doc.getFontSize() / doc.internal.scaleFactor;
            doc.text(footerText, (pageWidth - textWidth) / 2, pageHeight - margin);
        }

        addHeader(doc);
        addFooter(doc, currentPageNum);

        const checkY = (requiredHeight) => {
            if (y + requiredHeight > doc.internal.pageSize.getHeight() - margin - 10) {
                doc.addPage();
                currentPageNum++;
                addHeader(doc);
                addFooter(doc, currentPageNum);
            }
        };

        const tableColumn = ["Parroquia", "Comuna", "Consejo Comunal"];
        const tableRows = [];

        comunasNoTocadas.forEach(comuna => {
            if (comuna.consejos_comunales && comuna.consejos_comunales.length > 0) {
                comuna.consejos_comunales.forEach(consejo => {
                    const rowData = [
                        comuna.parroquia,
                        comuna.nombre,
                        consejo.nombre
                    ];
                    tableRows.push(rowData);
                });
            } else {
                // Si una comuna no tiene consejos comunales, aún se puede listar
                const rowData = [
                    comuna.parroquia,
                    comuna.nombre,
                    "N/A" // No hay consejo comunal
                ];
                tableRows.push(rowData);
            }
        });

        doc.autoTable(tableColumn, tableRows, { startY: y });

        // Añadir contador
        const finalY = doc.lastAutoTable.finalY;
        doc.setFontSize(12);
        doc.text(`Total de Consejos Comunales no abordados: ${tableRows.length}`, margin, finalY + 10);

        doc.save('comunidades_no_abordadas.pdf');
    } catch (error) {
        console.error("Error al generar el PDF de comunidades no abordadas:", error);
        alert("Ocurrió un error al generar el PDF: " + error.message);
    } finally {
        hideLoader();
    }
}

const exportNoTocadasPdfBtn = document.getElementById('export-no-tocadas-pdf');
if (exportNoTocadasPdfBtn) {
    exportNoTocadasPdfBtn.addEventListener('click', exportNoTocadasToPdf);
}