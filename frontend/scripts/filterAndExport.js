// scripts/filterAndExport.js

/**
 * @file scripts/filterAndExport.js
 * @description Este script maneja la lógica de filtrado de la tabla de casos
 * y la exportación de datos a formatos PDF (gráficos y tabla de resumen) y Excel (tabla completa).
 * Interactúa con `caseTableManager.js` para obtener los datos y repoblar la tabla filtrada.
 */

// Importaciones de módulos y funciones necesarias.
import { showLoader, hideLoader } from './loader.js'; // Para mostrar/ocultar el loader.
import { getCasosData, populateTable } from './caseTableManager.js'; // Para obtener datos de casos y repoblar tabla.
import { showNotification, generateAlphanumericId } from './utils.js'; // Para notificaciones y IDs legibles.
import { getApiBaseUrlAsync } from './config.js'; // Importar getApiBaseUrlAsync

/**
 * Aplica un filtro a las filas de la tabla de casos basándose en el campo y valor seleccionados.
 * Actualiza la visibilidad de las filas y el estado del botón de exportar PDF de casos filtrados.
 * Esta función opera directamente sobre el DOM de la tabla renderizada.
 * @export
 */
export function applyFilter() {
    // Obtiene los elementos del DOM para los controles de filtro y el botón de exportar PDF.
    const filterFieldSelect = document.getElementById('filterField'); // Select para elegir el campo a filtrar.
    const filterValueInput = document.getElementById('filterValue');   // Input para el valor del filtro.
    const exportPdfCasosBtn = document.getElementById('export-pdf-casos'); // Botón para exportar PDF de casos filtrados.

    // Si algún elemento esencial no se encuentra, muestra una advertencia y termina.
    if (!filterFieldSelect || !filterValueInput || !exportPdfCasosBtn) {
        console.warn("Elementos del DOM para filtrar o exportar no fueron encontrados. La función de filtro no se ejecutará completamente.");
        return;
    }
    showLoader(); // Muestra el indicador de carga.
    try {
        const selectedField = filterFieldSelect.value; // Campo seleccionado para filtrar (ej. 'parroquia', 'id').
        const filterValue = filterValueInput.value.toLowerCase().trim(); // Valor del filtro, en minúsculas y sin espacios extra.
        const tableRows = document.querySelectorAll('#casosTable tbody tr'); // Todas las filas del cuerpo de la tabla.

        // Si el valor del filtro está vacío, muestra todas las filas y deshabilita el botón de exportar PDF.
        if (filterValue === '') {
            tableRows.forEach(row => {
                row.style.display = ''; // Muestra la fila.
            });
            exportPdfCasosBtn.disabled = true; // Deshabilita el botón.
            exportPdfCasosBtn.classList.add('disabled-look'); // Añade clase para apariencia de deshabilitado.
            exportPdfCasosBtn.classList.remove('active-look'); // Quita clase de apariencia activa.
            // Originalmente se repoblaba la tabla aquí, pero es más eficiente solo mostrar/ocultar filas.
            // populateTable(getCasosData()); 
            return;
        }

        let hasVisibleRows = false; // Bandera para rastrear si alguna fila coincide con el filtro.
        // Itera sobre cada fila de la tabla.
        tableRows.forEach(row => {
            let rowMatchesFilter = false; // Bandera para esta fila específica.
            const cells = row.querySelectorAll('td'); // Todas las celdas de la fila.

            // Mapeo de los valores del `filterFieldSelect` a los índices de las columnas en la tabla.
            // Es crucial que estos índices coincidan con el orden real de las columnas en el HTML.
            const fieldColumnMapping = {
                'id': 0,            // Columna del Código CUB
                'tipo_obra': 1,     // Columna Tipo de Obra
                'parroquia': 2,     // Columna Parroquia
                'circuito': 3,      // Columna Circuito
                'eje': 4,           // Columna Eje
                'comuna': 5,        // Columna Comuna
                // 'enlaceComunal': 6, // Esta columna no está en los options del select de filtro.
                // 'actuaciones': 7,   // Esta columna no está en los options.
                'caseDate': 8,      // Columna Fecha de Inicio
                'fechaEntrega': 9,  // Columna Fecha de Entrega
                // 'archivo': 10,      // Esta columna no está en los options.
                'estado': 11        // Columna Estado de la Obra
            };

            // Si se seleccionó "Todos los campos" para filtrar:
            if (selectedField === "") {
                // Itera sobre todas las celdas de la fila.
                for (let i = 0; i < cells.length; i++) {
                    const cell = cells[i];
                    let cellText = cell.textContent.toLowerCase(); // Texto de la celda en minúsculas.

                    // Lógica especial para la columna de ID (índice 0).
                    // Busca tanto en el ID legible (CUB-XXXXX) como en el ID interno de MongoDB y la parte alfanumérica.
                    if (i === 0) { 
                        const idLink = cell.querySelector('a.case-id-link'); // El ID es un enlace.
                        if (idLink) {
                            const displayId = idLink.textContent.toLowerCase(); // ID legible.
                            const internalId = idLink.dataset.id.toLowerCase(); // ID de MongoDB (del atributo data-id).
                            const alphanumericPart = displayId.replace('cub - ', ''); // Parte alfanumérica del ID legible.
                            if (displayId.includes(filterValue) || alphanumericPart.includes(filterValue) || internalId.includes(filterValue)) {
                                rowMatchesFilter = true;
                                break; // Si hay coincidencia, no necesita seguir buscando en esta fila.
                            }
                        } else if (cellText.includes(filterValue)) { // Fallback si no es un enlace.
                            rowMatchesFilter = true;
                            break;
                        }
                    } else if (cellText.includes(filterValue)) { // Para otras celdas, busca directamente en el texto.
                        rowMatchesFilter = true;
                        break;
                    }
                }
            } else { // Si se seleccionó un campo específico para filtrar:
                const columnIndex = fieldColumnMapping[selectedField]; // Obtiene el índice de la columna.
                if (selectedField === 'month') {
                    const dateCellIndex1 = 8; // "Fecha de Inicio"
                    const dateCellIndex2 = 9; // "Fecha de Entrega"
                    const dateCells = [cells[dateCellIndex1], cells[dateCellIndex2]];

                    for (const dateCell of dateCells) {
                        if (dateCell) {
                            const dateText = dateCell.textContent.trim();
                            if (dateText && dateText !== 'N/A') {
                                const dateParts = dateText.split('/');
                                if (dateParts.length === 3) {
                                    const monthIndex = parseInt(dateParts[1], 10) - 1;
                                    const dateObj = new Date(Date.UTC(dateParts[2], monthIndex, dateParts[0]));
                                    if (!isNaN(dateObj.getTime())) {
                                        const monthName = dateObj.toLocaleString('es-ES', { month: 'long', timeZone: 'UTC' });
                                        if (monthName.toLowerCase().includes(filterValue)) {
                                            rowMatchesFilter = true;
                                            break; // Found a match, no need to check other date cell
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                else if (selectedField === 'caseDate' || selectedField === 'fechaEntrega') {
                    const dateCell = cells[columnIndex];
                    if (dateCell) {
                        const dateText = dateCell.textContent.trim();
                        if (dateText && dateText !== 'N/A') {
                            // Primero, intentar la coincidencia de texto directo (para dd/mm/yyyy)
                            if (dateText.toLowerCase().includes(filterValue)) {
                                rowMatchesFilter = true;
                            } else {
                                // Si no, intentar la coincidencia por nombre del mes
                                const dateParts = dateText.split('/');
                                if (dateParts.length === 3) {
                                    const monthIndex = parseInt(dateParts[1], 10) - 1;
                                    const dateObj = new Date(Date.UTC(dateParts[2], monthIndex, dateParts[0]));
                                    if (!isNaN(dateObj.getTime())) {
                                        const monthName = dateObj.toLocaleString('es-ES', { month: 'long', timeZone: 'UTC' });
                                        if (monthName.toLowerCase().includes(filterValue)) {
                                            rowMatchesFilter = true;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                else if (columnIndex !== undefined && cells[columnIndex]) { // Si el índice es válido y la celda existe.
                    let cellText = cells[columnIndex].textContent.toLowerCase();
                    // Lógica especial para el campo 'id' (similar a la de "Todos los campos").
                    if (selectedField === 'id') { 
                        const idLink = cells[columnIndex].querySelector('a.case-id-link');
                        if (idLink) {
                            const displayId = idLink.textContent.toLowerCase();
                            const internalId = idLink.dataset.id.toLowerCase();
                            const alphanumericPart = displayId.replace('cub - ', '');
                            if (displayId.includes(filterValue) || alphanumericPart.includes(filterValue) || internalId.includes(filterValue)) {
                                rowMatchesFilter = true;
                            }
                        } else if (cellText.includes(filterValue)) {
                            rowMatchesFilter = true;
                        }
                    } else if (cellText.includes(filterValue)) { // Para otros campos, busca en el texto.
                        rowMatchesFilter = true;
                    }
                }
            }

            // Muestra u oculta la fila según si coincide con el filtro.
            if (rowMatchesFilter) {
                row.style.display = ''; // Muestra la fila.
                hasVisibleRows = true; // Marca que al menos una fila es visible.
            } else {
                row.style.display = 'none'; // Oculta la fila.
            }
        });

        // Habilita o deshabilita el botón de exportar PDF según si hay filas visibles.
        if (hasVisibleRows) {
            exportPdfCasosBtn.disabled = false;
            exportPdfCasosBtn.classList.remove('disabled-look');
            exportPdfCasosBtn.classList.add('active-look'); // Clase para apariencia activa (verde).
        } else {
            exportPdfCasosBtn.disabled = true;
            exportPdfCasosBtn.classList.add('disabled-look');
            exportPdfCasosBtn.classList.remove('active-look');
        }

    } finally {
        hideLoader(); // Siempre oculta el indicador de carga.
    }
}

/**
 * Genera y exporta a PDF los gráficos basados en los datos actualmente filtrados en la tabla.
 * Crea gráficos de pastel y de barras en un contenedor temporal, los captura como imágenes
 * y los añade a un PDF junto con una tabla de resumen de los datos filtrados.
 * @async
 * @private
 */
async function exportFilteredChartsToPDF() {
    showLoader(); // Muestra loader.
    try {
        const tableRows = document.querySelectorAll('#casosTable tbody tr'); // Filas de la tabla.
        const filteredData = []; // Array para almacenar los datos de las filas visibles.

        // Itera sobre las filas de la tabla para extraer datos de las filas visibles.
        tableRows.forEach(row => {
            if (row.style.display !== 'none') { // Solo procesa filas visibles.
                // Extrae el estado y las fechas de las celdas correspondientes.
                // Es crucial que los índices de las celdas (row.cells[X]) sean correctos.
                const estadoCell = row.cells[12];       // Celda de "Estado de la Obra".
                const fechaInicioCell = row.cells[8];   // Celda de "Fecha de Inicio".
                const fechaEntregaCell = row.cells[9];  // Celda de "Fecha de Entrega".

                if (estadoCell && fechaInicioCell && fechaEntregaCell) {
                    // Obtiene la fecha de inicio.
                    const originalStartDate = fechaInicioCell.dataset.originalDate; 
                    const startDateForChart = originalStartDate || fechaInicioCell.textContent.trim();

                    // Obtiene la fecha de entrega.
                    const originalDeliveryDate = fechaEntregaCell.dataset.originalDate;
                    const deliveryDateForChart = originalDeliveryDate || fechaEntregaCell.textContent.trim();

                    let estadoDelCaso = "Desconocido"; // Estado por defecto.
                    const selectElement = estadoCell.querySelector('select.estado-select');

                    if (selectElement) {
                        estadoDelCaso = selectElement.value;
                    } else {
                        console.warn("No se encontró el elemento <select> en la celda de estado para la fila:", row);
                    }
                    
                    filteredData.push({
                        estado: estadoDelCaso,
                        caseDate: startDateForChart,
                        fechaEntrega: deliveryDateForChart // Añade la fecha de entrega.
                    });
                }
            }
        });

        // Si no hay datos filtrados, muestra una notificación y termina.
        if (filteredData.length === 0) {
            showNotification('No hay datos filtrados para generar gráficos y exportar a PDF.', true);
            hideLoader(); 
            return;
        }
        const anioActual = new Date().getFullYear(); // Año actual para el título del PDF.

        // Crea un contenedor temporal y oculto para renderizar los gráficos antes de capturarlos.
        // Esto evita que los gráficos se muestren momentáneamente en la página principal.
        let tempChartsContainer = document.getElementById('tempChartsContainer');
        if (tempChartsContainer) { tempChartsContainer.remove(); } // Remueve si ya existe de una ejecución anterior.

        tempChartsContainer = document.createElement('div');
        tempChartsContainer.id = 'tempChartsContainer';
        // Posiciona el contenedor fuera de la pantalla visible.
        tempChartsContainer.style.position = 'absolute';
        tempChartsContainer.style.left = '-9999px';
        tempChartsContainer.style.top = '-9999px';
        tempChartsContainer.style.width = '800px'; // Ancho fijo para el renderizado de los canvas.
        document.body.appendChild(tempChartsContainer);
        
        // Añade los elementos canvas al contenedor temporal.
        // Se usan dimensiones fijas para los canvas para un renderizado consistente.
        tempChartsContainer.innerHTML = `
            <div style="width: 780px; height: 580px; background-color: white; padding: 10px;"><canvas id="filteredPieChart" width="780" height="580"></canvas></div>
            <div style="width: 780px; height: 580px; background-color: white; padding: 10px; margin-top: 20px;"><canvas id="filteredBarChart" width="780" height="580"></canvas></div>
        `;

        // --- GRÁFICO DE PASTEL (Filtrado) ---
        // Procesa los datos filtrados para el gráfico de pastel (conteo por estado).
        const estadoCounts = {};
        filteredData.forEach(caso => {
            const estado = caso.estado || 'Desconocido';
            estadoCounts[estado] = (estadoCounts[estado] || 0) + 1;
        });
        const pieLabels = Object.keys(estadoCounts);
        const pieData = Object.values(estadoCounts);
        // Mapeo de colores para el gráfico de pastel.
        const pieColors = pieLabels.map(label => {
            if (label === 'OBRA CULMINADA') return '#28a745';
            if (label === 'OBRA EN PROYECCION') return '#6c757d';
            if (label === 'OBRA EN EJECUCION') return '#007bff';
            if (label === 'OBRA EJECUTADA') return '#ffc107';
            return '#FF6384'; // Color por defecto.
        });

        // Renderiza el gráfico de pastel en el canvas temporal.
        const pieCanvas = document.getElementById('filteredPieChart');
        const pieCtx = pieCanvas.getContext('2d', { willReadFrequently: true }); // Optimizaciones para html2canvas.
        new Chart(pieCtx, { // Se crea la instancia pero no se guarda en una variable global ya que es temporal.
            type: 'pie',
            data: { labels: pieLabels, datasets: [{ data: pieData, backgroundColor: pieColors }] },
            options: { // Opciones de visualización del gráfico.
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { 
                    title: { display: true, text: 'Distribución de Casos (Datos Filtrados)', font: { size: 20, weight: 'bold' } },
                    legend: { position: 'top', labels: { font: {size: 14}}}
                },
                animation: { // Se usa onComplete para asegurar que el gráfico esté renderizado antes del siguiente paso.
                    onComplete: async () => { 
                        // Una vez que el gráfico de pastel está renderizado, se procede a renderizar el de barras y luego exportar.
                        await renderBarChartAndExport(filteredData, anioActual); 
                    }
                }
            }
        });

    } catch (error) { // Manejo de errores durante la inicialización de gráficos filtrados.
        console.error("Error al inicializar los gráficos filtrados para PDF:", error);
        showNotification('Error al generar los gráficos para el PDF a partir de los datos filtrados.', true);
        hideLoader(); 
        const tempContainer = document.getElementById('tempChartsContainer');
        if (tempContainer) { // Limpia el contenedor temporal si existe.
            tempContainer.remove();
        }
    }
}

/**
 * Renderiza el gráfico de barras con los datos filtrados y luego llama a la función de exportación a PDF.
 * Esta función se llama desde la callback `onComplete` del gráfico de pastel para asegurar la secuencia correcta.
 * @async
 * @private
 * @param {Array<Object>} filteredData - Los datos de los casos ya filtrados.
 * @param {number} anio - El año actual para el título del reporte.
 */
async function renderBarChartAndExport(filteredData, anio) {
    // --- GRÁFICO DE BARRAS (Filtrado) ---
    // Procesa los datos filtrados para el gráfico de barras (conteo por estado y mes).
    const monthlyDataLocal = {}; // Objeto para datos mensuales.
    filteredData.forEach(caso => {
        let dateStr;
        // Si el caso está 'OBRA CULMINADA' y tiene fecha de entrega, úsala.
        if (caso.estado === 'OBRA CULMINADA' && caso.fechaEntrega && caso.fechaEntrega !== 'N/A') {
            dateStr = caso.fechaEntrega;
        } else {
            // Para otros estados, usa la fecha de inicio.
            dateStr = caso.caseDate;
        }

        let date;
        // Intenta parsear la fecha (soporta YYYY-MM-DD y DD/MM/YYYY).
        if (dateStr.includes('-') && dateStr.length === 10) { 
            date = new Date(dateStr);
        } else if (dateStr.includes('/')) { 
            const parts = dateStr.split('/');
            if (parts.length === 3) { // Asume DD/MM/YYYY.
                date = new Date(parts[2], parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
            } else {
                //console.warn(`Formato de fecha DD/MM/YYYY inválido para gráfico de barras: ${dateStr}`);
                return; // Salta este caso si la fecha no es parseable.
            }
        } else {
            //console.warn(`Formato de fecha no reconocido para gráfico de barras: ${dateStr}`);
            return; // Salta este caso.
        }

        if (!date || isNaN(date.getTime())) { // Validación adicional de la fecha parseada.
            //console.warn(`Fecha inválida después del parseo para gráfico de barras: ${dateStr}`);
            return; 
        }
        
        const yearMonth = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`; // Formato YYYY-MM.
        // Inicializa el contador para el mes si no existe.
        if (!monthlyDataLocal[yearMonth]) {
            monthlyDataLocal[yearMonth] = { 'OBRA EN PROYECCION': 0, 'OBRA EN EJECUCION': 0, 'OBRA EJECUTADA': 0, 'OBRA CULMINADA': 0, 'Desconocido': 0 };
        }
        // Incrementa el contador para el estado correspondiente del caso.
        if (monthlyDataLocal[yearMonth][caso.estado] !== undefined) {
            monthlyDataLocal[yearMonth][caso.estado]++;
        } else {
            monthlyDataLocal[yearMonth]['Desconocido']++; // Si el estado no es uno de los esperados.
        }
    });

    const barLabelsLocal = Object.keys(monthlyDataLocal).sort(); // Etiquetas del eje X (meses ordenados).
    const estadosParaBarra = ['OBRA EN PROYECCION', 'OBRA EN EJECUCION', 'OBRA EJECUTADA', 'OBRA CULMINADA']; // Estados para las series de datos.
    // Colores para las barras de cada estado.
    const barColors = {
        'OBRA EN PROYECCION': 'rgba(108, 117, 125, 0.8)',
        'OBRA EN EJECUCION': 'rgba(0, 123, 255, 0.8)',
        'OBRA EJECUTADA': 'rgba(255, 193, 7, 0.8)',
        'OBRA CULMINADA': 'rgba(40, 167, 69, 0.8)'
    };
    // Crea los datasets para el gráfico de barras.
    const barDatasetsLocal = estadosParaBarra.map(estado => ({
        label: estado,
        data: barLabelsLocal.map(month => monthlyDataLocal[month]?.[estado] || 0),
        backgroundColor: barColors[estado],
        borderColor: barColors[estado].replace('0.8', '1'), // Borde más opaco que el relleno.
        borderWidth: 1
    }));

    // Renderiza el gráfico de barras en el canvas temporal.
    const barCanvas = document.getElementById('filteredBarChart');
    const barCtx = barCanvas.getContext('2d', { willReadFrequently: true });
    new Chart(barCtx, { // Se crea la instancia pero no se guarda.
        type: 'bar',
        data: { labels: barLabelsLocal, datasets: barDatasetsLocal },
        options: { // Opciones de visualización.
            responsive: true,
            maintainAspectRatio: false,
            scales: { 
                x: { stacked: true, title: { display: true, text: 'Mes/Año', font: {size: 14, weight: 'bold'}}}, 
                y: { stacked: true, beginAtZero: true, ticks: { precision: 0 }, title: {display: true, text: 'Número de Casos', font: {size: 14, weight: 'bold'}}}
            },
            animation: { // Se usa onComplete para asegurar que el gráfico esté renderizado antes de exportar.
                onComplete: async () => { 
                    // requestAnimationFrame para asegurar que el navegador haya completado el renderizado.
                    requestAnimationFrame(async () => {
                        try {
                            // Prepara los datos estadísticos para la tabla en el PDF.
                            const statsForTable = [];
                            statsForTable.push({ label: "Casos Mostrados (Filtrados)", value: filteredData.length });

                            const countsByState = filteredData.reduce((acc, caso) => {
                                acc[caso.estado] = (acc[caso.estado] || 0) + 1;
                                return acc;
                            }, {});

                            const estadosParaTabla = ["OBRA EN PROYECCION", "OBRA EN EJECUCION", "OBRA EJECUTADA", "OBRA CULMINADA"];
                            estadosParaTabla.forEach(estado => {
                                if (countsByState[estado] || estado === "Desconocido") { // Mostrar desconocido solo si tiene conteo o es explícitamente para mostrar
                                    statsForTable.push({ label: `Casos ${estado}`, value: countsByState[estado] || 0 });
                                }
                            });
                            
                            // Logs de depuración para verificar los datos que se envían a la función de exportación.
                            // console.log("Datos de estadísticas para la tabla del PDF:", JSON.stringify(statsForTable, null, 2)); 
                            // console.log("Datos filtrados para gráficos (revisión):", JSON.stringify(filteredData, null, 2));
                            // ... (otros logs de depuración que ya estaban presentes)

                            // Llama a la función global exportChartsToPDF (definida en export_pdf.js) para generar el PDF.
                            if (window.exportChartsToPDF) {
                                await window.exportChartsToPDF('#tempChartsContainer', '#filteredPieChart, #filteredBarChart', anio, statsForTable);
                            } else {
                                console.error("La función exportChartsToPDF no está definida globalmente.");
                                alert("Error crítico: la función de exportación a PDF no está disponible.");
                            }
                        } catch (exportError) { // Manejo de errores durante la exportación.
                            console.error("Error durante la recolección de datos finales o la exportación a PDF:", exportError);
                            showNotification('Ocurrió un error durante la preparación final de la exportación a PDF.', true);
                        } finally { // Limpieza final.
                            const tempContainer = document.getElementById('tempChartsContainer');
                            if (tempContainer) {
                                tempContainer.remove(); // Elimina el contenedor temporal de gráficos.
                            }
                            hideLoader(); // Oculta el loader.
                        }
                    }); 
                } 
            },
            plugins: { // Título y leyenda del gráfico de barras.
                title: { display: true, text: 'Casos por Mes/Año (Datos Filtrados)', font: { size: 20, weight: 'bold' } },
                legend: { position: 'top', labels: {font: {size: 14}}}
            } 
        } 
    }); 
} 


// Event listener para el botón de exportar PDF en la página de casos (casos.html).
// Se activa cuando el DOM está completamente cargado.
document.addEventListener('DOMContentLoaded', () => {
    const exportPdfCasosBtn = document.getElementById('export-pdf-casos');
    if (exportPdfCasosBtn) {
        // Asigna la función exportFilteredChartsToPDF al evento click del botón.
        exportPdfCasosBtn.addEventListener('click', exportFilteredChartsToPDF);
        // Asegura que el botón tenga la apariencia correcta de deshabilitado si ya lo está en el HTML.
        if (exportPdfCasosBtn.disabled) {
            exportPdfCasosBtn.classList.add('disabled-look');
        }
    }
});

/**
 * Limpia los filtros aplicados a la tabla y la restaura a su estado original (mostrando todos los casos).
 * También deshabilita el botón de exportar PDF de casos filtrados.
 * @export
 */
export function clearFilter() {
    showLoader();
    try {
        const filterFieldSelect = document.getElementById('filterField');
        const filterValueInput = document.getElementById('filterValue');

        if (filterFieldSelect) {
            filterFieldSelect.value = ""; // Restablece el select de campo a "Todos los campos".
        }
        if (filterValueInput) {
            filterValueInput.value = ''; // Limpia el input de valor del filtro.
        }
        
        // Repuebla la tabla con todos los datos originales (sin filtrar).
        // La función populateTable se encarga de ordenar y renderizar.
        populateTable(getCasosData()); 
        showNotification('Filtro limpiado. Mostrando todos los casos.');
    
        // Deshabilita y actualiza la apariencia del botón de exportar PDF.
        const exportPdfCasosBtn = document.getElementById('export-pdf-casos');
        if (exportPdfCasosBtn) {
            exportPdfCasosBtn.disabled = true; 
            exportPdfCasosBtn.classList.add('disabled-look');
            exportPdfCasosBtn.classList.remove('active-look');
        }

    } finally {
        hideLoader();
    }
}

/**
 * Formatea los datos de "Punto y Círculo" para la exportación.
 * @param {Array} data - El array de `punto_y_circulo_data`.
 * @returns {String} Una cadena de texto formateada o 'No Aplica'.
 */
function formatPuntoYCirculo(data) {
    if (!Array.isArray(data) || data.length === 0) {
        return 'No Aplica';
    }
    return data.map((item, index) => {
        return `Registro ${index + 1}: ` +
               `Acciones: ${item.acciones_ejecutadas || 'N/A'}, ` +
               `Tipo de Obra: ${item.tipo_obra || 'N/A'}, ` +
               `Comuna: ${item.comuna || 'N/A'}, ` +
               `Consejo Comunal: ${item.consejo_comunal || 'N/A'}, ` +
               `Descripción: ${item.descripcion_caso || 'N/A'}`;
    }).join('; \n'); // Une cada registro con un punto y coma y un salto de línea.
}

/**
 * Formatea las actuaciones para la exportación.
 * @param {Array} actuaciones - El array de `actuaciones`.
 * @returns {String} Una cadena de texto formateada o 'Sin actuaciones'.
 */
function formatActuaciones(actuaciones) {
    if (!Array.isArray(actuaciones) || actuaciones.length === 0) {
        return 'Sin actuaciones';
    }
    return actuaciones.map(act => {
        const fecha = act.fecha ? new Date(act.fecha).toLocaleString('es-VE') : 'Fecha no disponible';
        return `[${fecha}] (${act.usuario || 'Sistema'}): ${act.descripcion || 'Sin descripción'}`;
    }).join('; \n');
}

/**
 * Formatea el historial de modificaciones para la exportación.
 * @param {Array} modificaciones - El array de `modificaciones`.
 * @returns {String} Una cadena de texto formateada o 'Sin modificaciones'.
 */
function formatModificaciones(modificaciones) {
    if (!Array.isArray(modificaciones) || modificaciones.length === 0) {
        return 'Sin modificaciones';
    }
    return modificaciones.map(mod => {
        const fecha = mod.fecha ? new Date(mod.fecha).toLocaleString('es-VE') : 'Fecha no disponible';
        // Procesa valores antiguos y nuevos para que se muestren correctamente, incluso si son objetos.
        const valorAntiguo = typeof mod.valorAntiguo === 'object' ? JSON.stringify(mod.valorAntiguo) : mod.valorAntiguo;
        const valorNuevo = typeof mod.valorNuevo === 'object' ? JSON.stringify(mod.valorNuevo) : mod.valorNuevo;
        return `[${fecha}] (${mod.usuario || 'Sistema'}) - Campo '${mod.campo}': cambió de '${valorAntiguo}' a '${valorNuevo}'`;
    }).join('; \n');
}

/**
 * Formatea una fecha para la exportación en un formato legible.
 * @param {Date|String} date - La fecha a formatear.
 * @returns {String} La fecha formateada o 'N/A'.
 */
function formatDate(date) {
    if (!date) return 'N/A';
    try {
        return new Date(date).toLocaleDateString('es-VE', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    } catch (e) {
        return 'Fecha inválida';
    }
}


/**
 * Exporta los datos de todos los casos (o los actualmente filtrados si se modifica la lógica de getCasosData)
 * a un archivo Excel (.xlsx).
 * @export
 */
export async function exportTableToExcel() {
    showLoader();
    try {
        const tableRows = document.querySelectorAll('#casosTable tbody tr');
        const dataToExport = [];

        tableRows.forEach(row => {
            if (row.style.display !== 'none') {
                const cells = row.cells;
                const casoId = cells[0].querySelector('a').dataset.id;
                const fullCaseData = getCasosData().find(c => c._id === casoId);

                if (fullCaseData) {
                    dataToExport.push(fullCaseData);
                }
            }
        });

        if (dataToExport.length === 0) {
            showNotification('No hay datos filtrados para exportar a Excel.', true);
            return;
        }

        const ws_data = dataToExport.map(caso => ({
            'ID del Caso (CUB)': caso.codigoPersonalizado || generateAlphanumericId(caso._id),
            'Estado': caso.estado,
            'Acciones Ejecutadas': caso.acciones_ejecutadas,
            'Tipo de Obra': caso.tipo_obra,
            'Nombre de Obra': caso.nombre_obra,
            'Descripción del Caso': caso.caseDescription,
            'Fecha de Creación': formatDate(caso.createdAt),
            'Fecha de Inicio': formatDate(caso.caseDate),
            'Fecha de Entrega': formatDate(caso.fechaEntrega),
            'Última Actualización': formatDate(caso.updatedAt),
            // Ubicación
            'Parroquia': caso.parroquia,
            'Circuito': caso.circuito,
            'Eje': caso.eje,
            'Comuna': caso.comuna,
            'Código Comunal': caso.codigoComuna,
            'Dirección Exacta': caso.direccion_exacta,
            // Responsables y Enlaces
            'Ente Responsable': caso.ente_responsable,
            'Gerente Responsable': caso.gerente_responsable,
            'Responsable Sala de Autogobierno': caso.responsable_sala_autogobierno,
            'Jefe Político del Eje': caso.jefe_politico_eje,
            'Enlace Político del Circuito': caso.enlace_politico_circuito,
            'Enlace Político Parroquial': caso.enlace_politico_parroquial,
            'Enlace Comunal': caso.enlaceComunal,
            'Jefe de Comunidad (JC)': caso.nameJC,
            'Jefe de UBCH': caso.nameJU,
            'Jefe de Calle': caso.jefe_calle,
            'Jefe de Juventud Circuito Comunal': caso.jefe_juventud_circuito_comunal,
            'Jueces de Paz': caso.jueces_de_paz,
            // Detalles de la Comunidad
            'Consejo Comunal Donde se Ejecuta la Acción': caso.consejo_comunal_ejecuta,
            'Código del Consejo Comunal': caso.codigo_consejo_comunal,
            'Cantidad de Familias Beneficiadas': caso.cantidad_familiares,
            // Punto y Círculo
            'Aplica Punto y Círculo': caso.punto_y_circulo,
            'Detalles Punto y Círculo': formatPuntoYCirculo(caso.punto_y_circulo_data),
            // Historial
            'Historial de Actuaciones': formatActuaciones(caso.actuaciones),
            'Historial de Modificaciones': formatModificaciones(caso.modificaciones),
            // Archivo
            'Nombre del Archivo Adjunto': caso.archivo || 'Sin archivo',
        }));

        const ws = XLSX.utils.json_to_sheet(ws_data);
        // Ajustar el ancho de las columnas (opcional, pero mejora la legibilidad)
        const colWidths = Object.keys(ws_data[0] || {}).map(key => {
            // Estima un ancho basado en el título y el contenido.
            const headerWidth = key.length;
            const contentWidth = Math.max(...ws_data.map(row => (row[key] || '').toString().length), 0);
            return { wch: Math.min(Math.max(headerWidth, contentWidth) + 2, 80) }; // Ancho máximo de 80
        });
        ws['!cols'] = colWidths;


        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Casos Filtrados");

        const today = new Date();
        const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const fileName = `Reporte_Casos_Filtrados_${formattedDate}.xlsx`;

        XLSX.writeFile(wb, fileName);
        showNotification(`Tabla exportada a Excel como ${fileName} exitosamente.`);
    } catch (error) {
        console.error("Error al exportar a Excel:", error);
        showNotification("Ocurrió un error al intentar exportar la tabla a Excel.", true);
    } finally {
        hideLoader();
    }
}