// scripts/caseTableManager.js

/**
 * @file scripts/caseTableManager.js
 * @description Gestiona la carga, renderizado, filtrado, exportación y actualización de la tabla de casos.
 * Interactúa con el backend para obtener los datos y con otros módulos para la funcionalidad de popups y utilidades.
 */

// Importaciones de módulos y funciones necesarias.
import { showLoader, hideLoader } from './loader.js'; // Para mostrar/ocultar indicador de carga.
import { showNotification, generateAlphanumericId } from './utils.js'; // Para notificaciones y generación de IDs legibles.
import { getApiBaseUrlAsync } from './config.js'; // Importar getApiBaseUrlAsync
import {
    openActuacionPopup,
    openConfirmDeliveryPopup,
    openModifyCasePopup,
    openViewCasePopup,
    openViewActuacionesPopup,
    openViewModificacionesPopup,
    openConfirmDeletePopup
} from './popup_handler.js'; // Funciones para manejar los diferentes popups de acciones sobre casos.

// Referencia al cuerpo (tbody) de la tabla de casos en el DOM.
const casosTableBody = document.querySelector('#casosTable tbody');

// --- ALMACÉN DE DATOS LOCAL ---
// `allCasosData` almacena todos los casos obtenidos del backend. Actúa como una caché local.
let allCasosData = []; 
// `estadosDisponibles` define los estados que pueden ser seleccionados en el dropdown de la tabla.
// El estado 'Entregado' se maneja de forma especial y se añade dinámicamente si el caso ya está en ese estado.
const estadosDisponibles = ['Cargado', 'Supervisado', 'En Desarrollo']; 

// --- FUNCIONES DE GESTIÓN DE DATOS ---

/**
 * Función interna (privada por convención con '_') para obtener todos los datos de los casos desde el backend.
 * Se llama al inicializar la tabla y cuando se necesita una recarga completa de los datos.
 * Actualiza la variable global `allCasosData`.
 * @async
 * @private
 * @throws {Error} Si la petición al backend falla o los datos recibidos no son válidos.
 */
async function _fetchCasosData() {
    showLoader(); // Muestra el indicador de carga.
    try {
        const API_BASE_URL = await getApiBaseUrlAsync();
        //console.log("Iniciando carga de todos los casos desde el backend...");
        // Realiza la petición GET al backend. Se usa un límite alto para intentar obtener todos los casos.
        // TODO: Considerar paginación o un endpoint que devuelva todos los casos sin límite si la cantidad es muy grande.
        const response = await fetch(`${API_BASE_URL}/casos?limit=10000`);
        if (!response.ok) { // Si la respuesta HTTP no es exitosa.
            throw new Error(`Error HTTP al obtener casos: ${response.status} ${response.statusText}`);
        }
        const responseData = await response.json(); // Parsea la respuesta JSON.

        // Asigna el array de casos de la respuesta a `allCasosData`.
        // Se espera que la respuesta del backend sea un objeto con una propiedad 'casos' que es un array.
        allCasosData = responseData.casos; 
        if (!Array.isArray(allCasosData)) { // Validación de que `casos` sea un array.
            console.error("Error: La propiedad 'casos' en la respuesta del backend no es un array.", responseData);
            showNotification('Error al procesar los datos de los casos recibidos del servidor.', true);
            allCasosData = []; // Asegura que `allCasosData` sea un array vacío en caso de error.
        }
        //console.log("Datos de casos (array) recibidos y almacenados localmente:", allCasosData); 
    } catch (error) { // Captura errores de red o de la lógica interna.
        console.error('Error crítico durante la carga inicial de los casos:', error);
        showNotification('Error al cargar la lista de casos: ' + error.message, true);
        if (casosTableBody) { // Si la tabla existe, muestra un mensaje de error en ella.
            casosTableBody.innerHTML = `<tr><td colspan="14" style="text-align: center; color: red;">Error al cargar los casos. Verifique la conexión con el servidor o contacte al administrador. Detalle: ${error.message}</td></tr>`;
        }
        allCasosData = []; // Resetea `allCasosData` en caso de error.
        throw error; // Propaga el error para que la función que llamó a _fetchCasosData sepa que falló.
    } finally {
        hideLoader(); // Siempre oculta el indicador de carga.
    }
}

