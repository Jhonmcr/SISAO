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
const estadosDisponibles = ['Cargado', 'Supervisado', 'En Desarrollo']; // Estados de select, 'Entregado' se añade por separado

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
    // Suponemos que existe una forma de obtener el rol del usuario actual.
    // Por ejemplo, desde localStorage o una variable global.
    // const currentUserRole = localStorage.getItem('userRole'); // Ejemplo: 'SUPERADMIN', 'ADMIN'
    // Para este ejemplo, vamos a simularlo. Reemplaza esto con tu lógica real.
    const currentUserRole = localStorage.getItem('userRole'); // Asegúrate que 'userRole' se guarda en localStorage al hacer login.
    console.log("Rol de usuario actual (leído de localStorage en populateTable):", currentUserRole); // Línea de depuración

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

        let actionButtonsHtml = '';

        // Lógica de botones según el rol
        // Los roles se comparan en minúsculas: 'user', 'admin', 'superadmin'
        if (currentUserRole === 'superadmin') {
            actionButtonsHtml = `
                <button class="action-btn modify-btn" data-id="${caso._id}" ${disableIfEntregado} title="Modificar">
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
        } else if (currentUserRole === 'admin') {
            actionButtonsHtml = `
                <button class="action-btn modify-btn" data-id="${caso._id}" ${disableIfEntregado} title="Modificar">
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
        } else if (currentUserRole === 'user') { 
            actionButtonsHtml = ''; // No mostrar botones para el rol user
        }
        // Si currentUserRole es null o no coincide con ninguno, no se mostrarán botones (comportamiento por defecto)

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
                <select class="estado-select" data-id="${caso._id}" ${disableIfEntregado} ${currentUserRole === 'user' ? 'disabled' : ''}>
                    ${estadosDisponibles.map(estado => `
                        <option value="${estado}" ${caso.estado === estado ? 'selected' : ''}>
                            ${estado}
                        </option>
                    `).join('')}
                    ${isEntregado ? `<option value="Entregado" selected>Entregado</option>` : ''}
                </select>
            </td>
            <td>
                ${actionButtonsHtml}
            </td>
        `;
        casosTableBody.appendChild(row);
    });

    // Agrega event listeners a los elementos de la tabla DESPUÉS de que se han renderizado
    attachTableEventListeners();

    // Adjuntar listeners para los botones de filtro y exportación
    // Esto se hace aquí para asegurar que estén listos después de que la tabla se puebla
    // y también porque caseTableManager es un buen lugar central para la lógica de la tabla.
    // Sin embargo, si estos botones están fuera del ámbito directo de la tabla y su contenido,
    // podrían manejarse en main.js o un módulo de UI dedicado.
    // Por ahora, los dejamos aquí asumiendo que están estrechamente ligados a la tabla.

    const applyFilterBtn = document.getElementById('applyFilterBtn');
    if (applyFilterBtn && !applyFilterBtn.hasAttribute('data-listener-attached')) {
        applyFilterBtn.addEventListener('click', () => {
            // La función applyFilter se importa y usa directamente desde filterAndExport.js
            // No es necesario pasar datos aquí ya que applyFilter lee los inputs directamente.
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
    
    // Listener para el input de filtro para filtrar en cada pulsación de tecla
    const filterValueInput = document.getElementById('filterValue');
    if (filterValueInput && !filterValueInput.hasAttribute('data-listener-attached')) {
        filterValueInput.addEventListener('keyup', () => {
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
        let username = null;
        try {
            const userString = localStorage.getItem('user');
            if (userString) {
                const user = JSON.parse(userString);
                username = user ? user.username : null;
            }
        } catch (e) {
            console.error("Error al parsear el usuario de localStorage en handleTableChange:", e);
        }
        
        console.log(`Usuario obtenido para cambio de estado: ${username}`); // Para depuración

        // Si el nuevo estado es "Entregado", la lógica de actualización está en el botón específico.
        // No se permite cambiar a "Entregado" directamente desde el select si ya está deshabilitado.
        if (newStatus === 'Entregado') {
            showNotification('Utiliza el botón "Marcar como Obra Entregada" para cambiar el estado a "Entregado".', true);
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
                // Enviar el nuevo estado y el nombre de usuario para el registro de modificación
                body: JSON.stringify({ estado: newStatus, username: username }) 
            });

            if (!response.ok) {
                // Intenta parsear el error como JSON, si falla, usa el texto del status.
                let errorData;
                try {
                    errorData = await response.json();
                } catch (e) {
                    // Si la respuesta no es JSON (ej. HTML de error 404), usa el statusText.
                    throw new Error(response.statusText || `Error HTTP ${response.status}`);
                }
                throw new Error(errorData.message || `Error al actualizar el estado del caso ${generateAlphanumericId(caseId)}`);
            }

            // El backend ahora devuelve { message: string, caso: object }
            const responseData = await response.json();
            const updatedCase = responseData.caso; 

            // Actualizar la caché local con el caso completo devuelto por el backend.
            // Esto asegura que 'modificaciones' y otros campos estén al día.
            updateCaseInCache(caseId, updatedCase); 
            
            populateTable(getCasosData()); // Refresca la tabla.
            showNotification(`Estado del caso OBC - ${generateAlphanumericId(caseId)} actualizado a: ${newStatus}`);

        } catch (error) {
            console.error('Error al actualizar estado:', error);
            // Mostrar el mensaje de error de la API si está disponible, o un mensaje genérico.
            showNotification(`Error al actualizar estado: ${error.message}`, true);
            
            // Revertir la selección visualmente en caso de error.
            const originalCase = allCasosData.find(caso => caso._id === caseId);
            if (originalCase) {
                target.value = originalCase.estado;
            }
        }
    }
}