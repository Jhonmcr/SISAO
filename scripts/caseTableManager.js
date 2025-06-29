// scripts/caseTableManager.js

import { showNotification, generateAlphanumericId } from './utils.js';
import {
    openActuacionPopup,
    openConfirmDeliveryPopup,
    openModifyCasePopup,
    openViewCasePopup,
    openViewActuacionesPopup,
    openViewModificacionesPopup, // Añadido
    openConfirmDeletePopup
} from './popup_handler.js'; // Asegúrate de que popup_handler.js exista y exporte estas funciones

// Referencias a elementos del DOM
const casosTableBody = document.querySelector('#casosTable tbody');

// **Almacén de datos:**
let allCasosData = []; // Almacena todos los casos brutos del backend
const estadosDisponibles = ['Cargado', 'Supervisado', 'En Desarrollo', 'Entregado']; // Estados de select, 'Entregado' se añade por separado

// --- Funciones de Gestión de Datos ---

/**
 * Función interna para cargar todos los casos del backend.
 * SOLO debe ser llamada una vez al inicio, o cuando se requiera una recarga completa de la fuente de datos.
 */
async function _fetchCasosData() {
    try {
        console.log("Cargando todos los casos del backend...");
        const response = await fetch('http://localhost:3000/casos');
        if (!response.ok) {
            throw new Error(`Error HTTP! estado: ${response.status}`);
        }
        allCasosData = await response.json(); // Almacena todos los datos
        console.log("Datos de casos recibidos del backend y almacenados:", allCasosData);
    } catch (error) {
        console.error('Error al cargar los casos iniciales:', error);
        showNotification('Error al cargar los casos: ' + error.message, true);
        if (casosTableBody) {
            // Muestra un mensaje claro si la tabla no se puede cargar
            casosTableBody.innerHTML = `<tr><td colspan="14" style="text-align: center; color: red;">Error al cargar los casos. Asegúrate de que tu API de backend esté funcionando correctamente en http://localhost:3000/casos. Detalle: ${error.message}</td></tr>`;
        }
        allCasosData = []; // Asegura que la lista esté vacía en caso de error
        throw error; // Propaga el error para que quien lo llama sepa que falló
    }
}

/**
 * Retorna una copia de los datos de todos los casos cargados.
 * Esto permite que otros módulos accedan a los datos sin modificarlos directamente.
 * @returns {Array} Una copia del array de todos los casos.
 */
export function getCasosData() {
    return [...allCasosData]; // Devuelve una copia para evitar mutaciones externas
}

/**
 * Actualiza un caso específico en el almacén de datos (allCasosData) después de una modificación exitosa.
 * @param {string} caseId - El _id del caso a actualizar.
 * @param {object} updatedData - Los nuevos datos del caso.
 */
export function updateCaseInCache(caseId, updatedData) {
    const index = allCasosData.findIndex(caso => caso._id === caseId);
    if (index !== -1) {
        allCasosData[index] = { ...allCasosData[index], ...updatedData };
        console.log(`Caso ${caseId} actualizado en caché.`);
    }
}

/**
 * Elimina un caso del almacén de datos (allCasosData) después de una eliminación exitosa.
 * @param {string} caseId - El _id del caso a eliminar.
 */
export function removeCaseFromCache(caseId) {
    allCasosData = allCasosData.filter(caso => caso._id !== caseId);
    console.log(`Caso ${caseId} eliminado de caché.`);
}

/**
 * Función de ordenación común para casos.
 * Prioriza los casos NO "Entregados" primero (por caseDate descendente),
 * luego los casos "Entregados" (también por caseDate descendente).
 *
 * @param {Array} casesArray - El array de casos a ordenar.
 * @returns {Array} Un nuevo array con los casos ordenados.
 */
