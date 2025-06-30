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
        console.log("Respuesta del backend (objeto user):", user); // Para depuración

        // Asumimos que el rol viene como user.role (todo en minúsculas)
        // según la estructura ROLES_VALIDOS que compartiste y cómo Mongoose suele devolver los campos.
        // Si en la consola ves que se llama user.ROLE (mayúsculas), ajusta user.role a user.ROLE aquí.
        if (user && user.role) {
            localStorage.setItem('userRole', user.role); // Guardar solo el rol para caseTableManager
            localStorage.setItem('user', JSON.stringify(user)); // Opcional: seguir guardando todo el objeto si lo usas en otro lado
            
            closeModal('loginModal');
            showNotification('Inicio de sesión exitoso.', 'success'); // Notificación de éxito
            
            // Redireccionar según el rol del usuario
            if (user.role === 'superadmin' || user.role === 'admin' || user.role === 'user') {
                // Todos los roles van a la misma página de home, la vista se ajustará en el frontend.
                window.location.href = '../../views/SUPERADMIN/home/home.html';
            } else {
                // Fallback o error si el rol no es reconocido
                showNotification('Rol de usuario no reconocido.', 'error');
                window.location.href = '../../index.html'; // O a la página de login
            }

        } else {
            // Esto no debería ocurrir si el login fue exitoso y el backend envía el rol
            showNotification('Error: No se pudo obtener el rol del usuario.', 'error');
            console.error("El objeto user recibido del backend no contiene un campo 'role':", user);
        }
        
    } catch (error) {
        console.error('Error en la solicitud de login:', error);
        showNotification(`Error de conexión o en la autenticación: ${error.message || 'Desconocido'}. Por favor, inténtalo más tarde.`, 'error');
    }
});