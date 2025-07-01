// scripts/popup_handler.js
import { showLoader, hideLoader } from './loader.js';
import { generateAlphanumericId, showNotification } from './utils.js';
import {
    tipoObraOptions,
    parroquias,
    circuitos,
    circuitosParroquias,
    populateSelect
} from './home/select_populator.js';
// REMOVIDO: import { loadAndDisplayCases } from './caseTableManager.js'; // Eliminada la importación directa

// Estas variables ahora almacenarán el ID DE MONGODB (_id)
export let currentCaseIdForActuacion = null;
export let currentCaseIdForDelivery = null;
export let currentCaseIdForModify = null;
export let currentCaseIdForView = null;
export let currentCaseIdForModificacionesView = null; // ID de MongoDB para ver modificaciones
export let currentCaseIdForDelete = null; // ID de MongoDB para borrar caso

// Nueva variable global para almacenar las modificaciones que se están viendo
let currentModificaciones = [];
// Nueva variable global para almacenar las actuaciones que se están viendo
let currentActuaciones = [];
/**
 * Obtiene el nombre de usuario del usuario logueado desde localStorage.
 * @returns {string|null} El nombre de usuario o null si no hay sesión.
 */
function getLoggedInUsername() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        return user ? user.username : null;
    } catch (e) {
        console.error("Error al parsear el usuario de localStorage:", e);
        return null;
    }
}

export function updateCircuitoSelectionForModifyForm() {
    const parroquiaSelect = document.getElementById('modify_parroquia');
    const circuitoSelect = document.getElementById('modify_circuito');

    if (!parroquiaSelect || !circuitoSelect) return;

    const selectedParroquia = parroquiaSelect.value;
    let matchedCircuito = '';
    for (const [circuito, parroquiasList] of Object.entries(circuitosParroquias)) {
        if (parroquiasList.includes(selectedParroquia)) {
            matchedCircuito = circuito;
            break;
        }
    }
    circuitoSelect.innerHTML = '<option value="" disabled>Circuito asignado automáticamente</option>';
    circuitoSelect.disabled = true;
    if (matchedCircuito) {
        const option = document.createElement('option');
        option.value = matchedCircuito;
        option.textContent = matchedCircuito;
        option.selected = true;
        circuitoSelect.appendChild(option);
    }
}
// --- Función de ayuda para obtener un caso por su _id de MongoDB ---
async function getCaseByMongoId(mongoId) {
    console.log('Intentando obtener caso con _id de MongoDB:', mongoId);
    if (!mongoId) {
        throw new Error('ID de MongoDB no proporcionado para buscar el caso.');
    }
    try {
        const response = await fetch(`http://localhost:3000/casos/${mongoId}`);
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error(`Caso con _id ${mongoId} no encontrado en el servidor.`);
            }
            throw new Error(`Error al obtener el caso: ${response.status} - ${response.statusText}`);
        }
        const caso = await response.json();
        console.log("Caso obtenido por _id:", caso);
        return caso;
    } catch (error) {
        console.error('Error en getCaseByMongoId:', error);
        throw error;
    }
}
// --- Manejadores de Popup de Actuación ---
export async function openActuacionPopup(mongoId) {
    try {
        const caso = await getCaseByMongoId(mongoId);
        currentCaseIdForActuacion = caso._id;
        const popupElement = document.getElementById('actuacionPopup');
        document.getElementById('actuacionCaseId').textContent = generateAlphanumericId(caso._id);
        popupElement.style.display = 'flex';
        // @ts-ignore
        void popupElement.offsetHeight; // Force reflow
        document.getElementById('newActuacionText').value = '';
    } catch (error) {
        console.error('Error al abrir popup de actuación:', error);
        showNotification('Error al abrir popup de actuación: ' + error.message, true);
        const popupElement = document.getElementById('actuacionPopup');
        if (popupElement) {
            popupElement.style.display = 'none';
        }
    }
}
/**
 * Cierra el popup de agregar actuación.
 */