/**
 * Retorna una copia del array `allCasosData` que contiene todos los casos cargados.
 * Se devuelve una copia para proteger el array original de modificaciones externas directas.
 * @export
 * @returns {Array<Object>} Una copia del array de todos los casos.
 */
export function getCasosData() {
    return [...allCasosData]; // Usa el operador spread para crear una copia superficial.
}

/**
 * Actualiza un caso específico en la caché local (`allCasosData`) después de una modificación exitosa en el backend.
 * @export
 * @param {string} caseId - El ID de MongoDB (_id) del caso a actualizar.
 * @param {Object} updatedData - El objeto con los nuevos datos del caso.
 */
export function updateCaseInCache(caseId, updatedData) {
    const index = allCasosData.findIndex(caso => caso._id === caseId); // Encuentra el índice del caso.
    if (index !== -1) { // Si se encuentra el caso.
        // Actualiza el caso en el array combinando los datos antiguos con los nuevos.
        allCasosData[index] = { ...allCasosData[index], ...updatedData };
        console.log(`Caso con ID ${caseId} actualizado en la caché local.`);
    }
}

/**
 * Elimina un caso específico de la caché local (`allCasosData`) después de una eliminación exitosa en el backend.
 * @export
 * @param {string} caseId - El ID de MongoDB (_id) del caso a eliminar.
 */
export function removeCaseFromCache(caseId) {
    // Filtra el array para excluir el caso con el ID proporcionado.
    allCasosData = allCasosData.filter(caso => caso._id !== caseId);
    console.log(`Caso con ID ${caseId} eliminado de la caché local.`);
}

/**
 * Función de ordenación para los casos que se mostrarán en la tabla.
 * Criterios de ordenación:
 * 1. Los casos que NO están en estado "Entregado" se muestran primero.
 * 2. Dentro de cada grupo (No Entregados y Entregados), los casos se ordenan por `caseDate` de forma descendente (más recientes primero).
 * @private
 * @param {Array<Object>} casesArray - El array de casos a ordenar.
 * @returns {Array<Object>} Un nuevo array con los casos ordenados según los criterios definidos.
 */
function _sortCases(casesArray) {
    const sortedArray = [...casesArray]; // Crea una copia para no modificar el array original.

    sortedArray.sort((a, b) => {
        const isAEntregado = a.estado === 'Entregado'; // Verifica si el caso 'a' está entregado.
        const isBEntregado = b.estado === 'Entregado'; // Verifica si el caso 'b' está entregado.

        // Lógica de prioridad: Casos no entregados van antes que los entregados.
        if (isAEntregado && !isBEntregado) {
            return 1; // 'a' (Entregado) va después de 'b' (No Entregado).
        }
        if (!isAEntregado && isBEntregado) {
            return -1; // 'a' (No Entregado) va antes de 'b' (Entregado).
        }

        // Si ambos casos tienen el mismo estado (ambos entregados o ambos no entregados),
        // se ordenan por `caseDate` de forma descendente (el más reciente primero).
        const dateA = a.caseDate ? new Date(a.caseDate).getTime() : 0; // Convierte fecha a timestamp para comparación.
        const dateB = b.caseDate ? new Date(b.caseDate).getTime() : 0;
        return dateB - dateA; // Orden descendente por fecha.
    });

    return sortedArray; // Retorna el array ordenado.
}

// --- FUNCIONES DE RENDERIZADO DE TABLA Y MANEJO DE EVENTOS ---

