// scripts/charts_renderer.js

// La función para renderizar los gráficos
async function renderCharts() {
    try {
        const response = await fetch('http://localhost:3000/casos');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const casos = await response.json();

        // --- Gráfico de Pastel (Distribución por Estado) ---
        const estadoCounts = {};
        casos.forEach(caso => {
            // Asegúrate de que el estado exista, si no, usa un valor por defecto o ignóralo
            const estado = caso.estado || 'Desconocido';
            estadoCounts[estado] = (estadoCounts[estado] || 0) + 1;
        });

        const pieLabels = Object.keys(estadoCounts);
        const pieData = Object.values(estadoCounts);

        // ¡MODIFICADO: Definición de colores con verde para 'Entregado'!
        const pieColors = pieLabels.map(label => {
            if (label === 'Entregado') return '#28a745'; // Verde para 'Entregado'
            if (label === 'Cargado') return '#6c757d'; // Gris 
            if (label === 'Supervisado') return '#007bff'; // Azul
            if (label === 'En Desarrollo') return '#ffc107'; // Naranja/Amarillo
            return '#FF6384'; // Color por defecto para otros estados o 'Desconocido'
        });

        const pieCtx = document.getElementById('pieChart');
        if (pieCtx) { // Asegúrate de que el canvas exista
            // Destruye el gráfico existente si lo hay para evitar superposiciones al actualizar
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
                options: {
                    responsive: true,
                    maintainAspectRatio: false, // Permitir que el gráfico ajuste su tamaño
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
        const monthlyData = {}; // { 'YYYY-MM': { 'Cargado': 5, 'Supervisado': 2, ... } }

        casos.forEach(caso => {
            const date = new Date(caso.caseDate);
            // Verifica si la fecha es válida
            if (isNaN(date.getTime())) {
                console.warn(`Fecha inválida para el caso ID ${caso.id}: ${caso.caseDate}`);
                return; // Saltar este caso si la fecha no es válida
            }
            const yearMonth = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`; // Formato YYYY-MM

            // ¡MODIFICADO: Inicializa 'Entregado' en lugar de 'Finalizado'!
            if (!monthlyData[yearMonth]) {
                monthlyData[yearMonth] = {
                    'Cargado': 0,
                    'Supervisado': 0,
                    'En Desarrollo': 0,
                    'Entregado': 0 // ¡MODIFICADO: 'Entregado' en lugar de 'Finalizado'!
                };
            }
            // Asegúrate de que el estado sea uno de los reconocidos para los gráficos
            const estado = caso.estado;
            if (monthlyData[yearMonth][estado] !== undefined) {
                monthlyData[yearMonth][estado]++;
            }
        });

        const barLabels = Object.keys(monthlyData).sort(); // Ordenar los meses
        const barDatasets = [];

        // ¡MODIFICADO: 'Entregado' en lugar de 'Finalizado' en la lista de estados para la barra!
        const estadosParaBarra = ['Cargado', 'Supervisado', 'En Desarrollo', 'Entregado'];
        const barColors = {
            'Cargado': 'rgba(108, 117, 125, 0.7)',    // Azul, consistente con el pie
            'Supervisado': 'rgba(0, 123, 255, 0.7)', // Gris, consistente con el pie
            'En Desarrollo': 'rgba(255, 193, 7, 0.7)', // Naranja/Amarillo, consistente con el pie
            'Entregado': 'rgba(40, 167, 69, 0.7)'   // ¡MODIFICADO: Verde para 'Entregado'!
        };
        const barBorders = {
            'Cargado': 'rgba(108, 117, 125, 0.7)',    // Azul, consistente con el pie
            'Supervisado': 'rgba(0, 123, 255, 0.7)',
            'En Desarrollo': 'rgba(255, 193, 7, 1)',
            'Entregado': 'rgba(40, 167, 69, 1)' // ¡MODIFICADO: Borde verde para 'Entregado'!
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
        if (barCtx) { // Asegúrate de que el canvas exista
            // Destruye el gráfico existente si lo hay para evitar superposiciones al actualizar
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
        showNotification('No se pudieron cargar los datos para los gráficos. Asegúrate de que json-server esté funcionando.', true);
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