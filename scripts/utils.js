// scripts/utils.js

/**
 * Muestra una notificación en la interfaz de usuario.
 * @param {string} message - El mensaje a mostrar.
 * @param {boolean} isError - Si es true, la notificación se muestra como un error.
 * @param {HTMLElement} [targetElement=null] - El elemento específico donde mostrar la notificación. Si es null, se usa el selector global.
 */
export function showNotification(message, isError = false, targetElement = null) {
    const notificationElement = targetElement || document.querySelector('.notification');

    if (notificationElement) {
        notificationElement.textContent = message;
        // Gestionar clases con cuidado para no eliminar clases existentes importantes si las hubiera,
        // aunque para este caso específico de <p class="notification">, reemplazar className es seguro.
        let classes = 'notification';
        if (isError) {
            classes += ' error';
        } else {
            classes += ' success';
        }
        // Si el elemento ya tiene otras clases que no sean 'notification', 'error', o 'success',
        // podríamos querer preservarlas. Por ahora, esto es simple y efectivo para la estructura actual.
        notificationElement.className = classes;

        // Añadir la clase para la animación de opacidad y asegurar visibilidad
        notificationElement.classList.add('show-notification');
        // notificationElement.style.display = 'block'; // Ya no es necesario si .show-notification lo maneja

        // Ocultar después de unos segundos
        setTimeout(() => {
            notificationElement.classList.remove('show-notification');
            // Esperar a que la animación de opacidad termine antes de hacer display:none
            // Esto asume que la transición de opacidad es de 0.3s (como en el CSS)
            setTimeout(() => {
                // Solo establecer display: none si no se ha vuelto a mostrar mientras tanto
                if (!notificationElement.classList.contains('show-notification')) {
                    notificationElement.style.display = 'none';
                }
            }, 300); // Coincide con la duración de la transición de opacidad
        }, 5000);
    } else {
        console.warn('Elemento de notificación no encontrado. Mensaje:', message);
    }
}

/**
 * Genera un ID alfanumérico legible a partir de un ID de MongoDB.
 * Utiliza una porción del ID de MongoDB para asegurar la unicidad y facilitar la búsqueda.
 * @param {string} mongoId - El ID único de MongoDB (_id).
 * @returns {string} Un ID alfanumérico más corto y legible.
 */
export function generateAlphanumericId(mongoId) {
    if (!mongoId || typeof mongoId !== 'string' || mongoId.length < 10) {
        console.warn('ID de MongoDB inválido o demasiado corto para generar ID alfanumérico:', mongoId);
        return 'ERROR_ID';
    }
    // Tomar los últimos 10 caracteres del ID de MongoDB para mayor unicidad y legibilidad.
    return mongoId.substring(mongoId.length - 5).toUpperCase();
}