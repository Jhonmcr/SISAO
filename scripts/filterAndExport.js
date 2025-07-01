// scripts/filterAndExport.js
import { showLoader, hideLoader } from './loader.js';
import { getCasosData, populateTable } from './caseTableManager.js';
import { showNotification, generateAlphanumericId } from './utils.js';

export function applyFilter() {
    const filterFieldSelect = document.getElementById('filterField');
    const filterValueInput = document.getElementById('filterValue');
    const exportPdfCasosBtn = document.getElementById('export-pdf-casos');

    if (!filterFieldSelect || !filterValueInput || !exportPdfCasosBtn) {
        console.warn("Algunos elementos del DOM para filtrar o exportar no fueron encontrados.");
        return;
    }
    showLoader();
    try {
        const selectedField = filterFieldSelect.value;
        const filterValue = filterValueInput.value.toLowerCase().trim();
        const tableRows = document.querySelectorAll('#casosTable tbody tr');

        if (filterValue === '') {
            tableRows.forEach(row => {
                row.style.display = '';
            });
            exportPdfCasosBtn.disabled = true;
            exportPdfCasosBtn.classList.add('disabled-look'); // Asume que esta clase lo pone gris
            exportPdfCasosBtn.classList.remove('active-look'); // Asume que esta clase lo pone verde
            // populateTable(getCasosData()); 
            return;
        }

        let hasVisibleRows = false;
        tableRows.forEach(row => {
        let rowMatchesFilter = false;
        const cells = row.querySelectorAll('td');

        // Mapeo de los valores de filterField a los índices de las columnas (ajusta según tu tabla)
        // Esto debe coincidir con el orden de las columnas en tu HTML y los <option> value.
        const fieldColumnMapping = {
            'id': 0,
            'tipo_obra': 1,
            'parroquia': 2,
            'circuito': 3,
            'eje': 4,
            'comuna': 5,
            // 'enlaceComunal' // Esta columna no está en los options, pero podría añadirse
            // 'actuaciones' // Esta columna no está en los options
            'caseDate': 8, // Fecha de Inicio
            'fechaEntrega': 9, // Fecha de Entrega
            // 'archivo' // Esta columna no está en los options
            'estado': 11 // Estado de la Obra
        };

        if (selectedField === "") { // "Todos los campos"
            for (let i = 0; i < cells.length; i++) {
                const cell = cells[i];
                let cellText = cell.textContent.toLowerCase();

                if (i === 0) { // Lógica especial para la columna de ID (índice 0)
                    const idLink = cell.querySelector('a.case-id-link');
                    if (idLink) {
                        const displayId = idLink.textContent.toLowerCase(); // "obc - abc123xyz"
                        const internalId = idLink.dataset.id.toLowerCase(); // el _id de mongo
                        const alphanumericPart = displayId.replace('obc - ', ''); // "abc123xyz"
                        if (displayId.includes(filterValue) || alphanumericPart.includes(filterValue) || internalId.includes(filterValue)) {
                            rowMatchesFilter = true;
                            break;
                        }
                    } else if (cellText.includes(filterValue)) {
                        rowMatchesFilter = true;
                        break;
                    }
                } else if (cellText.includes(filterValue)) {
                    rowMatchesFilter = true;
                    break;
                }
            }
        } else { // Un campo específico está seleccionado
            const columnIndex = fieldColumnMapping[selectedField];
            if (columnIndex !== undefined && cells[columnIndex]) {
                let cellText = cells[columnIndex].textContent.toLowerCase();
                if (selectedField === 'id') { // Lógica especial para la columna de ID
                    const idLink = cells[columnIndex].querySelector('a.case-id-link');
                    if (idLink) {
                        const displayId = idLink.textContent.toLowerCase();
                        const internalId = idLink.dataset.id.toLowerCase();
                        const alphanumericPart = displayId.replace('obc - ', '');
                        if (displayId.includes(filterValue) || alphanumericPart.includes(filterValue) || internalId.includes(filterValue)) {
                            rowMatchesFilter = true;
                        }
                    } else if (cellText.includes(filterValue)) {
                        rowMatchesFilter = true;
                    }
                } else if (cellText.includes(filterValue)) {
                    rowMatchesFilter = true;
                }
            }
        }

        if (rowMatchesFilter) {
            row.style.display = '';
            hasVisibleRows = true;
        } else {
            row.style.display = 'none';
        }
    });

    if (hasVisibleRows) {
        exportPdfCasosBtn.disabled = false;
        exportPdfCasosBtn.classList.remove('disabled-look');
        exportPdfCasosBtn.classList.add('active-look');
    } else {
        exportPdfCasosBtn.disabled = true;
        exportPdfCasosBtn.classList.add('disabled-look');
        exportPdfCasosBtn.classList.remove('active-look');
    }

    } finally {
        hideLoader();
    }
}

