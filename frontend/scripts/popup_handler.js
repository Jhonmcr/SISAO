// scripts/popup_handler.js

/**
 * @file scripts/popup_handler.js
 * @description Maneja la lógica de apertura, cierre y acciones de varios popups (modales)
 * utilizados en la aplicación, como agregar actuaciones, confirmar entregas, modificar casos, etc.
 * También interactúa con el backend para obtener y enviar datos relacionados con estas acciones.
 */

// Importaciones de funciones de utilidad y datos para los selects.
import { showLoader, hideLoader } from './loader.js'; // Funciones para mostrar/ocultar el loader global.
import { generateAlphanumericId, showNotification } from './utils.js'; // Funciones para generar IDs legibles y mostrar notificaciones.
import { getApiBaseUrlAsync } from './config.js'; // <--- IMPORTAR LA FUNCIÓN PARA LA URL BASE
import {
    tipoObraOptions,
    parroquias,
    circuitos,
    circuitosParroquias,
    populateSelect, // Función para poblar elementos <select>
    initializeSelects
} from './home/select_populator.js'; // Datos y funciones para los selects de los formularios.
import { initializeComunaHandler } from './home/comuna_handler.js';
import { initializePuntoYCirculoHandlers } from './home/punto_y_circulo_handler.js';

// Variables globales para almacenar el ID de MongoDB (_id) del caso actualmente seleccionado
// para diferentes operaciones de popup. Esto evita pasar IDs a través de múltiples funciones o el DOM.
export let currentCaseIdForActuacion = null; // Para agregar actuación.
export let currentCaseIdForDelivery = null;  // Para confirmar entrega.
export let currentCaseIdForModify = null;    // Para modificar caso.
export let currentCaseIdForView = null;      // Para ver detalles del caso.
export let currentCaseIdForModificacionesView = null; // Para ver el historial de modificaciones.
export let currentCaseIdForDelete = null;    // Para borrar un caso.

// Variables globales para almacenar temporalmente las listas de modificaciones o actuaciones
// cuando se abre el popup correspondiente para visualizarlas.
let currentModificaciones = [];
let currentActuaciones = [];

/**
 * Obtiene el nombre de usuario del usuario actualmente logueado.
 * Lee la información del usuario desde `localStorage`.
 * @returns {string|null} El nombre de usuario si está disponible, o `null` si no se encuentra o hay un error.
 */
function getLoggedInUsername() {
    try {
        const user = JSON.parse(localStorage.getItem('user')); // Intenta parsear el objeto 'user' de localStorage.
        return user ? user.username : null; // Retorna el nombre de usuario o null.
    } catch (e) {
        // Si hay un error al parsear (ej. localStorage está vacío o el formato es incorrecto),
        // muestra un error en consola y retorna null.
        console.error("Error al parsear los datos del usuario desde localStorage:", e);
        return null;
    }
}

/**
 * Actualiza el campo de selección 'Circuito' en el formulario de MODIFICACIÓN de caso,
 * basándose en la 'Parroquia' seleccionada.
 * Similar a `updateCircuitoSelection` en `select_populator.js` pero adaptada para los IDs
 * del formulario de modificación.
 * @export
 */
export function updateCircuitoSelectionForModifyForm() {
    // Obtiene los elementos select de parroquia y circuito del formulario de modificación.
    const parroquiaSelect = document.getElementById('modify_parroquia');
    const circuitoSelect = document.getElementById('modify_circuito');

    // Si alguno de los selects no existe, no hace nada.
    if (!parroquiaSelect || !circuitoSelect) return;

    const selectedParroquia = parroquiaSelect.value; // Parroquia seleccionada.
    let matchedCircuito = ''; // Para almacenar el circuito correspondiente.

    // Busca el circuito al que pertenece la parroquia seleccionada.
    for (const [circuito, parroquiasList] of Object.entries(circuitosParroquias)) {
        if (parroquiasList.includes(selectedParroquia)) {
            matchedCircuito = circuito;
            break;
        }
    }

    // Limpia y configura el select de circuito.
    circuitoSelect.innerHTML = '<option value="" disabled>Circuito asignado automáticamente</option>';
    circuitoSelect.disabled = true; // El campo siempre está deshabilitado.
    
    // Si se encontró un circuito, lo añade como la única opción seleccionable (y seleccionada).
    if (matchedCircuito) {
        const option = document.createElement('option');
        option.value = matchedCircuito;
        option.textContent = matchedCircuito;
        option.selected = true;
        circuitoSelect.appendChild(option);
    }
    // No es necesario un 'else' para `circuitoSelect.value = '';` porque innerHTML ya lo limpió
    // y la opción por defecto ya está establecida.
}

/**
 * Función auxiliar asíncrona para obtener los detalles de un caso específico desde el backend
 * utilizando su ID de MongoDB (_id).
 * @async
 * @param {string} mongoId - El ID de MongoDB del caso a obtener.
 * @returns {Promise<Object>} Una promesa que resuelve con el objeto del caso.
 * @throws {Error} Si el ID no se proporciona, si el caso no se encuentra (404), o si hay un error en la petición.
 */
