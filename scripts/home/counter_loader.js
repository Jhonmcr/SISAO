// scripts/counter_loader.js
import { showNotification } from '../utils.js'; // Asegúrate que esta línea SÍ esté

const totalCasosCargadosCounter = document.getElementById('totalCasosCargados');
const casosEnEsperaCounter = document.getElementById('casosCargados');
const casosSupervisarCounter = document.getElementById('casosSupervisar');
const casosEnDesarrolloCounter = document.getElementById('casosEnDesarrollo');
const casosFinalizadosCounter = document.getElementById('casosFinalizados');

async function loadCasesCounters() {
    try {
        // CAMBIO 1: Modificar el fetch para obtener muchos casos (o todos si son pocos)
        const response = await fetch('http://localhost:3000/casos?limit=10000'); 
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        // CAMBIO 2: Obtener el objeto de respuesta y luego el array de casos
        const responseData = await response.json(); 
        const casosArray = responseData.casos; // <--- Acceder al array

        // CAMBIO 3: Añadir una verificación por si casosArray no es un array
        if (!Array.isArray(casosArray)) {
            console.error("Error: responseData.casos no es un array para los contadores", responseData);
            showNotification('Error al procesar los datos de los casos para los contadores.', true); // Asumo que 'true' es para isError
            return; 
        }

        // CAMBIO 4: Usar responseData.totalCasos para el conteo total
        let totalCount = responseData.totalCasos; 
        let cargadosCount = 0;
        let supervisarCount = 0;
        let enDesarrolloCount = 0;
        let finalizadosCount = 0;

        // CAMBIO 5: Iterar sobre casosArray
        casosArray.forEach(caso => {
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
                    cargadosCount++; 
            }
        });

        if (totalCasosCargadosCounter) totalCasosCargadosCounter.textContent = totalCount;
        if (casosEnEsperaCounter) casosEnEsperaCounter.textContent = cargadosCount;
        if (casosSupervisarCounter) casosSupervisarCounter.textContent = supervisarCount;
        if (casosEnDesarrolloCounter) casosEnDesarrolloCounter.textContent = enDesarrolloCount;
        if (casosFinalizadosCounter) casosFinalizadosCounter.textContent = finalizadosCount;

    } catch (error) {
        console.error('Error al cargar los contadores de casos:', error);
        if (totalCasosCargadosCounter) totalCasosCargadosCounter.textContent = 'Error';
        if (casosEnEsperaCounter) casosEnEsperaCounter.textContent = 'Error';
        if (casosSupervisarCounter) casosSupervisarCounter.textContent = 'Error';
        if (casosEnDesarrolloCounter) casosEnDesarrolloCounter.textContent = 'Error';
        if (casosFinalizadosCounter) casosFinalizadosCounter.textContent = 'Error';
        showNotification('Error al cargar los contadores.', true);
    }
}

document.addEventListener('DOMContentLoaded', loadCasesCounters);
document.addEventListener('caseDataChanged', loadCasesCounters);