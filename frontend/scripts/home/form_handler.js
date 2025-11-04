// Importa funciones de utilidad: showNotification para mostrar mensajes y generateAlphanumericId (aunque no se usa en este script actualmente).
import { showNotification, generateAlphanumericId } from '../utils.js';
import { getApiBaseUrlAsync } from '../config.js'; // Importar getApiBaseUrlAsync
import { showLoader, hideLoader } from '../loader.js'; // Importar showLoader y hideLoader
import { populateSelect, tipoObraOptions } from './select_populator.js';
import { initializeComunaHandler } from './comuna_handler.js';

/**
 * @file scripts/home/form_handler.js
 * @description Maneja la validación y el envío del formulario para agregar nuevos casos.
 * Realiza validaciones en el frontend antes de enviar los datos al backend.
 * Muestra notificaciones de éxito o error dentro del popup del formulario.
 */

// Obtiene la referencia al formulario de agregar caso por su ID.
const form = document.getElementById('caseForm');
// Obtiene la referencia al elemento de notificación específico del popup.
const popupNotification = document.querySelector('#popup .notification');

// Agrega un event listener al formulario para prevenir el envío por defecto (que recargaría la página).
// Esto permite manejar el envío con JavaScript de forma asíncrona.
if (form) {
    const submitButton = document.getElementById('submitCaseBtn');
    if (submitButton) {
        submitButton.addEventListener('click', confirmAndUploadCase);
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault(); // Previene el comportamiento de envío estándar del formulario.
        // console.log("Envío de formulario prevenido por defecto para manejo con JS.");
        confirmAndUploadCase();
    });
} else {
    // Si el formulario no se encuentra en el DOM, muestra un error en la consola.
    // Esto ayuda a la depuración si el ID del formulario cambia o no está presente.
    console.error("El formulario con id 'caseForm' no fue encontrado en el DOM.");
}

/**
 * Función asíncrona para confirmar y cargar un nuevo caso.
 * Realiza validaciones de los campos del formulario y del archivo PDF adjunto.
 * Si las validaciones son exitosas, crea un objeto FormData y envía los datos al backend.
 * Muestra notificaciones de éxito o error y resetea el formulario en caso de éxito.
 */