async function getCaseByMongoId(mongoId) {
    //console.log('Intentando obtener caso con _id de MongoDB:', mongoId);
    if (!mongoId) {
        throw new Error('ID de MongoDB no proporcionado para buscar el caso.');
    }
    try {
        const API_BASE_URL = await getApiBaseUrlAsync();
        const response = await fetch(`${API_BASE_URL}/casos/${mongoId}`); // Petición al endpoint del caso específico.
        if (!response.ok) {
            if (response.status === 404) { // Si el servidor responde con 404.
                throw new Error(`Caso con _id ${mongoId} no encontrado en el servidor.`);
            }
            // Para otros errores HTTP.
            throw new Error(`Error al obtener el caso: ${response.status} - ${response.statusText}`);
        }
        const caso = await response.json(); // Parsea la respuesta JSON.
        //console.log("Caso obtenido por _id:", caso);
        return caso; // Retorna el objeto del caso.
    } catch (error) {
        console.error('Error en getCaseByMongoId:', error);
        throw error; // Relanza el error para ser manejado por la función que llama.
    }
}

// --- MANEJADORES PARA EL POPUP DE AGREGAR ACTUACIÓN ---

/**
 * Abre el popup para agregar una nueva actuación a un caso.
 * Obtiene los datos del caso por su `mongoId` para mostrar información relevante.
 * @export
 * @async
 * @param {string} mongoId - El ID de MongoDB del caso al que se agregará la actuación.
 */
export async function openActuacionPopup(mongoId) {
    try {
        const caso = await getCaseByMongoId(mongoId); // Obtiene los datos del caso.
        currentCaseIdForActuacion = caso._id; // Almacena el ID de MongoDB del caso actual.
        
        const popupElement = document.getElementById('actuacionPopup'); // Elemento del popup.
        // Muestra el ID legible del caso en el popup.
        document.getElementById('actuacionCaseId').textContent = generateAlphanumericId(caso._id); 
        popupElement.style.display = 'flex'; // Muestra el popup.
        // @ts-ignore - Ignora la advertencia de TypeScript si 'offsetHeight' no es reconocido en el tipo base.
        void popupElement.offsetHeight; // Fuerza un reflujo del DOM para asegurar que las transiciones CSS se apliquen correctamente.
        document.getElementById('newActuacionText').value = ''; // Limpia el textarea de actuación.
    } catch (error) {
        console.error('Error al abrir popup de actuación:', error);
        showNotification('Error al abrir popup de actuación: ' + error.message, true); // Muestra error.
        // Asegura que el popup se oculte si hubo un error al abrirlo.
        const popupElement = document.getElementById('actuacionPopup');
        if (popupElement) {
            popupElement.style.display = 'none';
        }
    }
}

/**
 * Cierra el popup de agregar actuación.
 * Restablece la variable `currentCaseIdForActuacion`.
 * @export
 */
export function closeActuacionPopup() {
    const popupElement = document.getElementById('actuacionPopup');
    if (popupElement) {
        popupElement.style.display = 'none'; // Oculta el popup.
    }
    currentCaseIdForActuacion = null; // Resetea el ID del caso actual para actuación.
}

/**
 * Guarda una nueva actuación para el caso actualmente almacenado en `currentCaseIdForActuacion`.
 * Obtiene el texto de la actuación, el usuario logueado y la fecha actual.
 * Envía una petición PATCH al backend para actualizar el caso con la nueva actuación.
 * @export
 * @async
 */
