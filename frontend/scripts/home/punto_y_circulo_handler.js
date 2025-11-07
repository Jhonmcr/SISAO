import { populateSelect, tipoObraOptions } from './select_populator.js';
import { initializeComunaHandler } from './comuna_handler.js';
import { showNotification } from '../utils.js';

export function initializePuntoYCirculoHandlers(formElement) {
    const puntoYCirculoRadios = formElement.querySelectorAll('input[name="punto_y_circulo"]');
    const optionsDiv = formElement.querySelector('#punto_y_circulo_options');
    const countSelect = formElement.querySelector('#punto_y_circulo_count');
    const container = formElement.querySelector('#punto_y_circulo_data_container');
    const notificationElement = formElement.querySelector('.notification');

    puntoYCirculoRadios.forEach(radio => {
        radio.addEventListener('change', function () {
            if (this.value === 'si' && this.checked) {
                optionsDiv.style.display = 'block';
            } else {
                optionsDiv.style.display = 'none';
                container.innerHTML = '';
                countSelect.value = '0';
            }
        });
    });

    countSelect.addEventListener('change', function () {
        createPuntoYCirculoForms(formElement);
    });
}

export async function createPuntoYCirculoForms(formElement) {
    const container = formElement.querySelector('#punto_y_circulo_data_container');
    const countSelect = formElement.querySelector('#punto_y_circulo_count');
    const notificationElement = formElement.querySelector('.notification');
    
    container.innerHTML = ''; // Clear previous forms
    const count = parseInt(countSelect.value, 10);
    const parroquiaSeleccionada = formElement.querySelector('#parroquia').value;

    if (count > 0 && !parroquiaSeleccionada) {
        showNotification('Por favor, seleccione una parroquia antes de agregar Puntos y Círculos.', 'error', notificationElement);
        countSelect.value = '0'; // Reset the count
        return;
    }

    if (isNaN(count) || count <= 0) {
        return;
    }

    for (let i = 0; i < count; i++) {
        const subForm = document.createElement('form');
        subForm.classList.add('punto-y-circulo-form');
        subForm.innerHTML = `
            <hr>
            <h4>Punto y Círculo ${i + 1}</h4>
            <div><label>Acciones Ejecutadas</label><select name="acciones_ejecutadas" class="acciones_ejecutadas_select"></select></div>
            <div><label>Tipo de Obra</label><input type="text" name="tipo_obra" placeholder="Tipo de Obra"></div>
            <div><label>Comuna</label><select name="comuna" class="comuna_select"></select></div>
            <div><label>Consejo Comunal</label><select name="consejo_comunal" class="consejo_comunal_select"></select></div>
            <div><label>Descripción del Caso</label><textarea name="descripcion_caso" placeholder="Descripción del Caso"></textarea></div>
        `;
        container.appendChild(subForm);

        const accionesSelect = subForm.querySelector('.acciones_ejecutadas_select');
        populateSelect(accionesSelect, tipoObraOptions, 'Seleccione una Acción');

        const comunaSelect = subForm.querySelector('.comuna_select');
        const consejoComunalSelect = subForm.querySelector('.consejo_comunal_select');

        const handler = await initializeComunaHandler(
            null,
            comunaSelect,
            null,
            consejoComunalSelect,
            null,
            `#${container.id} form:nth-child(${i + 1}) .notification`
        );

        if (parroquiaSeleccionada && handler && typeof handler.cargarComunas === 'function') {
            await handler.cargarComunas(parroquiaSeleccionada);
        }
    }
}