async function confirmAndUploadCase() {
    const submitButton = document.getElementById('submitCaseBtn');
    submitButton.disabled = true;

    //console.log('Función confirmAndUploadCase() invocada.');

    // Verifica si la referencia al formulario es válida.
    if (!form) {
        console.error('Error: Formulario no encontrado al intentar subir caso.');
        // Muestra una notificación global (no la del popup, ya que el popup podría no estar visible o el form no existir).
        showNotification('Error: Formulario de añadir caso no encontrado.', 'error');
        submitButton.disabled = false;
        return; // Termina la ejecución si el formulario no existe.
    }

    // --- VALIDACIONES DE CAMPOS DEL FORMULARIO ---
    // Obtiene y recorta los valores de los campos del formulario.
    const nombreObra = document.getElementById('nombre_obra').value.trim();
    const parroquia = document.getElementById('parroquia').value.trim();
    const circuito = document.getElementById('circuito').value.trim(); // Este campo es llenado automáticamente y deshabilitado.
    const eje = document.getElementById('eje').value.trim();
    const comuna = document.getElementById('comuna').value.trim();
    const codigoComuna = document.getElementById('codigoComuna').value.trim();
    const consejo_comunal_ejecuta = document.getElementById('consejo_comunal_ejecuta').value.trim();
    const codigo_consejo_comunal = document.getElementById('codigo_consejo_comunal').value.trim();
    const nameJC = document.getElementById('nameJC').value.trim(); // Jefe de Comunidad
    const nameJU = document.getElementById('nameJU').value.trim(); // Jefe de UBCH
    const enlaceComunal = document.getElementById('enlaceComunal').value.trim();
    const caseDescription = document.getElementById('caseDescription').value.trim(); // Descripción del caso
    const caseDate = document.getElementById('caseDate').value.trim(); // Fecha del caso
    const fecha_entrega = document.getElementById('fecha_entrega').value.trim(); // Fecha de entrega
    const caseFile = document.getElementById('archivo'); // Input de tipo 'file' para el archivo PDF.

    // Nuevos campos
    const ente_responsable = document.getElementById('ente_responsable').value.trim();
    const cantidad_familiares = document.getElementById('cantidad_familiares').value.trim();
    const direccion_exacta = document.getElementById('direccion_exacta').value.trim();
    const responsable_sala_autogobierno = document.getElementById('responsable_sala_autogobierno').value.trim();
    const jefe_calle = document.getElementById('jefe_calle').value.trim();
    const jefe_politico_eje = document.getElementById('jefe_politico_eje').value.trim();
    const jefe_juventud_circuito_comunal = document.getElementById('jefe_juventud_circuito_comunal').value.trim();
    const estado = document.getElementById('estado').value.trim();

    const gerente_responsable = document.getElementById('gerente_responsable').value.trim();
    const enlace_politico_circuito = document.getElementById('enlace_politico_circuito').value.trim();
    const enlace_politico_parroquial = document.getElementById('enlace_politico_parroquial').value.trim();
    const jueces_de_paz = document.getElementById('jueces_de_paz').value.trim();
    const punto_y_circulo = document.getElementById('punto_y_circulo').value;

    // Recopilar valores del select múltiple 'tipo_obra' de forma nativa.
    const tipoObraSelect = document.getElementById('tipo_obra');
    // Se obtienen todas las opciones seleccionadas, se convierten a un array y se extrae su valor.
    const tiposObraSeleccionados = [...tipoObraSelect.selectedOptions].map(option => option.value);

    //console.log('Iniciando validaciones de campos del formulario...');

    // Validación de campos de texto obligatorios.
    // Verifica que todos los campos requeridos por el backend tengan un valor.
    if (tiposObraSeleccionados.length === 0 || !parroquia || !circuito || !caseDate) {
        //console.warn('Validación fallida: Uno o más campos obligatorios están vacíos.');
        // Muestra una notificación de error dentro del popup.
        showNotification('Por favor, completa todos los campos obligatorios: Tipo de Obra, Parroquia, Circuito y Fecha.', 'error', popupNotification);
        submitButton.disabled = false;
        return; // Detiene la ejecución.
    }

    // Validación del archivo PDF (si se ha seleccionado uno).
    const selectedFile = caseFile.files[0];
    if (selectedFile) {
        const MAX_FILE_SIZE_MB = 2; // Tamaño máximo permitido para el archivo en MB.
        const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024; // Tamaño máximo en bytes.

        // Verifica que el tipo de archivo sea PDF.
        if (selectedFile.type !== 'application/pdf') {
            console.warn('Validación fallida: El archivo seleccionado no es PDF.');
            showNotification('Solo se permiten archivos PDF.', 'error', popupNotification);
            submitButton.disabled = false;
            return; // Detiene la ejecución.
        }
        // Verifica que el tamaño del archivo no exceda el límite.
        if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
            console.warn('Validación fallida: El archivo PDF excede el tamaño máximo permitido.');
            showNotification(`El archivo PDF excede el tamaño máximo de ${MAX_FILE_SIZE_MB}MB.`, 'error', popupNotification);
            submitButton.disabled = false;
            return; // Detiene la ejecución.
        }
    }
    

    // console.log('Todas las validaciones del frontend han sido superadas. Preparando datos para enviar...');

    // Crea un objeto FormData para enviar los datos del formulario, incluyendo el archivo.
    const formData = new FormData();
    // Unir los tipos de obra en un solo string y adjuntarlo
    formData.append('tipo_obra', tiposObraSeleccionados.join(', '));
    formData.append('nombre_obra', nombreObra);
    formData.append('parroquia', parroquia);
    formData.append('circuito', circuito);
    formData.append('eje', eje);
    formData.append('comuna', comuna);
    formData.append('codigoComuna', codigoComuna);
    formData.append('consejo_comunal_ejecuta', consejo_comunal_ejecuta);
    formData.append('codigo_consejo_comunal', codigo_consejo_comunal);
    formData.append('nameJC', nameJC);
    formData.append('nameJU', nameJU);
    formData.append('enlaceComunal', enlaceComunal);
    formData.append('caseDescription', caseDescription);
    formData.append('caseDate', caseDate);
    if (fecha_entrega) {
        formData.append('fecha_entrega', fecha_entrega);
    }
    
    // Adjuntar archivo solo si fue seleccionado
    if (selectedFile) {
        formData.append('archivo', selectedFile); // Añade el archivo al FormData.
    }

    // Añadir nuevos campos al FormData
    formData.append('ente_responsable', ente_responsable);
    formData.append('cantidad_familiares', cantidad_familiares);
    formData.append('direccion_exacta', direccion_exacta);
    formData.append('responsable_sala_autogobierno', responsable_sala_autogobierno);
    formData.append('jefe_calle', jefe_calle);
    formData.append('jefe_politico_eje', jefe_politico_eje);
    formData.append('jefe_juventud_circuito_comunal', jefe_juventud_circuito_comunal);
    formData.append('estado', estado);
    formData.append('gerente_responsable', gerente_responsable);
    formData.append('enlace_politico_circuito', enlace_politico_circuito);
    formData.append('enlace_politico_parroquial', enlace_politico_parroquial);
    formData.append('jueces_de_paz', jueces_de_paz);
    formData.append('punto_y_circulo', punto_y_circulo);

    if (punto_y_circulo === 'si') {
        const puntoYCirculoData = [];
        const container = document.getElementById('punto_y_circulo_data_container');
        const forms = container.querySelectorAll('form');
        forms.forEach(form => {
            const data = {
                acciones_ejecutadas: form.querySelector('[name="acciones_ejecutadas"]').value,
                tipo_obra: form.querySelector('[name="tipo_obra"]').value,
                comuna: form.querySelector('[name="comuna"]').value,
                consejo_comunal: form.querySelector('[name="consejo_comunal"]').value,
                descripcion_caso: form.querySelector('[name="descripcion_caso"]').value
            };
            puntoYCirculoData.push(data);
        });
        formData.append('punto_y_circulo_data', JSON.stringify(puntoYCirculoData));
    }


    // Bucle para depuración: Muestra en consola los pares clave/valor del FormData.
    // Es útil para verificar que los datos se están añadiendo correctamente.
    for (let [key, value] of formData.entries()) {
        // Si el valor es un objeto File, muestra su nombre y tamaño.
        if (value instanceof File) {
            // console.log(`${key}: ${value.name} (tamaño: ${value.size} bytes)`);
        } else {
            // console.log(`${key}: ${value}`);
        }
    }
    // Muestra el tamaño del archivo seleccionado en bytes (redundante con el bucle anterior, pero puede ser útil).
    // console.log("Tamaño del archivo a enviar:", selectedFile.size, "bytes");


    // Intenta enviar los datos al backend.
    showLoader(); // Mostrar el loader antes de la petición
    try {
        const API_BASE_URL = await getApiBaseUrlAsync();
        // Realiza la petición POST al endpoint '/casos' del backend.
        const response = await fetch(`${API_BASE_URL}/casos`, { 
            method: 'POST', // Método HTTP.
            body: formData // Cuerpo de la petición (el objeto FormData). No se necesita 'Content-Type' header, el navegador lo establece automáticamente para FormData.
        });

        // Intenta parsear la respuesta del servidor como JSON.
        // Si el servidor no responde con JSON válido (ej. está caído o responde con HTML de error),
        // se captura el error y se provee un mensaje genérico.
        const result = await response.json().catch(() => ({ message: 'Error: La respuesta del servidor no tiene el formato esperado.' }));

        // Verifica si la respuesta del backend fue exitosa (status 2xx).
        if (response.ok) {
            // console.log('Caso cargado exitosamente. Respuesta del backend:', result);
            // Genera el ID legible para la notificación.
            const alphanumericId = generateAlphanumericId(result.id);
            const successMessage = `Caso cargado exitosamente con el código: CUB - ${alphanumericId}`;
            
            // Muestra una notificación de éxito.
            showNotification(successMessage, 'success', popupNotification);

            // Resetea el formulario para permitir la carga de otro caso.
            form.reset();
            // Limpia manualmente los selects ya que form.reset() podría no hacerlo para todos los navegadores o configuraciones.
            document.getElementById('tipo_obra').value = '';
            document.getElementById('parroquia').value = '';
            document.getElementById('cantidad_familiares').value = '';
            
            // Resetea los selects de comuna y consejo comunal
            const comunaSelect = document.getElementById('comuna');
            if (comunaSelect) {
                comunaSelect.value = '';
                // Dispara el evento 'change' para que la lógica en comuna_handler.js se ejecute y resetee los campos dependientes.
                comunaSelect.dispatchEvent(new Event('change'));
            }

            const circuitoSelect = document.getElementById('circuito'); // El select de circuito se llena dinámicamente.
            if (circuitoSelect) {
                circuitoSelect.value = ''; // Resetea su valor.
                // Dispara un evento 'change' para asegurar que cualquier lógica dependiente se actualice (si la hay).
                circuitoSelect.dispatchEvent(new Event('change')); 
            }
            // Dispara un evento personalizado para indicar que los datos de los casos han cambiado.
            // Otros componentes (como los gráficos o la tabla de casos) pueden escuchar este evento para recargarse.
            document.dispatchEvent(new CustomEvent('caseDataChanged'));

        } else {
            // Si la respuesta del backend no fue exitosa, muestra un error.
            console.error('Error del backend al agregar el caso. Status:', response.status, 'Respuesta:', result);
            showNotification(result.message || 'Error al agregar el caso. Verifique los datos e intente nuevamente.', 'error', popupNotification);
        }
    } catch (error) {
        // Captura errores de red o cualquier otro error durante el proceso de fetch.
        console.error('Error de red o excepción durante la carga del caso:', error);
        showNotification(`Error de conexión: ${error.message || 'No se pudo conectar al servidor'}. Inténtalo más tarde.`, 'error', popupNotification);
    } finally {
        hideLoader(); // Ocultar el loader independientemente del resultado
        const submitButton = document.getElementById('submitCaseBtn');
        if (submitButton) {
            submitButton.disabled = false;
        }
    }
}

