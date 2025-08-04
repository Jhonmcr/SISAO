// Importa la función showNotification desde el archivo utils.js para mostrar mensajes al usuario.
import { showNotification } from '../utils.js'; 
import { getApiBaseUrlAsync } from '../config.js';



/**
 * @file scripts/home/charts_renderer.js
 * @description Este archivo se encarga de obtener los datos de los casos y renderizar dos tipos de gráficos
 * en la página de inicio: un gráfico de pastel para la distribución de casos por estado y un gráfico de barras
 * para la cantidad de casos por estado y mes. También maneja la exportación de estos gráficos y estadísticas a PDF.
 */

/**
 * Función asíncrona principal para obtener datos y renderizar los gráficos.
 * Se comunica con el backend para obtener los casos, procesa estos datos y
 * utiliza la librería Chart.js para dibujar un gráfico de pastel y un gráfico de barras.
 * También maneja errores durante el proceso y muestra notificaciones al usuario.
 */
async function renderCharts() {
    try {
        const API_BASE_URL = await getApiBaseUrlAsync();
        const fullUrl = `${API_BASE_URL}/casos?limit=10000`;
        //console.log('[charts_renderer.js] Intentando fetch con URL:', fullUrl);
        // Realiza una petición fetch para obtener todos los casos. Se usa un límite alto para asegurar traer todos los datos.

        const response = await fetch(fullUrl);
        // Verifica si la respuesta de la petición fue exitosa.
        if (!response.ok) {
            // Si no fue exitosa, lanza un error con el estado HTTP.
            throw new Error(`Error HTTP! estado: ${response.status}`);
        }
        // Convierte la respuesta a formato JSON.
        const responseData = await response.json();
        // Accede al array de casos dentro de la respuesta. Se asume que la respuesta tiene una propiedad 'casos'.
        const casosArray = responseData.casos; 

        // Verifica si 'casosArray' es efectivamente un array.
        if (!Array.isArray(casosArray)) {
            // Si no es un array, muestra un error en consola y una notificación al usuario.
            console.error("Error: responseData.casos no es un array para los gráficos", responseData);
            showNotification('Error al procesar los datos de los casos para los gráficos.', true);
            return; // Termina la ejecución de la función si los datos no son válidos.
        }

        // --- GRÁFICO DE PASTEL (Distribución de Casos por Estado) ---
        // Objeto para contar la cantidad de casos por cada estado.
        const estadoCounts = {};
        // Itera sobre cada caso en el array 'casosArray'.
        casosArray.forEach(caso => {
            // Obtiene el estado del caso. Si no tiene estado, se asigna 'Desconocido'.
            const estado = caso.estado || 'Desconocido';
            // Incrementa el contador para el estado correspondiente.
            estadoCounts[estado] = (estadoCounts[estado] || 0) + 1;
        });

        // Obtiene las etiquetas (nombres de los estados) para el gráfico de pastel.
        const pieLabels = Object.keys(estadoCounts);
        // Obtiene los datos (cantidad de casos por estado) para el gráfico de pastel.
        const pieData = Object.values(estadoCounts);

        // Define los colores para cada sección del gráfico de pastel.
        const pieColors = pieLabels.map(label => {
            if (label === 'Entregado') return '#28a745'; // Verde para 'Entregado'
            if (label === 'Cargado') return '#6c757d'; // Gris para 'Cargado'
            if (label === 'Supervisado') return '#007bff'; // Azul para 'Supervisado'
            if (label === 'En Desarrollo') return '#ffc107'; // Naranja/Amarillo para 'En Desarrollo'
            return '#FF6384'; // Color rosa por defecto para otros estados o 'Desconocido'.
        });

        // Obtiene el elemento canvas donde se renderizará el gráfico de pastel.
        const pieCtx = document.getElementById('pieChart');
        // Verifica si el elemento canvas existe.
        if (pieCtx) {
            // Si ya existe un gráfico en este canvas, lo destruye para crear uno nuevo.
            // Esto es útil si la función renderCharts se llama múltiples veces (ej. al actualizar datos).
            if (pieCtx.chart) {
                pieCtx.chart.destroy();
            }
            // Obtiene el contexto 2D del canvas. 'willReadFrequently' es una optimización.
            const pieChartContext = pieCtx.getContext('2d', { willReadFrequently: true });
            // Crea una nueva instancia de Chart (gráfico de pastel).
            pieCtx.chart = new Chart(pieChartContext, {
                type: 'pie', // Tipo de gráfico.
                data: {
                    labels: pieLabels, // Etiquetas para cada sección.
                    datasets: [{
                        data: pieData, // Datos numéricos para cada sección.
                        backgroundColor: pieColors, // Colores de fondo para cada sección.
                        borderColor: '#fff', // Color del borde de cada sección.
                        borderWidth: 1 // Ancho del borde.
                    }]
                },
                options: {
                    responsive: true, // Hace el gráfico responsivo al tamaño del contenedor.
                    maintainAspectRatio: false, // Permite que el gráfico no mantenga una relación de aspecto fija, adaptándose mejor.
                    plugins: {
                        title: { // Configuración del título del gráfico.
                            display: true,
                            text: 'Distribución de Casos', // Texto del título.
                            font: { size: 16 } // Tamaño de la fuente del título.
                        },
                        tooltip: { // Configuración de los tooltips (información que aparece al pasar el ratón).
                            callbacks: {
                                // Función para personalizar el texto del tooltip.
                                label: function(context) {
                                    let label = context.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    if (context.parsed !== null) {
                                        label += context.parsed; // Añade el valor numérico.
                                        // Calcula y añade el porcentaje.
                                        const total = context.dataset.data.reduce((acc, current) => acc + current, 0);
                                        const percentage = ((context.parsed / total) * 100).toFixed(2) + '%';
                                        label += ` (${percentage})`;
                                    }
                                    return label;
                                }
                            }
                        },
                        legend: { // Configuración de la leyenda.
                            position: 'right', // Posición de la leyenda.
                        }
                    }
                }
            });
        }

        // --- GRÁFICO DE BARRAS (Casos por Estado y Mes) ---
        // Objeto para almacenar los datos agrupados por mes y estado.
        const monthlyData = {};
        // Itera sobre cada caso.
        casosArray.forEach(caso => {
            let date;
            // Si el caso está 'Entregado' y tiene una fecha de entrega, usar esa fecha.
            if (caso.estado === 'Entregado' && caso.fechaEntrega) {
                date = new Date(caso.fechaEntrega);
            } else {
                // Para todos los demás estados, usar la fecha de inicio del caso.
                date = new Date(caso.caseDate);
            }

            // Verifica si la fecha es válida.
            if (isNaN(date.getTime())) {
                //console.warn(`Fecha inválida para el caso ID ${caso._id}. Estado: ${caso.estado}. Fecha usada: ${caso.estado === 'Entregado' ? caso.fechaEntrega : caso.caseDate}`);
                return; // Salta este caso si la fecha no es válida.
            }
            // Formatea la fecha como 'YYYY-MM' usando UTC para evitar errores de zona horaria.
            const yearMonth = `${date.getUTCFullYear()}-${(date.getUTCMonth() + 1).toString().padStart(2, '0')}`;

            // Si no existe una entrada para este mes/año, la inicializa con contadores en 0 para cada estado.
            if (!monthlyData[yearMonth]) {
                monthlyData[yearMonth] = {
                    'Cargado': 0,
                    'Supervisado': 0,
                    'En Desarrollo': 0,
                    'Entregado': 0
                    // Asegurarse que todos los estados posibles estén aquí si se quieren barras apiladas consistentes.
                };
            }
            // Obtiene el estado del caso actual.
            const estado = caso.estado;
            // Si el estado es uno de los que se rastrean, incrementa su contador para el mes/año correspondiente.
            if (monthlyData[yearMonth][estado] !== undefined) {
                monthlyData[yearMonth][estado]++;
            }
        });

        // Obtiene las etiquetas (meses/años) para el eje X del gráfico de barras, ordenadas cronológicamente.
        const barLabels = Object.keys(monthlyData).sort();
        // Array para almacenar los datasets (series de datos) para el gráfico de barras.
        const barDatasets = [];

        // Define los estados y sus colores correspondientes para el gráfico de barras.
        const estadosParaBarra = ['Cargado', 'Supervisado', 'En Desarrollo', 'Entregado'];
        const barColors = {
            'Cargado': 'rgba(108, 117, 125, 0.7)', // Gris
            'Supervisado': 'rgba(0, 123, 255, 0.7)', // Azul
            'En Desarrollo': 'rgba(255, 193, 7, 0.7)', // Amarillo/Naranja
            'Entregado': 'rgba(40, 167, 69, 0.7)' // Verde
        };
        const barBorders = { // Colores de borde para las barras.
            'Cargado': 'rgba(108, 117, 125, 1)',
            'Supervisado': 'rgba(0, 123, 255, 1)',
            'En Desarrollo': 'rgba(255, 193, 7, 1)',
            'Entregado': 'rgba(40, 167, 69, 1)'
        };

        // Itera sobre cada estado definido para crear un dataset para el gráfico de barras.
        estadosParaBarra.forEach(estado => {
            // Mapea los datos de cada mes para el estado actual. Si no hay datos, usa 0.
            const dataForEstado = barLabels.map(month => monthlyData[month][estado] || 0);
            // Añade el nuevo dataset al array.
            barDatasets.push({
                label: estado, // Nombre del estado (ej. 'Cargado').
                data: dataForEstado, // Array de datos (cantidad de casos por mes para este estado).
                backgroundColor: barColors[estado], // Color de fondo de las barras.
                borderColor: barBorders[estado], // Color del borde de las barras.
                borderWidth: 1 // Ancho del borde.
            });
        });

        // Obtiene el elemento canvas donde se renderizará el gráfico de barras.
        const barCtx = document.getElementById('barChart');
        // Verifica si el elemento canvas existe.
        if (barCtx) {
            // Si ya existe un gráfico en este canvas, lo destruye.
            if (barCtx.chart) {
                barCtx.chart.destroy();
            }
            // Obtiene el contexto 2D del canvas.
            const barChartContext = barCtx.getContext('2d', { willReadFrequently: true });
            // Crea una nueva instancia de Chart (gráfico de barras).
            barCtx.chart = new Chart(barChartContext, {
                type: 'bar', // Tipo de gráfico.
                data: {
                    labels: barLabels, // Etiquetas para el eje X (meses/años).
                    datasets: barDatasets // Series de datos (una por cada estado).
                },
                options: {
                    responsive: true, // Hace el gráfico responsivo.
                    maintainAspectRatio: false, // Permite que el gráfico no mantenga una relación de aspecto fija.
                    scales: { // Configuración de los ejes.
                        x: { // Eje X (horizontal).
                            stacked: true, // Apila las barras de diferentes datasets (estados) para cada mes.
                            title: {
                                display: true,
                                text: 'Mes/Año' // Título del eje X.
                            }
                        },
                        y: { // Eje Y (vertical).
                            stacked: true, // Apila las barras.
                            beginAtZero: true, // El eje Y comienza en 0.
                            title: {
                                display: true,
                                text: 'Número de Casos' // Título del eje Y.
                            },
                            ticks: { // Configuración de las marcas/etiquetas del eje Y.
                                precision: 0 // Asegura que los números en el eje Y sean enteros.
                            }
                        }
                    },
                    plugins: { // Configuración de plugins adicionales.
                        title: { // Título del gráfico.
                            display: true,
                            text: 'Casos por Mes/Año', // Texto del título.
                            font: { size: 16 } // Tamaño de fuente del título.
                        }
                    }
                }
            });
        }

    } catch (error) {
        // Si ocurre cualquier error durante el proceso, se captura aquí.
        console.error('Error al cargar datos para los gráficos:', error);
        // Muestra una notificación de error al usuario.
        showNotification('No se pudieron cargar los datos para los gráficos. Asegúrate de que tu servidor de datos esté funcionando y respondiendo correctamente.', true);
    }
}

