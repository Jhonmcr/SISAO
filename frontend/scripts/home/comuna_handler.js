// Importa la configuración de la API y utilidades
import { getApiBaseUrlAsync } from '../config.js';
import { showNotification } from '../utils.js';

// Se ejecuta cuando el contenido del DOM está completamente cargado
document.addEventListener('DOMContentLoaded', async () => {
    // Referencias a los elementos del formulario
    const parroquiaSelect = document.getElementById('parroquia');
    const comunaSelect = document.getElementById('comuna');
    const codigoComunaInput = document.getElementById('codigoComuna');
    const consejoComunalSelect = document.getElementById('consejo_comunal_ejecuta');
    const codigoConsejoComunalInput = document.getElementById('codigo_consejo_comunal');
    const popupNotification = document.querySelector('#popup .notification');

    // Almacenará los datos de las comunas filtradas para evitar múltiples peticiones
    let comunasData = [];

    /**
     * Obtiene las comunas desde el backend, opcionalmente filtradas por parroquia, 
     * y las carga en el select de comunas.
     * @param {string} parroquia - La parroquia por la cual filtrar. Si es vacía, no se cargarán comunas.
     */
    const cargarComunas = async (parroquia) => {
        // Resetear campos dependientes cada vez que se intenta cargar nuevas comunas
        comunaSelect.innerHTML = '<option value="">Seleccione una Comúna</option>';
        comunaSelect.disabled = true;
        codigoComunaInput.value = '';
        consejoComunalSelect.innerHTML = '<option value="">Seleccione un Consejo Comunal</option>';
        consejoComunalSelect.disabled = true;
        codigoConsejoComunalInput.value = '';

        if (!parroquia) {
            return; // No hacer nada si no se ha seleccionado una parroquia
        }

        try {
            const API_BASE_URL = await getApiBaseUrlAsync();
            // La URL ahora puede incluir un parámetro de consulta para filtrar por parroquia
            const response = await fetch(`${API_BASE_URL}/comunas?parroquia=${encodeURIComponent(parroquia)}`);

            if (!response.ok) {
                throw new Error('No se pudieron cargar las comunas para la parroquia seleccionada.');
            }

            comunasData = await response.json();

            // Si se encontraron comunas, poblar el select
            if (comunasData.length > 0) {
                comunasData.forEach(comuna => {
                    const option = document.createElement('option');
                    option.value = comuna.nombre; // Usamos el nombre como valor
                    option.textContent = comuna.nombre;
                    option.dataset.codigo = comuna.codigo_circuito_comunal; // Guardamos el código en un data attribute
                    comunaSelect.appendChild(option);
                });
                comunaSelect.disabled = false; // Habilitar el select de comunas
            } else {
                showNotification('No hay comunas registradas para esta parroquia.', 'error', popupNotification);
            }

        } catch (error) {
            console.error('Error al cargar comunas:', error);
            showNotification(error.message, 'error', popupNotification);
        }
    };

    /**
     * Maneja el evento de cambio en el select de parroquias.
     */
    parroquiaSelect.addEventListener('change', () => {
        const parroquiaSeleccionada = parroquiaSelect.value;
        cargarComunas(parroquiaSeleccionada);
    });

    /**
     * Maneja el evento de cambio en el select de comunas.
     */
    comunaSelect.addEventListener('change', () => {
        const nombreComunaSeleccionada = comunaSelect.value;
        
        // Resetear campos dependientes del consejo comunal
        consejoComunalSelect.innerHTML = '<option value="">Seleccione un Consejo Comunal</option>';
        consejoComunalSelect.disabled = true;
        codigoConsejoComunalInput.value = '';
        codigoComunaInput.value = '';

        if (nombreComunaSeleccionada) {
            const selectedOption = Array.from(comunaSelect.options).find(opt => opt.value === nombreComunaSeleccionada);
            if(selectedOption && selectedOption.dataset.codigo) {
                codigoComunaInput.value = selectedOption.dataset.codigo;
            }

            const comunaSeleccionada = comunasData.find(c => c.nombre === nombreComunaSeleccionada);

            if (comunaSeleccionada && comunaSeleccionada.consejos_comunales && comunaSeleccionada.consejos_comunales.length > 0) {
                comunaSeleccionada.consejos_comunales.forEach(consejo => {
                    const option = document.createElement('option');
                    option.value = consejo.nombre;
                    option.textContent = consejo.nombre;
                    option.dataset.situr = consejo.codigo_situr;
                    consejoComunalSelect.appendChild(option);
                });
                consejoComunalSelect.disabled = false;
            } else {
                showNotification('Esta comuna no tiene consejos comunales registrados.', 'error', popupNotification);
            }
        }
    });

    /**
     * Maneja el evento de cambio en el select de consejos comunales.
     */
    consejoComunalSelect.addEventListener('change', () => {
        const selectedOption = consejoComunalSelect.options[consejoComunalSelect.selectedIndex];
        if (selectedOption && selectedOption.dataset.situr) {
            codigoConsejoComunalInput.value = selectedOption.dataset.situr;
        } else {
            codigoConsejoComunalInput.value = '';
        }
    });

    // Inicialmente, los selects de comuna y consejo comunal están deshabilitados
    comunaSelect.disabled = true;
    consejoComunalSelect.disabled = true;
});
