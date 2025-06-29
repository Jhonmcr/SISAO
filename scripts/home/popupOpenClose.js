// scripts/home/popupOpenClose.js

// Función para abrir el popup de agregar caso
function openPopup() {
    // Usa la función global openModal si está disponible
    if (typeof window.openModal === 'function') {
        window.openModal('popup');
    } else {
        console.warn("window.openModal no está definida. Abriendo popup directamente.");
        const popup = document.getElementById('popup');
        if (popup) popup.style.display = 'flex';
    }
}

// Función para cerrar el popup de agregar caso
function closePopup() {
    // Usa la función global closeModal si está disponible
    if (typeof window.closeModal === 'function') {
        window.closeModal('popup');
    } else {
        console.warn("window.closeModal no está definida. Cerrando popup directamente.");
        const popup = document.getElementById('popup');
        if (popup) popup.style.display = 'none';
    }
}

// Exponer globalmente para los onclick en HTML
window.openPopup = openPopup;
window.closePopup = closePopup;

// Event listener para cerrar el popup al hacer clic fuera de su contenido
document.addEventListener('DOMContentLoaded', () => {
    const popup = document.getElementById('popup');
    if (popup) {
        popup.addEventListener('click', (event) => {
            if (event.target === popup) {
                closePopup(); // Llama a la función local que usa window.closeModal
            }
        });
    }
});