export async function saveActuacion() {
    // Verifica que haya un caso seleccionado.
    if (!currentCaseIdForActuacion) {
        showNotification('Error: No se ha seleccionado un caso para agregar actuación.', true);
        return;
    }
    // Obtiene y valida el texto de la nueva actuación.
    const newActuacionText = document.getElementById('newActuacionText').value.trim();
    if (!newActuacionText) {
        showNotification('Por favor, ingresa una descripción para la actuación.', true);
        return;
    }

    showLoader(); // Muestra el indicador de carga.
    try {
        // Obtiene los datos más recientes del caso para asegurar que se trabaja con la última versión de las actuaciones.
        const caso = await getCaseByMongoId(currentCaseIdForActuacion);

        // Crea una copia del array de actuaciones existente o un array vacío si no hay actuaciones.
        const actuaciones = Array.isArray(caso.actuaciones) ? [...caso.actuaciones] : [];

        const currentDate = new Date().toISOString(); // Fecha actual en formato ISO.
        const username = getLoggedInUsername(); // Nombre del usuario que realiza la acción.

        // Añade la nueva actuación al array.
        actuaciones.push({
            descripcion: newActuacionText,
            fecha: currentDate,
            usuario: username || 'Desconocido' // Si no se puede obtener el username, se guarda como 'Desconocido'.
        });

        // Envía la petición PATCH al backend para actualizar las actuaciones del caso.
        const API_BASE_URL = await getApiBaseUrlAsync();
        const response = await fetch(`${API_BASE_URL}/casos/${currentCaseIdForActuacion}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ actuaciones: actuaciones }) // Envía solo el campo 'actuaciones' actualizado.
        });

        if (!response.ok) { // Si la respuesta no es exitosa.
            const errorData = await response.json().catch(() => ({ message: 'Error desconocido al procesar respuesta del servidor.' }));
            throw new Error(`Error al guardar actuación: ${response.status} - ${errorData.message || response.statusText}`);
        }

        showNotification('Actuación guardada exitosamente.'); // Notificación de éxito.
        closeActuacionPopup(); // Cierra el popup.
        // Dispara eventos para notificar a otros componentes (como la tabla de casos) que los datos han cambiado.
        document.dispatchEvent(new CustomEvent('casoActualizado')); 
        document.dispatchEvent(new CustomEvent('caseDataChanged')); 

    } catch (error) {
        console.error('Error al guardar la actuación:', error);
        showNotification('Error al guardar actuación: ' + error.message, true);
        document.dispatchEvent(new CustomEvent('casoActualizado')); // También dispara el evento en caso de error para posible recarga.
    } finally {
        hideLoader(); // Oculta el indicador de carga, haya éxito o error.
    }
}

// --- MANEJADORES PARA EL POPUP DE CONFIRMAR ENTREGA DE CASO ---

/**
 * Abre el popup para confirmar la entrega de una obra/caso.
 * Requiere la introducción de una clave de seguridad.
 * @export
 * @async
 * @param {string} mongoId - El ID de MongoDB del caso cuya entrega se va a confirmar.
 */
export async function openConfirmDeliveryPopup(mongoId) {
    try {
        const caso = await getCaseByMongoId(mongoId); // Obtiene datos del caso.
        currentCaseIdForDelivery = caso._id; // Almacena el ID del caso actual.
        
        const popupElement = document.getElementById('confirmDeliveryPopup');
        // Muestra el ID legible del caso.
        document.getElementById('deliveryCaseId').textContent = generateAlphanumericId(caso._id);
        popupElement.style.display = 'flex'; // Muestra el popup.
        // @ts-ignore
        void popupElement.offsetHeight; // Fuerza reflujo para animaciones.
        document.getElementById('securityPasswordInput').value = ''; // Limpia el campo de contraseña.
    } catch (error) {
        console.error('Error al abrir popup de confirmación de entrega:', error);
        showNotification('Error al abrir popup de confirmación de entrega: ' + error.message, true);
        const popupElement = document.getElementById('confirmDeliveryPopup');
        if (popupElement) {
            popupElement.style.display = 'none'; // Oculta si hay error.
        }
    }
}

/**
 * Cierra el popup de confirmación de entrega.
 * Restablece `currentCaseIdForDelivery`.
 * @export
 */
export function closeConfirmDeliveryPopup() {
    const popupElement = document.getElementById('confirmDeliveryPopup');
    if (popupElement) {
        popupElement.style.display = 'none';
    }
    currentCaseIdForDelivery = null; // Resetea el ID.
}

/**
 * Confirma la entrega de una obra.
 * Envía el ID del caso y la clave de seguridad al backend para su validación y actualización del estado del caso.
 * @export
 * @async
 */
export async function confirmDelivery() {
    if (!currentCaseIdForDelivery) { // Verifica que haya un caso seleccionado.
        showNotification('Error: No se ha seleccionado un caso para confirmar entrega.', true);
        return;
    }

    const enteredPassword = document.getElementById('securityPasswordInput').value; // Obtiene la contraseña ingresada.
    if (!enteredPassword) { // Valida que se haya ingresado una contraseña.
        showNotification('Por favor, ingresa la clave de seguridad.', true);
        return;
    }

    showLoader(); // Muestra el loader.
    try {
        // Petición PATCH al endpoint específico para confirmar entrega.
        const API_BASE_URL = await getApiBaseUrlAsync();
        const username = getLoggedInUsername();
        if (!username) {
            showNotification('Error: No se pudo obtener el nombre de usuario para registrar la entrega. Asegúrate de haber iniciado sesión.', true);
            hideLoader();
            return;
        }

        const response = await fetch(`${API_BASE_URL}/casos/${currentCaseIdForDelivery}/confirm-delivery`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password: enteredPassword, username: username }) // Envía la contraseña y el username.
        });

        const responseData = await response.json(); // Parsea la respuesta.

        if (!response.ok) { // Si hay error en la respuesta.
            throw new Error(responseData.message || 'Error desconocido al confirmar entrega.');
        }

        showNotification(responseData.message || 'Obra marcada como entregada exitosamente.'); // Notificación de éxito.
        closeConfirmDeliveryPopup(); // Cierra el popup.
        // Dispara eventos para actualizar otros componentes.
        document.dispatchEvent(new CustomEvent('casoActualizado'));
        document.dispatchEvent(new CustomEvent('caseDataChanged'));

    } catch (error) {
        console.error('Error al confirmar entrega:', error);
        showNotification('Error al confirmar entrega: ' + error.message, true);
        document.dispatchEvent(new CustomEvent('casoActualizado')); // También dispara en caso de error.
    } finally {
        hideLoader(); // Oculta el loader.
    }
}


// --- MANEJADORES PARA EL POPUP DE MODIFICACIÓN DE CASO ---

/**
 * Abre el popup para modificar un caso existente.
 * Obtiene los datos del caso por su `mongoId` y los carga en los campos del formulario de modificación.
 * @export
 * @async
 * @param {string} mongoId - El ID de MongoDB del caso a modificar.
 */
export async function openModifyCasePopup(mongoId) {
    const popupElement = document.getElementById('modifyCasePopup');
    if (!popupElement) return;

    try {
        const caso = await getCaseByMongoId(mongoId);
        currentCaseIdForModify = caso._id;

        const form = popupElement.querySelector('#caseForm');
        // Resetear visibilidad y estado de los campos
        form.reset();
        Array.from(form.elements).forEach(el => el.disabled = false);
        popupElement.querySelector('.popup-title').textContent = `Modificar Caso: ${generateAlphanumericId(caso._id)}`;
        
        // Poblar todos los campos del formulario
        await _populateAndSetupForm(caso, popupElement);

        // Habilitar/deshabilitar campos según el estado de la obra
        const isEntregado = caso.estado === 'OBRA CULMINADA';
        Array.from(form.elements).forEach(element => {
            const alwaysDisabled = ['circuito', 'codigoComuna', 'codigo_consejo_comunal'].includes(element.id);
            if (alwaysDisabled) {
                element.disabled = true;
                return;
            }
            if (isEntregado) {
                const canEditWhenDelivered = ['caseDate', 'fecha_entrega'].includes(element.id);
                element.disabled = !canEditWhenDelivered;
            } else {
                element.disabled = false;
            }
        });

        const submitButton = form.querySelector('#submitCaseBtn');
        submitButton.textContent = 'GUARDAR CAMBIOS';
        submitButton.style.display = 'block';
        submitButton.onclick = saveModifiedCase; // Asignar la función correcta al botón

        popupElement.style.display = 'flex';
        void popupElement.offsetHeight;

    } catch (error) {
        console.error('Error al abrir popup de modificación:', error);
        showNotification('Error al abrir popup de modificación: ' + error.message, true);
        popupElement.style.display = 'none';
    }
}


/**
 * Cierra el popup de modificación de caso.
 */
export function closeModifyPopup() {
    const popupElement = document.getElementById('modifyCasePopup');
    if (popupElement) {
        popupElement.style.display = 'none';
    }
    currentCaseIdForModify = null;
}

/**
 * Guarda los cambios realizados en el formulario de modificación de un caso.
 */
export async function saveModifiedCase() {
    if (!currentCaseIdForModify) {
        showNotification('Error: No se ha seleccionado un caso para modificar.', true);
        return;
    }

    showLoader();
    const popupElement = document.getElementById('modifyCasePopup');
    const form = popupElement.querySelector('#caseForm');
    
    // REFACTOR: Recolectar datos manualmente para incluir campos deshabilitados
    const updatedData = {};
    const formElements = form.elements;

    for (const element of formElements) {
        if (element.name) {
            switch (element.type) {
                case 'select-multiple':
                    // FIX: Unir las opciones en un string, que es lo que espera el backend.
                    updatedData[element.name] = [...element.selectedOptions].map(option => option.value).join(', ');
                    break;
                case 'radio':
                    if (element.checked) {
                        updatedData[element.name] = element.value;
                    }
                    break;
                case 'checkbox':
                    updatedData[element.name] = element.checked;
                    break;
                case 'file':
                    // El archivo se maneja por separado
                    break;
                default:
                    updatedData[element.name] = element.value;
            }
        }
    }


    try {
        const casoActual = await getCaseByMongoId(currentCaseIdForModify);
        
        // Manejo de subida de archivo
        const archivoInput = form.querySelector('#archivo');
        if (archivoInput.files[0]) {
            const fileFormData = new FormData();
            fileFormData.append('archivo', archivoInput.files[0]);
            
            const API_BASE_URL = await getApiBaseUrlAsync();
            const uploadResponse = await fetch(`${API_BASE_URL}/upload`, {
                method: 'POST',
                body: fileFormData
            });

            if (!uploadResponse.ok) {
                throw new Error('Error al subir el nuevo archivo.');
            }
            const uploadResult = await uploadResponse.json();
            updatedData.archivo = uploadResult.fileName;
        } else {
            updatedData.archivo = casoActual.archivo; // Mantener el archivo existente si no se sube uno nuevo
        }

        // Registro de modificaciones
        const username = getLoggedInUsername();
        const modificationDate = new Date().toISOString();
        const changesDetected = [];
        const fieldsToCompare = Object.keys(updatedData);

        fieldsToCompare.forEach(field => {
            let oldValue = casoActual[field];
            let newValue = updatedData[field];

            if (field === 'caseDate' || field === 'fechaEntrega') {
                oldValue = casoActual[field] ? new Date(casoActual[field]).toISOString().split('T')[0] : '';
                newValue = updatedData[field] || '';
            } else {
                oldValue = String(oldValue || '').trim();
                newValue = String(newValue || '').trim();
            }

            if (oldValue !== newValue) {
                changesDetected.push({
                    campo: field,
                    valorAntiguo: oldValue,
                    valorNuevo: newValue,
                    fecha: modificationDate,
                    usuario: username || 'Desconocido'
                });
            }
        });

        const allModificaciones = [...(casoActual.modificaciones || []), ...changesDetected];
        updatedData.modificaciones = allModificaciones;
        
        const API_BASE_URL = await getApiBaseUrlAsync();
        const response = await fetch(`${API_BASE_URL}/casos/${currentCaseIdForModify}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error al guardar los cambios.');
        }

        showNotification('Caso modificado exitosamente.');
        closeModifyPopup();
        document.dispatchEvent(new CustomEvent('caseDataChanged'));

    } catch (error) {
        console.error('Error al guardar cambios del caso:', error);
        showNotification('Error al guardar cambios: ' + error.message, true);
    } finally {
        hideLoader();
    }
}


