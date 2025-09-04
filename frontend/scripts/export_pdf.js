/**
 * @file scripts/export_pdf.js
 * @description Contiene funciones para exportar contenido HTML (gráficos y tablas de estadísticas) a un archivo PDF.
 * Utiliza las librerías jsPDF y html2canvas.
 * Se exponen dos funciones principales a `window` para ser llamadas desde otros scripts:
 * `exportChartsToPDF`: Función más genérica, originalmente pensada para gráficos, pero adaptada para incluir datos tabulares.
 * `exportHomeDataToPDF`: Una función más específica para la página de inicio, que estructura el PDF con gráficos y una tabla de resumen.
 */

import { showLoader, hideLoader } from './loader.js'; // Para mostrar/ocultar el loader global

/**
 * Exporta gráficos y opcionalmente datos estadísticos a un archivo PDF.
 * Esta función es más genérica y puede ser utilizada por diferentes páginas (home, casos).
 * 
 * @async
 * @param {string} containerSelector - Selector CSS para el contenedor de los gráficos.
 * @param {string} chartsSelector - Selector CSS para los elementos canvas de los gráficos dentro del contenedor.
 * @param {number} anio - El año para incluir en el título del reporte.
 * @param {Array<Object>} [statsData=null] - Array opcional de objetos con datos estadísticos para incluir en una tabla y sección de porcentajes.
 *                                          Cada objeto debe tener `label` y `value`. Un objeto puede tener `isTitle: true` para un título de sección.
 */
