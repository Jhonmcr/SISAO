// scripts/utils.js

/**
 * Muestra una notificación en la interfaz de usuario.
 * @param {string} message - El mensaje a mostrar.
 * @param {boolean} isError - Si es true, la notificación se muestra como un error.
 * @param {HTMLElement} [targetElement=null] - El elemento específico donde mostrar la notificación. Si es null, se usa el selector global.
 */

// Map para rastrear los temporizadores de ocultación de las notificaciones
const notificationTimers = new Map();

export function showNotification(message, isError = false, targetElement = null) {
    const notificationElement = targetElement || document.querySelector('.notification');

    if (notificationElement) {
        // Si hay un temporizador de ocultación existente para este elemento, cancelarlo
        if (notificationTimers.has(notificationElement)) {
            clearTimeout(notificationTimers.get(notificationElement).hideTimer);
            clearTimeout(notificationTimers.get(notificationElement).removeShowClassTimer);
            notificationTimers.delete(notificationElement);
        }

        notificationElement.textContent = message;
        let classes = 'notification';
        if (isError) {
            classes += ' error';
        } else {
            classes += ' success';
        }
        notificationElement.className = classes; // Esto sobrescribe, asegúrate de que es lo deseado.
                                                 // Si .notification tiene otras clases base importantes, ajustar.

        // Forzar reflujo para reiniciar la animación si se llama rápidamente
        // Esto es útil si la notificación se actualiza mientras aún está visible.
        notificationElement.style.display = 'none'; 
        void notificationElement.offsetWidth; // truco para forzar reflujo
        notificationElement.style.display = ''; // Revertir a lo que sea que el CSS defina (block por .show-notification)


        notificationElement.classList.add('show-notification');

        // Temporizador para quitar la clase de 'mostrar' (inicia la transición de opacidad para ocultar)
        const removeShowClassTimerId = setTimeout(() => {
            notificationElement.classList.remove('show-notification');

            // Temporizador para establecer display: none DESPUÉS de que la transición de opacidad haya terminado
            const hideTimerId = setTimeout(() => {
                // Solo ocultar si no se ha vuelto a mostrar mientras tanto
                if (!notificationElement.classList.contains('show-notification')) {
                    notificationElement.style.display = 'none';
                }
                notificationTimers.delete(notificationElement); // Limpiar el rastreador
            }, 300); // Coincide con la duración de la transición de opacidad CSS

            // Actualizar el map con el timer de ocultación final
            if (notificationTimers.has(notificationElement)) {
                 notificationTimers.get(notificationElement).hideTimer = hideTimerId;
            }

        }, 5000); // Tiempo total que la notificación es visible antes de empezar a ocultarse

        // Guardar ambos timers en el Map
        notificationTimers.set(notificationElement, {
            removeShowClassTimer: removeShowClassTimerId,
            hideTimer: null // hideTimer se establecerá dentro del primer setTimeout
        });

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