/**
 * Puebla el cuerpo de la tabla de casos (`casosTableBody`) con los datos proporcionados.
 * Esta función se encarga del renderizado de las filas de la tabla.
 * Antes de renderizar, ordena los casos utilizando `_sortCases`.
 * También adjunta los event listeners necesarios para los filtros y botones de exportación.
 * @export
 * @param {Array<Object>} casesToDisplay - El array de objetos de caso que se mostrarán en la tabla.
 */
export function populateTable(casesToDisplay) {
    // Verifica si el elemento tbody de la tabla existe.
    if (!casosTableBody) {
        console.warn("Elemento '#casosTable tbody' no encontrado en el DOM. No se puede poblar la tabla.");
        return;
    }

    const sortedCases = _sortCases(casesToDisplay); // Ordena los casos.
    casosTableBody.innerHTML = ''; // Limpia el contenido previo de la tabla.

    // Si no hay casos para mostrar, inserta una fila con un mensaje.
    if (sortedCases.length === 0) {
        casosTableBody.innerHTML = `<tr><td colspan="14" style="text-align: center;">No hay casos para mostrar con los filtros actuales.</td></tr>`;
        return;
    }

    // Obtiene el rol del usuario actual desde localStorage para controlar la visibilidad de los botones de acción.
    const currentUserRole = localStorage.getItem('userRole'); 
    //console.log("Rol de usuario actual (leído en populateTable):", currentUserRole); 

    // Itera sobre cada caso ordenado y crea una fila (<tr>) para la tabla.
    sortedCases.forEach(caso => {
        const row = casosTableBody.insertRow(); // Inserta una nueva fila en la tabla.

        // Genera un ID alfanumérico legible para mostrar en la tabla.
        const alphanumericId = generateAlphanumericId(caso._id);
        const displayCodigoPersonalizado = `CUB - ${alphanumericId}`;

        // Formatea la fecha de entrega (si existe y el caso está entregado).
        const fechaEntregaDisplay = caso.fechaEntrega && caso.estado === 'Entregado' ? new Date(caso.fechaEntrega).toLocaleDateString() : 'N/A';
        const isEntregado = caso.estado === 'Entregado'; // Bandera para saber si el caso está entregado.

        // Variables para deshabilitar botones si el caso ya está entregado o según el estado.
        const disableIfEntregado = isEntregado ? 'disabled' : '';
        const disableAddActuacion = isEntregado ? 'disabled' : ''; 
        // El botón "Obra Entregada" solo se habilita si el estado es "En Desarrollo" y no está ya entregado.
        const disableObraEntregada = (caso.estado !== 'En Desarrollo' || isEntregado) ? 'disabled' : '';
        
        // Obtiene un nombre de archivo legible para mostrar (sin la ruta completa).
        const displayName = caso.archivo ? caso.archivo.substring(caso.archivo.lastIndexOf('/') + 1) : 'N/A';
        
        // Formatea la fecha de inicio del caso.
        const formattedCaseDate = caso.caseDate ? new Date(caso.caseDate).toLocaleDateString() : 'N/A';

        // Construye el HTML para los botones de acción basado en el rol del usuario.
        let actionButtonsHtml = '';
        if (currentUserRole === 'superadmin') { // Botones para Superadmin (todos los permisos).
            actionButtonsHtml = `
                <button class="action-btn modify-btn" data-id="${caso._id}" ${disableIfEntregado} title="Modificar Caso">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                    </svg>
                </button>
                <button class="action-btn add-actuacion-btn" data-id="${caso._id}" ${disableAddActuacion} title="Agregar Actuación">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M12 5.25a.75.75 0 0 1 .75.75v5.25H18a.75.75 0 0 1 0 1.5h-5.25V18a.75.75 0 0 1-1.5 0v-5.25H6a.75.75 0 0 1 0-1.5h5.25V6a.75.75 0 0 1 .75-.75Z" clip-rule="evenodd" /></svg>
                </button>
                <button class="action-btn obra-entregada-btn" data-id="${caso._id}" ${disableObraEntregada} title="Marcar como Obra Entregada">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9.75 10.5a.75.75 0 0 1-1.12.082l-4.5-4.25a.75.75 0 0 1 1.02-1.1l3.961 3.731 9.143-9.9a.75.75 0 0 1 1.04-.208Z" clip-rule="evenodd" /></svg>
                </button>
                <button class="action-btn delete-btn" data-id="${caso._id}" title="Eliminar Caso">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                </button>
            `;
        } else if (currentUserRole === 'admin') { // Botones para Admin (sin permiso de eliminar).
            actionButtonsHtml = `
                <button class="action-btn modify-btn" data-id="${caso._id}" ${disableIfEntregado} title="Modificar Caso">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                    </svg>
                </button>
                <button class="action-btn add-actuacion-btn" data-id="${caso._id}" ${disableAddActuacion} title="Agregar Actuación">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M12 5.25a.75.75 0 0 1 .75.75v5.25H18a.75.75 0 0 1 0 1.5h-5.25V18a.75.75 0 0 1-1.5 0v-5.25H6a.75.75 0 0 1 0-1.5h5.25V6a.75.75 0 0 1 .75-.75Z" clip-rule="evenodd" /></svg>
                </button>
                <button class="action-btn obra-entregada-btn" data-id="${caso._id}" ${disableObraEntregada} title="Marcar como Obra Entregada">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9.75 10.5a.75.75 0 0 1-1.12.082l-4.5-4.25a.75.75 0 0 1 1.02-1.1l3.961 3.731 9.143-9.9a.75.75 0 0 1 1.04-.208Z" clip-rule="evenodd" /></svg>
                </button>
            `;
        } else if (currentUserRole === 'user') { // Usuario 'user' no tiene botones de acción directa en la tabla.
            actionButtonsHtml = ''; // Vacío, o podría ser un botón de "Ver Detalles" si es diferente al clic en el ID.
        }

        // Inserta el HTML de las celdas en la fila.
        row.innerHTML = `
            <td class="idInput">
                <a href="#" class="case-id-link" data-id="${caso._id}">${displayCodigoPersonalizado}</a>
            </td>
            <td>${caso.tipo_obra || 'N/A'}</td>
            <td>${caso.nombre_obra || 'N/A'}</td>
            <td>${caso.parroquia || 'N/A'}</td>
            <td>${caso.circuito || 'N/A'}</td>
            <td>${caso.eje || 'N/A'}</td>
            <td>${caso.comuna || 'N/A'}</td>
            <td>${caso.responsable_sala_autogobierno || 'N/A'}</td>
            <td>${formattedCaseDate}</td>
            <td>${fechaEntregaDisplay}</td>
            <td>
                ${caso.archivo ? `<a href="${caso.archivo}" target="_blank" rel="noopener noreferrer">${displayName}</a>` : 'N/A'}
            </td>
            <td data-label="Actuaciones">
                <button class="button-link view-actuaciones-btn" data-id="${caso._id}">VER</button>
            </td>
            <td>
                <select class="estado-select" data-id="${caso._id}" ${disableIfEntregado} ${currentUserRole === 'user' ? 'disabled' : ''}>
                    ${estadosDisponibles.map(estado => `
                        <option value="${estado}" ${caso.estado === estado ? 'selected' : ''}>
                            ${estado}
                        </option>
                    `).join('')}
                    ${isEntregado ? `<option value="Entregado" selected>Entregado</option>` : ''}
                </select>
            </td>
            <td class="tdAcciones">
                ${actionButtonsHtml}
            </td>
        `;
        casosTableBody.appendChild(row); // Añade la fila completa al tbody.
    });

    attachTableEventListeners(); // (Re)adjunta los event listeners a la tabla después de poblarla.

    // Adjunta los listeners para los filtros y botones de exportación.
    // Se usa un atributo 'data-listener-attached' para evitar adjuntar múltiples listeners si populateTable se llama varias veces.
    // NOTA: La importación dinámica dentro de los listeners puede tener implicaciones de rendimiento si se llama muy frecuentemente.
    // Sería más óptimo importar el módulo una vez fuera del listener si es posible.
    const applyFilterBtn = document.getElementById('applyFilterBtn');
    if (applyFilterBtn && !applyFilterBtn.hasAttribute('data-listener-attached')) {
        applyFilterBtn.addEventListener('click', () => {
            import('./filterAndExport.js').then(module => module.applyFilter());
        });
        applyFilterBtn.setAttribute('data-listener-attached', 'true');
    }

    const clearFilterBtn = document.getElementById('clearFilterBtn');
    if (clearFilterBtn && !clearFilterBtn.hasAttribute('data-listener-attached')) {
        clearFilterBtn.addEventListener('click', () => {
            import('./filterAndExport.js').then(module => module.clearFilter());
        });
        clearFilterBtn.setAttribute('data-listener-attached', 'true');
    }
    
    const filterValueInput = document.getElementById('filterValue');
    if (filterValueInput && !filterValueInput.hasAttribute('data-listener-attached')) {
        filterValueInput.addEventListener('keyup', () => { // Filtra al levantar una tecla.
            import('./filterAndExport.js').then(module => module.applyFilter());
        });
        filterValueInput.setAttribute('data-listener-attached', 'true');
    }

    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn && !exportBtn.hasAttribute('data-listener-attached')) {
        exportBtn.addEventListener('click', () => {
            import('./filterAndExport.js').then(module => module.exportTableToExcel());
        });
        exportBtn.setAttribute('data-listener-attached', 'true');
    }
}

