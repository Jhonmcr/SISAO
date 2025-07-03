// scripts/charts_renderer.js
import { showNotification } from '../utils.js'; // Asegúrate que esta línea SÍ esté

async function renderCharts() {
    try {
        // LÓGICA DEL PRIMER CÓDIGO (MEJORADA PARA FETCH Y ESTRUCTURA DE DATOS)
        // CAMBIO 1: Modificar el fetch para incluir el límite y obtener el objeto
        const response = await fetch('http://localhost:3000/casos?limit=10000');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        // CAMBIO 2: Obtener el objeto y luego el array 'casos'
        const responseData = await response.json();
        const casosArray = responseData.casos; // <--- Acceder al array

        // CAMBIO 3: Añadir verificación para asegurar que es un array
        if (!Array.isArray(casosArray)) {
            console.error("Error: responseData.casos no es un array para los gráficos", responseData);
            showNotification('Error al procesar los datos de los casos para los gráficos.', true);
            return;
        }

        // --- Gráfico de Pastel (Distribución por Estado) ---
        const estadoCounts = {};
        // CAMBIO 4: Iterar sobre casosArray (lógica del primer código)
        casosArray.forEach(caso => {
            const estado = caso.estado || 'Desconocido';
            estadoCounts[estado] = (estadoCounts[estado] || 0) + 1;
        });

        const pieLabels = Object.keys(estadoCounts);
        const pieData = Object.values(estadoCounts);

        // Colores y lógica de mapeo de colores del SEGUNDO CÓDIGO (con tu ajuste para 'Entregado')
        const pieColors = pieLabels.map(label => {
            if (label === 'Entregado') return '#28a745'; // Verde para 'Entregado'
            if (label === 'Cargado') return '#6c757d'; // Gris
            if (label === 'Supervisado') return '#007bff'; // Azul
            if (label === 'En Desarrollo') return '#ffc107'; // Naranja/Amarillo
            return '#FF6384'; // Color por defecto para otros estados o 'Desconocido'
        });

        const pieCtx = document.getElementById('pieChart');
        if (pieCtx) {
            if (pieCtx.chart) {
                pieCtx.chart.destroy();
            }
            const pieChartContext = pieCtx.getContext('2d', { willReadFrequently: true });
            pieCtx.chart = new Chart(pieChartContext, {
                type: 'pie',
                data: {
                    labels: pieLabels,
                    datasets: [{
                        data: pieData,
                        backgroundColor: pieColors, // Usa los colores mapeados
                        borderColor: '#fff', // Borde blanco para mejor separación
                        borderWidth: 1
                    }]
                },
                // OPCIONES DE GRÁFICO DE PASTEL DEL SEGUNDO CÓDIGO
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Distribución de Casos',
                            font: { size: 16 }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    if (context.parsed !== null) {
                                        label += context.parsed;
                                        const total = context.dataset.data.reduce((acc, current) => acc + current, 0);
                                        const percentage = ((context.parsed / total) * 100).toFixed(2) + '%';
                                        label += ` (${percentage})`;
                                    }
                                    return label;
                                }
                            }
                        },
                        legend: {
                            position: 'right', // Puedes ajustar la posición de la leyenda
                        }
                    }
                }
            });
        }

        // --- Gráfico de Barras (Casos por Estado y Mes) ---
        const monthlyData = {};
        // CAMBIO 5: Iterar sobre casosArray (lógica del primer código)
        casosArray.forEach(caso => {
            const date = new Date(caso.caseDate);
            if (isNaN(date.getTime())) {
                console.warn(`Fecha inválida para el caso ID ${caso.id}: ${caso.caseDate}`);
                return;
            }
            const yearMonth = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;

            // Lógica de inicialización con 'Entregado' del SEGUNDO CÓDIGO
            if (!monthlyData[yearMonth]) {
                monthlyData[yearMonth] = {
                    'Cargado': 0,
                    'Supervisado': 0,
                    'En Desarrollo': 0,
                    'Entregado': 0
                };
            }
            const estado = caso.estado;
            if (monthlyData[yearMonth][estado] !== undefined) {
                monthlyData[yearMonth][estado]++;
            }
        });

        const barLabels = Object.keys(monthlyData).sort();
        const barDatasets = [];

        // Colores y bordes para la barra del SEGUNDO CÓDIGO (con tu ajuste para 'Entregado')
        const estadosParaBarra = ['Cargado', 'Supervisado', 'En Desarrollo', 'Entregado'];
        const barColors = {
            'Cargado': 'rgba(108, 117, 125, 0.7)',
            'Supervisado': 'rgba(0, 123, 255, 0.7)',
            'En Desarrollo': 'rgba(255, 193, 7, 0.7)',
            'Entregado': 'rgba(40, 167, 69, 0.7)'
        };
        const barBorders = {
            'Cargado': 'rgba(108, 117, 125, 1)',
            'Supervisado': 'rgba(0, 123, 255, 1)',
            'En Desarrollo': 'rgba(255, 193, 7, 1)',
            'Entregado': 'rgba(40, 167, 69, 1)'
        };

        estadosParaBarra.forEach(estado => {
            const dataForEstado = barLabels.map(month => monthlyData[month][estado] || 0);
            barDatasets.push({
                label: estado,
                data: dataForEstado,
                backgroundColor: barColors[estado],
                borderColor: barBorders[estado],
                borderWidth: 1
            });
        });

        const barCtx = document.getElementById('barChart');
        if (barCtx) {
            if (barCtx.chart) {
                barCtx.chart.destroy();
            }
            const barChartContext = barCtx.getContext('2d', { willReadFrequently: true });
            barCtx.chart = new Chart(barChartContext, {
                type: 'bar',
                data: {
                    labels: barLabels,
                    datasets: barDatasets
                },
                // OPCIONES DE GRÁFICO DE BARRAS DEL SEGUNDO CÓDIGO
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            stacked: true, // Para barras apiladas por estado
                            title: {
                                display: true,
                                text: 'Mes/Año'
                            }
                        },
                        y: {
                            stacked: true, // Para barras apiladas por estado
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Número de Casos'
                            },
                            ticks: {
                                precision: 0 // Asegura que los ticks sean números enteros
                            }
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Casos por Mes/Año',
                            font: { size: 16 }
                        }
                    }
                }
            });
        }

    } catch (error) {
        console.error('Error al cargar datos para los gráficos:', error);
        showNotification('No se pudieron cargar los datos para los gráficos. Asegúrate de que tu servidor de datos esté funcionando y respondiendo correctamente.', true);
    }
}