// Función para generar y exportar gráficos basados en los datos filtrados de la tabla
async function exportFilteredChartsToPDF() {
    showLoader();
    try {
        const tableRows = document.querySelectorAll('#casosTable tbody tr');
        const filteredData = [];

        tableRows.forEach(row => {
            // Solo incluir filas visibles (no display: none)
            if (row.style.display !== 'none') {
                // Extraer datos de la fila. Esto necesita ser adaptado
                // para que coincida con cómo se almacenan/acceden los datos de cada fila.
                // Por simplicidad, asumiremos que podemos obtener el 'estado' y 'caseDate'
                // directamente de los atributos de datos o del texto de las celdas.
                // Esta parte es CRÍTICA y debe ser implementada correctamente.

                // Ejemplo (necesitarás adaptarlo):
                const estadoCell = row.cells[11]; // Índice de la columna 'Estado de la Obra'
                const fechaCell = row.cells[8]; // Índice de la columna 'Fecha de Inicio'

                if (estadoCell && fechaCell) {
                    const originalDate = fechaCell.dataset.originalDate; 
                    const dateForChart = originalDate || fechaCell.textContent.trim();

                    let estadoTextoLimpio = estadoCell.textContent.trim();
                    if (estadoTextoLimpio.includes('\n')) {
                        estadoTextoLimpio = estadoTextoLimpio.split('\n')[0].trim();
                    }
                    
                    const estadosConocidos = ["En Desarrollo", "Supervisado", "Cargado", "Entregado"]; // "En Desarrollo" primero
                    let estadoFinalDetectado = "Desconocido"; 

                    for (const conocido of estadosConocidos) {
                        if (estadoTextoLimpio.startsWith(conocido)) {
                            estadoFinalDetectado = conocido;
                            break;
                        }
                    }
                    // Si después de comprobar con startsWith sigue siendo "Desconocido" y la cadena original no estaba vacía,
                    // podría ser un estado válido que no está en la lista o un problema.
                    // Por ahora, si no coincide, se quedará como "Desconocido".

                    filteredData.push({
                        estado: estadoFinalDetectado,
                        caseDate: dateForChart
                    });
                }
            }
        });

        if (filteredData.length === 0) {
            showNotification('No hay datos filtrados para generar gráficos.', true);
            hideLoader(); // Asegurarse de ocultar el loader si no hay datos
            return;
        }
        const anioActual = new Date().getFullYear(); // Definir anioActual aquí

        // Crear un contenedor temporal para los gráficos
        let tempChartsContainer = document.getElementById('tempChartsContainer');
        if (tempChartsContainer) { // Si existe de una ejecución anterior, removerlo
            tempChartsContainer.remove();
        }

        tempChartsContainer = document.createElement('div');
        tempChartsContainer.id = 'tempChartsContainer';
        // Para que html2canvas funcione correctamente, el contenedor no debe ser display:none.
        // En lugar de eso, lo movemos fuera de la pantalla.
        tempChartsContainer.style.position = 'absolute';
        tempChartsContainer.style.left = '-9999px';
        tempChartsContainer.style.top = '-9999px';
        tempChartsContainer.style.width = '800px'; // Dar un ancho al contenedor padre
        // tempChartsContainer.style.visibility = 'hidden'; // Alternativa a moverlo fuera de pantalla
        document.body.appendChild(tempChartsContainer);
        
        // Añadir los canvas al contenedor temporal con dimensiones explícitas
        tempChartsContainer.innerHTML = `
            <div style="width: 780px; height: 580px; background-color: white; padding: 10px;"><canvas id="filteredPieChart" width="780" height="580"></canvas></div>
            <div style="width: 780px; height: 580px; background-color: white; padding: 10px; margin-top: 20px;"><canvas id="filteredBarChart" width="780" height="580"></canvas></div>
        `;

        // --- Gráfico de Pastel (Distribución por Estado - Filtrado) ---
        const estadoCounts = {};
        filteredData.forEach(caso => {
            const estado = caso.estado || 'Desconocido';
            estadoCounts[estado] = (estadoCounts[estado] || 0) + 1;
        });
        const pieLabels = Object.keys(estadoCounts);
        const pieData = Object.values(estadoCounts);
        const pieColors = pieLabels.map(label => {
            if (label === 'Entregado') return '#28a745';
            if (label === 'Cargado') return '#6c757d';
            if (label === 'Supervisado') return '#007bff';
            if (label === 'En Desarrollo') return '#ffc107';
            return '#FF6384';
        });

        const pieCanvas = document.getElementById('filteredPieChart');
        const pieCtx = pieCanvas.getContext('2d', { willReadFrequently: true });
        const pieChart = new Chart(pieCtx, {
            type: 'pie',
            data: { labels: pieLabels, datasets: [{ data: pieData, backgroundColor: pieColors }] },
            options: {
                responsive: true, 
                maintainAspectRatio: false, // Importante para que el canvas use width/height
                plugins: { 
                    title: { display: true, text: 'Distribución de Casos (Filtrado)', font: { size: 20, weight: 'bold' } },
                    legend: { position: 'top', labels: { font: {size: 14}}}
                },
                animation: {
                    onComplete: async () => { // Asegurar que la animación del gráfico termine
                        // Continuar con el gráfico de barras DESPUÉS de que el de torta esté listo
                        await renderBarChartAndExport(filteredData, anioActual); // Solo pasar filteredData y anioActual
                    }
                }
            }
        });

    } catch (error) {
        console.error("Error inicializando gráficos filtrados:", error);
        showNotification('Error al inicializar gráficos filtrados.', true);
        hideLoader(); // Asegurar que el loader se oculte en caso de error temprano
        const tempContainer = document.getElementById('tempChartsContainer');
        if (tempContainer) {
            tempContainer.remove();
        }
    }
}