/**
 * Función de inicialización principal para la tabla de casos.
 * Se llama cuando el DOM está listo. Carga los datos iniciales y puebla la tabla.
 * También configura un listener para el evento `caseDataChanged` para recargar la tabla.
 * @export
 * @async
 */
export async function initializeCaseTable() {
    showLoader(); // Muestra el loader antes de iniciar la carga.
    try {
        await _fetchCasosData(); // Carga todos los datos de los casos desde el backend.
        populateTable(allCasosData); // Puebla la tabla con los datos cargados (y ordenados).
    } catch (error) {
        // El error ya es manejado y notificado por _fetchCasosData.
        // Aquí, solo nos aseguramos de que la tabla muestre un mensaje de error si está vacía.
        if (casosTableBody && !casosTableBody.hasChildNodes()) { // Si el tbody existe y no tiene filas.
            casosTableBody.innerHTML = `<tr><td colspan="14" style="text-align: center; color: red;">Error crítico al inicializar la tabla de casos.</td></tr>`;
        }
    } finally {
        hideLoader(); // Siempre oculta el loader al finalizar.
    }
    // Configura un event listener para el evento personalizado 'caseDataChanged'.
    // Remueve cualquier listener previo para evitar duplicados si initializeCaseTable se llama múltiples veces.
    document.removeEventListener('caseDataChanged', handleCaseDataChange); 
    document.addEventListener('caseDataChanged', handleCaseDataChange);
}

