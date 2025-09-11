// scripts/home/select_populator.js

/**
 * @file scripts/home/select_populator.js
 * @description Este script se encarga de poblar los elementos `<select>` en los formularios
 * (tanto para agregar como para modificar casos) con opciones predefinidas.
 * También maneja la lógica para actualizar automáticamente el campo 'Circuito'
 * basado en la 'Parroquia' seleccionada.
 */

// OPCIONES PREDEFINIDAS PARA LOS SELECTS

// Opciones para el select de "Tipo de Obra".
export const tipoObraOptions = ['Donación', 'Dotación', 'Instalación', 'Nivelación', 'Embellecimiento', 'Construcción', 'Impermeabilización', 'Jornada Integral', 'Mantenimiento', 'Embaulamiento', 'Rehabilitacion', 'Entrega', 'Proyectos Comunales', 'Instalación de Parque', 'Viabilidad'];

// Lista de todas las parroquias.
export const parroquias = [
    'El Junquito', 'Sucre', 'La Pastora', 'Altagracia', '23 de Enero', 'San Juan', 'Catedral', 'Santa Teresa',
    'San Bernardino', 'El Recreo', 'San Pedro', 'San Agustín', 'La Candelaria', 'San José', 'Santa Rosalía',
    'Coche', 'El Valle', 'Macarao', 'Antimano', 'Caricuao', 'La Vega', 'El Paraíso'
];

// Lista de los circuitos disponibles.
export const circuitos = [
    'Circuito 1', 'Circuito 2', 'Circuito 3', 'Circuito 4', 'Circuito 5'
];

// Mapeo de qué parroquias pertenecen a qué circuito.
// Usado para la selección automática del circuito.
export const circuitosParroquias = {
    'Circuito 1': ['El Junquito', 'Sucre', 'La Pastora'],
    'Circuito 2': ['Altagracia', '23 de Enero', 'San Juan', 'Catedral', 'Santa Teresa'],
    'Circuito 3': ['San Bernardino', 'El Recreo', 'San Pedro', 'San Agustín', 'La Candelaria', 'San José'],
    'Circuito 4': ['Santa Rosalía', 'Coche', 'El Valle'],
    'Circuito 5': ['Macarao', 'Antimano', 'Caricuao', 'La Vega', 'El Paraíso']
};

/**
 * Actualiza el campo de selección 'Circuito' basándose en la 'Parroquia' seleccionada.
 * Esta función se ejecuta cuando cambia la selección de parroquia en el formulario de agregar
 * o modificar caso. El campo 'Circuito' es de solo lectura y se actualiza automáticamente.
 */
function updateCircuitoSelection() {
    // Intenta obtener los selects del formulario de AGREGAR caso.
    let parroquiaSelect = document.getElementById('parroquia'); 
    let circuitoSelect = document.getElementById('circuito');   

    // Si no se encuentran en el formulario de agregar, intenta obtenerlos del formulario de MODIFICAR caso.
    // Esto permite que la función sea reutilizable para ambos formularios si tienen IDs diferentes.
    if (!parroquiaSelect || !circuitoSelect) {
        const modifyParroquiaSelect = document.getElementById('modify_parroquia');
        const modifyCircuitoSelect = document.getElementById('modify_circuito');

        // Si se encuentran los selects de modificación, los usa.
        if (modifyParroquiaSelect && modifyCircuitoSelect) {
            parroquiaSelect = modifyParroquiaSelect;
            circuitoSelect = modifyCircuitoSelect;
        } else {
            // Si no se encuentra ningún par de selects relevante, no hace nada.
            console.warn("No se encontraron los elementos select de parroquia o circuito para actualizar.");
            return; 
        }
    }

    const selectedParroquia = parroquiaSelect.value; // Obtiene la parroquia seleccionada.
    let matchedCircuito = ''; // Variable para almacenar el circuito correspondiente.

    // Itera sobre el objeto `circuitosParroquias` para encontrar a qué circuito pertenece la parroquia seleccionada.
    for (const [circuito, parroquiasList] of Object.entries(circuitosParroquias)) {
        if (parroquiasList.includes(selectedParroquia)) {
            matchedCircuito = circuito; // Guarda el circuito encontrado.
            break; // Termina el bucle una vez encontrado.
        }
    }

    // Limpia y repuebla el select de circuito.
    // Siempre muestra la opción por defecto "Circuito asignado automáticamente".
    circuitoSelect.innerHTML = '<option value="" disabled>Circuito asignado automáticamente</option>';
    circuitoSelect.disabled = true; // El campo de circuito siempre está deshabilitado para edición manual.
    
    // Añade todas las opciones de circuito al select (aunque solo una estará seleccionada).
    circuitos.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        circuitoSelect.appendChild(opt);
    });

    // Si se encontró un circuito coincidente, lo selecciona.
    if (matchedCircuito) {
        circuitoSelect.value = matchedCircuito;
    } else {
        // Si no hay coincidencia (ej. si la parroquia no está en la lista o no se ha seleccionado ninguna),
        // el select de circuito se resetea a su valor por defecto (vacío).
        circuitoSelect.value = ''; 
    }
}

/**
 * Inicializa los campos de selección (`<select>`) en el formulario de agregar caso
 * cuando la página se carga por primera vez.
 * Puebla los selects de "Tipo de Obra", "Parroquia" y configura el de "Circuito".
 */
