// scripts/sesion/logout.js

/**
 * @file scripts/sesion/logout.js
 * @description Maneja la funcionalidad de cierre de sesión, incluyendo la apertura
 * y gestión del modal de confirmación, la limpieza del localStorage y la redirección.
 * También incluye lógica para prevenir el acceso a páginas restringidas después de cerrar sesión
 * o mediante el uso del botón "Atrás" del navegador.
 */

// Importa funciones de utilidad y para manejar modales.
import { showNotification } from '../utils.js'; 
import { openModal, closeModal } from './auth.js'; 

// --- OBTENCIÓN DE ELEMENTOS DEL DOM ---
// Botón principal para iniciar el proceso de cierre de sesión.
const logoutButton = document.getElementById('logoutButton');
// Modal de confirmación de cierre de sesión.
const logoutConfirmModal = document.getElementById('logoutConfirmModal');
// Botón dentro del modal para confirmar el cierre de sesión.
const confirmLogoutBtn = document.getElementById('confirmLogoutBtn');

// --- CONFIGURACIÓN DE EVENT LISTENERS ---

// Event listener para el botón "Cerrar Sesión".
// Abre el modal de confirmación cuando se hace clic.
if (logoutButton) {
    logoutButton.addEventListener('click', (event) => {
        event.stopPropagation(); // Detiene la propagación del evento para evitar cierres accidentales de modal si está anidado.
        openModal('logoutConfirmModal'); // Abre el modal de confirmación.
    });
} else {
    // Advertencia si el botón de logout no se encuentra en la página actual.
    console.warn("Elemento 'logoutButton' no encontrado. El script de logout no adjuntará el listener de apertura de modal.");
}

// Event listener para el botón "Sí, cerrar sesión" dentro del modal de confirmación.
// Realiza las acciones de cierre de sesión.
if (confirmLogoutBtn) {
    confirmLogoutBtn.addEventListener('click', () => {
        // 1. Elimina la información del usuario del localStorage.
        // Esto efectivamente "cierra la sesión" en el lado del cliente.
        localStorage.removeItem('user');
        localStorage.removeItem('userRole'); // Asegurarse de limpiar también el rol.

        // 2. Muestra una notificación informativa al usuario.
        showNotification('Sesión cerrada correctamente.', 'info'); // 'info' podría ser un tipo de notificación (azul/gris).
        
        // 3. Redirige al usuario a la página de inicio de sesión/autenticación.
        // La ruta debe ser correcta y apuntar al HTML de autenticación.
        window.location.href = '../../index.html'; 
    });
} else {
    // Advertencia si el botón de confirmación de logout no se encuentra.
    console.warn("Elemento 'confirmLogoutBtn' no encontrado. El script de logout no adjuntará el listener de confirmación.");
}


// Event listener para el botón "No, quedarse" dentro del modal de confirmación.
// Simplemente cierra el modal.
const cancelLogoutBtn = logoutConfirmModal ? logoutConfirmModal.querySelector('.cancel-btn') : null;
if (cancelLogoutBtn) {
    cancelLogoutBtn.addEventListener('click', () => {
        closeModal('logoutConfirmModal'); // Cierra el modal de confirmación.
    });
}

// Event listener para el botón de cerrar (la 'X') en el modal de confirmación.
const closeLogoutModalSpan = logoutConfirmModal ? logoutConfirmModal.querySelector('.close-button') : null;
if (closeLogoutModalSpan) {
    closeLogoutModalSpan.addEventListener('click', () => {
        closeModal('logoutConfirmModal'); // Cierra el modal de confirmación.
    });
}


// --- LÓGICA DE PROTECCIÓN DE RUTAS POST-LOGOUT ---
// Esta sección intenta prevenir que un usuario acceda a páginas restringidas
// después de haber cerrado sesión, especialmente al usar el botón "Atrás" del navegador.

// Se ejecuta cuando el DOM de cualquier página que incluya este script está completamente cargado.
document.addEventListener('DOMContentLoaded', () => {
    // Verifica si existe información del usuario en localStorage.
    const user = localStorage.getItem('user');

    // Si no hay información de usuario (lo que implica que la sesión está cerrada o nunca se inició):
    if (!user) {
        // Obtiene el nombre del archivo de la página actual (ej. "home.html").
        const currentPage = window.location.pathname.split('/').pop();

        // Define una lista de páginas que se consideran restringidas y requieren inicio de sesión.
        // Es crucial que estos nombres de archivo coincidan exactamente con los archivos en `views/SUPERADMIN/`.
        const restrictedPages = ['home.html', 'casos.html', 'otc.html', 'dependencias.html', 'mapas.html', 'pdf_s.html']; 

        // Si la página actual está en la lista de páginas restringidas:
        if (restrictedPages.includes(currentPage)) {
            // Redirige al usuario a la página de autenticación.
            // `window.location.replace` se usa en lugar de `window.location.href` para
            // que la página de autenticación reemplace la entrada actual en el historial del navegador.
            // Esto evita que el usuario pueda usar el botón "Atrás" para volver a la página restringida
            // inmediatamente después de ser redirigido.
            console.log(`Usuario no logueado intentando acceder a página restringida (${currentPage}). Redirigiendo a login.`);
            window.location.replace('../../index.html'); 
        }
    }
});

// Event listener para el evento 'popstate', que se dispara cuando el historial de navegación cambia
// (ej. al usar los botones "Atrás" o "Adelante" del navegador).
// Esta es otra medida para reforzar la protección de rutas.
window.addEventListener('popstate', (event) => {
    const user = localStorage.getItem('user'); // Verifica nuevamente el estado de la sesión.
    if (!user) { // Si no hay usuario logueado:
        const currentPage = window.location.pathname.split('/').pop();
        const restrictedPages = ['home.html', 'casos.html', 'otc.html', 'dependencias.html', 'mapas.html', 'pdf_s.html'];

        // Si el cambio en el historial lleva a una página restringida, redirige a login.
        if (restrictedPages.includes(currentPage)) {
            console.log(`Navegación de historial a página restringida (${currentPage}) sin sesión. Redirigiendo a login.`);
            window.location.replace('../../index.html');
        }
    }
});
// Nota: La manipulación del historial del navegador y la caché para seguridad es compleja
// y tiene limitaciones en el lado del cliente. Las medidas más robustas para la protección de rutas
// deben implementarse en el servidor (ej. verificación de tokens de sesión en cada solicitud a rutas protegidas).
// Los encabezados HTTP como Cache-Control, Pragma, Expires (configurados en el HTML) también ayudan,
// pero su efectividad puede variar entre navegadores.