// --- MANEJADORES PARA EL POPUP DE VER DETALLES DEL CASO ---

/**
 * Abre el popup para ver los detalles de un caso en modo de solo lectura.
 * @export
 * @async
 * @param {string} mongoId - El ID de MongoDB del caso a visualizar.
 */
export async function openViewCasePopup(mongoId) {
    const popupElement = document.getElementById('viewCasePopup');
    if (!popupElement) return;

    try {
        const caso = await getCaseByMongoId(mongoId);
        currentCaseIdForView = caso._id;

        const form = popupElement.querySelector('#caseForm');
        form.reset();
        popupElement.querySelector('.popup-title').textContent = `Detalles del Caso: ${generateAlphanumericId(caso._id)}`;

        await _populateAndSetupForm(caso, popupElement);

        // Deshabilitar todos los campos y ocultar el botón de guardar
        Array.from(form.elements).forEach(el => el.disabled = true);
        const submitButton = form.querySelector('#submitCaseBtn');
        if(submitButton) {
            submitButton.style.display = 'none';
        }

        popupElement.style.display = 'flex';
        void popupElement.offsetHeight;

    } catch (error) {
        console.error('Error al abrir popup de vista:', error);
        showNotification('Error al abrir popup de vista: ' + error.message, true);
        popupElement.style.display = 'none';
    }
}

