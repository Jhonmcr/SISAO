// scripts/sesion/auth.js

// Función para abrir un modal (simplificada)
export function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex'; // Hacerlo 'flex' para que ocupe espacio
        void modal.offsetHeight; // Forzar reflow para que la transición se aplique
        setTimeout(() => { // Pequeño delay para asegurar que la transición de opacidad/transform ocurra
            modal.classList.add('show-modal');
        }, 10); // Un pequeño delay es usualmente suficiente
    }
}

// Función para cerrar un modal
export function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show-modal'); // Iniciar transición de salida
        setTimeout(() => {
            modal.style.display = 'none'; // Ocultar después de la transición
        }, 300); // Coincidir con la transición de opacidad de .modal en auth.css (0.3s)
    }
}

// Cierra el modal si se hace clic fuera del contenido del modal
export function closeModalsOnClickOutside(event) {
    // Only close if the click directly targets a modal background (the div with class 'modal')
    if (event.target.classList.contains('modal')) {
        closeModal(event.target.id);
    }
}

// Hacemos las funciones accesibles globalmente para que el HTML y otros scripts puedan llamarlas directamente
// Esto es necesario para los 'onclick' directamente en el HTML de auth.html
window.openModal = openModal;
window.closeModal = closeModal;
// Aunque esta línea funciona, es mejor manejar el clic en el documento en el DOMContentLoaded
// window.onclick = closeModalsOnClickOutside;
document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('click', closeModalsOnClickOutside);
});