/**
 * Manejador para el evento `caseDataChanged`.
 * Este evento se dispara desde otras partes de la aplicación cuando los datos de los casos
 * han sido modificados (ej. un caso agregado, actualizado o eliminado).
 * Esta función recarga todos los datos de los casos y vuelve a poblar la tabla.
 * @async
 * @private
 */
async function handleCaseDataChange() {
    console.log("Evento 'caseDataChanged' detectado en caseTableManager. Recargando datos y actualizando tabla...");
    showLoader();
    try {
        await _fetchCasosData(); // Vuelve a cargar todos los datos desde el backend.
        populateTable(allCasosData); // Repuebla la tabla con los datos actualizados.
    } catch (error) {
        console.error("Error al recargar la tabla después de un evento 'caseDataChanged':", error);
        // _fetchCasosData ya maneja la notificación de error al usuario.
    } finally {
        hideLoader();
    }
}

// --- MANEJO DE EVENTOS DE LA TABLA (DELEGACIÓN DE EVENTOS) ---

/**
 * Adjunta los event listeners principales al `casosTableBody` para manejar clics y cambios.
 * Utiliza la delegación de eventos para manejar eventos en elementos que pueden ser
 * añadidos dinámicamente a la tabla (botones de acción, selects de estado).
 * Remueve listeners antiguos antes de añadir nuevos para evitar duplicaciones.
 * @private
 */