// Cargar los gráficos cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', renderCharts);

// Escuchar el evento personalizado cuando un caso ha sido subido o modificado
document.addEventListener('caseDataChanged', renderCharts);

// Event listener para el botón de exportar PDF en home.html
document.addEventListener('DOMContentLoaded', () => {
    const exportButtonHome = document.getElementById('export-pdf-home');
    if (exportButtonHome) {
        exportButtonHome.addEventListener('click', () => {
            const anioActual = new Date().getFullYear();
            
            // Recolectar los datos de las estadísticas para la tabla
            const statsData = [
                // { label: "Estadísticas Generales", isTitle: true }, // Título opcional si se maneja en exportHomeDataToPDF
                { label: "Casos Cargados", value: document.getElementById('totalCasosCargados')?.textContent || 'N/A' },
                { label: "Casos Supervisados", value: document.getElementById('casosSupervisar')?.textContent || 'N/A' },
                { label: "Casos en Desarrollo", value: document.getElementById('casosEnDesarrollo')?.textContent || 'N/A' },
                { label: "Casos Entregados", value: document.getElementById('casosFinalizados')?.textContent || 'N/A' }
            ];

            if (window.exportHomeDataToPDF) {
                // Se llama a la nueva función específica para el home
                window.exportHomeDataToPDF('.contentEstGrafic', '#pieChart, #barChart', statsData, anioActual);
            } else {
                console.error("La función exportHomeDataToPDF no está definida.");
                alert("Error al intentar exportar: la función de exportación no está disponible.");
            }
        });
    }
});