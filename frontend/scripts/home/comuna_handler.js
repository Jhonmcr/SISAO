// Importa la configuración de la API y utilidades
import { getApiBaseUrlAsync } from '../config.js';
import { showNotification } from '../utils.js';

// Se ejecuta cuando el contenido del DOM está completamente cargado
document.addEventListener('DOMContentLoaded', async () => {
    // Referencias a los elementos del formulario
    const comunaSelect = document.getElementById('comuna');
    const codigoComunaInput = document.getElementById('codigoComuna');
    const consejoComunalSelect = document.getElementById('consejo_comunal_ejecuta');
    const codigoConsejoComunalInput = document.getElementById('codigo_consejo_comunal');
    const popupNotification = document.querySelector('#popup .notification');

    // Almacenará los datos de todas las comunas para evitar múltiples peticiones
    let comunasData = [];

    /**
     * Obtiene todas las comunas desde el backend y las carga en el select de comunas.
     */
    const cargarComunas = async () => {
        try {
            const API_BASE_URL = await getApiBaseUrlAsync();
            const response = await fetch(`${API_BASE_URL}/comunas`);

            if (!response.ok) {
                throw new Error('No se pudieron cargar las comunas.');
            }

            comunasData = await response.json();

            // Limpiar opciones existentes (excepto la primera que es "Seleccione...")
            comunaSelect.innerHTML = '<option value="">Seleccione una Comúna</option>';

            // Poblar el select con las comunas obtenidas
            comunasData.forEach(comuna => {
                const option = document.createElement('option');
                option.value = comuna.nombre; // Usamos el nombre como valor
                option.textContent = comuna.nombre;
                comunaSelect.appendChild(option);
            });

        } catch (error) {
            console.error('Error al cargar comunas:', error);
            showNotification('Error al cargar la lista de comunas.', 'error', popupNotification);
        }
    };

    /**
     * Maneja el evento de cambio en el select de comunas.
     */
    comunaSelect.addEventListener('change', () => {
        const nombreComunaSeleccionada = comunaSelect.value;
        
        // Resetear campos dependientes
        codigoComunaInput.value = '';
        consejoComunalSelect.innerHTML = '<option value="">Seleccione un Consejo Comunal</option>';
        consejoComunalSelect.disabled = true;
        codigoConsejoComunalInput.value = '';

        if (nombreComunaSeleccionada) {
            // Encontrar la comuna seleccionada en los datos almacenados
            const comunaSeleccionada = comunasData.find(c => c.nombre === nombreComunaSeleccionada);

            if (comunaSeleccionada) {
                // Rellenar código de la comuna
                codigoComunaInput.value = comunaSeleccionada.codigo_circuito_comunal || '';

                // Poblar y habilitar el select de consejos comunales
                if (comunaSeleccionada.consejos_comunales && comunaSeleccionada.consejos_comunales.length > 0) {
                    comunaSeleccionada.consejos_comunales.forEach(consejo => {
                        const option = document.createElement('option');
                        option.value = consejo.nombre; // Usamos el nombre como valor
                        option.textContent = consejo.nombre;
                        // Guardamos el código SITUR en un atributo de datos para fácil acceso
                        option.dataset.situr = consejo.codigo_situr;
                        consejoComunalSelect.appendChild(option);
                    });
                    consejoComunalSelect.disabled = false;
                } else {
                    // Si no hay consejos comunales, mantenemos el select deshabilitado
                    showNotification('Esta comuna no tiene consejos comunales registrados.', 'error', popupNotification);
                }
            }
        }
    });

    /**
     * Maneja el evento de cambio en el select de consejos comunales.
     */
    consejoComunalSelect.addEventListener('change', () => {
        const nombreConsejoSeleccionado = consejoComunalSelect.value;
        codigoConsejoComunalInput.value = '';

        if (nombreConsejoSeleccionado) {
            // El código SITUR se guardó en el `dataset` de la opción seleccionada
            const selectedOption = consejoComunalSelect.options[consejoComunalSelect.selectedIndex];
            if (selectedOption && selectedOption.dataset.situr) {
                codigoConsejoComunalInput.value = selectedOption.dataset.situr;
            }
        }
    });

    // Cargar las comunas al iniciar
    await cargarComunas();
});