export function closeActuacionPopup() {
    const popupElement = document.getElementById('actuacionPopup');
    if (popupElement) {
        popupElement.style.display = 'none';
    }
    currentCaseIdForActuacion = null;
}
/**
 * Guarda una nueva actuación para el caso actualmente seleccionado.
 */
export async function saveActuacion() {
    if (!currentCaseIdForActuacion) {
        showNotification('Error: No se ha seleccionado un caso para agregar actuación.', true);
        return;
    }
    const newActuacionText = document.getElementById('newActuacionText').value.trim();
    if (!newActuacionText) {
        showNotification('Por favor, ingresa una descripción para la actuación.', true);
        return;
    }
    showLoader();
    try {
        const caso = await getCaseByMongoId(currentCaseIdForActuacion);

        const actuaciones = Array.isArray(caso.actuaciones) ? [...caso.actuaciones] : [];

        const currentDate = new Date().toISOString();
        const username = getLoggedInUsername(); // Obtiene el username

        actuaciones.push({
            descripcion: newActuacionText,
            fecha: currentDate,
            usuario: username || 'Desconocido' // Añade el usuario que realiza la acción
        });
        const response = await fetch(`http://localhost:3000/casos/${currentCaseIdForActuacion}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ actuaciones: actuaciones })
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
            throw new Error(`Error al guardar actuación: ${response.status} - ${errorData.message || response.statusText}`);
        }
        showNotification('Actuación guardada exitosamente.');
        closeActuacionPopup();
        document.dispatchEvent(new CustomEvent('casoActualizado')); // Despacha evento en lugar de llamar loadAndDisplayCases()
        document.dispatchEvent(new CustomEvent('caseDataChanged')); // Dispara este evento para que caseTableManager recargue

    } catch (error) {
        console.error('Error al guardar la actuación:', error);
        showNotification('Error al guardar actuación: ' + error.message, true);
        document.dispatchEvent(new CustomEvent('casoActualizado')); // Despacha también en caso de error
    } finally {
        hideLoader();
    }
}
// --- Manejadores de Popup de Confirmación de Entrega ---
export async function openConfirmDeliveryPopup(mongoId) {
    try {
        const caso = await getCaseByMongoId(mongoId);
        currentCaseIdForDelivery = caso._id;
        const popupElement = document.getElementById('confirmDeliveryPopup');
        document.getElementById('deliveryCaseId').textContent = generateAlphanumericId(caso._id);
        popupElement.style.display = 'flex';
        // @ts-ignore
        void popupElement.offsetHeight; // Force reflow
        document.getElementById('securityPasswordInput').value = '';
    } catch (error) {
        console.error('Error al abrir popup de confirmación de entrega:', error);
        showNotification('Error al abrir popup de confirmación de entrega: ' + error.message, true);
        const popupElement = document.getElementById('confirmDeliveryPopup');
        if (popupElement) {
            popupElement.style.display = 'none';
        }
    }
}
/**
 * Cierra el popup de confirmación de entrega.
 */
export function closeConfirmDeliveryPopup() {
    const popupElement = document.getElementById('confirmDeliveryPopup');
    if (popupElement) {
        popupElement.style.display = 'none';
    }
    currentCaseIdForDelivery = null;
}
/**
 * Confirma la entrega de una obra, enviando la clave de seguridad al backend para validación.
 */
export async function confirmDelivery() {
    if (!currentCaseIdForDelivery) {
        showNotification('Error: No se ha seleccionado un caso para confirmar entrega.', true);
        return;
    }

    const enteredPassword = document.getElementById('securityPasswordInput').value;
    if (!enteredPassword) {
        showNotification('Por favor, ingresa la clave de seguridad.', true);
        return;
    }

    showLoader();
    try {
        const response = await fetch(`http://localhost:3000/casos/${currentCaseIdForDelivery}/confirm-delivery`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password: enteredPassword })
        });

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.message || 'Error desconocido al confirmar entrega.');
        }

        showNotification(responseData.message || 'Obra marcada como entregada exitosamente.');
        closeConfirmDeliveryPopup();
        document.dispatchEvent(new CustomEvent('casoActualizado')); // Despacha evento
        document.dispatchEvent(new CustomEvent('caseDataChanged')); // Dispara este evento para que caseTableManager recargue

    } catch (error) {
        console.error('Error al confirmar entrega:', error);
        showNotification('Error al confirmar entrega: ' + error.message, true);
        document.dispatchEvent(new CustomEvent('casoActualizado')); // Despacha también en caso de error
    } finally {
        hideLoader();
    }
}