function attachTableEventListeners() {
    if (!casosTableBody) return; // No hacer nada si el tbody no existe.

    // Remueve los listeners de eventos previamente adjuntados para evitar múltiples ejecuciones.
    // El tercer argumento `true` (useCapture) es importante si los listeners se añadieron con captura.
    // Si se añadieron en fase de burbuja (por defecto), no es estrictamente necesario aquí,
    // pero es una buena práctica ser consistente.
    casosTableBody.removeEventListener('click', handleTableClick, true);
    casosTableBody.removeEventListener('change', handleTableChange, true);

    // Adjunta nuevos listeners en la fase de captura para una delegación más fiable,
    // especialmente si hay elementos anidados que podrían detener la propagación.
    casosTableBody.addEventListener('click', handleTableClick, true); 
    casosTableBody.addEventListener('change', handleTableChange, true);
}

/**
 * Manejador de eventos de clic para la tabla de casos (delegado al `casosTableBody`).
 * Identifica en qué tipo de elemento se hizo clic (botón de acción, enlace de ID de caso)
 * y llama a la función correspondiente del `popup_handler.js` para abrir el popup adecuado.
 * @private
 * @param {MouseEvent} event - El objeto del evento de clic.
 */
function handleTableClick(event) {
    const target = event.target; // El elemento específico que recibió el clic.
    
    // Usa `closest` para encontrar el botón o enlace más cercano que tenga un `data-id`.
    // Esto permite que el clic funcione incluso si se hace sobre un icono SVG dentro de un botón.
    const buttonOrLink = target.closest('button[data-id], a[data-id]');
    const caseId = buttonOrLink ? buttonOrLink.dataset.id : null; // Obtiene el ID del caso desde el atributo data-id.

    if (!caseId) return; // Si no hay un ID de caso asociado, no hace nada.

    let popupOpened = false; // Bandera para rastrear si se abrió un popup.

    // Determina qué acción realizar según la clase del botón/enlace clickeado.
    if (target.closest('.add-actuacion-btn')) {
        openActuacionPopup(caseId);
        popupOpened = true;
    } else if (target.closest('.obra-entregada-btn')) {
        openConfirmDeliveryPopup(caseId);
        popupOpened = true;
    } else if (target.closest('.modify-btn')) {
        openModifyCasePopup(caseId);
        popupOpened = true;
    } else if (target.closest('.delete-btn')) {
        //console.log('[caseTableManager] Botón de eliminar presionado para el caso ID:', caseId);
        openConfirmDeletePopup(caseId);
        popupOpened = true;
    } else if (target.closest('.case-id-link')) { // Si se hizo clic en el enlace del ID del caso.
        openViewCasePopup(caseId);
        popupOpened = true;
    } else if (target.closest('.view-actuaciones-btn')) { // Si se hizo clic en el botón "VER" de actuaciones.
        openViewActuacionesPopup(caseId);
        popupOpened = true;
    }
    // TODO: Añadir aquí el `else if` para el botón de ver modificaciones:
    // else if (target.closest('.view-modificaciones-btn')) {
    //     openViewModificacionesPopup(caseId);
    //     popupOpened = true;
    // }

    // Si se abrió un popup, previene la acción por defecto del navegador (ej. seguir un enlace '#')
    // y detiene la propagación del evento para evitar que otros listeners lo manejen.
    if (popupOpened) {
        event.preventDefault(); 
        event.stopPropagation(); 
    }
}

