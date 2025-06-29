// scripts/sesion/auth.js

// Función para abrir un modal
export function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex'; // Make modal background visible
        setTimeout(() => {
            modal.classList.add('show-modal');
        }, 10);
    }
}

// Función para cerrar un modal
export function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show-modal'); // Start exit transition
        setTimeout(() => {
            modal.style.display = 'none';
        }, 500); // 500ms matches CSS transition duration
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