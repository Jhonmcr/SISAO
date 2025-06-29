// scripts/counter_loader.js

const totalCasosCargadosCounter = document.getElementById('totalCasosCargados');
const casosEnEsperaCounter = document.getElementById('casosCargados'); // Corregido para el id "casosCargados"
const casosSupervisarCounter = document.getElementById('casosSupervisar');
const casosEnDesarrolloCounter = document.getElementById('casosEnDesarrollo');
const casosFinalizadosCounter = document.getElementById('casosFinalizados');

/**
 * Carga los casos desde el servidor y actualiza los contadores en la página.
 */
async function loadCasesCounters() {
    try {
        const response = await fetch('http://localhost:3000/casos');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const casos = await response.json();

        let totalCount = casos.length;
        let cargadosCount = 0;
        let supervisarCount = 0;
        let enDesarrolloCount = 0;
        let finalizadosCount = 0;

        casos.forEach(caso => {
            switch (caso.estado) {
                case 'Cargado':
                    cargadosCount++;
                    break;
                case 'Supervisado':
                    supervisarCount++;
                    break;
                case 'En Desarrollo':
                    enDesarrolloCount++;
                    break;
                case 'Entregado':
                    finalizadosCount++;
                    break;
                default:
                    // Si el estado no está definido o es desconocido, lo contamos como cargado (en espera)
                    cargadosCount++; 
            }
        });

        // Actualizar los elementos en el DOM
        if (totalCasosCargadosCounter) totalCasosCargadosCounter.textContent = totalCount;
        if (casosEnEsperaCounter) casosEnEsperaCounter.textContent = cargadosCount;
        if (casosSupervisarCounter) casosSupervisarCounter.textContent = supervisarCount;
        if (casosEnDesarrolloCounter) casosEnDesarrolloCounter.textContent = enDesarrolloCount;
        if (casosFinalizadosCounter) casosFinalizadosCounter.textContent = finalizadosCount;

    } catch (error) {
        console.error('Error al cargar los contadores de casos:', error);
        // Si hay un error, mostrar 'Error' en los contadores y una notificación
        if (totalCasosCargadosCounter) totalCasosCargadosCounter.textContent = 'Error';
        if (casosEnEsperaCounter) casosEnEsperaCounter.textContent = 'Error';
        if (casosSupervisarCounter) casosSupervisarCounter.textContent = 'Error';
        if (casosEnDesarrolloCounter) casosEnDesarrolloCounter.textContent = 'Error';
        if (casosFinalizadosCounter) casosFinalizadosCounter.textContent = 'Error';
        showNotification('Error al cargar los contadores.', true);
    }
}

// Cargar los contadores cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', loadCasesCounters);

// Escuchar el evento personalizado cuando un caso ha sido subido o modificado
document.addEventListener('caseDataChanged', loadCasesCounters);