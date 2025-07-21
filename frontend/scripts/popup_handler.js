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
    populateSelect // Función para poblar elementos <select>
} from './home/select_populator.js'; // Datos y funciones para los selects de los formularios.

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
    try {
        const caso = await getCaseByMongoId(mongoId); // Obtiene los datos del caso.
        currentCaseIdForModify = caso._id; // Almacena el ID del caso actual.
        // Muestra el ID legible del caso en el título del popup.
        document.getElementById('modifyCaseIdDisplay').textContent = generateAlphanumericId(caso._id);

        // Puebla los campos del formulario con los datos del caso.
        // Usa la función populateSelect para los campos <select>.
        populateSelect(document.getElementById('modify_tipo_obra'), tipoObraOptions, 'Selecciona Tipo de Obra', caso.tipo_obra);
        populateSelect(document.getElementById('modify_parroquia'), parroquias, 'Selecciona Parroquia', caso.parroquia);
        
        // Actualiza y establece el valor del circuito (que depende de la parroquia).
        updateCircuitoSelectionForModifyForm(); // Asegura que el select de circuito tenga las opciones correctas.
        document.getElementById('modify_circuito').value = caso.circuito; // Establece el valor actual del circuito.

        // Puebla los campos de texto.
        document.getElementById('modify_nombre_obra').value = caso.nombre_obra || '';
        document.getElementById('modify_eje').value = caso.eje || '';
        document.getElementById('modify_comuna').value = caso.comuna || '';
        document.getElementById('modify_codigoComuna').value = caso.codigoComuna || '';
        document.getElementById('modify_nameJC').value = caso.nameJC || '';
        document.getElementById('modify_nameJU').value = caso.nameJU || '';
        document.getElementById('modify_enlaceComunal').value = caso.enlaceComunal || '';
        document.getElementById('modify_caseDescription').value = caso.caseDescription || '';
        // Formatea la fecha para el input de tipo 'date'.
        document.getElementById('modify_caseDate').value = caso.caseDate ? new Date(caso.caseDate).toISOString().split('T')[0] : '';

        // Poblar nuevos campos
        document.getElementById('modify_ente_responsable').value = caso.ente_responsable || '';
        
        // Para selects como cantidad_consejos_comunales y cantidad_familiares,
        // nos aseguraremos de que las opciones existan y luego seleccionaremos el valor.
        const cantidadConsejosSelect = document.getElementById('modify_cantidad_consejos_comunales');
        if (cantidadConsejosSelect) {
            // Si las opciones no están (ej. porque no están hardcodeadas en casos.html para este popup)
            // podrías generarlas aquí como en home.html o asegurar que estén en el HTML.
            // Por ahora, asumimos que las opciones existen o se añadirán al HTML (paso 5 del plan).
            cantidadConsejosSelect.value = caso.cantidad_consejos_comunales || '';
        }

        document.getElementById('modify_consejo_comunal_ejecuta').value = caso.consejo_comunal_ejecuta || '';
        
        const cantidadFamiliasSelect = document.getElementById('modify_cantidad_familiares');
        if (cantidadFamiliasSelect) {
            // Similar a cantidad_consejos_comunales. El plan indica añadir opciones al HTML.
            // Si no tuviera opciones, se podrían generar aquí:
            // if (cantidadFamiliasSelect.options.length <= 1) { // <=1 para contar la opción "Seleccione cantidad"
            //     for (let i = 0; i <= 100; i++) {
            //         const option = document.createElement('option');
            //         option.value = i;
            //         option.textContent = i;
            //         cantidadFamiliasSelect.appendChild(option);
            //     }
            // }
            cantidadFamiliasSelect.value = caso.cantidad_familiares || '';
        }
        
        document.getElementById('modify_direccion_exacta').value = caso.direccion_exacta || '';
        document.getElementById('modify_responsable_sala_autogobierno').value = caso.responsable_sala_autogobierno || '';
        document.getElementById('modify_jefe_calle').value = caso.jefe_calle || '';
        document.getElementById('modify_jefe_politico_eje').value = caso.jefe_politico_eje || '';
        document.getElementById('modify_jefe_juventud_circuito_comunal').value = caso.jefe_juventud_circuito_comunal || '';

        // Muestra información sobre el archivo PDF actual, si existe.
        const currentArchivoSpan = document.getElementById('modify_current_archivo');
        const API_BASE_URL = await getApiBaseUrlAsync(); // Obtener la URL base
        const fileUrl = caso.archivo ? `${API_BASE_URL}/uploads/pdfs/${caso.archivo}` : '#';
        if (caso.archivo) {
            currentArchivoSpan.innerHTML = `Archivo actual: <a href="${fileUrl}" target="_blank">${caso.archivo}</a>`;
        } else {
            currentArchivoSpan.textContent = 'Ninguno';
        }

        // Asegura que el listener para el cambio de parroquia esté activo en el formulario de modificación.
        const modifyParroquiaSelect = document.getElementById('modify_parroquia');
        if (modifyParroquiaSelect) {
            modifyParroquiaSelect.onchange = updateCircuitoSelectionForModifyForm;
        }

        const popupElement = document.getElementById('modifyCasePopup');
        popupElement.style.display = 'flex'; // Muestra el popup.
        // @ts-ignore
        void popupElement.offsetHeight; // Fuerza reflujo.
    } catch (error) {
        console.error('Error al abrir popup de modificación:', error);
        showNotification('Error al abrir popup de modificación: ' + error.message, true);
        const popupElement = document.getElementById('modifyCasePopup');
        if (popupElement) {
            popupElement.style.display = 'none'; // Oculta si hay error.
        }
    }
}