async function exportChartsToPDF(containerSelector, chartsSelector, anio, statsData = null) {
    // Desestructura jsPDF del objeto window.jspdf (asumiendo que la librería jsPDF está cargada globalmente).
    const { jsPDF } = window.jspdf; 
    // Selecciona el contenedor principal de los gráficos.
    const chartsContainer = document.querySelector(containerSelector); 
    // Selecciona todos los elementos canvas de los gráficos dentro del contenedor.
    const charts = chartsContainer ? chartsContainer.querySelectorAll(chartsSelector) : []; 

    // Si no se encuentra el contenedor o no hay gráficos, muestra un error y termina.
    if (!chartsContainer || charts.length === 0) {
        console.error("No se encontraron gráficos o el contenedor especificado para exportar a PDF.");
        alert("Error: No se encontraron gráficos o el contenedor para exportar.");
        return;
    }

    // Crea una nueva instancia de jsPDF.
    // Configuración: orientación horizontal (landscape), unidades en milímetros (mm), formato A4.
    const pdf = new jsPDF({ 
        orientation: 'landscape',
        unit: 'mm', 
        format: 'a4' 
    });

    // Definición de constantes para el layout del PDF.
    const headerHeight = 40; // Altura reservada para el encabezado.
    const footerHeight = 20; // Altura reservada para el pie de página.
    const margin = 10;       // Margen general de la página.
    const pageWidth = pdf.internal.pageSize.getWidth(); // Ancho total de la página.
    const pageHeight = pdf.internal.pageSize.getHeight(); // Alto total de la página.
    // Ancho y alto disponibles para el contenido (descontando márgenes, encabezado y pie).
    const contentWidth = pageWidth - 2 * margin; 
    const contentHeight = pageHeight - headerHeight - footerHeight - 2 * margin; 

    /**
     * Agrega un encabezado estándar a una página del PDF.
     * Incluye logos y un título con el año.
     * @param {jsPDF} doc - La instancia del documento jsPDF.
     * @param {number} year - El año para mostrar en el título.
     */
    function addHeader(doc, year) { 
        const imgGDC_url = '../../../img/GDCSF.png'; // Ruta al logo GDC.
        const imgGOB_url = '../../../img/GOBIERNO.png'; // Ruta al logo GOBIERNO.
        const titulo = `REPORTE DE CASOS ${year}`; // Título del reporte.

        doc.addImage(imgGDC_url, 'PNG', margin, margin, 30, 15); // Añade logo GDC.
        doc.addImage(imgGOB_url, 'PNG', pageWidth - margin - 30, margin, 30, 15); // Añade logo GOBIERNO.

        doc.setFontSize(16); // Establece tamaño de fuente para el título.
        doc.setFont('helvetica', 'bold'); // Establece estilo de fuente.
        // Calcula el ancho del texto del título para centrarlo.
        const textWidth = doc.getStringUnitWidth(titulo) * doc.getFontSize() / doc.internal.scaleFactor; 
        doc.text(titulo, (pageWidth - textWidth) / 2, margin + 10); // Añade el título centrado.
    }

    /**
     * Agrega un pie de página estándar a una página del PDF.
     * Muestra el número de página actual y el total de páginas.
     * @param {jsPDF} doc - La instancia del documento jsPDF.
     * @param {number} pageNum - El número de la página actual.
     * @param {number} totalPages - El número total de páginas del documento.
     */
    function addFooter(doc, pageNum, totalPages) {
        doc.setFontSize(10); // Tamaño de fuente para el pie de página.
        doc.setFont('helvetica', 'normal'); // Estilo de fuente.
        const footerText = `Página ${pageNum} de ${totalPages}`; // Texto del pie de página.
        const textWidth = doc.getStringUnitWidth(footerText) * doc.getFontSize() / doc.internal.scaleFactor; // Ancho del texto.
        doc.text(footerText, (pageWidth - textWidth) / 2, pageHeight - margin - 5); // Añade el texto centrado.
    }

    let chartCount = 0; // Contador de gráficos procesados.
    let currentPageNum = 1; // Número de página actual.
    // Calcula el número total de páginas. Si hay `statsData`, se añade una página extra para la tabla y porcentajes.
    // Se asume que caben 2 gráficos por página.
    const totalPages = statsData ? Math.ceil(charts.length / 2) + 1 : Math.ceil(charts.length / 2);

    // --- PROCESAMIENTO DE GRÁFICOS ---
    // Añade encabezado y pie a la primera página (o única página de gráficos).
    addHeader(pdf, anio); 
    addFooter(pdf, currentPageNum, totalPages);

    // Itera sobre cada elemento de gráfico encontrado.
    for (let i = 0; i < charts.length; i++) {
        const chartElement = charts[i]; // Elemento canvas del gráfico.
        // Asegura que el gráfico sea visible (display: block) antes de intentar capturarlo con html2canvas.
        // Esto es importante si los gráficos están en contenedores que podrían estar ocultos (ej. tabs).
        chartElement.style.display = 'block'; 

        try {
            // Captura el elemento del gráfico como una imagen usando html2canvas.
            const canvas = await html2canvas(chartElement, { 
                scale: 2, // Aumenta la escala de la captura para mejor resolución en el PDF.
                logging: true, // Habilita logs de html2canvas para depuración.
                useCORS: true, // Permite cargar imágenes de otros dominios si el gráfico las usa.
                backgroundColor: '#ffffff' // Establece un fondo blanco para evitar transparencias problemáticas.
            });

            const imgData = canvas.toDataURL('image/png'); // Convierte el canvas capturado a una imagen PNG en formato base64.
            
            // Calcula las dimensiones de la imagen en el PDF, intentando poner dos gráficos por fila.
            let imgWidth = contentWidth / 2 - margin / 2; // Ancho para cada imagen (considerando un pequeño margen entre ellas).
            let imgHeight = (canvas.height * imgWidth) / canvas.width; // Alto manteniendo la proporción original.

            // Si la altura calculada excede el espacio disponible, la reajusta y recalcula el ancho.
            if (imgHeight > contentHeight) {
                imgHeight = contentHeight;
                imgWidth = (canvas.width * imgHeight) / canvas.height; 
            }

            let x, y; // Coordenadas para posicionar la imagen en el PDF.

            // Determina la posición X e Y.
            // Si es el primer gráfico de un par (0, 2, 4...), se coloca a la izquierda.
            // Si es el segundo gráfico de un par (1, 3, 5...), se coloca a la derecha.
            if (chartCount % 2 === 0) { // Gráfico par (0, 2, ...)
                x = margin; 
                y = headerHeight + margin; 
            } else { // Gráfico impar (1, 3, ...)
                x = margin + contentWidth / 2 + margin / 2; 
                y = headerHeight + margin; 
            }

            pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight); // Añade la imagen del gráfico al PDF.
            chartCount++; // Incrementa el contador de gráficos procesados.

            // Si se han añadido dos gráficos y aún quedan más por procesar, crea una nueva página.
            if (chartCount % 2 === 0 && i < charts.length - 1) {
                pdf.addPage(); 
                currentPageNum++; 
                addHeader(pdf, anio); // Añade encabezado a la nueva página.
                addFooter(pdf, currentPageNum, totalPages); // Añade pie de página.
            }
        } catch (error) { // Manejo de errores durante la captura de un gráfico.
            console.error(`Error al capturar el gráfico ${i + 1} (ID: ${chartElement.id}):`, error); 
            alert(`Error al capturar el gráfico ${chartElement.id || i + 1}. Asegúrese de que el gráfico es visible y no está vacío.`);
        } finally {
            // Opcional: Restaurar el estilo de display original del elemento del gráfico si se modificó.
            // chartElement.style.display = ''; // O el valor que tuviera antes.
        }
    }

    // --- PÁGINA ADICIONAL PARA DATOS ESTADÍSTICOS (SI SE PROPORCIONAN) ---
    if (statsData && statsData.length > 0) {
        pdf.addPage(); // Añade una nueva página para las estadísticas.
        currentPageNum++;
        addHeader(pdf, anio); // Encabezado.
        addFooter(pdf, currentPageNum, totalPages); // Pie de página.

        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        // Busca un título específico en statsData o usa uno genérico.
        const titleFromData = statsData.find(s => s.isTitle === true);
        const statsTitle = titleFromData ? titleFromData.label : "Resumen de Casos";
        pdf.text(statsTitle, margin, headerHeight + margin); // Escribe el título de la sección de estadísticas.

        // Define estilos para las columnas de la tabla de estadísticas.
        const tableColumnStyles = {
            0: { cellWidth: 60 }, // Ancho para la columna "Categoría".
            1: { cellWidth: 'auto', halign: 'right' }, // Ancho automático y alineación derecha para "Cantidad".
        };
        
        // Prepara el cuerpo de la tabla, filtrando los elementos que no son títulos.
        const tableBody = statsData.filter(s => !s.isTitle).map(stat => [stat.label, stat.value]);

        // Usa jsPDF-AutoTable para generar la tabla de estadísticas.
        pdf.autoTable({
            startY: headerHeight + margin + 10, // Posición Y donde comienza la tabla.
            head: [['Categoría', 'Cantidad']], // Encabezados de la tabla.
            body: tableBody, // Datos de la tabla.
            theme: 'grid', // Tema visual para la tabla ('striped', 'grid', 'plain').
            styles: { fontSize: 10, cellPadding: 2 }, // Estilos generales para las celdas.
            headStyles: { fillColor: [22, 160, 133], fontSize: 11, fontStyle: 'bold' }, // Estilos para el encabezado de la tabla.
            columnStyles: tableColumnStyles, // Estilos específicos por columna.
            margin: { left: margin, right: margin } // Márgenes de la tabla.
        });

        // --- SECCIÓN DE PORCENTAJES (DEBAJO DE LA TABLA DE ESTADÍSTICAS) ---
        let finalY = pdf.lastAutoTable.finalY || (headerHeight + margin + 10); // Obtiene la posición Y después de la tabla.
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text("Distribución Porcentual de Casos:", margin, finalY + 10); // Título para la sección de porcentajes.

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        let currentY = finalY + 10 + 7; // Posición Y inicial para la lista de porcentajes.

        // Calcula el total de casos para los porcentajes.
        // Si `statsData` incluye "Casos Mostrados" (típico de `casos.html` filtrados), usa ese valor.
        // De lo contrario (típico de `home.html`), suma los valores de los estados individuales.
        let totalCasos = 0;
        const casosMostradosStat = statsData.find(stat => stat.label === "Casos Mostrados (Filtrados)");
        if (casosMostradosStat) {
            totalCasos = parseInt(casosMostradosStat.value, 10) || 0;
        } else {
            statsData.forEach(stat => {
                // Suma solo si el valor es numérico y la etiqueta parece ser un contador de estado.
                if (!isNaN(parseInt(stat.value, 10)) && 
                    (stat.label.startsWith("Casos ") || ["OBRA EN PROYECCION", "OBRA EN EJECUCION", "OBRA EJECUTADA", "OBRA CULMINADA"].some(s => stat.label.includes(s)))) {
                    if (stat.label !== "Casos Mostrados") { // Evita doble conteo si "Casos Mostrados" estuviera presente y no se capturó antes.
                        totalCasos += parseInt(stat.value, 10);
                    }
                }
            });
        }
        
        // Estados relevantes para los cuales se calcularán y mostrarán porcentajes.
        const estadosRelevantes = ["OBRA EN PROYECCION", "OBRA EN EJECUCION", "OBRA EJECUTADA", "OBRA CULMINADA"];

        if (totalCasos > 0) { // Procede solo si hay un total de casos válido.
            statsData.forEach(stat => {
                // Verifica si la etiqueta del `stat` actual corresponde a un estado relevante.
                const estadoEncontrado = estadosRelevantes.find(er => stat.label.includes(er));
                if (estadoEncontrado) {
                    const count = parseInt(stat.value, 10);
                    if (!isNaN(count) && count >= 0) { // Asegura que el conteo sea un número válido.
                        const percentage = ((count / totalCasos) * 100).toFixed(1); // Calcula el porcentaje.
                        // Formatea la etiqueta para mostrar (ej. "OBRA EN PROYECCION" en lugar de "Casos OBRA EN PROYECCION").
                        const displayLabel = stat.label.startsWith("Casos ") ? stat.label.substring(6) : stat.label;
                        pdf.text(`- ${displayLabel}: ${percentage}% (${count})`, margin + 5, currentY); // Añade la línea al PDF.
                        currentY += 7; // Incrementa la posición Y para la siguiente línea.
                        // Control de salto de página si el contenido excede el espacio disponible.
                        if (currentY > pageHeight - footerHeight - margin - 10) { 
                            pdf.addPage();
                            currentPageNum++;
                            addHeader(pdf, anio);
                            addFooter(pdf, currentPageNum, totalPages);
                            currentY = headerHeight + margin; // Resetea Y para la nueva página.
                        }
                    }
                }
            });
        } else { // Si no hay datos para calcular porcentajes.
            pdf.text("No hay datos suficientes para calcular porcentajes.", margin + 5, currentY);
        }
    } 

    // GUARDAR EL PDF
    // Determina el nombre del archivo PDF basado en si es un reporte de filtros o de la página de inicio.
    let filename;
    if (containerSelector.includes('tempChartsContainer')) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;
        filename = `reporte_Casos_filtrados_${formattedDate}.pdf`;
    } else {
        filename = `reporte_home_${anio}.pdf`;
    }
    pdf.save(filename); // Guarda el archivo PDF.
}

