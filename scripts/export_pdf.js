// Funcion para exportar graficos a PDF (ahora también para casos.html con datos numéricos)
async function exportChartsToPDF(containerSelector, chartsSelector, anio, statsData = null) {
    const { jsPDF } = window.jspdf; 
    const chartsContainer = document.querySelector(containerSelector); 
    const charts = chartsContainer.querySelectorAll(chartsSelector); 

    if (!chartsContainer || charts.length === 0) {
        console.error("No se encontraron gráficos o el contenedor para exportar.");
        alert("No se encontraron gráficos para exportar.");
        return;
    }

    const pdf = new jsPDF({ 
        orientation: 'landscape',
        unit: 'mm', 
        format: 'a4' 
    });

    const headerHeight = 40; 
    const footerHeight = 20; 
    const margin = 10; 
    const pageWidth = pdf.internal.pageSize.getWidth(); 
    const pageHeight = pdf.internal.pageSize.getHeight(); 
    const contentWidth = pageWidth - 2 * margin; 
    const contentHeight = pageHeight - headerHeight - footerHeight - 2 * margin; 

    // Función para agregar encabezado
    function addHeader(doc, year) { // Cambiado el nombre del parámetro pdf a doc para evitar confusión
        const imgGDC = '../../../img/GDCSF.png'; // Ruta del logo GDC
        const imgGOB = '../../../img/GOBIERNO.png'; // Ruta del logo GOBIERNO
        const titulo = `REPORTE DE CASOS ${anio}`; // Título del reporte

        pdf.addImage(imgGDC, 'PNG', margin, margin, 30, 15); // Agregar logo GDC
        pdf.addImage(imgGOB, 'PNG', pageWidth - margin - 30, margin, 30, 15); // Agregar logo GOBIERNO

        pdf.setFontSize(16); // Tamaño de la fuente del título
        pdf.setFont('helvetica', 'bold'); // Estilo de la fuente del título
        const textWidth = pdf.getStringUnitWidth(titulo) * pdf.getFontSize() / pdf.internal.scaleFactor; // Ancho del título
        pdf.text(titulo, (pageWidth - textWidth) / 2, margin + 10); // Centrar título
    }

    // Función para agregar pie de página
    function addFooter(pdf, pageNum, totalPages) {
        pdf.setFontSize(10); // Tamaño de la fuente del pie de página
        pdf.setFont('helvetica', 'normal'); // Estilo de la fuente del pie de página
        const footerText = `Página ${pageNum} de ${totalPages}`; // Texto del pie de página
        const textWidth = pdf.getStringUnitWidth(footerText) * pdf.getFontSize() / pdf.internal.scaleFactor; // Ancho del texto
        pdf.text(footerText, (pageWidth - textWidth) / 2, pageHeight - margin - 5); // Centrar texto del pie de página
    }

    let chartCount = 0; 
    let currentPageNum = 1;
    const totalPages = statsData ? Math.ceil(charts.length / 2) + 1 : Math.ceil(charts.length / 2);

    // --- PÁGINA 1 (o más, para gráficos) ---
    addHeader(pdf, anio); 
    addFooter(pdf, currentPageNum, totalPages);

    for (let i = 0; i < charts.length; i++) {
        const chartElement = charts[i]; 
        // Asegurarse de que el gráfico sea visible antes de capturarlo
        chartElement.style.display = 'block'; 

        try {
            const canvas = await html2canvas(chartElement, { // Capturar gráfico como canvas
                scale: 2, // Escala de la captura
                logging: true, // Habilitar logs para depuración
                useCORS: true, // Permitir CORS si las imágenes son de otro dominio
                backgroundColor: '#ffffff' // Fondo blanco para evitar transparencias
            });

            const imgData = canvas.toDataURL('image/png'); // Convertir canvas a imagen PNG
            let imgWidth = contentWidth / 2 - margin / 2; // Ancho de la imagen (dos gráficos por fila)
            let imgHeight = (canvas.height * imgWidth) / canvas.width; // Alto de la imagen manteniendo proporción

            // Ajustar tamaño si la imagen es muy alta
            if (imgHeight > contentHeight) {
                imgHeight = contentHeight;
                imgWidth = (canvas.width * imgHeight) / canvas.height; // Ajustar ancho manteniendo proporción
            }

            let x, y; // Coordenadas x, y para posicionar la imagen

            // Posicionar el primer gráfico en la página
            if (chartCount % 2 === 0) {
                x = margin; // Posición x para el primer gráfico
                y = headerHeight + margin; // Posición y
            } else { // Posicionar el segundo gráfico en la página
                x = margin + contentWidth / 2 + margin / 2; // Posición x para el segundo gráfico
                y = headerHeight + margin; // Posición y
            }

            pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight); // Agregar imagen al PDF
            chartCount++; // Incrementar contador de gráficos

            // Agregar nueva página después de cada dos gráficos, excepto para el último par
            if (chartCount % 2 === 0 && i < charts.length - 1) {
                pdf.addPage(); 
                currentPageNum++; 
                addHeader(pdf, anio); 
                addFooter(pdf, currentPageNum, totalPages); 
            }
        } catch (error) {
            console.error(`Error al capturar el gráfico ${i + 1}:`, error); 
            alert(`Error al capturar el gráfico ${chartElement.id || i + 1}. Es posible que el gráfico no sea visible o esté vacío.`);
        } finally {
            // Restaurar la visualización original si es necesario (opcional)
            // chartElement.style.display = ''; // O el valor original
        }
    }

    // --- PÁGINA ADICIONAL PARA ESTADÍSTICAS (si se proporcionan) ---
    if (statsData && statsData.length > 0) {
        pdf.addPage();
        currentPageNum++;
        addHeader(pdf, anio);
        addFooter(pdf, currentPageNum, totalPages);

        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        // Usar un título genérico o uno específico si se pasa en statsData
        const titleFromData = statsData.find(s => s.isTitle === true);
        const statsTitle = titleFromData ? titleFromData.label : "Resumen de Casos";
        pdf.text(statsTitle, margin, headerHeight + margin);

        const tableColumnStyles = {
            0: { cellWidth: 60 }, // Ancho para la columna "Categoría"
            1: { cellWidth: 'auto', halign: 'right' }, // Ancho automático para "Cantidad" y alineado a la derecha
        };
        
        const tableBody = statsData.filter(s => !s.isTitle).map(stat => [stat.label, stat.value]);

        pdf.autoTable({
            startY: headerHeight + margin + 10,
            head: [['Categoría', 'Cantidad']],
            body: tableBody,
            theme: 'grid', // 'striped', 'grid', 'plain'
            styles: { fontSize: 10, cellPadding: 2 },
            headStyles: { fillColor: [22, 160, 133], fontSize: 11, fontStyle: 'bold' }, // Color para encabezado
            columnStyles: tableColumnStyles,
            margin: { left: margin, right: margin }
        });
    }

    // Guardar el PDF
    const filename = containerSelector.includes('tempChartsContainer') ? `reporte_casos_filtrados_${anio}.pdf` : `reporte_home_${anio}.pdf`; // Corregido el nombre para home
    pdf.save(filename);
}