export function initializeSelects(ids, selectedValues = {}) {
    const { tipoObraSelectId, parroquiaSelectId, circuitoSelectId, cantidadFamiliasSelectId } = ids;
    // Obtiene referencias a los elementos select del formulario.
    const tipoObraSelect = document.getElementById(tipoObraSelectId);
    const parroquiaSelect = document.getElementById(parroquiaSelectId);
    const circuitoSelect = document.getElementById(circuitoSelectId);
    const cantidadFamiliasSelect = document.getElementById(cantidadFamiliasSelectId);

    // Puebla el select de "Tipo de Obra" si existe.
    if (tipoObraSelect) {
        // No se pasa texto para la opción por defecto, para que no se cree en este select múltiple.
        populateSelect(tipoObraSelect, tipoObraOptions, '', selectedValues.tipo_obra);
    }
    // Puebla el select de "Parroquia" si existe.
    if (parroquiaSelect) {
        populateSelect(parroquiaSelect, parroquias, 'Selecciona una Parroquia', selectedValues.parroquia);
    }

    // Puebla el select de "Cantidad de Familias" si existe.
    if (cantidadFamiliasSelect) {
        const familiasOptions = Array.from({ length: 101 }, (_, i) => i.toString());
        populateSelect(cantidadFamiliasSelect, familiasOptions, 'Seleccione Cantidad', selectedValues.cantidad_familiares);
    }

    // Configura el select de "Circuito" si existe.
    if (circuitoSelect) {
        circuitoSelect.innerHTML = ''; // Limpia opciones existentes.
        // Crea y añade la opción por defecto.
        const defaultCircuitoOption = document.createElement('option');
        defaultCircuitoOption.value = '';
        defaultCircuitoOption.textContent = 'Circuito asignado automáticamente';
        defaultCircuitoOption.selected = true; // Seleccionada por defecto.
        defaultCircuitoOption.disabled = true; // Deshabilitada para que no se pueda elegir manualmente.
        circuitoSelect.appendChild(defaultCircuitoOption);

        // Añade todas las posibles opciones de circuito (aunque se seleccionará automáticamente).
        circuitos.forEach(circuitoText => {
            const option = document.createElement('option');
            option.value = circuitoText;
            option.textContent = circuitoText;
            circuitoSelect.appendChild(option);
        });

        circuitoSelect.disabled = true; // El select de circuito siempre está deshabilitado.
    }

    // Si el select de parroquia existe, le añade un event listener para actualizar el circuito cuando cambie.
    if (parroquiaSelect) {
        parroquiaSelect.addEventListener('change', updateCircuitoSelection);
        // Llama a la función una vez al inicio para establecer el circuito si ya hay una parroquia preseleccionada.
        updateCircuitoSelection(); 
    }
}

function initializeFormSelects() {
    const ids = {
        tipoObraSelectId: 'tipo_obra',
        parroquiaSelectId: 'parroquia',
        circuitoSelectId: 'circuito',
        cantidadFamiliasSelectId: 'cantidad_familiares'
    };
    initializeSelects(ids);
}

/**
 * Función genérica para poblar un elemento `<select>` con opciones.
 * @param {HTMLSelectElement} selectElement - El elemento select del DOM a poblar.
 * @param {string[]} options - Un array de strings con las opciones a añadir.
 * @param {string} [defaultText=''] - El texto para la opción por defecto (usualmente deshabilitada).
 * @param {string} [selectedValue=''] - El valor que debería estar seleccionado por defecto (si coincide con una opción).
 */
export function populateSelect(selectElement, options, defaultText = '', selectedValue = '') {
    if (!selectElement) return; // Si el elemento select no existe, no hace nada.
    
    selectElement.innerHTML = ''; // Limpia cualquier opción existente en el select.
    
    let defaultOption = null; // Declara la variable fuera del if.

    // Solo añade la opción por defecto si se proporciona un texto para ella.
    if (defaultText) {
        defaultOption = document.createElement('option'); // Asigna el elemento a la variable.
        defaultOption.value = ''; // Valor vacío para la opción por defecto.
        defaultOption.textContent = defaultText; // Texto del placeholder (ej. "Selecciona una opción").
        defaultOption.disabled = true; // La opción por defecto no se puede seleccionar.
        defaultOption.selected = true; // La opción por defecto está seleccionada inicialmente.
        selectElement.appendChild(defaultOption);
    }

    // Itera sobre el array de opciones y crea un elemento <option> para cada una.
    options.forEach(optionText => {
        const option = document.createElement('option');
        option.value = optionText; // El valor y el texto de la opción son el mismo.
        option.textContent = optionText;
        // Si el valor de esta opción coincide con `selectedValue`, la marca como seleccionada.
        if (optionText === selectedValue) {
            option.selected = true; 
            // Solo intenta deseleccionar la opción por defecto si fue creada.
            if (defaultOption) {
                defaultOption.selected = false;
            }
        }
        selectElement.appendChild(option); // Añade la opción al select.
    });
}

// Event Listener: Ejecuta initializeFormSelects cuando el DOM está completamente cargado.
// Esto asegura que los selects en el formulario de agregar caso se pueblen al cargar la página.
document.addEventListener('DOMContentLoaded', initializeFormSelects);