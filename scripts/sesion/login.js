// scripts/sesion/login.js

import { showNotification } from '../utils.js'; // Importamos showNotification
import { closeModal } from './auth.js';     // Importamos closeModal

const formL = document.getElementById('form-login');
const userInput = document.getElementById('login-user');
const passwordInput = document.getElementById('login-password');

// Evento de envío del formulario de login
formL.addEventListener('submit', async e => {
    e.preventDefault();

    const userValue = userInput.value.trim();
    const passwordValue = passwordInput.value.trim();

    if (!userValue || !passwordValue) {
        showNotification('Usuario y contraseña son obligatorios', 'error');
        return;
    }

    try {
        // La solicitud fetch permanece igual
        const response = await fetch(`http://localhost:3000/users?username=${userValue}&password=${passwordValue}`);

        // --- IMPORTANTE: Maneja las respuestas que NO son 200 OK PRIMERO ---
        // Tu backend envía 401 para contraseña incorrecta
        if (response.status === 401) {
            const errorData = await response.json(); // Espera { message: 'Contraseña incorrecta.' }
            showNotification(errorData.message || 'Usuario o contraseña incorrectos.', 'error');
            return;
        }

        // Maneja otros estados que no son OK (ej. 500 del bloque catch del backend)
        if (!response.ok) {
            const errorText = await response.text();
            showNotification(`Error del servidor: ${response.status} ${response.statusText}. ${errorText}`, 'error');
            return;
        }

        // --- Procesa una respuesta 200 OK exitosa ---
        // Tu backend devuelve directamente el objeto de usuario o null.
        // Así que, ya no esperamos un array.
        const user = await response.json(); // Esto será el objeto de usuario o null directamente

        if (!user) { // Si 'user' es null, significa que no se encontró ningún usuario con el nombre de usuario dado
            showNotification('Usuario no encontrado. Verifica el nombre de usuario.', 'error');
            return;
        }

        // Si llegamos aquí, significa que el usuario fue encontrado y la contraseña coincidió.
        localStorage.setItem('user', JSON.stringify(user));
        
        closeModal('loginModal');
        
        window.location.href = '../../views/SUPERADMIN/home/home.html'; // Redirecciona a la página de inicio
    } catch (error) {
        console.error('Error en la solicitud de login:', error);
        showNotification(`Error de conexión o en la autenticación: ${error.message || 'Desconocido'}. Por favor, inténtalo más tarde.`, 'error');
    }
});