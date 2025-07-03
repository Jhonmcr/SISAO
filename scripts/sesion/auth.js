// scripts/sesion/auth.js

/**
 * @file scripts/sesion/auth.js
 * @description Este script maneja la lógica básica para abrir y cerrar modales (popups)
 * utilizados en la página de autenticación (auth.html), como los modales de inicio de sesión y registro.
 * También incluye una funcionalidad para cerrar los modales al hacer clic fuera de su contenido.
 */

/**
 * Abre un modal específico identificado por su ID.
 * Cambia el estilo `display` del modal a 'flex' para hacerlo visible y
 * añade la clase 'show-modal' para activar animaciones CSS de entrada.
 * 
 * @export
 * @param {string} modalId - El ID del elemento HTML del modal que se va a abrir.
 */
export function openModal(modalId) {
    const modal = document.getElementById(modalId); // Obtiene el elemento del modal.
    if (modal) { // Verifica que el modal exista.
        modal.style.display = 'flex'; // Establece display a 'flex' para mostrarlo y permitir centrado.
        
        // Forzar un reflujo (reflow) del DOM. Esto es un truco para asegurar que el navegador 
        // procese el cambio de `display` antes de añadir la clase para la transición.
        // Sin esto, la transición de opacidad/transformación podría no ejecutarse correctamente
        // si el modal estaba previamente en `display: none`.
        void modal.offsetHeight; 
        
        // Añade la clase 'show-modal' después de un breve retardo.
        // Este retardo (10ms) da tiempo al navegador para aplicar el `display: flex`
        // y luego iniciar la transición definida por 'show-modal' en el CSS.
        setTimeout(() => { 
            modal.classList.add('show-modal');
        }, 10); 
    }
}

/**
 * Cierra un modal específico identificado por su ID.
 * Remueve la clase 'show-modal' para activar animaciones CSS de salida y,
 * después de un retardo (que debe coincidir con la duración de la animación),
 * cambia el estilo `display` del modal a 'none' para ocultarlo completamente.
 * 
 * @export
 * @param {string} modalId - El ID del elemento HTML del modal que se va a cerrar.
 */
export function closeModal(modalId) {
    const modal = document.getElementById(modalId); // Obtiene el elemento del modal.
    if (modal) { // Verifica que el modal exista.
        modal.classList.remove('show-modal'); // Quita la clase para iniciar la animación de salida (ej. fade-out).
        
        // Establece un temporizador para cambiar `display: none` después de que la animación de salida haya terminado.
        // La duración (300ms) debe coincidir con la duración de la transición CSS (ej. `transition: opacity 0.3s`).
        setTimeout(() => {
            modal.style.display = 'none'; // Oculta completamente el modal.
        }, 300); 
    }
}

/**
 * Cierra un modal si el usuario hace clic directamente en el fondo del modal (fuera del contenido del modal).
 * Esta función se usa como un event listener para clics en el documento.
 * 
 * @export
 * @param {MouseEvent} event - El objeto del evento de clic.
 */
export function closeModalsOnClickOutside(event) {
    // Verifica si el elemento que originó el clic (event.target) tiene la clase 'modal'.
    // Esto implica que el clic fue en el overlay de fondo del modal, no en su contenido interno.
    if (event.target.classList.contains('modal')) {
        closeModal(event.target.id); // Cierra el modal usando su ID.
    }
}

// EXPOSICIÓN GLOBAL DE FUNCIONES (para compatibilidad con `onclick` en HTML)
// Asigna las funciones openModal y closeModal al objeto `window` para que puedan ser
// llamadas directamente desde atributos `onclick` en los elementos HTML de `auth.html`.
// Aunque es una práctica común, para proyectos más grandes o mantenibles,
// se preferiría adjuntar event listeners directamente desde JavaScript en lugar de usar `onclick`.
window.openModal = openModal;
window.closeModal = closeModal;

// EVENT LISTENER PARA CIERRE DE MODAL AL HACER CLIC FUERA
// Se ejecuta cuando el DOM está completamente cargado.
// Añade un event listener al documento para detectar clics.
// Si el clic ocurre fuera del contenido de un modal (en su fondo), el modal se cierra.
document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('click', closeModalsOnClickOutside);
});