function _sortCases(casesArray) {
    const sortedArray = [...casesArray]; // Trabaja con una copia

    sortedArray.sort((a, b) => {
        const isAEntregado = a.estado === 'Entregado';
        const isBEntregado = b.estado === 'Entregado';

        // Lógica de prioridad: Los NO "Entregados" van primero
        if (isAEntregado && !isBEntregado) {
            return 1; // 'a' (Entregado) va después de 'b' (No Entregado)
        }
        if (!isAEntregado && isBEntregado) {
            return -1; // 'a' (No Entregado) va antes de 'b' (Entregado)
        }

        // Si ambos tienen el mismo estado (ambos Entregados o ambos No Entregados),
        // ordenar por caseDate descendente (más reciente primero)
        const dateA = a.caseDate ? new Date(a.caseDate).getTime() : 0;
        const dateB = b.caseDate ? new Date(b.caseDate).getTime() : 0;
        return dateB - dateA; // Ordena del más reciente al más antiguo
    });

    return sortedArray;
}

// --- Funciones de Renderizado de Tabla y Eventos ---

/**
 * Poblala la tabla con un array de casos dado.
 * Esta función es la que se encarga de renderizar, no de filtrar ni de obtener datos.
 * Aplica el ordenamiento antes de mostrar.
 * @param {Array} casesToDisplay - El array de objetos de casos a mostrar en la tabla.
 */
