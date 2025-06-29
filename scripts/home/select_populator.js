// scripts/select_populator.js

// Opciones para el select de Tipo de Obra
export const tipoObraOptions = ['Desmalezamiento', 'Pintura', 'Control de Cemento', 'Vías', 'Agua', 'Electricidad', 'Salud', 'Educación', 'Deporte', 'Cultura', 'Vivienda'];

// Opciones para el select de Parroquias
export const parroquias = [
    'El Junquito', 'Sucre', 'La Pastora', 'Altagracia', '23 de Enero', 'San Juan', 'Catedral', 'Santa Teresa',
    'San Bernardino', 'El Recreo', 'San Pedro', 'San Agustín', 'La Candelaria', 'San José', 'Santa Rosalía',
    'Coche', 'El Valle', 'Macarao', 'Antimano', 'Caricuao', 'La Vega', 'El Paraíso'
];

// Opciones para el select de Circuitos
export const circuitos = [
    'Circuito 1', 'Circuito 2', 'Circuito 3', 'Circuito 4', 'Circuito 5'
];

// Opciones de Parroquias dentro de los Circuitos
export const circuitosParroquias = {
    'Circuito 1': ['El Junquito', 'Sucre', 'La Pastora'],
    'Circuito 2': ['Altagracia', '23 de Enero', 'San Juan', 'Catedral', 'Santa Teresa'],
    'Circuito 3': ['San Bernardino', 'El Recreo', 'San Pedro', 'San Agustín', 'La Candelaria', 'San José'],
    'Circuito 4': ['Santa Rosalía', 'Coche', 'El Valle'],
    'Circuito 5': ['Macarao', 'Antimano', 'Caricuao', 'La Vega', 'El Paraíso']
};

/**
 * Actualiza el select de circuito basado en la parroquia seleccionada.
 * Esta función es crucial para la lógica de asignación automática de circuitos.
 */
function updateCircuitoSelection() {
    const parroquiaSelect = document.getElementById('parroquia'); // Asumiendo este ID para el form de agregar
    const circuitoSelect = document.getElementById('circuito');   // Asumiendo este ID para el form de agregar

    if (!parroquiaSelect || !circuitoSelect) {
        // También verifica los IDs para el formulario de modificación si es necesario
        const modifyParroquiaSelect = document.getElementById('modify_parroquia');
        const modifyCircuitoSelect = document.getElementById('modify_circuito');

        if (modifyParroquiaSelect && modifyCircuitoSelect) {
            parroquiaSelect = modifyParroquiaSelect;
            circuitoSelect = modifyCircuitoSelect;
        } else {
            return; // No se encontraron los selects relevantes
        }
    }


    const selectedParroquia = parroquiaSelect.value;
    let matchedCircuito = '';

    for (const [circuito, parroquiasList] of Object.entries(circuitosParroquias)) {
        if (parroquiasList.includes(selectedParroquia)) {
            matchedCircuito = circuito;
            break;
        }
    }

    circuitoSelect.innerHTML = '<option value="" disabled>Circuito asignado automáticamente</option>';
    circuitoSelect.disabled = true; // Siempre deshabilitado para edición manual
    circuitos.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        circuitoSelect.appendChild(opt);
    });

    if (matchedCircuito) {
        circuitoSelect.value = matchedCircuito;
    } else {
        circuitoSelect.value = ''; // Resetea si no hay coincidencia
    }
}

// Función para inicializar los selects al cargar el formulario.
function initializeFormSelects() {
    const tipoObraSelect = document.getElementById('tipo_obra');
    const parroquiaSelect = document.getElementById('parroquia');
    const circuitoSelect = document.getElementById('circuito');

    if (tipoObraSelect) populateSelect(tipoObraSelect, tipoObraOptions, 'Selecciona un Tipo de Obra');
    if (parroquiaSelect) populateSelect(parroquiaSelect, parroquias, 'Selecciona una Parroquia');

    if (circuitoSelect) {
        circuitoSelect.innerHTML = '';
        const defaultCircuitoOption = document.createElement('option');
        defaultCircuitoOption.value = '';
        defaultCircuitoOption.textContent = 'Circuito asignado automáticamente';
        defaultCircuitoOption.selected = true;
        defaultCircuitoOption.disabled = true;
        circuitoSelect.appendChild(defaultCircuitoOption);

        circuitos.forEach(circuitoText => {
            const option = document.createElement('option');
            option.value = circuitoText;
            option.textContent = circuitoText;
            circuitoSelect.appendChild(option);
        });

        circuitoSelect.disabled = true;
    }

    if (parroquiaSelect) {
        parroquiaSelect.addEventListener('change', updateCircuitoSelection);
        updateCircuitoSelection(); // Llamada inicial para asegurar que el circuito se actualice si hay un valor preseleccionado
    }
}

export function populateSelect(selectElement, options, defaultText = '', selectedValue = '') {
    selectElement.innerHTML = ''; // Clear existing options.
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = defaultText;
    defaultOption.disabled = true; // Disable the default option.
    defaultOption.selected = true; // Select it by default.
    selectElement.appendChild(defaultOption);

    options.forEach(optionText => {
        const option = document.createElement('option');
        option.value = optionText;
        option.textContent = optionText;
        if (optionText === selectedValue) {
            option.selected = true; // Mark the option as selected if it matches the value.
            defaultOption.selected = false; // Deselect the default option.
        }
        selectElement.appendChild(option);
    });
}

document.addEventListener('DOMContentLoaded', initializeFormSelects);