// --- Manejadores de Popup de Modificación ---
export async function openModifyCasePopup(mongoId) {
    try {
        const caso = await getCaseByMongoId(mongoId);
        currentCaseIdForModify = caso._id;
        document.getElementById('modifyCaseIdDisplay').textContent = generateAlphanumericId(caso._id);

        populateSelect(document.getElementById('modify_tipo_obra'), tipoObraOptions, 'Selecciona Tipo de Obra', caso.tipo_obra);
        populateSelect(document.getElementById('modify_parroquia'), parroquias, 'Selecciona Parroquia', caso.parroquia);
        updateCircuitoSelectionForModifyForm();
        document.getElementById('modify_circuito').value = caso.circuito;

        document.getElementById('modify_eje').value = caso.eje || '';
        document.getElementById('modify_comuna').value = caso.comuna || '';
        document.getElementById('modify_codigoComuna').value = caso.codigoComuna || '';
        document.getElementById('modify_nameJC').value = caso.nameJC || '';
        document.getElementById('modify_nameJU').value = caso.nameJU || '';
        document.getElementById('modify_enlaceComunal').value = caso.enlaceComunal || '';
        document.getElementById('modify_caseDescription').value = caso.caseDescription || '';
        document.getElementById('modify_caseDate').value = caso.caseDate ? new Date(caso.caseDate).toISOString().split('T')[0] : '';

        const currentArchivoSpan = document.getElementById('modify_current_archivo');
        const fileUrl = caso.archivo ? `http://localhost:3000/uploads/pdfs/${caso.archivo}` : '#';
        if (caso.archivo) {
            currentArchivoSpan.innerHTML = `Archivo actual: <a href="${fileUrl}" target="_blank">${caso.archivo}</a>`;
        } else {
            currentArchivoSpan.textContent = 'Ninguno';
        }

        const modifyParroquiaSelect = document.getElementById('modify_parroquia');
        if (modifyParroquiaSelect) {
            modifyParroquiaSelect.onchange = updateCircuitoSelectionForModifyForm;
        }

        const popupElement = document.getElementById('modifyCasePopup');
        popupElement.style.display = 'flex';
        // @ts-ignore
        void popupElement.offsetHeight; // Force reflow
    } catch (error) {
        console.error('Error al abrir popup de modificación:', error);
        showNotification('Error al abrir popup de modificación: ' + error.message, true);
        const popupElement = document.getElementById('modifyCasePopup');
        if (popupElement) {
            popupElement.style.display = 'none';
        }
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
    const modifyParroquiaSelect = document.getElementById('modify_parroquia');
    if (modifyParroquiaSelect) {
        modifyParroquiaSelect.onchange = null;
    }
}

/**
 * Guarda los cambios realizados en un caso después de la modificación.
 */
export async function saveModifiedCase() {
    if (!currentCaseIdForModify) {
        showNotification('Error: No se ha seleccionado un caso para modificar.', true);
        return;
    }

    showLoader();
    try {
        let casoActual;
        try {
            casoActual = await getCaseByMongoId(currentCaseIdForModify);
        } catch (error) {
            console.error('Error al obtener el caso actual para modificación:', error);
            showNotification('Error al cargar datos actuales para comparar.', true);
            throw error; // Propagar para que el catch exterior y el finally se ejecuten
        }

    const updatedData = {
        tipo_obra: document.getElementById('modify_tipo_obra').value,
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
    };

    const archivoInput = document.getElementById('modify_archivo');
    const selectedFile = archivoInput.files[0];

    if (selectedFile) {
        const MAX_FILE_SIZE_MB = 2;
        const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

        if (selectedFile.type !== 'application/pdf') {
            showNotification('Solo se permiten archivos PDF para el archivo del caso.', true);
            return;
        }
        if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
            showNotification(`El archivo PDF excede el tamaño máximo de ${MAX_FILE_SIZE_MB}MB.`, true);
            return;
        }

        const formData = new FormData();
        formData.append('archivo', selectedFile);

        try {
            const uploadResponse = await fetch('http://localhost:3000/upload', {
                method: 'POST',
                body: formData
            });

            if (!uploadResponse.ok) {
                const errorText = await uploadResponse.text();
                throw new Error(`Error al subir el archivo: ${uploadResponse.statusText} - ${errorText}`);
            }

            const uploadResult = await uploadResponse.json();
            updatedData.archivo = uploadResult.fileName;
        } catch (uploadError) {
            console.error('Error al subir el archivo:', uploadError);
            showNotification('Error al subir el archivo: ' + uploadError.message, true);
            return;
        }
    } else {
        updatedData.archivo = casoActual.archivo;
    }


    const username = getLoggedInUsername(); // Obtiene el username
    const modificationDate = new Date().toISOString();

    const changesDetected = [];

    const fieldsToCompare = [
        'tipo_obra', 'parroquia', 'circuito', 'eje', 'comuna', 'codigoComuna',
        'nameJC', 'nameJU', 'enlaceComunal', 'caseDescription', 'caseDate', 'archivo'
    ];

    fieldsToCompare.forEach(field => {
        let oldValue = casoActual[field];
        let newValue = updatedData[field];

        if (field === 'caseDate') {
            oldValue = casoActual.caseDate ? new Date(casoActual.caseDate).toISOString().split('T')[0] : '';
            newValue = updatedData.caseDate || '';
        } else {
            oldValue = (oldValue !== undefined && oldValue !== null) ? String(oldValue).trim() : '';
            newValue = (newValue !== undefined && newValue !== null) ? String(newValue).trim() : '';
        }

        if (oldValue !== newValue) {
            changesDetected.push({
                campo: field,
                valorAntiguo: oldValue,
                valorNuevo: newValue,
                fecha: modificationDate,
                usuario: username || 'Desconocido' // Añade el usuario que realiza la acción
            });
        }
    });

    const allModificaciones = Array.isArray(casoActual.modificaciones) ? [...casoActual.modificaciones] : [];

    if (changesDetected.length > 0) {
        changesDetected.forEach(changeEntry => allModificaciones.push(changeEntry));
    } else {
        // Registrar una revisión si no hay cambios específicos pero se guarda el formulario
        allModificaciones.push({
            campo: 'revisión',
            valorAntiguo: 'N/A',
            valorNuevo: 'N/A',
            fecha: modificationDate,
            usuario: username || 'Desconocido' // Añade el usuario que realiza la acción
        });
    }

    updatedData.modificaciones = allModificaciones;


        // El fetch para guardar el caso
        const response = await fetch(`http://localhost:3000/casos/${currentCaseIdForModify}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Error desconocido del servidor' }));
            throw new Error(`Error al guardar cambios: ${response.status} - ${errorData.message || response.statusText}`);
        }

        showNotification('Caso modificado exitosamente.');
        closeModifyPopup();
        document.dispatchEvent(new CustomEvent('casoActualizado'));
        document.dispatchEvent(new CustomEvent('caseDataChanged'));

    } catch (error) { // Este catch atrapará errores de getCaseByMongoId, subida, o el fetch final
        console.error('Error al guardar cambios del caso:', error);
        showNotification('Error al guardar cambios: ' + error.message, true);
        // No es necesario despachar 'casoActualizado' aquí si falló el guardado
    } finally {
        hideLoader(); 
    }
}


// --- Manejadores de Popup de Ver Caso ---
export async function openViewCasePopup(mongoId) {
    try {
        const caso = await getCaseByMongoId(mongoId);
        currentCaseIdForView = caso._id;
        document.getElementById('viewCaseIdDisplay').textContent = generateAlphanumericId(caso._id);

        document.getElementById('view_tipo_obra').textContent = caso.tipo_obra || 'N/A';
        document.getElementById('view_parroquia').textContent = caso.parroquia || 'N/A';
        document.getElementById('view_circuito').textContent = caso.circuito || 'N/A';
        document.getElementById('view_eje').textContent = caso.eje || 'N/A';
        document.getElementById('view_comuna').textContent = caso.comuna || 'N/A';
        document.getElementById('view_codigoComuna').textContent = caso.codigoComuna || 'N/A';
        document.getElementById('view_nameJC').textContent = caso.nameJC || 'N/A';
        document.getElementById('view_nameJU').textContent = caso.nameJU || 'N/A';
        document.getElementById('view_enlaceComunal').textContent = caso.enlaceComunal || 'N/A';
        document.getElementById('view_caseDescription').textContent = caso.caseDescription || 'N/A';
        document.getElementById('view_caseDate').textContent = caso.caseDate ? new Date(caso.caseDate).toLocaleDateString() : 'N/A';

        const viewArchivo = document.getElementById('view_archivo');
        const fileUrl = caso.archivo ? `http://localhost:3000/uploads/pdfs/${caso.archivo}` : '#';
        if (caso.archivo) {
            viewArchivo.innerHTML = `<a href="${fileUrl}" target="_blank">${caso.archivo}</a>`;
            viewArchivo.href = fileUrl;
        } else {
            viewArchivo.textContent = 'N/A';
            viewArchivo.href = '#';
        }

        document.getElementById('view_estado').textContent = caso.estado || 'N/A';
        document.getElementById('view_fechaEntrega').textContent = caso.fechaEntrega && caso.estado === 'Entregado' ? new Date(caso.fechaEntrega).toLocaleDateString() : 'N/A';
        
        // Poblar los nuevos campos createdAt y updatedAt
        document.getElementById('view_createdAt').textContent = caso.createdAt ? new Date(caso.createdAt).toLocaleString() : 'N/A';
        document.getElementById('view_updatedAt').textContent = caso.updatedAt ? new Date(caso.updatedAt).toLocaleString() : 'N/A';

        const viewActuacionesSection = document.getElementById('view_actuaciones');
        if (viewActuacionesSection) {
            viewActuacionesSection.innerHTML = '';

            if (Array.isArray(caso.actuaciones) && caso.actuaciones.length > 0) {
                const button = document.createElement('button');
                button.className = 'button-link view-actuaciones-btn'; // Asegúrate que esta clase exista y tenga estilos adecuados
                button.textContent = 'VER';
                button.dataset.id = caso._id; // Usar mongoId directamente
                viewActuacionesSection.appendChild(button);
                button.addEventListener('click', (event) => {
                    event.stopPropagation(); // Prevenir que el click se propague a otros listeners si es necesario
                    openViewActuacionesPopup(event.currentTarget.dataset.id);
                });
            } else {
                viewActuacionesSection.textContent = 'Ninguna actuación registrada.';
            }
        } else {
            console.warn("Elemento con ID 'view_actuaciones' no encontrado.");
        }

        const viewModificacionesSection = document.getElementById('view_modificaciones');
        if (viewModificacionesSection) {
            viewModificacionesSection.innerHTML = '';

            if (Array.isArray(caso.modificaciones) && caso.modificaciones.length > 0) {
                const button = document.createElement('button');
                button.className = 'button-link view-modificaciones-btn'; // Asegúrate que esta clase exista
                button.textContent = 'VER';
                button.dataset.id = caso._id; // Usar mongoId directamente
                viewModificacionesSection.appendChild(button);
                button.addEventListener('click', (event) => {
                    event.stopPropagation();
                    openViewModificacionesPopup(event.currentTarget.dataset.id);
                });
            } else {
                viewModificacionesSection.textContent = 'Ninguna modificación registrada.';
            }
        } else {
            console.warn("Elemento con ID 'view_modificaciones' no encontrado.");
        }

        const popupElement = document.getElementById('viewCasePopup');
        popupElement.style.display = 'flex';
        // @ts-ignore
        void popupElement.offsetHeight; // Force reflow
    } catch (error) {
        console.error('Error al abrir popup de vista:', error);
        showNotification('Error al abrir popup de vista: ' + error.message, true);
        const popupElement = document.getElementById('viewCasePopup');
        if (popupElement) {
            popupElement.style.display = 'none';
        }
    }
}

/**
 * Cierra el popup de vista de caso.
 */
export function closeViewCasePopup() {
    const popupElement = document.getElementById('viewCasePopup');
    if (popupElement) {
        popupElement.style.display = 'none';
    }
    currentCaseIdForView = null;
}


// --- Manejadores de Popup de Ver Actuaciones ---
export async function openViewActuacionesPopup(mongoId) {
    try {
        const caso = await getCaseByMongoId(mongoId);
        currentActuaciones = Array.isArray(caso.actuaciones) ? caso.actuaciones : [];

        document.getElementById('viewActuacionesCaseId').textContent = generateAlphanumericId(caso._id);

        const actuacionesList = document.getElementById('viewActuacionesList');
        actuacionesList.innerHTML = '';

        if (currentActuaciones.length > 0) {
            const formattedActuaciones = currentActuaciones.map(act => {
                if (typeof act === 'string') { // Manejar actuaciones antiguas que eran solo strings
                    return { descripcion: act, fecha: 'Fecha desconocida', usuario: 'Desconocido' };
                }
                return act;
            });

            formattedActuaciones.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

            formattedActuaciones.forEach((act, index) => {
                const li = document.createElement('li');
                const fechaLegible = act.fecha ? new Date(act.fecha).toLocaleString() : 'Fecha desconocida';
                const usuarioDisplay = act.usuario ? `(${act.usuario}) ` : '';
                li.textContent = `${index + 1}. ${usuarioDisplay}(${fechaLegible}) ${act.descripcion}`;
                actuacionesList.appendChild(li);
            });
        } else {
            const li = document.createElement('li');
            li.textContent = 'No hay actuaciones registradas para este caso.';
            actuacionesList.appendChild(li);
        }

        const popupElement = document.getElementById('viewActuacionesPopup');
        popupElement.style.display = 'flex';
        // @ts-ignore
        void popupElement.offsetHeight; // Force reflow
    }
    catch (error) {
        console.error('Error al abrir popup de ver actuaciones:', error);
        showNotification('Error al abrir popup de ver actuaciones: ' + error.message, true);
        const popupElement = document.getElementById('viewActuacionesPopup');
        if (popupElement) {
            popupElement.style.display = 'none';
        }
    }
}

/**
 * Cierra el popup de ver actuaciones.
 */
export function closeViewActuacionesPopup() {
    const popupElement = document.getElementById('viewActuacionesPopup');
    if (popupElement) {
        popupElement.style.display = 'none';
    }
    currentActuaciones = [];
}


// --- Manejadores de Popup de Ver Modificaciones ---
export async function openViewModificacionesPopup(mongoId) {
    try {
        const caso = await getCaseByMongoId(mongoId);
        currentModificaciones = Array.isArray(caso.modificaciones) ? caso.modificaciones : [];

        document.getElementById('viewModificacionesCaseId').textContent = generateAlphanumericId(caso._id);

        const modificacionesList = document.getElementById('viewModificacionesList');
        modificacionesList.innerHTML = '';

        if (currentModificaciones.length > 0) {
            currentModificaciones.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

            currentModificaciones.forEach((mod, index) => {
                const li = document.createElement('li');
                const fechaLegible = mod.fecha ? new Date(mod.fecha).toLocaleString() : 'Fecha desconocida';
                const usuarioDisplay = mod.usuario ? `(${mod.usuario}) ` : '';

                let descripcionDisplay = '';
                if (mod.campo === 'revisión') {
                    descripcionDisplay = 'Información del caso revisada (sin cambios específicos).';
                } else if (mod.campo !== undefined && mod.valorAntiguo !== undefined && mod.valorNuevo !== undefined) {
                    descripcionDisplay = `Campo '${mod.campo}' cambiado de '${mod.valorAntiguo}' a '${mod.valorNuevo}'`;
                } else {
                    descripcionDisplay = mod.descripcion || 'Detalle no disponible o formato inesperado.';
                }

                li.textContent = `${index + 1}. ${usuarioDisplay}(${fechaLegible}) ${descripcionDisplay}`;
                modificacionesList.appendChild(li);
            });
        } else {
            const li = document.createElement('li');
            li.textContent = 'No hay modificaciones registradas para este caso.';
            modificacionesList.appendChild(li);
        }

        const popupElement = document.getElementById('viewModificacionesPopup');
        popupElement.style.display = 'flex';
        // @ts-ignore
        void popupElement.offsetHeight; // Force reflow

        // Intentos adicionales para forzar repintado global:
        document.body.style.zoom = 1.00000001;
        void document.body.offsetWidth;
        document.body.style.zoom = 1;
    } catch (error) {
        console.error('Error al abrir popup de ver modificaciones:', error);
        showNotification('Error al abrir popup de ver modificaciones: ' + error.message, true);
        const popupElement = document.getElementById('viewModificacionesPopup');
        if (popupElement) {
            popupElement.style.display = 'none';
        }
    }
}

/**
 * Cierra el popup de ver modificaciones.
 */
export function closeViewModificacionesPopup() {
    const popupElement = document.getElementById('viewModificacionesPopup');
    if (popupElement) {
        popupElement.style.display = 'none';
    }
    currentCaseIdForModificacionesView = null;
    currentModificaciones = [];
}

// --- NUEVAS FUNCIONES PARA BORRAR CASO ---
export async function openConfirmDeletePopup(mongoId) {
    console.log('[popup_handler] openConfirmDeletePopup called with mongoId:', mongoId); // DEBUG
    try {
        const caso = await getCaseByMongoId(mongoId);
        currentCaseIdForDelete = caso._id;
        const popupElement = document.getElementById('confirmDeletePopup');
        if (!popupElement) { // DEBUG
            console.error('[popup_handler] confirmDeletePopup element NOT FOUND');
            return;
        }
        console.log('[popup_handler] confirmDeletePopup element found:', popupElement); // DEBUG
        document.getElementById('deleteCaseIdDisplay').textContent = generateAlphanumericId(caso._id);
        // Ya no se maneja la clase 'hidden' aquí si no existe en el CSS del usuario
        popupElement.style.display = 'flex';
        // @ts-ignore
        void popupElement.offsetHeight; // Force reflow

        // Intentos adicionales para forzar repintado global:
        document.body.style.zoom = 1.00000001; 
        void document.body.offsetWidth; 
        document.body.style.zoom = 1; 

        document.getElementById('deleteSecurityPasswordInput').value = '';
    } catch (error) {
        console.error('[popup_handler] Error in openConfirmDeletePopup:', error); // DEBUG
        showNotification('Error al abrir confirmación de borrado: ' + error.message, true);
        const popupElement = document.getElementById('confirmDeletePopup');
        if (popupElement) {
            popupElement.style.display = 'none';
            // Ya no se maneja la clase 'hidden'
        }
    }
}

/**
 * Cierra el popup de confirmación de borrado.
 */
export function closeConfirmDeletePopup() {
    const popupElement = document.getElementById('confirmDeletePopup');
    if (popupElement) {
        popupElement.style.display = 'none';
        // Ya no se maneja la clase 'hidden'
    }
    currentCaseIdForDelete = null;
}

/**
 * Confirma y ejecuta el borrado de un caso.
 */
export async function confirmDeleteCase() {
    if (!currentCaseIdForDelete) {
        showNotification('Error: No se ha seleccionado un caso para borrar.', true);
        return;
    }

    const enteredPassword = document.getElementById('deleteSecurityPasswordInput').value;
    if (!enteredPassword) {
        showNotification('Por favor, ingresa la clave de seguridad para eliminar.', true);
        return;
    }

    showLoader();
    try {
        const response = await fetch(`http://localhost:3000/casos/${currentCaseIdForDelete}/delete-with-password`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password: enteredPassword })
        });

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.message || 'Error desconocido al borrar caso.');
        }

        showNotification('Caso borrado exitosamente.');
        closeConfirmDeletePopup();
        document.dispatchEvent(new CustomEvent('casoActualizado')); // Despacha evento
        document.dispatchEvent(new CustomEvent('caseDataChanged')); // Dispara este evento para que caseTableManager recargue

    } catch (error) {
        console.error('Error al borrar caso:', error);
        showNotification('Error al borrar caso: ' + error.message, true);
        document.dispatchEvent(new CustomEvent('casoActualizado')); // Despacha también en caso de error
    } finally {
        hideLoader();
    }
}