/**
 * Cierra el popup de modificación de caso.
 * Restablece `currentCaseIdForModify` y quita el listener `onchange` del select de parroquia.
 * @export
 */
export function closeModifyPopup() {
    const popupElement = document.getElementById('modifyCasePopup');
    if (popupElement) {
        popupElement.style.display = 'none';
    }
    currentCaseIdForModify = null; // Resetea ID.
    // Limpia el listener del select de parroquia para evitar efectos secundarios si el popup se reutiliza.
    const modifyParroquiaSelect = document.getElementById('modify_parroquia');
    if (modifyParroquiaSelect) {
        modifyParroquiaSelect.onchange = null;
    }
}

/**
 * Guarda los cambios realizados en el formulario de modificación de un caso.
 * Compara los datos actuales con los nuevos, registra las modificaciones,
 * maneja la subida de un nuevo archivo PDF si se proporciona,
 * y envía una petición PATCH al backend para actualizar el caso.
 * @export
 * @async
 */
export async function saveModifiedCase() {
    if (!currentCaseIdForModify) { // Verifica que haya un caso seleccionado.
        showNotification('Error: No se ha seleccionado un caso para modificar.', true);
        return;
    }

    showLoader(); // Muestra loader.
    try {
        let casoActual;
        // Obtiene los datos actuales del caso para compararlos con los datos modificados.
        try {
            casoActual = await getCaseByMongoId(currentCaseIdForModify);
        } catch (error) {
            console.error('Error al obtener el caso actual para modificación:', error);
            showNotification('Error al cargar datos actuales para comparar.', true);
            throw error; // Propaga el error para que sea manejado por el catch exterior y el finally.
        }

    // Recopila los datos actualizados del formulario.
    const updatedData = {
        tipo_obra: document.getElementById('modify_tipo_obra').value,
        nombre_obra: document.getElementById('modify_nombre_obra').value,
        parroquia: document.getElementById('modify_parroquia').value,
        circuito: document.getElementById('modify_circuito').value,
        eje: document.getElementById('modify_eje').value,
        comuna: document.getElementById('modify_comuna').value,
        codigoComuna: document.getElementById('modify_codigoComuna').value,
        nameJC: document.getElementById('modify_nameJC').value,
        nameJU: document.getElementById('modify_nameJU').value,
        enlaceComunal: document.getElementById('modify_enlaceComunal').value,
        caseDescription: document.getElementById('modify_caseDescription').value,
        caseDate: document.getElementById('modify_caseDate').value,
        // Nuevos campos
        ente_responsable: document.getElementById('modify_ente_responsable').value,
        cantidad_consejos_comunales: document.getElementById('modify_cantidad_consejos_comunales').value,
        consejo_comunal_ejecuta: document.getElementById('modify_consejo_comunal_ejecuta').value,
        cantidad_familiares: document.getElementById('modify_cantidad_familiares').value,
        direccion_exacta: document.getElementById('modify_direccion_exacta').value,
        responsable_sala_autogobierno: document.getElementById('modify_responsable_sala_autogobierno').value,
        jefe_calle: document.getElementById('modify_jefe_calle').value,
        jefe_politico_eje: document.getElementById('modify_jefe_politico_eje').value,
        jefe_juventud_circuito_comunal: document.getElementById('modify_jefe_juventud_circuito_comunal').value,
        // El campo 'archivo' se maneja por separado.
    };

    // Manejo de la subida de un nuevo archivo PDF.
    const archivoInput = document.getElementById('modify_archivo');
    const selectedFile = archivoInput.files[0]; // Obtiene el archivo seleccionado (si hay alguno).

    if (selectedFile) { // Si se seleccionó un nuevo archivo.
        // Validaciones del nuevo archivo.
        const MAX_FILE_SIZE_MB = 2;
        const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

        if (selectedFile.type !== 'application/pdf') {
            showNotification('Solo se permiten archivos PDF para el archivo del caso.', true);
            hideLoader(); return; // Detiene si no es PDF.
        }
        if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
            showNotification(`El archivo PDF excede el tamaño máximo de ${MAX_FILE_SIZE_MB}MB.`, true);
            hideLoader(); return; // Detiene si es muy grande.
        }

        // Crea FormData para enviar el nuevo archivo al endpoint de subida.
        const formData = new FormData();
        formData.append('archivo', selectedFile);

        try {
            // Sube el nuevo archivo.
            const API_BASE_URL = await getApiBaseUrlAsync();
            const uploadResponse = await fetch(`${API_BASE_URL}/upload`, {
                method: 'POST',
                body: formData
            });

            if (!uploadResponse.ok) { // Si la subida falla.
                const errorText = await uploadResponse.text();
                throw new Error(`Error al subir el archivo: ${uploadResponse.statusText} - ${errorText}`);
            }

            const uploadResult = await uploadResponse.json();
            updatedData.archivo = uploadResult.fileName; // Asigna el nombre del nuevo archivo a los datos a actualizar.
        } catch (uploadError) {
            console.error('Error al subir el archivo:', uploadError);
            showNotification('Error al subir el archivo: ' + uploadError.message, true);
            hideLoader(); return; // Detiene si la subida falla.
        }
    } else {
        // Si no se seleccionó un nuevo archivo, mantiene el nombre del archivo existente.
        updatedData.archivo = casoActual.archivo;
    }

    // REGISTRO DE MODIFICACIONES
    const username = getLoggedInUsername(); // Usuario que realiza la modificación.
    const modificationDate = new Date().toISOString(); // Fecha de la modificación.
    const changesDetected = []; // Array para almacenar los cambios detectados.

    // Campos a comparar para detectar cambios.
    const fieldsToCompare = [
        'tipo_obra', 'nombre_obra', 'parroquia', 'circuito', 'eje', 'comuna', 'codigoComuna',
        'nameJC', 'nameJU', 'enlaceComunal', 'caseDescription', 'caseDate', 'archivo',
        'ente_responsable', 'cantidad_consejos_comunales', 'consejo_comunal_ejecuta',
        'cantidad_familiares', 'direccion_exacta', 'responsable_sala_autogobierno',
        'jefe_calle', 'jefe_politico_eje', 'jefe_juventud_circuito_comunal'
    ];

    // Compara cada campo del formulario con su valor original en `casoActual`.
    fieldsToCompare.forEach(field => {
        let oldValue = casoActual[field];
        let newValue = updatedData[field];

        // Normaliza los valores para una comparación precisa (especialmente fechas y strings).
        if (field === 'caseDate') { // Formatea fechas a YYYY-MM-DD.
            oldValue = casoActual.caseDate ? new Date(casoActual.caseDate).toISOString().split('T')[0] : '';
            newValue = updatedData.caseDate || '';
        } else { // Para otros campos, convierte a string y quita espacios extra.
            oldValue = (oldValue !== undefined && oldValue !== null) ? String(oldValue).trim() : '';
            newValue = (newValue !== undefined && newValue !== null) ? String(newValue).trim() : '';
        }

        // Si hay una diferencia, registra el cambio.
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

    // Obtiene el historial de modificaciones existente y añade los nuevos cambios.
    const allModificaciones = Array.isArray(casoActual.modificaciones) ? [...casoActual.modificaciones] : [];
    if (changesDetected.length > 0) {
        changesDetected.forEach(changeEntry => allModificaciones.push(changeEntry));
    } else {
        // Si no se detectaron cambios específicos en los campos pero el usuario guardó el formulario,
        // se registra una entrada de "revisión" para indicar que el caso fue abierto y guardado.
        allModificaciones.push({
            campo: 'revisión', // Tipo especial de modificación.
            valorAntiguo: 'N/A',
            valorNuevo: 'N/A',
            fecha: modificationDate,
            usuario: username || 'Desconocido'
        });
    }
    updatedData.modificaciones = allModificaciones; // Añade el historial de modificaciones a los datos a actualizar.


        // Envía la petición PATCH al backend para guardar todos los cambios del caso.
        const API_BASE_URL = await getApiBaseUrlAsync();
        const response = await fetch(`${API_BASE_URL}/casos/${currentCaseIdForModify}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData) // Envía todos los datos actualizados, incluyendo el historial de modificaciones.
        });

        if (!response.ok) { // Si hay error.
            const errorData = await response.json().catch(() => ({ message: 'Error desconocido del servidor al guardar cambios.' }));
            throw new Error(`Error al guardar cambios: ${response.status} - ${errorData.message || response.statusText}`);
        }

        showNotification('Caso modificado exitosamente.'); // Notificación de éxito.
        closeModifyPopup(); // Cierra el popup.
        // Dispara eventos para actualizar otros componentes.
        document.dispatchEvent(new CustomEvent('casoActualizado'));
        document.dispatchEvent(new CustomEvent('caseDataChanged'));

    } catch (error) { // Captura errores de getCaseByMongoId, subida de archivo, o el fetch final de guardado.
        console.error('Error al guardar cambios del caso:', error);
        showNotification('Error al guardar cambios: ' + error.message, true);
    } finally {
        hideLoader(); // Siempre oculta el loader.
    }
}


// --- MANEJADORES PARA EL POPUP DE VER DETALLES DEL CASO ---

/**
 * Abre el popup para ver los detalles de un caso en modo de solo lectura.
 * Obtiene los datos del caso por su `mongoId` y los muestra en los elementos HTML correspondientes.
 * @export
 * @async
 * @param {string} mongoId - El ID de MongoDB del caso a visualizar.
 */
export async function openViewCasePopup(mongoId) {
    try {
        const caso = await getCaseByMongoId(mongoId); // Obtiene datos del caso.
        currentCaseIdForView = caso._id; // Almacena ID actual.
        // Muestra ID legible.
        document.getElementById('viewCaseIdDisplay').textContent = generateAlphanumericId(caso._id);

        // Puebla todos los campos de texto con la información del caso.
        // Usa 'N/A' si un campo no tiene valor.
        document.getElementById('view_tipo_obra').textContent = caso.tipo_obra || 'N/A';
        document.getElementById('view_nombre_obra').textContent = caso.nombre_obra || 'N/A';
        document.getElementById('view_parroquia').textContent = caso.parroquia || 'N/A';
        document.getElementById('view_circuito').textContent = caso.circuito || 'N/A';
        document.getElementById('view_eje').textContent = caso.eje || 'N/A';
        // Nuevos campos
        document.getElementById('view_ente_responsable').textContent = caso.ente_responsable || 'N/A';
        document.getElementById('view_cantidad_consejos_comunales').textContent = caso.cantidad_consejos_comunales || 'N/A';
        document.getElementById('view_consejo_comunal_ejecuta').textContent = caso.consejo_comunal_ejecuta || 'N/A';
        document.getElementById('view_cantidad_familiares').textContent = caso.cantidad_familiares || 'N/A';
        document.getElementById('view_direccion_exacta').textContent = caso.direccion_exacta || 'N/A';
        document.getElementById('view_responsable_sala_autogobierno').textContent = caso.responsable_sala_autogobierno || 'N/A';
        document.getElementById('view_jefe_calle').textContent = caso.jefe_calle || 'N/A';
        document.getElementById('view_jefe_politico_eje').textContent = caso.jefe_politico_eje || 'N/A';
        document.getElementById('view_jefe_juventud_circuito_comunal').textContent = caso.jefe_juventud_circuito_comunal || 'N/A';
        // Campos existentes
        document.getElementById('view_comuna').textContent = caso.comuna || 'N/A';
        document.getElementById('view_codigoComuna').textContent = caso.codigoComuna || 'N/A';
        document.getElementById('view_nameJC').textContent = caso.nameJC || 'N/A';
        document.getElementById('view_nameJU').textContent = caso.nameJU || 'N/A';
        document.getElementById('view_enlaceComunal').textContent = caso.enlaceComunal || 'N/A';
        document.getElementById('view_caseDescription').textContent = caso.caseDescription || 'N/A';
        // Formatea la fecha del caso.
        document.getElementById('view_caseDate').textContent = caso.caseDate ? new Date(caso.caseDate).toLocaleDateString() : 'N/A';

        // Muestra el enlace al archivo PDF si existe.
        const viewArchivo = document.getElementById('view_archivo');
        // Si caso.archivo ya es una URL completa (ej. de S3), úsala directamente.
        // Si es solo un nombre de archivo, entonces sí se podría construir la URL.
        // Asumiendo que caso.archivo AHORA CONTIENE LA URL COMPLETA DE S3.
        const fileUrl = caso.archivo ? caso.archivo : '#'; 
        //console.log("[ViewCasePopup] caso.archivo:", caso.archivo);
        //console.log("[ViewCasePopup] fileUrl construida:", fileUrl);
        //console.log("[ViewCasePopup] viewArchivo tagName:", viewArchivo.tagName);

        if (caso.archivo) {
            // Extraer solo el nombre del archivo para mostrar, si caso.archivo es una URL completa
            const fileName = caso.archivo.substring(caso.archivo.lastIndexOf('/') + 1);
            viewArchivo.innerHTML = `<a href="${fileUrl}" target="_blank">${fileName}</a>`;
            
            const linkElement = viewArchivo.querySelector('a'); // Intentar obtener el <a> interno
            if (linkElement) {
                //console.log("[ViewCasePopup] href del <a> interno ANTES de modificar:", linkElement.href);
                linkElement.href = fileUrl; // Asegurarse de que el <a> interno tenga el href correcto
                //console.log("[ViewCasePopup] href del <a> interno DESPUÉS de modificar:", linkElement.href);
            } else if (viewArchivo.tagName === 'A') { // Si el elemento en sí es un <a>
                console.log("[ViewCasePopup] href de viewArchivo (si es A) ANTES de modificar:", viewArchivo.href);
                viewArchivo.href = fileUrl;
                console.log("[ViewCasePopup] href de viewArchivo (si es A) DESPUÉS de modificar:", viewArchivo.href);
            }
        } else {
            viewArchivo.textContent = 'N/A';
            if (viewArchivo.tagName === 'A') {
                viewArchivo.href = '#'; // Evita errores si es un <a>.
            }
        }

        document.getElementById('view_estado').textContent = caso.estado || 'N/A';
        // Muestra la fecha de entrega solo si el caso está 'Entregado'.
        document.getElementById('view_fechaEntrega').textContent = caso.fechaEntrega && caso.estado === 'Entregado' ? new Date(caso.fechaEntrega).toLocaleDateString() : 'N/A';
        
        // Muestra las fechas de creación y última actualización, formateadas.
        document.getElementById('view_createdAt').textContent = caso.createdAt ? new Date(caso.createdAt).toLocaleString() : 'N/A';
        document.getElementById('view_updatedAt').textContent = caso.updatedAt ? new Date(caso.updatedAt).toLocaleString() : 'N/A';

        // Configura el botón/enlace para ver actuaciones.
        const viewActuacionesSection = document.getElementById('view_actuaciones');
        if (viewActuacionesSection) {
            viewActuacionesSection.innerHTML = ''; // Limpia contenido previo.
            if (Array.isArray(caso.actuaciones) && caso.actuaciones.length > 0) {
                // Si hay actuaciones, crea un botón para abrir el popup de ver actuaciones.
                const button = document.createElement('button');
                button.className = 'button-link view-actuaciones-btn'; // Clase para estilos.
                button.textContent = 'VER';
                button.dataset.id = caso._id; // Almacena el ID en el dataset del botón.
                viewActuacionesSection.appendChild(button);
                button.addEventListener('click', (event) => {
                    event.stopPropagation(); // Evita que el clic se propague a otros listeners (ej. cerrar el popup actual).
                    openViewActuacionesPopup(event.currentTarget.dataset.id); // Abre el popup de actuaciones.
                });
            } else {
                viewActuacionesSection.textContent = 'Ninguna actuación registrada.';
            }
        } else {
            console.warn("Elemento con ID 'view_actuaciones' no encontrado en el DOM.");
        }

        // Configura el botón/enlace para ver modificaciones.
        const viewModificacionesSection = document.getElementById('view_modificaciones');
        if (viewModificacionesSection) {
            viewModificacionesSection.innerHTML = ''; // Limpia contenido previo.
            if (Array.isArray(caso.modificaciones) && caso.modificaciones.length > 0) {
                // Si hay modificaciones, crea un botón para abrir el popup de ver modificaciones.
                const button = document.createElement('button');
                button.className = 'button-link view-modificaciones-btn';
                button.textContent = 'VER';
                button.dataset.id = caso._id;
                viewModificacionesSection.appendChild(button);
                button.addEventListener('click', (event) => {
                    event.stopPropagation();
                    openViewModificacionesPopup(event.currentTarget.dataset.id); // Abre el popup de modificaciones.
                });
            } else {
                viewModificacionesSection.textContent = 'Ninguna modificación registrada.';
            }
        } else {
            console.warn("Elemento con ID 'view_modificaciones' no encontrado en el DOM.");
        }

        const popupElement = document.getElementById('viewCasePopup');
        popupElement.style.display = 'flex'; // Muestra el popup.
        // @ts-ignore
        void popupElement.offsetHeight; // Fuerza reflujo.
    } catch (error) {
        console.error('Error al abrir popup de vista:', error);
        showNotification('Error al abrir popup de vista: ' + error.message, true);
        const popupElement = document.getElementById('viewCasePopup');
        if (popupElement) {
            popupElement.style.display = 'none'; // Oculta si hay error.
        }
    }
}

/**
 * Cierra el popup de visualización de detalles del caso.
 * Restablece `currentCaseIdForView`.
 * @export
 */
export function closeViewCasePopup() {
    const popupElement = document.getElementById('viewCasePopup');
    if (popupElement) {
        popupElement.style.display = 'none';
    }
    currentCaseIdForView = null; // Resetea ID.
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
    const modifyParroquiaSelect = document.getElementById('modify_parroquia');
    if (modifyParroquiaSelect) {
        modifyParroquiaSelect.addEventListener('change', updateCircuitoSelectionForModifyForm);
    }
});