/**
 * Cierra el popup de visualización de detalles del caso.
 */
export function closeViewCasePopup() {
    const popupElement = document.getElementById('viewCasePopup');
    if (popupElement) {
        popupElement.style.display = 'none';
    }
    currentCaseIdForView = null;
}

/**
 * Función auxiliar para poblar el formulario unificado con los datos de un caso.
 * @param {object} caso - El objeto del caso con los datos.
 * @param {HTMLElement} popupElement - El elemento del popup que contiene el formulario.
 */
async function _populateAndSetupForm(caso, popupElement) {
    const form = popupElement.querySelector('#caseForm');
    if (!form) throw new Error('El formulario no se encontró en el popup.');

    // Llenar campos de texto, selects y textareas
    Object.keys(caso).forEach(key => {
        const element = form.elements[key];
        if (element && element.type !== 'file') { // <-- AÑADIR ESTA CONDICIÓN
            if (key === 'caseDate' || key === 'fechaEntrega') {
                element.value = caso[key] ? new Date(caso[key]).toISOString().split('T')[0] : '';
            } else if (element.type === 'radio' || element.type === 'checkbox') {
                // Para radio buttons (ej. punto_y_circulo)
                const radioToSelect = form.querySelector(`[name="${key}"][value="${caso[key]}"]`);
                if (radioToSelect) radioToSelect.checked = true;
            }
             else {
                element.value = caso[key];
            }
        }
    });
    
    // Llenar selects especiales
    populateSelect(form.querySelector('#acciones_ejecutadas'), tipoObraOptions, 'Selecciona Acciones Ejecutadas', caso.acciones_ejecutadas);
    populateSelect(form.querySelector('#parroquia'), parroquias, 'Selecciona Parroquia', caso.parroquia);

    // Actualizar circuito
    const parroquiaSelect = form.querySelector('#parroquia');
    const circuitoSelect = form.querySelector('#circuito');
    if (parroquiaSelect.value) {
        for (const [circuito, parroquiasList] of Object.entries(circuitosParroquias)) {
            if (parroquiasList.includes(parroquiaSelect.value)) {
                circuitoSelect.innerHTML = `<option value="${circuito}" selected>${circuito}</option>`;
                break;
            }
        }
    }

    // Inicializar y cargar comunas/consejos
    const comunaHandler = await initializeComunaHandler(
        parroquiaSelect,
        form.querySelector('#comuna'),
        form.querySelector('#codigoComuna'),
        form.querySelector('#consejo_comunal_ejecuta'),
        form.querySelector('#codigo_consejo_comunal'),
        `#${popupElement.id} .notification`
    );

    if (caso.parroquia) {
        await comunaHandler.cargarComunas(caso.parroquia);
        form.querySelector('#comuna').value = caso.comuna;
        await comunaHandler.cargarConsejosComunales(caso.comuna);
        form.querySelector('#consejo_comunal_ejecuta').value = caso.consejo_comunal_ejecuta;
    }

    // Mostrar archivo actual
    const currentArchivoSpan = form.querySelector('#current_archivo');
    if (currentArchivoSpan) {
        if (caso.archivo) {
            const API_BASE_URL = await getApiBaseUrlAsync();
            const fileUrl = caso.archivo.startsWith('http') ? caso.archivo : `${API_BASE_URL}/uploads/pdfs/${caso.archivo}`;
            currentArchivoSpan.innerHTML = `Archivo actual: <a href="${fileUrl}" target="_blank">${caso.archivo.split('/').pop()}</a>`;
        } else {
            currentArchivoSpan.textContent = 'Ninguno';
        }
    }
}


