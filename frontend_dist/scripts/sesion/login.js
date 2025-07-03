// scripts/sesion/login.js

/**
 * @file scripts/sesion/login.js
 * @description Maneja la lógica del formulario de inicio de sesión.
 * Realiza la validación de los campos, envía las credenciales al backend para autenticación,
 * y maneja la respuesta (éxito o error), guardando la información del usuario y redirigiendo
 * si el inicio de sesión es exitoso.
 */

// Importa la función para mostrar notificaciones y la función para cerrar modales.
import { showNotification } from '../../../scripts/utils.js'; 
import { closeModal } from './auth.js';         
import { getApiBaseUrlAsync } from '../../../scripts/config.js'; // Importar getApiBaseUrlAsync

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

    try {
        const API_BASE_URL = await getApiBaseUrlAsync();
        // Realiza una petición fetch al backend para autenticar al usuario.
        // Envía el nombre de usuario y contraseña como parámetros en la URL (GET request).
        // NOTA: Para mayor seguridad, especialmente con contraseñas, se recomienda usar POST y enviar datos en el cuerpo.
        // Sin embargo, esto depende de cómo esté configurado el endpoint del backend.
        const response = await fetch(`${API_BASE_URL}/users?username=${userValue}&password=${passwordValue}`);

        // MANEJO DE RESPUESTAS DEL SERVIDOR:
        // Primero, se manejan los errores específicos conocidos.

        // Si el backend responde con estado 401 (No Autorizado), indica contraseña incorrecta.
        if (response.status === 401) {
            const errorData = await response.json(); // El backend debería enviar un mensaje de error en JSON.
            showNotification(errorData.message || 'Usuario o contraseña incorrectos.', 'error');
            return; // Detiene la ejecución.
        }

        // Si la respuesta no es OK (ej. error 500 del servidor u otros errores HTTP).
        if (!response.ok) {
            const errorText = await response.text(); // Intenta obtener texto del error si no es JSON.
            showNotification(`Error del servidor: ${response.status} ${response.statusText}. ${errorText}`, 'error');
            return; // Detiene la ejecución.
        }

        // PROCESAMIENTO DE RESPUESTA EXITOSA (200 OK):
        // El backend (según la lógica previa) devuelve directamente el objeto del usuario o null.
        const user = await response.json(); 

        // Si 'user' es null, significa que el nombre de usuario no fue encontrado en la base de datos.
        if (!user) { 
            showNotification('Usuario no encontrado. Verifica el nombre de usuario.', 'error');
            return; // Detiene la ejecución.
        }

        // Si se llega a este punto, el usuario fue encontrado y la contraseña coincidió.
        console.log("Respuesta del backend (objeto user):", user); // Para depuración.

        // Verifica que el objeto 'user' devuelto por el backend contenga la propiedad 'role'.
        // Se asume que el rol viene como `user.role` (todo en minúsculas).
        if (user && user.role) {
            // Guarda el rol del usuario y el objeto de usuario completo en localStorage.
            // `userRole` se usa en `caseTableManager.js` para controlar visibilidad de acciones.
            // `user` completo puede ser usado por otras partes de la aplicación.
            localStorage.setItem('userRole', user.role); 
            localStorage.setItem('user', JSON.stringify(user)); 
            
            closeModal('loginModal'); // Cierra el modal de inicio de sesión.
            showNotification('Inicio de sesión exitoso.', 'success'); // Notificación de éxito.
            
            // Redirecciona al usuario a la página de inicio (home.html).
            // La lógica para mostrar contenido diferente según el rol se maneja en el frontend de home.html.
            if (user.role === 'superadmin' || user.role === 'admin' || user.role === 'user') {
                window.location.href = '../../views/SUPERADMIN/home/home.html';
            } else {
                // Fallback si el rol no es uno de los esperados, aunque esto no debería ocurrir
                // si el backend valida los roles correctamente.
                showNotification('Rol de usuario no reconocido.', 'error');
                window.location.href = '../../index.html'; // Redirige a la página principal o de login.
            }

        } else {
            // Este caso no debería ocurrir si el login fue exitoso y el backend siempre devuelve el rol.
            // Indica un problema con los datos recibidos del backend.
            showNotification('Error: No se pudo obtener el rol del usuario desde el servidor.', 'error');
            console.error("El objeto 'user' recibido del backend no contiene un campo 'role' válido:", user);
        }
        
    } catch (error) {
        // Captura errores de red (ej. servidor no disponible) o errores al procesar la respuesta.
        console.error('Error en la solicitud de login:', error);
        showNotification(`Error de conexión o en la autenticación: ${error.message || 'Desconocido'}. Por favor, inténtalo más tarde.`, 'error');
    }
});