// Event Listener: Ejecuta renderCharts cuando el contenido del DOM está completamente cargado.
document.addEventListener('DOMContentLoaded', renderCharts);

// Event Listener: Escucha un evento personalizado 'caseDataChanged'.
// Este evento debería ser disparado desde otras partes del código cuando los datos de los casos cambian (ej. al agregar un nuevo caso).
// Al recibir el evento, vuelve a renderizar los gráficos para reflejar los cambios.
document.addEventListener('caseDataChanged', renderCharts);


// Event Listener para el botón de exportar PDF en la página de inicio (home.html).
// Se ejecuta cuando el DOM está completamente cargado.
document.addEventListener('DOMContentLoaded', () => {
    // Obtiene el botón de exportar PDF por su ID.
    const exportButtonHome = document.getElementById('export-pdf-home');
    // Verifica si el botón existe.
    if (exportButtonHome) {
        // Añade un event listener para el evento 'click'.
        exportButtonHome.addEventListener('click', () => {
            // Obtiene el año actual para incluirlo en el nombre del archivo PDF o en su contenido.
            const anioActual = new Date().getFullYear();
            
            // Recolecta los datos de las estadísticas mostradas en los contadores para incluirlos en el PDF.
            const statsData = [
                // { label: "Estadísticas Generales", isTitle: true }, // Ejemplo de cómo se podría añadir un título a la tabla de estadísticas.
                { label: "Casos Cargados", value: document.getElementById('totalCasosCargados')?.textContent || 'N/A' },
                { label: "Casos Supervisados", value: document.getElementById('casosSupervisar')?.textContent || 'N/A' },
                { label: "Casos en Desarrollo", value: document.getElementById('casosEnDesarrollo')?.textContent || 'N/A' },
                { label: "Casos Entregados", value: document.getElementById('casosFinalizados')?.textContent || 'N/A' }
            ];

            // Verifica si la función global 'exportHomeDataToPDF' (definida en export_pdf.js) está disponible.
            if (window.exportHomeDataToPDF) {
                // Llama a la función para exportar los datos de la página de inicio a PDF.
                // Argumentos: selector del contenedor de gráficos, selectores de los canvas de los gráficos, datos de estadísticas, año actual.
                window.exportHomeDataToPDF('.contentEstGrafic', '#pieChart, #barChart', statsData, anioActual);
            } else {
                // Si la función no está definida, muestra un error en consola y una alerta al usuario.
                console.error("La función exportHomeDataToPDF no está definida.");
                alert("Error al intentar exportar: la función de exportación no está disponible.");
            }
        });
    }
});