// --- MANEJADORES PARA EL POPUP DE VER ACTUACIONES ---

/**
 * Abre el popup para visualizar la lista de actuaciones de un caso.
 * Obtiene las actuaciones del caso y las formatea para su visualización.
 * @export
 * @async
 * @param {string} mongoId - El ID de MongoDB del caso cuyas actuaciones se van a visualizar.
 */
export async function openViewActuacionesPopup(mongoId) {
    try {
        const caso = await getCaseByMongoId(mongoId); // Obtiene datos del caso.
        // Almacena las actuaciones actuales para evitar múltiples accesos al objeto `caso`.
        currentActuaciones = Array.isArray(caso.actuaciones) ? caso.actuaciones : [];

        // Muestra el ID legible del caso en el título del popup.
        document.getElementById('viewActuacionesCaseId').textContent = generateAlphanumericId(caso._id);

        const actuacionesList = document.getElementById('viewActuacionesList'); // Elemento <ul> para la lista.
        actuacionesList.innerHTML = ''; // Limpia la lista previa.

        if (currentActuaciones.length > 0) {
            // Mapea las actuaciones para asegurar un formato consistente (con fecha y usuario).
            // Esto maneja actuaciones antiguas que podrían ser solo strings.
            const formattedActuaciones = currentActuaciones.map(act => {
                if (typeof act === 'string') { 
                    return { descripcion: act, fecha: 'Fecha desconocida', usuario: 'Desconocido' };
                }
                return act; // Si ya es un objeto, lo retorna tal cual.
            });

            // Ordena las actuaciones por fecha, de la más reciente a la más antigua.
            formattedActuaciones.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

            // Crea un elemento <li> para cada actuación formateada y lo añade a la lista.
            formattedActuaciones.forEach((act, index) => {
                const li = document.createElement('li');
                const fechaLegible = act.fecha ? new Date(act.fecha).toLocaleString() : 'Fecha desconocida';
                const usuarioDisplay = act.usuario ? `(${act.usuario}) ` : ''; // Muestra el usuario si está disponible.
                li.textContent = `${index + 1}. ${usuarioDisplay}(${fechaLegible}) ${act.descripcion}`;
                actuacionesList.appendChild(li);
            });
        } else {
            // Si no hay actuaciones, muestra un mensaje indicándolo.
            const li = document.createElement('li');
            li.textContent = 'No hay actuaciones registradas para este caso.';
            actuacionesList.appendChild(li);
        }

        const popupElement = document.getElementById('viewActuacionesPopup');
        popupElement.style.display = 'flex'; // Muestra el popup.
        // @ts-ignore
        void popupElement.offsetHeight; // Fuerza reflujo.
    }
    catch (error) { // Captura errores al obtener el caso o al manipular el DOM.
        console.error('Error al abrir popup de ver actuaciones:', error);
        showNotification('Error al abrir popup de ver actuaciones: ' + error.message, true);
        const popupElement = document.getElementById('viewActuacionesPopup');
        if (popupElement) { // Asegura ocultar el popup si falla la apertura.
            popupElement.style.display = 'none';
        }
    }
}

/**
 * Cierra el popup de visualización de actuaciones.
 * Limpia la variable `currentActuaciones`.
 * @export
 */
export function closeViewActuacionesPopup() {
    const popupElement = document.getElementById('viewActuacionesPopup');
    if (popupElement) {
        popupElement.style.display = 'none';
    }
    currentActuaciones = []; // Limpia el array de actuaciones.
}


// --- MANEJADORES PARA EL POPUP DE VER MODIFICACIONES ---

/**
 * Abre el popup para visualizar el historial de modificaciones de un caso.
 * Obtiene las modificaciones del caso y las formatea para su visualización.
 * @export
 * @async
 * @param {string} mongoId - El ID de MongoDB del caso cuyo historial de modificaciones se va a visualizar.
 */