export function populateTable(casesToDisplay) {
    if (!casosTableBody) {
        console.warn("Elemento #casosTable tbody no encontrado.");
        return;
    }

    // APLICAR EL ORDENAMIENTO AQUÍ antes de renderizar
    const sortedCases = _sortCases(casesToDisplay);

    // Limpia las filas existentes de la tabla antes de renderizar las nuevas
    casosTableBody.innerHTML = '';

    // Si no hay casos para mostrar, muestra un mensaje
    if (sortedCases.length === 0) {
        casosTableBody.innerHTML = `<tr><td colspan="14" style="text-align: center;">No hay casos para mostrar.</td></tr>`;
        return;
    }

    // Itera sobre cada caso para crear y añadir una fila a la tabla
    sortedCases.forEach(caso => {
        const row = casosTableBody.insertRow(); // Inserta una nueva fila

        // Genera el ID alfanumérico y agrega "OBC - "
        const alphanumericId = generateAlphanumericId(caso._id);
        const displayCodigoPersonalizado = `OBC - ${alphanumericId}`;

        // Asegúrate de que 'fechaEntrega' se muestre solo si el estado es 'Entregado'
        const fechaEntregaDisplay = caso.fechaEntrega && caso.estado === 'Entregado' ? new Date(caso.fechaEntrega).toLocaleDateString() : 'N/A';
        const isEntregado = caso.estado === 'Entregado';

        // Deshabilitar botones/select si el caso está "Entregado"
        const disableIfEntregado = isEntregado ? 'disabled' : '';
        const disableAddActuacion = isEntregado ? 'disabled' : ''; // Actuaciones no se agregan a casos entregados
        // El botón "Obra Entregada" solo debe estar activo si el caso está "En Desarrollo" y no está ya "Entregado"
        const disableObraEntregada = (caso.estado !== 'En Desarrollo' || isEntregado) ? 'disabled' : '';

        const fileUrl = caso.archivo ? `http://localhost:3000/uploads/pdfs/${caso.archivo}` : '#';
        const formattedCaseDate = caso.caseDate ? new Date(caso.caseDate).toLocaleDateString() : 'N/A';

        row.innerHTML = `
            <td class="idInput">
                <a href="#" class="case-id-link" data-id="${caso._id}">${displayCodigoPersonalizado}</a>
            </td>
            <td>${caso.tipo_obra || 'N/A'}</td>
            <td>${caso.parroquia || 'N/A'}</td>
            <td>${caso.circuito || 'N/A'}</td>
            <td>${caso.eje || 'N/A'}</td>
            <td>${caso.comuna || 'N/A'}</td>
            <td>${caso.enlaceComunal || 'N/A'}</td>
            <td data-label="Actuaciones">
                <button class="button-link view-actuaciones-btn" data-id="${caso._id}">VER</button>
            </td>
            <td>${formattedCaseDate}</td>
            <td>${fechaEntregaDisplay}</td>
            <td>
                ${caso.archivo ? `<a href="${fileUrl}" target="_blank">${caso.archivo}</a>` : 'N/A'}
            </td>
            <td>
                <select class="estado-select" data-id="${caso._id}" ${disableIfEntregado}>
                    ${estadosDisponibles.map(estado => `
                        <option value="${estado}" ${caso.estado === estado ? 'selected' : ''}>
                            ${estado}
                        </option>
                    `).join('')}
                    ${isEntregado ? `<option value="Entregado" selected>Entregado</option>` : ''}
                </select>
            </td>
            <td>
                <button class="action-btn modify-btn" data-id="${caso._id}" ${disableIfEntregado} title="Modificar">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M21.731 2.269a2.25 2.25 0 0 0-3.03 0l-9.836 9.835a.75.75 0 0 0-.21.53V16.5a.75.75 0 0 0 .75.75h4.164a.75.75 0 0 0 .53-.21L21.73 5.23a2.25 2.25 0 0 0 0-3.03Zm-8.601 7.697l-4.71-4.71a.75.75 0 0 0-.015-1.05l-.037-.037a.75.75 0 0 0-1.05-.015l-4.71 4.71a.75.75 0 0 0-.015 1.05l.037.037a.75.75 0 0 0 1.05.015zM4.5 18.75a.75.75 0 0 0-1.5 0v.75A2.25 2.25 0 0 0 5.25 21h.75a.75.75 0 0 0 0-1.5H5.25a.75.75 0 0 1-.75-.75v-.75Z" />
                    </svg>
                </button>
                <button class="action-btn add-actuacion-btn" data-id="${caso._id}" ${disableAddActuacion} title="Agregar Actuación">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                        <path fill-rule="evenodd" d="M12 5.25a.75.75 0 0 1 .75.75v5.25H18a.75.75 0 0 1 0 1.5h-5.25V18a.75.75 0 0 1-1.5 0v-5.25H6a.75.75 0 0 1 0-1.5h5.25V6a.75.75 0 0 1 .75-.75Z" clip-rule="evenodd" />
                    </svg>
                </button>
                <button class="action-btn obra-entregada-btn" data-id="${caso._id}" ${disableObraEntregada} title="Marcar como Obra Entregada">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                        <path fill-rule="evenodd" d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9.75 10.5a.75.75 0 0 1-1.12.082l-4.5-4.25a.75.75 0 0 1 1.02-1.1l3.961 3.731 9.143-9.9a.75.75 0 0 1 1.04-.208Z" clip-rule="evenodd" />
                    </svg>
                </button>
                <button class="action-btn delete-btn" data-id="${caso._id}" title="Eliminar Caso">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                        <path fill-rule="evenodd" d="M16.5 4.478v.227a48.84 48.84 0 0 1 3.7 1.015V6.75a.75.75 0 0 1-.75.75H2.25a.75.75 0 0 1-.75-.75V5.713a48.84 48.84 0 0 1 3.7-1.015v-.227a48.904 48.904 0 0 1 11.2 0ZM8.55 7.5a.75.75 0 0 0 0 1.5h6.9a.75.75 0 0 0 0-1.5h-6.9Zm-3 8.25a.75.75 0 0 1 .75-.75h9a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-.75-.75v-1.5Z" clip-rule="evenodd" />
                    </svg>
                </button>
            </td>
        `;
        casosTableBody.appendChild(row);
    });

    // Agrega event listeners a los elementos de la tabla DESPUÉS de que se han renderizado
    attachTableEventListeners();
}

/**
 * Función de inicialización principal para la tabla de casos.
 * Carga los datos por primera vez y los muestra.
 */
export async function initializeCaseTable() {
    await _fetchCasosData(); // Carga los datos base
    populateTable(allCasosData); // Ahora populateTable se encarga de ordenar
    // Listener para actualizar la tabla cuando se dispare un evento 'caseDataChanged'
    document.removeEventListener('caseDataChanged', handleCaseDataChange); // Previene duplicados
    document.addEventListener('caseDataChanged', handleCaseDataChange);
}