/**
 * Manejador de eventos de cambio para la tabla de casos (delegado al `casosTableBody`).
 * Específicamente maneja los cambios en los `<select>` de estado de los casos.
 * Cuando se cambia el estado, envía una petición PATCH al backend para actualizarlo.
 * @private
 * @async
 * @param {Event} event - El objeto del evento de cambio.
 */
async function handleTableChange(event) {
    const target = event.target; // El elemento que disparó el evento (el <select>).
    
    // Verifica si el elemento es un select de estado.
    if (target.classList.contains('estado-select')) {
        const caseId = target.dataset.id; // ID del caso.
        const newStatus = target.value; // Nuevo estado seleccionado.
        let username = null; // Para registrar quién hizo el cambio.
        try {
            const userString = localStorage.getItem('user');
            if (userString) {
                const user = JSON.parse(userString);
                username = user ? user.username : null;
            }
        } catch (e) {
            console.error("Error al parsear datos de usuario desde localStorage en handleTableChange:", e);
        }
        
        console.log(`Usuario obtenido para cambio de estado: ${username}`); // Log para depuración.

        // Lógica de negocio: No se puede cambiar a 'Entregado' directamente desde el select.
        // Se debe usar el botón específico "Marcar como Obra Entregada" que pide clave.
        if (newStatus === 'Entregado') {
            showNotification('Para marcar como "Entregado", por favor use el botón de acción correspondiente.', true);
            // Revierte visualmente la selección al estado original del caso.
            const originalCase = allCasosData.find(caso => caso._id === caseId);
            if (originalCase) {
                target.value = originalCase.estado;
            }
            return; // Detiene la ejecución.
        }

        showLoader(); // Muestra el loader.
        try {
            const API_BASE_URL = await getApiBaseUrlAsync();
            // Petición PATCH al backend para actualizar el estado del caso.
            const response = await fetch(`${API_BASE_URL}/casos/${caseId}/estado`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                // Envía el nuevo estado y el nombre de usuario para el registro de la modificación.
                body: JSON.stringify({ estado: newStatus, username: username }) 
            });

            if (!response.ok) { // Si hay error en la respuesta.
                let errorData;
                try {
                    errorData = await response.json(); // Intenta parsear el mensaje de error JSON del backend.
                } catch (e) {
                    // Si la respuesta no es JSON (ej. un error HTML 500), usa el statusText.
                    throw new Error(response.statusText || `Error HTTP ${response.status} al actualizar estado.`);
                }
                throw new Error(errorData.message || `Error desconocido al actualizar el estado del caso ${generateAlphanumericId(caseId)}.`);
            }

            const responseData = await response.json(); // El backend devuelve el caso actualizado.
            const updatedCase = responseData.caso; 

            // Actualiza la caché local con el caso completo devuelto por el backend.
            // Esto es importante para mantener la consistencia de los datos, incluyendo el array de `modificaciones`.
            updateCaseInCache(caseId, updatedCase); 
            
            populateTable(getCasosData()); // Refresca la tabla para mostrar el cambio.
            showNotification(`Estado del caso CUB - ${generateAlphanumericId(caseId)} actualizado a: ${newStatus}.`);

        } catch (error) {
            console.error('Error al actualizar estado del caso:', error);
            showNotification(`Error al actualizar estado: ${error.message}`, true);
            
            // Revertir visualmente la selección en el <select> al estado original en caso de error.
            const originalCase = allCasosData.find(caso => caso._id === caseId);
            if (originalCase) {
                target.value = originalCase.estado;
            }
        } finally {
            hideLoader(); // Siempre oculta el loader.
        }
    }
}