document.getElementById('punto_y_circulo').addEventListener('change', function () {
    const optionsDiv = document.getElementById('punto_y_circulo_options');
    if (this.value === 'si') {
        optionsDiv.style.display = 'block';
    } else {
        optionsDiv.style.display = 'none';
        document.getElementById('punto_y_circulo_data_container').innerHTML = '';
        document.getElementById('punto_y_circulo_count').value = '0';
    }
});

document.getElementById('punto_y_circulo_count').addEventListener('change', function () {
    const container = document.getElementById('punto_y_circulo_data_container');
    container.innerHTML = '';
    const count = parseInt(this.value, 10);
    const parroquiaSeleccionada = document.getElementById('parroquia').value;

    for (let i = 0; i < count; i++) {
        const form = document.createElement('form');
        form.innerHTML = `
            <hr>
            <h4>Punto y Círculo ${i + 1}</h4>
            <div>
                <label>Acciones Ejecutadas</label>
                <select name="acciones_ejecutadas" class="acciones_ejecutadas_select"></select>
            </div>
            <div>
                <label>Tipo de Obra</label>
                <input type="text" name="tipo_obra" placeholder="Tipo de Obra">
            </div>
            <div>
                <label>Comuna</label>
                <select name="comuna" class="comuna_select"></select>
            </div>
            <div>
                <label>Consejo Comunal</label>
                <select name="consejo_comunal" class="consejo_comunal_select"></select>
            </div>
            <div>
                <label>Descripción del Caso</label>
                <textarea name="descripcion_caso" placeholder="Descripción del Caso"></textarea>
            </div>
        `;
        container.appendChild(form);

        const accionesSelect = form.querySelector('.acciones_ejecutadas_select');
        populateSelect(accionesSelect, tipoObraOptions, 'Seleccione una Acción');

        const comunaSelect = form.querySelector('.comuna_select');
        const consejoComunalSelect = form.querySelector('.consejo_comunal_select');

        initializeComunaHandler(
            null,
            comunaSelect,
            null,
            consejoComunalSelect,
            null,
            `#punto_y_circulo_data_container form:nth-child(${i + 1}) .notification`,
            parroquiaSeleccionada
        );
    }
});