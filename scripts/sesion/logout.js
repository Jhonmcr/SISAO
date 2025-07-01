// scripts/sesion/logout.js

import { showNotification } from '../utils.js'; // Importamos showNotification
import { openModal, closeModal } from './auth.js'; // Importamos openModal y closeModal

// --- Elementos del DOM ---
const logoutButton = document.getElementById('logoutButton');
const logoutConfirmModal = document.getElementById('logoutConfirmModal');
const confirmLogoutBtn = document.getElementById('confirmLogoutBtn');

// --- Event Listeners ---

// Abre el popup de confirmación al hacer clic en el botón "Cerrar Sesión"
if (logoutButton) {
    logoutButton.addEventListener('click', (event) => {
        event.stopPropagation(); // DETENER LA PROPAGACIÓN DEL EVENTO
        openModal('logoutConfirmModal'); // Usa la función importada openModal
    });
} else {
    console.warn("Elemento 'logoutButton' no encontrado. El script de logout no adjuntará el listener.");
}

// Lógica para cerrar sesión cuando se confirma en el popup
if (confirmLogoutBtn) {
    confirmLogoutBtn.addEventListener('click', () => {
        // 1. Elimina el usuario del localStorage
        localStorage.removeItem('user');

        // 2. Muestra notificación y redirige
        showNotification('Sesión cerrada correctamente.', 'info'); // Usa la función importada showNotification
        
        window.location.href = '../../login-signup/auth.html'; // Asegúrate que esta ruta es correcta
    });
} else {
    console.warn("Elemento 'confirmLogoutBtn' no encontrado. El script de logout no adjuntará el listener.");
}


// Lógica para cerrar el modal de confirmación con el botón "No, quedarse"
const cancelLogoutBtn = logoutConfirmModal ? logoutConfirmModal.querySelector('.cancel-btn') : null;
if (cancelLogoutBtn) {
    cancelLogoutBtn.addEventListener('click', () => {
        closeModal('logoutConfirmModal'); // Usa la función importada closeModal
    });
}

// Lógica para cerrar el modal de confirmación con el span "x"
const closeLogoutModalSpan = logoutConfirmModal ? logoutConfirmModal.querySelector('.close-button') : null;
if (closeLogoutModalSpan) {
    closeLogoutModalSpan.addEventListener('click', () => {
        closeModal('logoutConfirmModal'); // Usa la función importada closeModal
    });
}


// --- Lógica para evitar el acceso con el botón "Atrás" después de cerrar sesión ---

// Esto se ejecuta cada vez que la página se carga o se navega hacia ella
document.addEventListener('DOMContentLoaded', () => {
    // Verifica si hay un usuario en localStorage
    const user = localStorage.getItem('user');

    // Si no hay usuario (sesión cerrada) Y la URL actual es una página restringida (ej. home.html)
    // Entonces, redirige al usuario a la página de login.
    // Esto es crucial para manejar el botón "Atrás" del navegador.
    if (!user) {
        // Obtenemos el nombre de la página actual
        const currentPage = window.location.pathname.split('/').pop();

        // Lista de páginas que deberían ser restringidas (donde el usuario debe estar logueado)
        // Asegúrate de que estos nombres de archivo coincidan exactamente con los archivos en views/SUPERADMIN/
        const restrictedPages = ['home.html', 'casos.html', 'otc.html', 'dependencias.html', 'mapas.html', 'pdf_s.html']; 

        if (restrictedPages.includes(currentPage)) {
            // Usa replace() en lugar de href = para que la página de login
            // no se añada al historial del navegador y no puedan volver a la página restringida
            // con el botón "Atrás" inmediatamente después de la redirección.
            window.location.replace('../../login-signup/auth.html'); // Asegúrate que esta ruta es correcta
        }
    }
});

// Otra medida de seguridad para el historial del navegador:
// Evita que la página restringida se guarde en la caché del navegador.
// Esto es más un estándar de seguridad de encabezado HTTP,
// pero a nivel de cliente se puede forzar en algunos casos.
// Para una seguridad robusta, esto debería manejarse en el servidor.
window.addEventListener('popstate', (event) => {
    // Esto se dispara cuando el historial del navegador cambia (ej. botón atrás/adelante)
    const user = localStorage.getItem('user');
    if (!user) {
        // Si el usuario no está logueado y están intentando navegar hacia atrás a una página restringida,
        // simplemente redirige de nuevo al login.
        const currentPage = window.location.pathname.split('/').pop();
        // Asegúrate de que estos nombres de archivo coincidan exactamente con los archivos en views/SUPERADMIN/
        const restrictedPages = ['home.html', 'casos.html', 'otc.html', 'dependencias.html', 'mapas.html', 'pdf_s.html']; // MISMA LISTA ACTUALIZADA

        if (restrictedPages.includes(currentPage)) {
            window.location.replace('../../login-signup/auth.html');
        }
    }
});