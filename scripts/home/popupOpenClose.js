// scripts/home/popupOpenClose.js

/**
 * @file scripts/home/popupOpenClose.js
 * @description Este script maneja la lógica para abrir y cerrar el popup (modal) 
 * utilizado para agregar nuevos casos en la página de inicio.
 * Intenta utilizar funciones globales `window.openModal` y `window.closeModal` si están definidas
 * (posiblemente por `scripts/popup_handler.js`), o recurre a una manipulación directa del DOM.
 */

/**
 * Abre el popup de agregar caso.
 * Busca el popup por el ID 'popup'.
 * Prioriza el uso de `window.openModal` si está disponible, de lo contrario,
 * cambia directamente el estilo `display` del elemento popup a 'flex'.
 */
function openPopup() {
    // Verifica si la función global openModal (de popup_handler.js) está definida.
    if (typeof window.openModal === 'function') {
        // Si está definida, la usa para abrir el popup con ID 'popup'.
        // Esto permite centralizar la lógica de apertura de modales y manejar animaciones si existen.
        window.openModal('popup');
    } else {
        // Si window.openModal no está definida, muestra una advertencia en consola
        // y procede a abrir el popup cambiando su estilo 'display' directamente.
        // Esto sirve como fallback o para casos donde popup_handler.js no esté cargado.
        console.warn("La función global window.openModal no está definida. Abriendo el popup directamente (posiblemente sin animación).");
        const popup = document.getElementById('popup'); // Obtiene el elemento del popup.
        if (popup) {
            popup.style.display = 'flex'; // Muestra el popup. Se usa 'flex' para el centrado.
        }
    }
}

/**
 * Cierra el popup de agregar caso.
 * Busca el popup por el ID 'popup'.
 * Prioriza el uso de `window.closeModal` si está disponible, de lo contrario,
 * cambia directamente el estilo `display` del elemento popup a 'none'.
 */
function closePopup() {
    // Similar a openPopup, verifica si la función global closeModal está disponible.
    if (typeof window.closeModal === 'function') {
        // Usa la función global para cerrar el popup, permitiendo animaciones de cierre.
        window.closeModal('popup');
    } else {
        // Fallback si window.closeModal no está definida.
        console.warn("La función global window.closeModal no está definida. Cerrando el popup directamente.");
        const popup = document.getElementById('popup'); // Obtiene el elemento del popup.
        if (popup) {
            popup.style.display = 'none'; // Oculta el popup.
        }
    }
}

// Exponer las funciones openPopup y closePopup globalmente en el objeto window.
// Esto permite que sean llamadas directamente desde atributos onclick en el HTML,
// por ejemplo: <button onclick="openPopup()">Abrir</button>.
window.openPopup = openPopup;
window.closePopup = closePopup;

// Event Listener que se ejecuta cuando el DOM está completamente cargado.
// Añade funcionalidad para cerrar el popup si se hace clic fuera de su contenido (en el fondo oscuro).
document.addEventListener('DOMContentLoaded', () => {
    const popup = document.getElementById('popup'); // Obtiene el elemento del popup.
    if (popup) {
        // Agrega un event listener para el evento 'click' en el contenedor del popup.
        popup.addEventListener('click', (event) => {
            // Verifica si el objetivo del clic (event.target) es el propio contenedor del popup (el fondo oscuro).
            // Si es así, significa que el clic fue fuera del contenido del popup.
            if (event.target === popup) {
                closePopup(); // Llama a la función local closePopup para cerrar el modal.
            }
        });
    }
});