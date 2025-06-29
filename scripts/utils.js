// scripts/utils.js

/**
 * Muestra una notificación en la interfaz de usuario.
 * @param {string} message - El mensaje a mostrar.
 * @param {boolean} isError - Si es true, la notificación se muestra como un error.
 */
export function showNotification(message, isError = false) {
    const notificationElement = document.querySelector('.notification');
    if (notificationElement) {
        notificationElement.textContent = message;
        notificationElement.className = 'notification ' + (isError ? 'error' : 'success');
        notificationElement.style.display = 'block'; // Asegurarse de que esté visible

        // Ocultar después de unos segundos
        setTimeout(() => {
            notificationElement.style.display = 'none';
        }, 5000);
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

/**
 * Obtiene el nombre de usuario del usuario logueado desde localStorage.
 * @returns {string|null} El nombre de usuario o null si no hay sesión.
 */
export function getLoggedInUsername() {
    try {
        // Asumiendo que el objeto de usuario se guarda como 'user' y tiene una propiedad 'username'
        const userData = localStorage.getItem('user');
        if (userData) {
            const user = JSON.parse(userData);
            return user ? user.username : null;
        }
        return null;
    } catch (e) {
        console.error("Error al parsear el usuario de localStorage:", e);
        return null;
    }
}