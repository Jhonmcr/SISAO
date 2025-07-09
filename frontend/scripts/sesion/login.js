// scripts/sesion/login.js

/**
 * @file scripts/sesion/login.js
 * @description Maneja la lógica del formulario de inicio de sesión.
 * Realiza la validación de los campos, envía las credenciales al backend para autenticación,
 * y maneja la respuesta (éxito o error), guardando la información del usuario y redirigiendo
 * si el inicio de sesión es exitoso.
 */

// Importa la función para mostrar notificaciones y la función para cerrar modales.
import { showNotification } from '../utils.js'; 
import { closeModal } from './auth.js';         
import { getApiBaseUrlAsync } from '../config.js'; // Importar getApiBaseUrlAsync
import { showLoader, hideLoader } from '../loader.js'; // Importar showLoader y hideLoader

// Obtiene referencias a los elementos del DOM del formulario de inicio de sesión.
const formL = document.getElementById('form-login'); // El formulario de login.
const userInput = document.getElementById('login-user'); // Campo de entrada para el nombre de usuario.
const passwordInput = document.getElementById('login-password'); // Campo de entrada para la contraseña.

// Agrega un event listener para el evento 'submit' del formulario de inicio de sesión.
formL.addEventListener('submit', async e => {
    e.preventDefault(); // Previene el envío tradicional del formulario que recargaría la página.

    // Obtiene y recorta los valores ingresados por el usuario.
    const userValue = userInput.value.trim();
    const passwordValue = passwordInput.value.trim();

    // Validación básica: verifica que ambos campos tengan valor.
    if (!userValue || !passwordValue) {
        showNotification('Usuario y contraseña son obligatorios', 'error'); // Muestra notificación de error.
        return; // Detiene la ejecución si faltan campos.
    }

    showLoader(); // Mostrar el loader antes de la petición
    try {
        const API_BASE_URL = await getApiBaseUrlAsync();
        // Construye la URL para el endpoint de login.
        // La API_BASE_URL ya debería incluir '/api' (ej. https://gabinete5-backend.onrender.com/api)
        // Y las rutas de usuario en el backend son 'app.use('/users', userRoutes);'
        // Por lo tanto, el endpoint de login será /users/login
        const loginUrl = `${API_BASE_URL}/users/login`; // <-- ¡CAMBIO AQUÍ!

        // Realiza una petición fetch al backend para autenticar al usuario.
        // Ahora usa POST y envía los datos en el cuerpo de la solicitud.
        const response = await fetch(loginUrl, { // <-- CAMBIO AQUÍ!
            method: 'POST', // <-- CAMBIO DE MÉTODO A POST
            headers: {
                'Content-Type': 'application/json' // <-- INDICA QUE ESTÁS ENVIANDO JSON
            },
            body: JSON.stringify({ // <-- ENVÍA LOS DATOS EN FORMATO JSON EN EL CUERPO
                username: userValue,
                password: passwordValue
            })
        });

        // MANEJO DE RESPUESTAS DEL SERVIDOR:
        // Primero, se manejan los errores específicos conocidos.

        // Si el backend responde con estado 401 (No Autorizado), indica credenciales incorrectas.
        if (response.status === 401 || response.status === 400) { // <-- También maneja 400 por campos obligatorios
            const errorData = await response.json(); 
            showNotification(errorData.message || 'Usuario o contraseña incorrectos.', 'error');
            return; 
        }

        // Si la respuesta no es OK (ej. error 500 del servidor u otros errores HTTP).
        if (!response.ok) {
            const errorText = await response.text(); 
            showNotification(`Error del servidor: ${response.status} ${response.statusText}. ${errorText}`, 'error');
            return; 
        }

        // PROCESAMIENTO DE RESPUESTA EXITOSA (200 OK):
        const user = await response.json(); 

        // Si 'user' es null o undefined, significa que el nombre de usuario no fue encontrado (aunque con 401/400 ya lo manejamos).
        // Este if(!user) ya no debería ser necesario si el backend maneja bien el 401/400
        if (!user) { 
            showNotification('Error inesperado: No se recibió información de usuario.', 'error'); // Mensaje más genérico
            return; 
        }

        // Si se llega a este punto, el usuario fue encontrado y la contraseña coincidió.
        //console.log("Respuesta del backend (objeto user):", user); 

        // Verifica que el objeto 'user' devuelto por el backend contenga la propiedad 'role'.
        if (user && user.role) {
            localStorage.setItem('userRole', user.role); 
            localStorage.setItem('user', JSON.stringify(user)); 
            
            closeModal('loginModal'); 
            showNotification('Inicio de sesión exitoso.', 'success'); 
            
            if (user.role === 'superadmin' || user.role === 'admin' || user.role === 'user') {
                window.location.href = 'views/SUPERADMIN/home/home.html';
            } else {
                showNotification('Rol de usuario no reconocido.', 'error');
                window.location.href = 'index.html'; 
            }

        } else {
            showNotification('Error: No se pudo obtener el rol del usuario desde el servidor.', 'error');
            console.error("El objeto 'user' recibido del backend no contiene un campo 'role' válido:", user);
        }
        
    } catch (error) {
        console.error('Error en la solicitud de login:', error);
        showNotification(`Error de conexión o en la autenticación: ${error.message || 'Desconocido'}. Por favor, inténtalo más tarde.`, 'error');
    } finally {
        hideLoader(); // Ocultar el loader independientemente del resultado
    }
});