// Exportar la función para que esté disponible globalmente
window.exportChartsToPDF = exportChartsToPDF;


async function exportHomeDataToPDF(containerSelector, chartsSelector, statsData, anio) {
    const { jsPDF } = window.jspdf;
    const chartsContainer = document.querySelector(containerSelector);
    const charts = chartsContainer.querySelectorAll(chartsSelector);

    if (!chartsContainer || charts.length === 0) {
        console.error("No se encontraron gráficos o el contenedor para exportar.");
        alert("No se encontraron gráficos para exportar.");
        return;
    }

    const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    const headerHeight = 40;
    const footerHeight = 20;
    const margin = 10;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const contentWidth = pageWidth - 2 * margin;
    const contentHeight = pageHeight - headerHeight - footerHeight - 2 * margin;

    function addHeader(doc, year) {
        const imgGDC = '../../../img/GDCSF.png';
        const imgGOB = '../../../img/GOBIERNO.png';
        const titulo = `REPORTE DE CASOS ${year}`;
        doc.addImage(imgGDC, 'PNG', margin, margin, 30, 15);
        doc.addImage(imgGOB, 'PNG', pageWidth - margin - 30, margin, 30, 15);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        const textWidth = doc.getStringUnitWidth(titulo) * doc.getFontSize() / doc.internal.scaleFactor;
        doc.text(titulo, (pageWidth - textWidth) / 2, margin + 10);
    }

    function addFooter(doc, pageNum, totalPages) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const footerText = `Página ${pageNum} de ${totalPages}`;
        const textWidth = doc.getStringUnitWidth(footerText) * doc.getFontSize() / doc.internal.scaleFactor;
        doc.text(footerText, (pageWidth - textWidth) / 2, pageHeight - margin - 5);
    }

    // --- PÁGINA 1: GRÁFICOS ---
    addHeader(pdf, anio);
    addFooter(pdf, 1, 2); // Asumimos 2 páginas por ahora

    let chartCount = 0;
    for (let i = 0; i < charts.length; i++) {
        const chartElement = charts[i];
        chartElement.style.display = 'block';

        try {
            const canvas = await html2canvas(chartElement, {
                scale: 2,
                logging: true,
                useCORS: true,
                backgroundColor: '#ffffff',
                imageTimeout: 0, // Para evitar timeouts con imágenes grandes o lentas
                willReadFrequently: true // Para la advertencia de la consola
            });
            const imgData = canvas.toDataURL('image/png');
            let imgWidth = contentWidth / 2 - margin / 2;
            let imgHeight = (canvas.height * imgWidth) / canvas.width;
            if (imgHeight > contentHeight) {
                imgHeight = contentHeight;
                imgWidth = (canvas.width * imgHeight) / canvas.height;
            }
            let x = (chartCount % 2 === 0) ? margin : margin + contentWidth / 2 + margin / 2;
            let y = headerHeight + margin;
            pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
            chartCount++;
        } catch (error) {
            console.error(`Error al capturar el gráfico ${i + 1}:`, error);
            alert(`Error al capturar el gráfico ${chartElement.id || i + 1}.`);
        }
    }

    // --- PÁGINA 2: ESTADÍSTICAS NUMÉRICAS ---
    pdf.addPage();
    addHeader(pdf, anio);
    addFooter(pdf, 2, 2);

    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text("Resumen de Estadísticas de Casos", margin, headerHeight + margin); // Título general

    if (statsData) {
        const tableColumnStyles = {
            0: { cellWidth: 60 }, // Ancho para la columna "Categoría"
            1: { cellWidth: 'auto', halign: 'right' }, // Ancho automático para "Cantidad" y alineado a la derecha
        };
        const tableBody = statsData.map(stat => [stat.label, stat.value]); // Asume que statsData ya está formateado como [{label: '...', value: '...'}, ...]

        pdf.autoTable({
            startY: headerHeight + margin + 10,
            head: [['Categoría', 'Cantidad']],
            body: tableBody,
            theme: 'grid',
            styles: { fontSize: 10, cellPadding: 2 },
            headStyles: { fillColor: [22, 160, 133], fontSize: 11, fontStyle: 'bold' },
            columnStyles: tableColumnStyles,
            margin: { left: margin, right: margin }
        });
    } else {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        pdf.text("No se pudieron cargar los datos de las estadísticas.", margin + 10, headerHeight + margin + 20);
    }
    
    pdf.save(`reporte_home_${anio}.pdf`);
}

window.exportHomeDataToPDF = exportHomeDataToPDF;