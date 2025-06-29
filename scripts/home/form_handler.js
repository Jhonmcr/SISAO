// scripts/home/form_handler.js

import { showNotification, generateAlphanumericId} from '../utils.js';

const form = document.getElementById('caseForm');
const popupNotification = document.querySelector('#popup .notification');

// listener para prevenir el submit por defecto (MANTENLO)
if (form) {
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        console.log("Formulario submit preventDefault ejecutado.");
    });
} else {
    console.error("El formulario con id 'caseForm' no fue encontrado.");
}


window.confirmAndUploadCase = async function() {
    console.log('Función confirmAndUploadCase() llamada.');

    if (!form) {
        console.log('Error: Formulario no encontrado, mostrando notificación global.');
        showNotification('Error: Formulario de añadir caso no encontrado.', 'error');
        return;
    }

    // --- Validaciones de campos (AQUÍ ESTÁ LA PRIORIDAD AHORA) ---
    const tipoObra = document.getElementById('tipo_obra').value.trim();
    const parroquia = document.getElementById('parroquia').value.trim();
    const circuito = document.getElementById('circuito').value.trim();
    const eje = document.getElementById('eje').value.trim();
    const comuna = document.getElementById('comuna').value.trim();
    const codigoComuna = document.getElementById('codigoComuna').value.trim();
    const nameJC = document.getElementById('nameJC').value.trim();
    const nameJU = document.getElementById('nameJU').value.trim();
    const enlaceComunal = document.getElementById('enlaceComunal').value.trim();
    const caseDescription = document.getElementById('caseDescription').value.trim();
    const caseDate = document.getElementById('caseDate').value.trim();
    const caseFile = document.getElementById('archivo'); // Se obtiene la referencia al input de archivo

    console.log('Iniciando validaciones de campos...');

    // Validar campos de texto obligatorios PRIMERO
    if (!tipoObra || !parroquia || !circuito || !eje || !comuna || !codigoComuna ||
        !nameJC || !nameJU || !enlaceComunal || !caseDescription || !caseDate) {
        console.log('Validación fallida: Campos obligatorios incompletos.');
        showNotification('Por favor, completa todos los campos obligatorios.', 'error', popupNotification);
        return; // Detiene la ejecución si faltan campos
    }

    // Validar archivo PDF SEGUNDO (MUEVE ESTE BLOQUE DESDE ARRIBA)
    if (!caseFile || !caseFile.files[0]) {
        console.log('Validación fallida: Archivo PDF no seleccionado.');
        showNotification('Por favor, selecciona un archivo PDF para el caso.', 'error', popupNotification);
        return; // Detiene la ejecución si no hay archivo
    }

    const selectedFile = caseFile.files[0];
    const MAX_FILE_SIZE_MB = 2;
    const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

    if (selectedFile.type !== 'application/pdf') {
        console.log('Validación fallida: Tipo de archivo no es PDF.');
        showNotification('Solo se permiten archivos PDF.', 'error', popupNotification);
        return; // Detiene la ejecución si no es PDF
    }
    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
        console.log('Validación fallida: Tamaño de archivo excede el límite.');
        showNotification(`El archivo PDF excede el tamaño máximo de ${MAX_FILE_SIZE_MB}MB.`, 'error', popupNotification);
        return; // Detiene la ejecución si el archivo es muy grande
    }

    console.log('Todas las validaciones de frontend pasaron. Procediendo con el fetch...');

    const formData = new FormData();
    formData.append('tipo_obra', tipoObra);
    formData.append('parroquia', parroquia);
    formData.append('circuito', circuito);
    formData.append('eje', eje);
    formData.append('comuna', comuna);
    formData.append('codigoComuna', codigoComuna);
    formData.append('nameJC', nameJC);
    formData.append('nameJU', nameJU);
    formData.append('enlaceComunal', enlaceComunal);
    formData.append('caseDescription', caseDescription);
    formData.append('caseDate', caseDate);
    formData.append('archivo', selectedFile);

    // Verificando contenido de FormData (MANTENLO PARA DEPURACIÓN)
    for (let [key, value] of formData.entries()) {
        console.log(`${key}: ${value}`);
    }
    console.log("Tamaño del archivo:", selectedFile.size, "bytes");


    try {
        const response = await fetch('http://localhost:3000/casos', { // O 'http://127.0.0.1:3000/casos' si esa funcionó mejor
            method: 'POST',
            body: formData
        });

        // La lógica para la notificación de éxito/error y reseteo del formulario
        // permanece igual, ya que eso es lo que quieres que suceda una vez que
        // las validaciones pasen y se intente el fetch.

        const result = await response.json().catch(() => ({ message: 'Error de formato de respuesta del servidor.' }));

        if (response.ok) {
            console.log('Petición exitosa al backend. Status:', response.status, 'Respuesta:', result);
            showNotification(result.message || 'Caso cargado exitosamente.', 'success', popupNotification);

            // VACIAR EL FORMULARIO Y NO CERRAR EL POPUP INMEDIATAMENTE
            form.reset();
            document.getElementById('tipo_obra').value = '';
            document.getElementById('parroquia').value = '';
            const circuitoSelect = document.getElementById('circuito');
            if (circuitoSelect) {
                circuitoSelect.value = '';
                circuitoSelect.dispatchEvent(new Event('change'));
            }
            document.dispatchEvent(new CustomEvent('caseDataChanged'));

        } else {
            console.log('Petición fallida al backend. Status:', response.status, 'Error Data:', result);
            showNotification(result.message || 'Error al agregar el caso. Verifique los datos.', 'error', popupNotification);
        }
    } catch (error) {
        console.error('Error general en la carga del caso (catch):', error);
        showNotification(`Error de conexión con el servidor: ${error.message || 'Desconocido'}. Inténtalo más tarde.`, 'error', popupNotification);
    }
};