// Exporta la función `exportChartsToPDF` al objeto `window` para que esté disponible globalmente.
// Esto es útil si se llama desde HTML (onclick) o desde otros scripts que no importan este módulo directamente.
window.exportChartsToPDF = exportChartsToPDF;


/**
 * Exporta los datos de la página de inicio (gráficos y estadísticas de contadores) a un archivo PDF.
 * Esta función es una especialización de `exportChartsToPDF` o una alternativa con una estructura de reporte específica para `home.html`.
 * 
 * @async
 * @param {string} containerSelector - Selector CSS para el contenedor de los gráficos en `home.html`.
 * @param {string} chartsSelector - Selector CSS para los elementos canvas de los gráficos dentro del contenedor.
 * @param {Array<Object>} statsData - Array de objetos con los datos de los contadores (ej. Casos OBRA EN PROYECCION, etc.).
 * @param {number} anio - El año para incluir en el título del reporte.
 */
async function exportHomeDataToPDF(containerSelector, chartsSelector, statsData, anio) {
    showLoader(); // Mostrar el loader al iniciar la función
    await new Promise(resolve => setTimeout(resolve, 0)); // Permitir que el navegador repinte para mostrar el loader
    try {
        const { jsPDF } = window.jspdf; // Accede a jsPDF.
        const chartsContainer = document.querySelector(containerSelector); // Contenedor de gráficos.
        const charts = chartsContainer ? chartsContainer.querySelectorAll(chartsSelector) : []; // Elementos canvas.

        if (!chartsContainer || charts.length === 0) { // Validación.
            console.error("No se encontraron gráficos o el contenedor para exportar en la página de inicio.");
            alert("No se encontraron gráficos para exportar.");
            hideLoader(); // Ocultar loader si no hay gráficos
            return;
        }

        // Creación del documento PDF (landscape, A4, mm).
    const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    // Definiciones de layout (márgenes, alturas de encabezado/pie).
    const headerHeight = 40;
    const footerHeight = 20;
    const margin = 10;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    let currentPageNum = 0; // Contador de páginas.

    // Función interna para agregar encabezado (redefinida aquí, podría ser global).
    function addHeader(doc, year) {
        const imgGDC_url = '../../../img/GDCSF.png';
        const imgGOB_url = '../../../img/GOBIERNO.png';
        const titulo = `REPORTE DE CASOS ${year}`;
        doc.addImage(imgGDC_url, 'PNG', margin, margin, 30, 15);
        doc.addImage(imgGOB_url, 'PNG', pageWidth - margin - 30, margin, 30, 15);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        const textWidth = doc.getStringUnitWidth(titulo) * doc.getFontSize() / doc.internal.scaleFactor;
        doc.text(titulo, (pageWidth - textWidth) / 2, margin + 10);
    }

    // Función interna para agregar pie de página (redefinida aquí).
    function addFooter(doc, pageNum, totalPages) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const footerText = `Página ${pageNum} de ${totalPages}`;
        const textWidth = doc.getStringUnitWidth(footerText) * doc.getFontSize() / doc.internal.scaleFactor;
        doc.text(footerText, (pageWidth - textWidth) / 2, pageHeight - margin - 5);
    }
    
    // Se asume un total de 2 páginas para este reporte específico de home: 1 para gráficos, 1 para tabla/porcentajes.
    // Esto podría necesitar ser dinámico si el contenido de la tabla de estadísticas es muy largo.
    const totalPages = 2; 

    // --- PÁGINA 1: GRÁFICOS DE LA PÁGINA DE INICIO ---
    currentPageNum++;
    addHeader(pdf, anio);
    addFooter(pdf, currentPageNum, totalPages);

    let chartCount = 0; // Contador de gráficos en la página actual.
    const contentWidthCharts = pageWidth - 2 * margin; // Ancho disponible para los gráficos.
    const contentHeightCharts = pageHeight - headerHeight - footerHeight - 2 * margin; // Alto disponible.

    // Itera sobre los gráficos para capturarlos y añadirlos al PDF.
    for (let i = 0; i < charts.length; i++) {
        const chartElement = charts[i];
        chartElement.style.display = 'block'; // Asegura visibilidad.

        try {
            // Captura con html2canvas.
            const canvas = await html2canvas(chartElement, {
                scale: 2, // Buena resolución.
                logging: true,
                useCORS: true,
                backgroundColor: '#ffffff',
                imageTimeout: 0, // Intenta evitar timeouts con imágenes externas (si las hubiera).
                willReadFrequently: true // Optimización para lectura frecuente del canvas.
            });
            const imgData = canvas.toDataURL('image/png'); // Imagen en base64.
            // Calcula dimensiones y posición para dos gráficos por fila.
            let imgWidth = contentWidthCharts / 2 - margin / 2;
            let imgHeight = (canvas.height * imgWidth) / canvas.width;
            if (imgHeight > contentHeightCharts) { // Ajusta si es muy alto.
                imgHeight = contentHeightCharts;
                imgWidth = (canvas.width * imgHeight) / canvas.height;
            }
            let x = (chartCount % 2 === 0) ? margin : margin + contentWidthCharts / 2 + margin / 2;
            let y = headerHeight + margin;
            pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
            chartCount++;
            // No se espera que haya más de 2 gráficos en la home, así que no se añade lógica de paginación aquí.
        } catch (error) {
            console.error(`Error al capturar el gráfico de inicio ${i + 1}:`, error);
            alert(`Error al capturar el gráfico ${chartElement.id || i + 1}.`);
        }
    }

    // --- PÁGINA 2: TABLA DE ESTADÍSTICAS NUMÉRICAS Y PORCENTAJES DE LA PÁGINA DE INICIO ---
    pdf.addPage(); // Nueva página.
    currentPageNum++;
    addHeader(pdf, anio); // Encabezado.
    addFooter(pdf, currentPageNum, totalPages); // Pie de página.

    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text("Resumen de Estadísticas de Casos", margin, headerHeight + margin); // Título de la sección.

    let finalY = headerHeight + margin; // Posición Y inicial para la tabla.

    // Si se proporcionaron datos de estadísticas (contadores de la home).
    if (statsData && statsData.length > 0) {
        // Estilos para la tabla de estadísticas.
        const tableColumnStyles = {
            0: { cellWidth: 60 }, // Columna "Categoría".
            1: { cellWidth: 'auto', halign: 'right' }, // Columna "Cantidad".
        };

        // Extraer valores numéricos de statsData y calcular "Casos por Iniciar" ANTES de definir tableBody
        const getValue = (label) => parseInt(statsData.find(s => s.label === label)?.value, 10) || 0;

        const casosCargados = getValue("Casos OBRA EN PROYECCION");
        const casosSupervisados = getValue("Casos OBRA EN EJECUCION");
        const casosEnDesarrollo = getValue("Casos OBRA EJECUTADA");
        const casosEntregados = getValue("Casos OBRA CULMINADA");

        let casosPorIniciar = casosCargados - (casosSupervisados + casosEnDesarrollo + casosEntregados);
        if (casosPorIniciar < 0) {
            console.warn("Cálculo de 'Casos por Iniciar' resultó negativo. Ajustando a 0. Revise los contadores de origen.");
            casosPorIniciar = 0;
        }

        const statsDataForTable = [
            { label: "Casos OBRA EN PROYECCION", value: casosCargados.toString() },
            { label: "Casos por Iniciar", value: casosPorIniciar.toString() },
            { label: "Casos OBRA EN EJECUCION", value: casosSupervisados.toString() },
            { label: "Casos OBRA EJECUTADA", value: casosEnDesarrollo.toString() },
            { label: "Casos OBRA CULMINADA", value: casosEntregados.toString() }
        ];
        
        // Prepara el cuerpo de la tabla (usando statsDataForTable que incluye "Casos por Iniciar").
        const tableBody = statsDataForTable.map(stat => [stat.label, stat.value]);

        // Genera la tabla con jsPDF-AutoTable.
        pdf.autoTable({
            startY: finalY + 10, // Posición Y de inicio.
            head: [['Categoría', 'Cantidad']],
            body: tableBody,
            theme: 'grid',
            styles: { fontSize: 10, cellPadding: 2 },
            headStyles: { fillColor: [22, 160, 133], fontSize: 11, fontStyle: 'bold' },
            columnStyles: tableColumnStyles,
            margin: { left: margin, right: margin }
        });
        finalY = pdf.lastAutoTable.finalY; // Actualiza la posición Y después de la tabla.

        // --- Sección de Porcentajes (específica para los datos de la home) ---
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text("Distribución Porcentual de Casos (respecto al Total General):", margin, finalY + 10);

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        let currentY = finalY + 10 + 7;

        const totalGeneral = casosCargados + casosSupervisados + casosEnDesarrollo + casosEntregados;

        const estadosParaPorcentaje = [
            { label: "OBRA EN PROYECCION", count: casosCargados },
            { label: "OBRA EN EJECUCION", count: casosSupervisados },
            { label: "OBRA EJECUTADA", count: casosEnDesarrollo },
            { label: "OBRA CULMINADA", count: casosEntregados }
        ];

        if (totalGeneral > 0) {
            estadosParaPorcentaje.forEach(stat => {
                const percentage = ((stat.count / totalGeneral) * 100).toFixed(1);
                pdf.text(`- ${stat.label}: ${percentage}% (${stat.count})`, margin + 5, currentY);
                currentY += 7;
                if (currentY > pageHeight - footerHeight - margin - 10) {
                    pdf.addPage();
                    currentPageNum++;
                    addHeader(pdf, anio);
                    addFooter(pdf, currentPageNum, totalPages);
                    currentY = headerHeight + margin;
                }
            });
        } else {
            pdf.text("No hay casos para calcular porcentajes.", margin + 5, currentY);
        }

    } else { // Si no se proporcionaron `statsData`.
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        pdf.text("No se pudieron cargar los datos de las estadísticas.", margin, finalY + 15);
    }
    
    // Guarda el PDF con un nombre específico para el reporte de la página de inicio.
    pdf.save(`reporte_home_${anio}.pdf`);
    } catch (error) {
        console.error("Error general durante la exportación del PDF para Home:", error);
        alert("Ocurrió un error al generar el PDF: " + error.message);
        // hideLoader() se llamará en el finally, así que no es necesario aquí a menos que haya un return temprano.
    } finally {
        hideLoader(); // Asegurarse de que el loader se oculte siempre
    }
}