export async function openViewModificacionesPopup(mongoId) {
    try {
        const caso = await getCaseByMongoId(mongoId); // Obtiene datos del caso.
        // Almacena las modificaciones actuales.
        currentModificaciones = Array.isArray(caso.modificaciones) ? caso.modificaciones : [];

        // Muestra el ID legible del caso en el título del popup.
        document.getElementById('viewModificacionesCaseId').textContent = generateAlphanumericId(caso._id);

        const modificacionesList = document.getElementById('viewModificacionesList'); // Elemento <ul>.
        modificacionesList.innerHTML = ''; // Limpia lista previa.

        if (currentModificaciones.length > 0) {
            // Ordena las modificaciones por fecha, de la más reciente a la más antigua.
            currentModificaciones.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

            // Crea un elemento <li> para cada modificación y lo añade a la lista.
            currentModificaciones.forEach((mod, index) => {
                const li = document.createElement('li');
                const fechaLegible = mod.fecha ? new Date(mod.fecha).toLocaleString() : 'Fecha desconocida';
                const usuarioDisplay = mod.usuario ? `(${mod.usuario}) ` : '';

                // Formatea la descripción de la modificación para ser legible.
                let descripcionDisplay = '';
                if (mod.campo === 'revisión') { // Caso especial para entradas de "revisión".
                    descripcionDisplay = 'Información del caso revisada (sin cambios específicos).';
                } else if (mod.campo !== undefined && mod.valorAntiguo !== undefined && mod.valorNuevo !== undefined) {
                    // Formato estándar para cambios de campo.
                    descripcionDisplay = `Campo '${mod.campo}' cambiado de '${mod.valorAntiguo}' a '${mod.valorNuevo}'`;
                } else {
                    // Fallback si la estructura de la modificación no es la esperada.
                    descripcionDisplay = mod.descripcion || 'Detalle no disponible o formato inesperado.';
                }

                li.textContent = `${index + 1}. ${usuarioDisplay}(${fechaLegible}) ${descripcionDisplay}`;
                modificacionesList.appendChild(li);
            });
        } else {
            // Mensaje si no hay modificaciones.
            const li = document.createElement('li');
            li.textContent = 'No hay modificaciones registradas para este caso.';
            modificacionesList.appendChild(li);
        }

        const popupElement = document.getElementById('viewModificacionesPopup');
        popupElement.style.display = 'flex'; // Muestra el popup.
        // @ts-ignore
        void popupElement.offsetHeight; // Fuerza reflujo.

        // Intentos adicionales para forzar un repintado global, útil si el contenido del popup
        // no se renderiza correctamente debido a cambios rápidos de display.
        document.body.style.zoom = 1.00000001; 
        void document.body.offsetWidth; 
        document.body.style.zoom = 1; 
    } catch (error) {
        console.error('Error al abrir popup de ver modificaciones:', error);
        showNotification('Error al abrir popup de ver modificaciones: ' + error.message, true);
        const popupElement = document.getElementById('viewModificacionesPopup');
        if (popupElement) { // Asegura ocultar el popup si falla.
            popupElement.style.display = 'none';
        }
    }
}

/**
 * Cierra el popup de visualización de modificaciones.
 * Restablece `currentCaseIdForModificacionesView` y `currentModificaciones`.
 * @export
 */
export function closeViewModificacionesPopup() {
    const popupElement = document.getElementById('viewModificacionesPopup');
    if (popupElement) {
        popupElement.style.display = 'none';
    }
    currentCaseIdForModificacionesView = null; // Resetea ID.
    currentModificaciones = []; // Limpia array de modificaciones.
}

// --- FUNCIONES PARA BORRAR CASO ---

/**
 * Abre el popup de confirmación para borrar un caso.
 * Requiere la introducción de una clave de seguridad.
 * @export
 * @async
 * @param {string} mongoId - El ID de MongoDB del caso a borrar.
 */
export async function openConfirmDeletePopup(mongoId) {
    //console.log('[popup_handler] openConfirmDeletePopup llamado con mongoId:', mongoId); // Log para depuración.
    try {
        const caso = await getCaseByMongoId(mongoId); // Obtiene datos del caso.
        currentCaseIdForDelete = caso._id; // Almacena ID del caso actual.
        
        const popupElement = document.getElementById('confirmDeletePopup');
        if (!popupElement) { // Verificación adicional por si el elemento no existe.
            console.error('[popup_handler] Elemento del popup confirmDeletePopup NO ENCONTRADO.');
            return;
        }
        //console.log('[popup_handler] Elemento confirmDeletePopup encontrado:', popupElement); // Log.
        // Muestra ID legible.
        document.getElementById('deleteCaseIdDisplay').textContent = generateAlphanumericId(caso._id);
        popupElement.style.display = 'flex'; // Muestra el popup.
        // @ts-ignore
        void popupElement.offsetHeight; // Fuerza reflujo.

        // Intentos adicionales para forzar repintado (pueden ser redundantes si el reflujo simple funciona).
        document.body.style.zoom = 1.00000001; 
        void document.body.offsetWidth; 
        document.body.style.zoom = 1; 

        document.getElementById('deleteSecurityPasswordInput').value = ''; // Limpia campo de contraseña.
    } catch (error) {
        console.error('[popup_handler] Error en openConfirmDeletePopup:', error); // Log de error.
        showNotification('Error al abrir confirmación de borrado: ' + error.message, true);
        const popupElement = document.getElementById('confirmDeletePopup');
        if (popupElement) {
            popupElement.style.display = 'none'; // Oculta si hay error.
        }
    }
}

/**
 * Cierra el popup de confirmación de borrado de caso.
 * Restablece `currentCaseIdForDelete`.
 * @export
 */
export function closeConfirmDeletePopup() {
    const popupElement = document.getElementById('confirmDeletePopup');
    if (popupElement) {
        popupElement.style.display = 'none';
    }
    currentCaseIdForDelete = null; // Resetea ID.
}

/**
 * Confirma y ejecuta la eliminación de un caso.
 * Envía el ID del caso y la clave de seguridad al backend para validación y eliminación.
 * @export
 * @async
 */
