// Importa la función showNotification desde utils.js para mostrar mensajes al usuario.
import { showNotification } from '../utils.js';
import { getApiBaseUrlAsync } from '../config.js';



/**
 * @file scripts/home/counter_loader.js
 * @description Este script se encarga de cargar y mostrar los contadores de casos
 * (total, cargados, supervisados, en desarrollo, finalizados) en la página de inicio.
 * Obtiene los datos del backend y actualiza los elementos HTML correspondientes.
 */

// Obtención de los elementos HTML donde se mostrarán los contadores.
// Se espera que estos IDs existan en el archivo home.html.
const casosObraEnProyeccionCounter = document.getElementById('casosObraEnProyeccion'); // Contador para el total de casos.
const casosObraEnEjecucionCounter = document.getElementById('casosObraEnEjecucion'); // Contador para casos 'Supervisado'.
const casosObraEjecutadaCounter = document.getElementById('casosObraEjecutada'); // Contador para casos 'En Desarrollo'.
const casosObraCulminadaCounter = document.getElementById('casosObraCulminada'); // Contador para casos 'Entregado/Finalizado'.

/**
 * Función asíncrona para cargar los datos de los casos y actualizar los contadores en la página.
 * Realiza una petición fetch al backend, procesa la respuesta y actualiza el contenido
 * de los elementos HTML con las cifras correspondientes.
 * Maneja errores mostrando 'Error' en los contadores y una notificación al usuario.
 */
async function loadCasesCounters() {
    try {
        const API_BASE_URL = await getApiBaseUrlAsync();
        const fullUrl = `${API_BASE_URL}/casos?limit=10000`;
        //console.log('[counter_loader.js] Intentando fetch con URL:', fullUrl);
        // Realiza una petición fetch para obtener todos los casos.
        // Se usa un límite alto para asegurar que se obtengan todos los casos para el conteo.
        // en lugar de traer todos los datos de los casos al frontend para contarlos aquí.
        const response = await fetch(fullUrl); 
        // Verifica si la respuesta de la petición fue exitosa.
        if (!response.ok) {
            // Si no fue exitosa, lanza un error con el estado HTTP.
            throw new Error(`Error HTTP! estado: ${response.status}`); 
        }
        // Convierte la respuesta a formato JSON.
        const responseData = await response.json(); 
        // Accede al array de casos. Se asume que la respuesta contiene una propiedad 'casos'.
        const casosArray = responseData.casos; 

        // Verifica si 'casosArray' es un array.
        if (!Array.isArray(casosArray)) {
            // Si no es un array, muestra un error en consola y una notificación.
            console.error("Error: responseData.casos no es un array para los contadores", responseData);
            showNotification('Error al procesar los datos de los casos para los contadores.', true); // true indica que es un mensaje de error.
            return; // Termina la ejecución si los datos no son válidos.
        }

        // Obtiene el número total de casos directamente de la respuesta del backend (propiedad 'totalCasos').
        let totalCount = responseData.totalCasos; 
        // Inicializa los contadores para cada estado.
        let cargadosCount = 0;
        let supervisarCount = 0;
        let enDesarrolloCount = 0;
        let finalizadosCount = 0;

        // Itera sobre el array de casos para contar cuántos hay en cada estado.
        casosArray.forEach(caso => {
            switch (caso.estado) {
                case 'OBRA EN PROYECCION':
                    cargadosCount++;
                    break;
                case 'OBRA EN EJECUCION':
                    supervisarCount++;
                    break;
                case 'OBRA EJECUTADA':
                    enDesarrolloCount++;
                    break;
                case 'OBRA CULMINADA': // Asumiendo que 'Entregado' es el estado final.
                    finalizadosCount++;
                    break;
                default:
                    // Si un caso tiene un estado no reconocido o no tiene estado,
                    // se podría contar como 'Cargado' o tener una categoría 'Otros'.
                    // Aquí se está sumando a cargadosCount, lo cual podría ser o no el comportamiento deseado.
                    // TODO: Clarificar cómo manejar casos con estados desconocidos o nulos.
                    cargadosCount++; 
            }
        });

        // Actualiza el contenido de los elementos HTML con los valores de los contadores.
        // Se verifica si cada elemento existe antes de intentar actualizar su contenido.
        if (casosObraEnProyeccionCounter) casosObraEnProyeccionCounter.textContent = cargadosCount;
        if (casosObraEnEjecucionCounter) casosObraEnEjecucionCounter.textContent = supervisarCount;
        if (casosObraEjecutadaCounter) casosObraEjecutadaCounter.textContent = enDesarrolloCount;
        if (casosObraCulminadaCounter) casosObraCulminadaCounter.textContent = finalizadosCount;

    } catch (error) {
        // Si ocurre un error durante el fetch o el procesamiento de datos:
        console.error('Error al cargar los contadores de casos:', error);
        // Muestra 'Error' en todos los contadores.
        if (casosObraEnProyeccionCounter) casosObraEnProyeccionCounter.textContent = 'Error';
        if (casosObraEnEjecucionCounter) casosObraEnEjecucionCounter.textContent = 'Error';
        if (casosObraEjecutadaCounter) casosObraEjecutadaCounter.textContent = 'Error';
        if (casosObraCulminadaCounter) casosObraCulminadaCounter.textContent = 'Error';
        // Muestra una notificación de error al usuario.
        showNotification('Error al cargar los contadores.', true);
    }
}

// Event Listener: Ejecuta loadCasesCounters cuando el DOM está completamente cargado.
document.addEventListener('DOMContentLoaded', loadCasesCounters);
// Event Listener: Escucha un evento personalizado 'caseDataChanged'.
// Este evento se dispara desde otras partes de la aplicación (ej. después de agregar un caso)
// para indicar que los datos han cambiado y los contadores deben actualizarse.
document.addEventListener('caseDataChanged', loadCasesCounters);