// Función separada para renderizar el gráfico de barras y luego exportar
async function renderBarChartAndExport(filteredData, anio) {
    // --- Gráfico de Barras (Casos por Estado y Mes - Filtrado) ---
    const monthlyDataLocal = {}; // Usar un nombre diferente para el scope local
    filteredData.forEach(caso => {
        const dateStr = caso.caseDate;
        let date;

        // Priorizar el formato YYYY-MM-DD, luego DD/MM/YYYY
        if (dateStr.includes('-') && dateStr.length === 10) { // YYYY-MM-DD
            date = new Date(dateStr);
        } else if (dateStr.includes('/')) { // DD/MM/YYYY
            const parts = dateStr.split('/');
            if (parts.length === 3) {
                date = new Date(parts[2], parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
            } else {
                console.warn(`Formato de fecha DD/MM/YYYY inválido: ${dateStr}`);
                return; // Saltar este caso
            }
        } else {
            console.warn(`Formato de fecha no reconocido: ${dateStr}`);
            return; // Saltar este caso
        }

        if (!date || isNaN(date.getTime())) {
            console.warn(`Fecha inválida después del parseo: ${dateStr}`);
            return; // Saltar este caso
        }
        
        const yearMonth = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        if (!monthlyDataLocal[yearMonth]) {
            monthlyDataLocal[yearMonth] = { 'Cargado': 0, 'Supervisado': 0, 'En Desarrollo': 0, 'Entregado': 0 };
        }
        if (monthlyDataLocal[yearMonth][caso.estado] !== undefined) {
            monthlyDataLocal[yearMonth][caso.estado]++;
        }
    });

    const barLabelsLocal = Object.keys(monthlyDataLocal).sort(); // Usar un nombre diferente
    const estadosParaBarra = ['Cargado', 'Supervisado', 'En Desarrollo', 'Entregado'];
    const barColors = {
        'Cargado': 'rgba(108, 117, 125, 0.8)',
        'Supervisado': 'rgba(0, 123, 255, 0.8)',
        'En Desarrollo': 'rgba(255, 193, 7, 0.8)',
        'Entregado': 'rgba(40, 167, 69, 0.8)'
    };
    const barDatasetsLocal = estadosParaBarra.map(estado => ({ // Usar un nombre diferente
        label: estado,
        data: barLabelsLocal.map(month => monthlyDataLocal[month]?.[estado] || 0), // Usar monthlyDataLocal y barLabelsLocal
        backgroundColor: barColors[estado],
        borderColor: Object.values(barColors[estado]).slice(0,3).join(',') + ',1)', 
        borderWidth: 1
    }));

    // Estas constantes ya están definidas en el ámbito del módulo, no es necesario redeclararlas aquí.
    // const estadosParaBarra = ['Cargado', 'Supervisado', 'En Desarrollo', 'Entregado'];
    // const barColors = {
    //     'Cargado': 'rgba(108, 117, 125, 0.7)',
    //     'Supervisado': 'rgba(0, 123, 255, 0.7)',
    //     'En Desarrollo': 'rgba(255, 193, 7, 0.7)',
    //     'Entregado': 'rgba(40, 167, 69, 0.7)'
    // };

    const barCanvas = document.getElementById('filteredBarChart');
    const barCtx = barCanvas.getContext('2d', { willReadFrequently: true });
    const barChart = new Chart(barCtx, {
        type: 'bar',
        data: { labels: barLabelsLocal, datasets: barDatasetsLocal }, // Usar barLabelsLocal y barDatasetsLocal
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { 
                x: { stacked: true, title: { display: true, text: 'Mes', font: {size: 14, weight: 'bold'}}}, 
                y: { stacked: true, beginAtZero: true, ticks: { precision: 0 }, title: {display: true, text: 'Número de Casos', font: {size: 14, weight: 'bold'}}}
            },
            scales: { 
                x: { stacked: true, title: { display: true, text: 'Mes', font: {size: 14, weight: 'bold'}}}, 
                y: { stacked: true, beginAtZero: true, ticks: { precision: 0 }, title: {display: true, text: 'Número de Casos', font: {size: 14, weight: 'bold'}}}
            },
            animation: { // animation es una propiedad de options
                onComplete: async () => { 
                    requestAnimationFrame(async () => {
                        try {
                            const statsForTable = [];
                            statsForTable.push({ label: "Casos Mostrados", value: filteredData.length });

                            const countsByState = filteredData.reduce((acc, caso) => {
                                acc[caso.estado] = (acc[caso.estado] || 0) + 1;
                                return acc;
                            }, {});

                            const estadosParaTabla = ["Cargado", "Supervisado", "En Desarrollo", "Entregado"];
                            estadosParaTabla.forEach(estado => {
                                statsForTable.push({ label: `Casos ${estado}`, value: countsByState[estado] || 0 });
                            });
                            
                            // Opcional: si quieres mostrar "Desconocido" en la tabla si existe y tiene conteo
                            if (countsByState["Desconocido"] && countsByState["Desconocido"] > 0) {
                                statsForTable.push({ label: "Casos Desconocido", value: countsByState["Desconocido"] });
                            }
                            
                            // Definir orderedStates aquí para que esté en el ámbito correcto para los logs de barDatasetsLocalDebug
                            const orderedStatesForLog = ["Cargado", "Supervisado", "En Desarrollo", "Entregado", "Desconocido"];

                            console.log("Stats for PDF Table:", JSON.stringify(statsForTable, null, 2)); 

                            console.log("Filtered Data for Charts:", JSON.stringify(filteredData, null, 2));
                            const estadoCountsDebug = {};
                            filteredData.forEach(caso => {
                                const estado = caso.estado || 'Desconocido';
                                estadoCountsDebug[estado] = (estadoCountsDebug[estado] || 0) + 1;
                            });
                            console.log("Estado Counts (Pie Chart):", JSON.stringify(estadoCountsDebug, null, 2));
                            console.log("Pie Labels:", JSON.stringify(Object.keys(estadoCountsDebug), null, 2));
                            console.log("Pie Data:", JSON.stringify(Object.values(estadoCountsDebug), null, 2));

                            const monthlyDataLocalDebug = {};
                            filteredData.forEach(caso => {
                                const dateStr = caso.caseDate;
                                let date;
                                if (dateStr.includes('-') && dateStr.length === 10) { date = new Date(dateStr); } 
                                else if (dateStr.includes('/')) {
                                    const parts = dateStr.split('/');
                                    if (parts.length === 3) date = new Date(parts[2], parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
                                    else return;
                                } else return;
                                if (!date || isNaN(date.getTime())) return;
                                const yearMonth = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                                if (!monthlyDataLocalDebug[yearMonth]) monthlyDataLocalDebug[yearMonth] = { 'Cargado': 0, 'Supervisado': 0, 'En Desarrollo': 0, 'Entregado': 0, 'Desconocido': 0 };
                                if (monthlyDataLocalDebug[yearMonth][caso.estado] !== undefined) monthlyDataLocalDebug[yearMonth][caso.estado]++;
                                else monthlyDataLocalDebug[yearMonth]['Desconocido']++;
                            });
                            console.log("Monthly Data (Bar Chart):", JSON.stringify(monthlyDataLocalDebug, null, 2));
                            const barLabelsLocalDebug = Object.keys(monthlyDataLocalDebug).sort();
                            console.log("Bar Labels:", JSON.stringify(barLabelsLocalDebug, null, 2));
                            const barDatasetsLocalDebug = orderedStatesForLog.map(estado => ({
                                label: estado,
                                data: barLabelsLocalDebug.map(month => monthlyDataLocalDebug[month]?.[estado] || 0)
                            }));
                            console.log("Bar Datasets:", JSON.stringify(barDatasetsLocalDebug, null, 2));

                            if (window.exportChartsToPDF) {
                                await window.exportChartsToPDF('#tempChartsContainer', '#filteredPieChart, #filteredBarChart', anio, statsForTable);
                            } else {
                                console.error("La función exportChartsToPDF no está definida.");
                                alert("Error al intentar exportar: la función de exportación no está disponible.");
                            }
                        } catch (exportError) { 
                            console.error("Error durante la recolección de datos o exportación a PDF:", exportError);
                            showNotification('Error durante la exportación a PDF.', true);
                        } finally { 
                            const tempContainer = document.getElementById('tempChartsContainer');
                            if (tempContainer) {
                                tempContainer.remove();
                            }
                            hideLoader(); 
                        }
                    }); 
                } 
            }, // Cierre de animation
            plugins: { // plugins al mismo nivel que scales y animation
                title: { display: true, text: 'Casos por Mes (Filtrado)', font: { size: 20, weight: 'bold' } },
                legend: { position: 'top', labels: {font: {size: 14}}}
            } 
        } 
    }); 
} 


// Event listener para el nuevo botón de exportar PDF en casos.html
// y para asegurar el estado inicial del botón.
document.addEventListener('DOMContentLoaded', () => {
    const exportPdfCasosBtn = document.getElementById('export-pdf-casos');
    if (exportPdfCasosBtn) {
        exportPdfCasosBtn.addEventListener('click', exportFilteredChartsToPDF);
        // Asegurar estado visual inicial si ya está disabled en el HTML
        if (exportPdfCasosBtn.disabled) {
            exportPdfCasosBtn.classList.add('disabled-look');
        }
    }
});

export function clearFilter() {
    showLoader();
    try {
        const filterFieldSelect = document.getElementById('filterField');
    const filterValueInput = document.getElementById('filterValue');

    if (filterFieldSelect) {
        filterFieldSelect.value = ""; // Restablece el selector a "Todos los campos"
    }
    if (filterValueInput) {
        filterValueInput.value = ''; // Limpia el campo de entrada de texto
    }
    // // Vuelve a poblar la tabla con todos los datos originales y su orden por defecto
    // if (filterInput) {
    //     filterInput.value = ''; // Limpia el campo de entrada
    // }
    // Vuelve a poblar la tabla con todos los datos originales
    // Esto asegura que todos los elementos sean visibles de nuevo y se reordenen
    populateTable(getCasosData());
    showNotification('Filtro limpiado y tabla restaurada.');
    
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

export function exportTableToExcel() {
    showLoader();
    try {
        const dataToExport = getCasosData(); // Llama a la función para obtener los datos

    if (!dataToExport || dataToExport.length === 0) {
        showNotification('No hay datos para exportar.', true);
        return;
    }

    const ws = XLSX.utils.json_to_sheet(dataToExport.map(caso => ({
        'OBC - COD': generateAlphanumericId(caso._id),
        'Tipo de Obra': caso.tipo_obra,
        'Parroquia': caso.parroquia,
        'Circuito': caso.circuito,
        'Eje': caso.eje,
        'Comuna': caso.comuna,
        'Código Comunal': caso.codigoComuna,
        'Nombre JC': caso.nameJC,
        'Nombre JU': caso.nameJU,
        'Enlace Comunal': caso.enlaceComunal,
        'Descripción': caso.caseDescription,
        'Fecha de Inicio': caso.caseDate ? new Date(caso.caseDate).toLocaleDateString() : 'N/A',
        'Fecha de Entrega': caso.fechaEntrega && caso.estado === 'Entregado' ? new Date(caso.fechaEntrega).toLocaleDateString() : 'N/A',
        'Archivo': caso.archivo ? `http://localhost:3000/uploads/pdfs/${caso.archivo}` : 'N/A',
        'Estado': caso.estado,
        'Actuaciones': Array.isArray(caso.actuaciones) ? caso.actuaciones.map(act => {
            const date = act.fecha ? new Date(act.fecha).toLocaleString() : 'Fecha desconocida';
            const user = act.usuario ? `(${act.usuario})` : '';
            return `${user} ${date}: ${act.descripcion}`;
        }).join('; ') : 'N/A',
        'Modificaciones': Array.isArray(caso.modificaciones) ? caso.modificaciones.map(mod => {
            const date = mod.fecha ? new Date(mod.fecha).toLocaleString() : 'Fecha desconocida';
            const user = mod.usuario ? `(${mod.usuario})` : '';
            if (mod.campo === 'revisión') {
                return `${user} ${date}: Revisión sin cambios específicos`;
            }
            return `${user} ${date}: ${mod.campo} de '${mod.valorAntiguo}' a '${mod.valorNuevo}'`;
        }).join('; ') : 'N/A'
    })));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Casos");

    // Obtener fecha actual y formatearla para el nombre del archivo
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Meses son 0-indexados, +1 y padStart
    const day = String(today.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    const fileName = `Casos_${formattedDate}.xlsx`;

    XLSX.writeFile(wb, fileName);
    showNotification(`Tabla exportada a Excel como ${fileName} exitosamente.`);
    } finally {
        hideLoader();
    }
}