// ADJUNTAR EVENT LISTENERS A LOS BOTONES Y SPANS DE CIERRE DENTRO DE LOS POPUPS AL CARGAR EL DOM
// Esto asegura que los listeners se adjunten a los elementos una vez que el DOM está completamente cargado,
// sin depender de atributos onclick en el HTML.
document.addEventListener('DOMContentLoaded', () => {

    // --- Helper para adjuntar listeners a botones de cierre (X) y botones de cancelar/cerrar
    function setupPopupListeners(popupId, closeFn, confirmFn = null, saveFn = null) {
        const popup = document.getElementById(popupId);
        if (popup) {
            // Span de cerrar (clase 'close-btn' o 'close')
            const closeSpan = popup.querySelector('.close-btn') || popup.querySelector('.close');
            if (closeSpan) {
                closeSpan.addEventListener('click', closeFn);
            }

            // Botón de cancelar (clase 'cancel-btn')
            const cancelBtn = popup.querySelector('.cancel-btn');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', closeFn);
            }
            // Botón de confirmar (clase 'confirm-btn')
            const confirmBtn = popup.querySelector('.confirm-btn');
            if (confirmBtn && confirmFn) {
                confirmBtn.addEventListener('click', confirmFn);
            }
            // Botón de guardar (por ID, ya que no todos tienen una clase genérica como 'confirm-btn')
            // Estos IDs son los que ya existían en tu HTML original y los estamos reutilizando.
            if (popupId === 'actuacionPopup') {
                const saveActBtn = popup.querySelector('#saveActuacionBtn');
                if (saveActBtn) saveActBtn.addEventListener('click', saveFn);
            } else if (popupId === 'modifyCasePopup') {
                const saveModifyBtn = popup.querySelector('#saveModifiedCaseBtn');
                if (saveModifyBtn) saveModifyBtn.addEventListener('click', saveFn);
            }
        }
    }
    // Configurar listeners para cada popup
    setupPopupListeners('confirmDeliveryPopup', closeConfirmDeliveryPopup, confirmDelivery);
    setupPopupListeners('confirmDeletePopup', closeConfirmDeletePopup, confirmDeleteCase);
    setupPopupListeners('actuacionPopup', closeActuacionPopup, null, saveActuacion); // saveActuacion es el 'confirm' en este caso
    setupPopupListeners('modifyCasePopup', closeModifyPopup, null, saveModifiedCase); // saveModifiedCase es el 'confirm'
    setupPopupListeners('viewCasePopup', closeViewCasePopup);
    setupPopupListeners('viewActuacionesPopup', closeViewActuacionesPopup);
    setupPopupListeners('viewModificacionesPopup', closeViewModificacionesPopup);
    // Listener para el input de parroquia en el popup de modificar para actualizar circuito
    const modifyParroquiaSelect = document.getElementById('modify_parroquia');
    if (modifyParroquiaSelect) {
        modifyParroquiaSelect.addEventListener('change', updateCircuitoSelectionForModifyForm);
    }
});