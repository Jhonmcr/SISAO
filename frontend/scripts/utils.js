// scripts/utils.js

/**
 * @file scripts/utils.js
 * @description Este archivo contiene funciones de utilidad reutilizables en varias partes de la aplicación.
 * Incluye una función para mostrar notificaciones al usuario y otra para generar IDs legibles.
 */

/**
 * Muestra una notificación en la interfaz de usuario.
 * La notificación puede ser de éxito o de error y se oculta automáticamente después de un tiempo.
 * Si se llama varias veces para el mismo elemento, cancela los temporizadores anteriores para evitar comportamientos inesperados.
 * 
 * @export
 * @param {string} message - El mensaje que se mostrará en la notificación.
 * @param {boolean} [isError=false] - Indica si la notificación es de error (true) o de éxito/informativa (false).
 *                                    Esto afecta el estilo CSS aplicado.
 * @param {HTMLElement} [targetElement=null] - El elemento HTML específico donde se mostrará la notificación.
 *                                             Si es `null`, se buscará un elemento con la clase `.notification` en todo el documento.
 */

// Un Map para rastrear los temporizadores asociados a cada elemento de notificación.
// Esto permite cancelar temporizadores pendientes si se muestra una nueva notificación en el mismo elemento.
// Clave: HTMLElement (el elemento de notificación), Valor: objeto con { hideTimer, removeShowClassTimer }
const notificationTimers = new Map();

export function showNotification(message, isError = false, targetElement = null) {
    // Determina el elemento de notificación a usar: el `targetElement` proporcionado o el primero con clase `.notification`.
    const notificationElement = targetElement || document.querySelector('.notification');

    // Procede solo si se encontró un elemento de notificación.
    if (notificationElement) {
        // Si ya existe un temporizador para este elemento de notificación, lo limpia.
        // Esto evita que una notificación anterior se oculte prematuramente si se muestra una nueva.
        if (notificationTimers.has(notificationElement)) {
            const timers = notificationTimers.get(notificationElement);
            clearTimeout(timers.hideTimer); // Cancela el temporizador que oculta el elemento (display: none).
            clearTimeout(timers.removeShowClassTimer); // Cancela el temporizador que quita la clase 'show-notification'.
            notificationTimers.delete(notificationElement); // Elimina la entrada del Map.
        }

        // Establece el contenido de texto de la notificación.
        notificationElement.textContent = message;
        
        // Define las clases CSS base y añade 'error' o 'success' según corresponda.
        let classes = 'notification'; // Clase base.
        if (isError) {
            classes += ' error'; // Clase para notificaciones de error.
        } else {
            classes += ' success'; // Clase para notificaciones de éxito/informativas.
        }
        notificationElement.className = classes; // Sobrescribe todas las clases del elemento.
                                                 // PRECAUCIÓN: Si .notification tiene otras clases base importantes que no sean 'error' o 'success',
                                                 // este enfoque las eliminará. Sería mejor usar classList.add/remove.

        // Truco para forzar un "reflujo" del DOM. Esto es útil para reiniciar animaciones CSS
        // si la notificación se muestra repetidamente en rápida sucesión.
        notificationElement.style.display = 'none'; // Oculta momentáneamente.
        void notificationElement.offsetWidth; // Fuerza al navegador a recalcular el layout.
        notificationElement.style.display = ''; // Revierte al estilo de display definido por CSS (probablemente 'block' o 'flex' debido a .show-notification).

        // Añade la clase 'show-notification' para hacer visible la notificación y activar la animación de entrada (fade-in).
        notificationElement.classList.add('show-notification');

        // Configura un temporizador para quitar la clase 'show-notification' después de un tiempo.
        // Esto iniciará la animación de salida (fade-out).
        const removeShowClassTimerId = setTimeout(() => {
            notificationElement.classList.remove('show-notification');

            // Configura un segundo temporizador para establecer `display: none` una vez que la animación de fade-out haya concluido.
            // La duración de este temporizador (300ms) debe coincidir con la duración de la transición de opacidad en el CSS.
            const hideTimerId = setTimeout(() => {
                // Verifica si la notificación no ha sido mostrada nuevamente mientras este temporizador estaba activo.
                if (!notificationElement.classList.contains('show-notification')) {
                    notificationElement.style.display = 'none'; // Oculta completamente el elemento.
                }
                notificationTimers.delete(notificationElement); // Limpia la entrada del Map para este elemento.
            }, 300); 

            // Actualiza la entrada en el Map con el ID del nuevo temporizador de ocultación.
            // Esto es importante si se muestra otra notificación antes de que esta se oculte completamente.
            if (notificationTimers.has(notificationElement)) { // Debería existir, ya que se añadió abajo.
                notificationTimers.get(notificationElement).hideTimer = hideTimerId;
            }

        }, 20000); // La notificación permanece visible por 5 segundos antes de iniciar el fade-out.

        // Guarda los IDs de ambos temporizadores en el Map, asociados al elemento de notificación.
        notificationTimers.set(notificationElement, {
            removeShowClassTimer: removeShowClassTimerId,
            hideTimer: null // hideTimer se establecerá dentro del primer setTimeout.
        });

    } else {
        // Si no se encuentra ningún elemento de notificación, muestra una advertencia en la consola.
        console.warn('Elemento de notificación no encontrado en el DOM. Mensaje no mostrado:', message);
    }
}

/**
 * Genera un ID alfanumérico legible y más corto a partir de un ID de MongoDB.
 * Esta función toma los últimos 5 caracteres del ID de MongoDB y los convierte a mayúsculas.
 * Útil para mostrar identificadores más amigables en la interfaz de usuario, aunque no garantiza unicidad global
 * si se depende solo de estos 5 caracteres. La unicidad principal sigue recayendo en el ID completo de MongoDB.
 * 
 * @export
 * @param {string} mongoId - El ID completo y único generado por MongoDB (generalmente una cadena de 24 caracteres hexadecimales).
 * @returns {string} Un ID alfanumérico corto (últimos 5 caracteres en mayúsculas) o 'ERROR_ID' si el mongoId es inválido.
 */
export function generateAlphanumericId(mongoId) {
    // Valida que el mongoId sea una cadena y tenga una longitud mínima.
    if (!mongoId || typeof mongoId !== 'string' || mongoId.length < 5) { // Cambiado de 10 a 5 para que coincida con la lógica de substring.
        console.warn('ID de MongoDB inválido o demasiado corto para generar ID legible:', mongoId);
        return 'ERROR_ID'; // Retorna un ID de error si la validación falla.
    }
    // Extrae los últimos 5 caracteres del mongoId y los convierte a mayúsculas.
    return mongoId.substring(mongoId.length - 5).toUpperCase();
}