export async function confirmDeleteCase() {
    if (!currentCaseIdForDelete) { // Verifica que haya un caso seleccionado.
        showNotification('Error: No se ha seleccionado un caso para borrar.', true);
        return;
    }

    const enteredPassword = document.getElementById('deleteSecurityPasswordInput').value; // Obtiene contraseña.
    if (!enteredPassword) { // Valida contraseña.
        showNotification('Por favor, ingresa la clave de seguridad para eliminar.', true);
        return;
    }

    showLoader(); // Muestra loader.
    try {
        // Petición DELETE al endpoint específico para borrar con contraseña.
        const API_BASE_URL = await getApiBaseUrlAsync();
        const response = await fetch(`${API_BASE_URL}/casos/${currentCaseIdForDelete}/delete-with-password`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password: enteredPassword }) // Envía contraseña.
        });

        const responseData = await response.json(); // Parsea respuesta.

        if (!response.ok) { // Si hay error.
            throw new Error(responseData.message || 'Error desconocido al borrar caso.');
        }

        showNotification('Caso borrado exitosamente.'); // Notificación de éxito.
        closeConfirmDeletePopup(); // Cierra popup.
        // Dispara eventos para actualizar otros componentes.
        document.dispatchEvent(new CustomEvent('casoActualizado'));
        document.dispatchEvent(new CustomEvent('caseDataChanged'));

    } catch (error) {
        console.error('Error al borrar caso:', error);
        showNotification('Error al borrar caso: ' + error.message, true);
        document.dispatchEvent(new CustomEvent('casoActualizado')); // También dispara en caso de error.
    } finally {
        hideLoader(); // Oculta loader.
    }
}

// CONFIGURACIÓN DE EVENT LISTENERS GLOBALES PARA POPUPS
// Se ejecuta cuando el DOM está completamente cargado.
// Adjunta los event listeners a los botones de cerrar (X), cancelar y confirmar/guardar de cada popup.
// Esto evita la necesidad de usar `onclick` directamente en el HTML y centraliza el manejo de eventos.
document.addEventListener('DOMContentLoaded', () => {

    /**
     * Función auxiliar para configurar los event listeners de un popup.
     * @param {string} popupId - El ID del elemento HTML del popup.
     * @param {Function} closeFn - La función que se llamará para cerrar el popup.
     * @param {Function} [confirmFn=null] - La función que se llamará al hacer clic en el botón de confirmar (si existe).
     * @param {Function} [saveFn=null] - La función que se llamará al hacer clic en el botón de guardar (si existe, específico para algunos popups).
     */
    function setupPopupListeners(popupId, closeFn, confirmFn = null, saveFn = null) {
        const popup = document.getElementById(popupId); // Obtiene el elemento del popup.
        if (popup) {
            // Botón de cerrar (X), busca por clase '.close-btn' o '.close'.
            const closeSpan = popup.querySelector('.close-btn') || popup.querySelector('.close');
            if (closeSpan) {
                closeSpan.addEventListener('click', closeFn);
            }

            // Botón de cancelar (clase '.cancel-btn').
            const cancelBtn = popup.querySelector('.cancel-btn');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', closeFn);
            }
            // Botón de confirmar (clase '.confirm-btn').
            const confirmBtn = popup.querySelector('.confirm-btn');
            if (confirmBtn && confirmFn) {
                confirmBtn.addEventListener('click', confirmFn);
            }
            
            // Botones de guardar específicos por ID, ya que no todos usan una clase genérica.
            if (popupId === 'actuacionPopup') { // Para el popup de agregar actuación.
                const saveActBtn = popup.querySelector('#saveActuacionBtn');
                if (saveActBtn) saveActBtn.addEventListener('click', saveFn);
            } else if (popupId === 'modifyCasePopup') { // Para el popup de modificar caso.
                const saveModifyBtn = popup.querySelector('#saveModifiedCaseBtn');
                if (saveModifyBtn) saveModifyBtn.addEventListener('click', saveFn);
            }
        }
    }
    
    // Configura los listeners para cada uno de los popups definidos en el HTML.
    setupPopupListeners('confirmDeliveryPopup', closeConfirmDeliveryPopup, confirmDelivery);
    setupPopupListeners('confirmDeletePopup', closeConfirmDeletePopup, confirmDeleteCase);
    setupPopupListeners('actuacionPopup', closeActuacionPopup, null, saveActuacion); 
    setupPopupListeners('modifyCasePopup', closeModifyPopup, null, saveModifiedCase); 
    setupPopupListeners('viewCasePopup', closeViewCasePopup);
    setupPopupListeners('viewActuacionesPopup', closeViewActuacionesPopup);
    setupPopupListeners('viewModificacionesPopup', closeViewModificacionesPopup);
    
    // Listener específico para el select de parroquia en el FORMULARIO DE MODIFICACIÓN.
    // Cuando cambia la parroquia, se actualiza el circuito automáticamente.
    const modifyParroquiaSelect = document.getElementById('parroquia');
    if (modifyParroquiaSelect) {
        modifyParroquiaSelect.addEventListener('change', updateCircuitoSelectionForModifyForm);
    }
    
    // Inicializar manejadores de Punto y Círculo para cada formulario en los popups
    const modifyForm = document.querySelector('#modifyCasePopup #caseForm');
    if (modifyForm) {
        initializePuntoYCirculoHandlers(modifyForm);
    }
    const viewForm = document.querySelector('#viewCasePopup #caseForm');
    if (viewForm) {
        initializePuntoYCirculoHandlers(viewForm);
    }
});