// Función para manejar el evento 'caseDataChanged'
async function handleCaseDataChange() {
    console.log("Evento 'caseDataChanged' recibido. Recargando datos y actualizando tabla...");
    try {
        await _fetchCasosData(); // Recarga los datos del backend
        populateTable(allCasosData); // Vuelve a poblar la tabla con los datos frescos
    } catch (error) {
        console.error("Error al recargar la tabla después de un cambio:", error);
        showNotification("Error al actualizar la tabla: " + error.message, true);
    }
}

// --- Manejo de Eventos de la Tabla (Delegación) ---

function attachTableEventListeners() {
    if (!casosTableBody) return;

    // Remover listeners antiguos para evitar duplicados si se llama varias veces
    // Esto es crucial para un manejo de eventos eficiente en tablas dinámicas.
    // Usamos `true` para asegurar que se remuevan los listeners capturados si los hubiere.
    casosTableBody.removeEventListener('click', handleTableClick, true);
    casosTableBody.removeEventListener('change', handleTableChange, true);

    // Adjuntar nuevos listeners
    casosTableBody.addEventListener('click', handleTableClick, true); // Usar captura para mayor fiabilidad en delegación
    casosTableBody.addEventListener('change', handleTableChange, true);
}

function handleTableClick(event) {
    const target = event.target;
    // Usamos closest para encontrar el botón o el enlace y obtener el data-id
    const buttonOrLink = target.closest('button[data-id], a[data-id]');
    const caseId = buttonOrLink ? buttonOrLink.dataset.id : null;

    if (!caseId) return;

    // Manejar clics en botones
    if (target.closest('.add-actuacion-btn')) {
        event.preventDefault();
        openActuacionPopup(caseId);
    } else if (target.closest('.obra-entregada-btn')) {
        event.preventDefault();
        openConfirmDeliveryPopup(caseId);
    } else if (target.closest('.modify-btn')) {
        event.preventDefault();
        openModifyCasePopup(caseId); // Pasamos el caseId directo al popup handler
    } else if (target.closest('.delete-btn')) {
        event.preventDefault();
        openConfirmDeletePopup(caseId);
    } else if (target.closest('.case-id-link')) {
        event.preventDefault();
        openViewCasePopup(caseId); // Pasamos el caseId directo al popup handler
    } else if (target.closest('.view-actuaciones-btn')) {
        event.preventDefault();
        openViewActuacionesPopup(caseId); // Pasamos el caseId directo al popup handler
    }
}

async function handleTableChange(event) {
    const target = event.target;
    if (target.classList.contains('estado-select')) {
        const caseId = target.dataset.id;
        const newStatus = target.value;

        // Si el nuevo estado es "Entregado", la lógica de actualización está en el botón específico.
        // No se permite cambiar a "Entregado" directamente desde el select si ya está deshabilitado.
        if (newStatus === 'Entregado') {
             // Puedes añadir una notificación aquí si el usuario intenta esto de forma inesperada.
             showNotification('Utiliza el botón "Marcar como Obra Entregada" para cambiar el estado a "Entregado".', true);
             // Revertir la selección visualmente para que no parezca que el cambio fue aceptado
             const originalCase = allCasosData.find(caso => caso._id === caseId);
             if (originalCase) {
                 target.value = originalCase.estado;
             }
            return;
        }

        try {
            const response = await fetch(`http://localhost:3000/casos/${caseId}/estado`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ estado: newStatus })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Error al actualizar el estado del caso ${generateAlphanumericId(caseId)}`);
            }

            const updatedCase = await response.json(); // La respuesta incluye las modificaciones si el backend las envía
            updateCaseInCache(caseId, { estado: newStatus, modificaciones: updatedCase.modificaciones });
            populateTable(getCasosData()); // Refresca la tabla con los datos actualizados y ordenados
            showNotification(`Estado del caso OBC - ${generateAlphanumericId(caseId)} actualizado a: ${newStatus}`);

        } catch (error) {
            console.error('Error al actualizar estado:', error);
            showNotification(`Error al actualizar estado del caso OBC - ${generateAlphanumericId(caseId)}: ${error.message}`, true);
            // Revertir la selección visualmente en caso de error de la API
            const originalCase = allCasosData.find(caso => caso._id === caseId);
            if (originalCase) {
                target.value = originalCase.estado;
            }
        }
    }
}