// Exporta la función `exportHomeDataToPDF` al objeto `window` para disponibilidad global.
import { circuitosParroquias } from './home/select_populator.js';
import { getApiBaseUrlAsync } from './config.js';

window.exportHomeDataToPDF = exportHomeDataToPDF;

// Nueva función para exportar los datos de OTC a PDF
async function exportOtcToPdf() {
    showLoader();
    await new Promise(resolve => setTimeout(resolve, 0));

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
        });

        const API_BASE_URL = await getApiBaseUrlAsync();
        const caseStats = await fetch(`${API_BASE_URL}/casos/stats/consejo-comunal`).then(res => res.json());
        const caseCounts = caseStats.reduce((map, item) => {
            map[item.consejo_comunal] = item.count;
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
            doc.text(`Circuito ${circuito}`, margin, y);
            y += 8;

            const parroquias = circuitosParroquias[circuito];
            for (const parroquia of parroquias) {
                checkY(10);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bolditalic');
                doc.text(parroquia, margin + 6, y);
                y += 7;

                const comunas = await fetch(`${API_BASE_URL}/comunas/parroquia/${parroquia}`).then(res => res.json());
                for (const comuna of comunas) {
                    checkY(8);
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'italic');
                    doc.text(comuna.nombre, margin + 12, y);
                    y += 6;

                    for (const consejo of comuna.consejos_comunales) {
                        checkY(6);
                        const count = caseCounts[consejo.nombre] || 0;
                        doc.setFontSize(8);
                        doc.setFont('helvetica', 'normal');
                        doc.text(`- ${consejo.nombre} (${count} ${count === 1 ? 'caso' : 'casos'})`, margin + 18, y);
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