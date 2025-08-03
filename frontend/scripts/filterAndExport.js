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
                if (columnIndex !== undefined && cells[columnIndex]) { // Si el índice es válido y la celda existe.
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
                // Extrae el estado y la fecha de inicio de las celdas correspondientes.
                // Es crucial que los índices de las celdas (row.cells[X]) sean correctos.
                const estadoCell = row.cells[12]; // Celda de "Estado de la Obra".
                const fechaCell = row.cells[8];   // Celda de "Fecha de Inicio".

                if (estadoCell && fechaCell) {
                    // Intenta obtener la fecha original del atributo data-original-date si existe,
                    // de lo contrario, usa el texto de la celda.
                    const originalDate = fechaCell.dataset.originalDate; 
                    const dateForChart = originalDate || fechaCell.textContent.trim();

                    let estadoDelCaso = "Desconocido"; // Estado por defecto.
                    const selectElement = estadoCell.querySelector('select.estado-select'); // El estado se maneja con un select.

                    if (selectElement) {
                        estadoDelCaso = selectElement.value; // Obtiene el valor del select.
                    } else {
                        // Fallback si el select no se encuentra (no debería ocurrir con la estructura actual).
                        console.warn("No se encontró el elemento <select> en la celda de estado para la fila:", row);
                        // Se podría intentar leer el texto de la celda, pero es menos fiable.
                    }
                    
                    filteredData.push({
                        estado: estadoDelCaso,
                        caseDate: dateForChart // Fecha de inicio para agrupar en gráfico de barras.
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
            if (label === 'Entregado') return '#28a745';
            if (label === 'Cargado') return '#6c757d';
            if (label === 'Supervisado') return '#007bff';
            if (label === 'En Desarrollo') return '#ffc107';
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
        const dateStr = caso.caseDate; // Fecha del caso.
        let date;

        // Intenta parsear la fecha (soporta YYYY-MM-DD y DD/MM/YYYY).
        if (dateStr.includes('-') && dateStr.length === 10) { 
            date = new Date(dateStr);
        } else if (dateStr.includes('/')) { 
            const parts = dateStr.split('/');
            if (parts.length === 3) { // Asume DD/MM/YYYY.
                date = new Date(parts[2], parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
            } else {
                console.warn(`Formato de fecha DD/MM/YYYY inválido para gráfico de barras: ${dateStr}`);
                return; // Salta este caso si la fecha no es parseable.
            }
        } else {
            console.warn(`Formato de fecha no reconocido para gráfico de barras: ${dateStr}`);
            return; // Salta este caso.
        }

        if (!date || isNaN(date.getTime())) { // Validación adicional de la fecha parseada.
            console.warn(`Fecha inválida después del parseo para gráfico de barras: ${dateStr}`);
            return; 
        }
        
        const yearMonth = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`; // Formato YYYY-MM.
        // Inicializa el contador para el mes si no existe.
        if (!monthlyDataLocal[yearMonth]) {
            monthlyDataLocal[yearMonth] = { 'Cargado': 0, 'Supervisado': 0, 'En Desarrollo': 0, 'Entregado': 0, 'Desconocido': 0 };
        }
        // Incrementa el contador para el estado correspondiente del caso.
        if (monthlyDataLocal[yearMonth][caso.estado] !== undefined) {
            monthlyDataLocal[yearMonth][caso.estado]++;
        } else {
            monthlyDataLocal[yearMonth]['Desconocido']++; // Si el estado no es uno de los esperados.
        }
    });

    const barLabelsLocal = Object.keys(monthlyDataLocal).sort(); // Etiquetas del eje X (meses ordenados).
    const estadosParaBarra = ['Cargado', 'Supervisado', 'En Desarrollo', 'Entregado']; // Estados para las series de datos.
    // Colores para las barras de cada estado.
    const barColors = {
        'Cargado': 'rgba(108, 117, 125, 0.8)',
        'Supervisado': 'rgba(0, 123, 255, 0.8)',
        'En Desarrollo': 'rgba(255, 193, 7, 0.8)',
        'Entregado': 'rgba(40, 167, 69, 0.8)'
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

                            const estadosParaTabla = ["Cargado", "Supervisado", "En Desarrollo", "Entregado"];
                            estadosParaTabla.forEach(estado => {
                                if (countsByState[estado] || estado === "Desconocido") { // Mostrar desconocido solo si tiene conteo o es explícitamente para mostrar
                                    statsForTable.push({ label: `Casos ${estado}`, value: countsByState[estado] || 0 });
                                }
                            });
                            
                            // Logs de depuración para verificar los datos que se envían a la función de exportación.
                            console.log("Datos de estadísticas para la tabla del PDF:", JSON.stringify(statsForTable, null, 2)); 
                            console.log("Datos filtrados para gráficos (revisión):", JSON.stringify(filteredData, null, 2));
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
 * Exporta los datos de todos los casos (o los actualmente filtrados si se modifica la lógica de getCasosData)
 * a un archivo Excel (.xlsx).
 * @export
 */
export async function exportTableToExcel() { // Convertida a async
    showLoader();
    try {
        const API_BASE_URL = await getApiBaseUrlAsync(); // Obtener la URL base
        // Obtiene los datos de los casos. Actualmente, getCasosData() devuelve todos los casos.
        // Si se quisiera exportar solo los filtrados, se necesitaría una función que devuelva los datos filtrados.
        const dataToExport = getCasosData(); 

        if (!dataToExport || dataToExport.length === 0) {
            showNotification('No hay datos para exportar a Excel.', true);
            return;
        }

        // Mapea los datos de los casos al formato esperado por la hoja de cálculo.
        // Incluye la generación del ID legible y el formateo de fechas y arrays.
        const ws_data = dataToExport.map(caso => ({
            'CUB - COD': generateAlphanumericId(caso._id), // ID legible.
            'Tipo de Obra': caso.tipo_obra,
            'Parroquia': caso.parroquia,
            'Circuito': caso.circuito,
            'Eje': caso.eje,
            'Comuna': caso.comuna,
            'Código Comunal': caso.codigoComuna,
            'Nombre JC': caso.nameJC, // Jefe de Comunidad.
            'Nombre JU': caso.nameJU, // Jefe de UBCH.
            'Enlace Comunal': caso.enlaceComunal,
            'Descripción': caso.caseDescription,
            'Fecha de Inicio': caso.caseDate ? new Date(caso.caseDate).toLocaleDateString() : 'N/A',
            'Fecha de Entrega': caso.fechaEntrega && caso.estado === 'Entregado' ? new Date(caso.fechaEntrega).toLocaleDateString() : 'N/A',
            'Archivo': caso.archivo ? `${API_BASE_URL}/uploads/pdfs/${caso.archivo}` : 'N/A', // Enlace al archivo con URL base
            'Estado': caso.estado,
            // Concatena las actuaciones en una sola cadena, separadas por '; '.
            'Actuaciones': Array.isArray(caso.actuaciones) ? caso.actuaciones.map(act => {
                const date = act.fecha ? new Date(act.fecha).toLocaleString() : 'Fecha desconocida';
                const user = act.usuario ? `(${act.usuario})` : '';
                return `${user} ${date}: ${act.descripcion}`;
            }).join('; ') : 'N/A',
            // Concatena las modificaciones en una sola cadena.
            'Modificaciones': Array.isArray(caso.modificaciones) ? caso.modificaciones.map(mod => {
                const date = mod.fecha ? new Date(mod.fecha).toLocaleString() : 'Fecha desconocida';
                const user = mod.usuario ? `(${mod.usuario})` : '';
                if (mod.campo === 'revisión') {
                    return `${user} ${date}: Revisión sin cambios específicos`;
                }
                return `${user} ${date}: Campo '${mod.campo}' cambiado de '${mod.valorAntiguo}' a '${mod.valorNuevo}'`;
            }).join('; ') : 'N/A'
        }));
        
        // Crea una hoja de cálculo a partir de los datos JSON.
        const ws = XLSX.utils.json_to_sheet(ws_data);
        // Crea un nuevo libro de Excel.
        const wb = XLSX.utils.book_new();
        // Añade la hoja de cálculo al libro.
        XLSX.utils.book_append_sheet(wb, ws, "Casos"); // Nombre de la pestaña en Excel.

        // Genera el nombre del archivo con la fecha actual.
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0'); // Meses son 0-indexados.
        const day = String(today.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;
        const fileName = `Reporte_Casos_${formattedDate}.xlsx`; // Nombre del archivo.

        // Descarga el archivo Excel.
        XLSX.writeFile(wb, fileName);
        showNotification(`Tabla exportada a Excel como ${fileName} exitosamente.`);
    } finally {
        hideLoader(); // Siempre oculta el loader.
    }
}