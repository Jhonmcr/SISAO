// scripts/sesion/signup.js

/**
 * @file scripts/sesion/signup.js
 * @description Maneja la lógica del formulario de registro de nuevos usuarios.
 * Incluye la carga de tokens de roles desde el backend, validación de campos,
 * verificación de existencia de usuario, y envío de datos para la creación del nuevo usuario.
 */

// Importa funciones de utilidad y para manejar modales.
import { showNotification } from '../utils.js'; 
import { openModal, closeModal } from './auth.js'; 

// OBTENCIÓN DE ELEMENTOS DEL DOM
// Referencias a los elementos del formulario de registro.
const formC = document.getElementById('form-signup'); // Formulario de registro.
const nameInput = document.getElementById('signup-name'); // Campo para el nombre completo.
const userInput = document.getElementById('signup-user'); // Campo para el nombre de usuario.
const passwordInput = document.getElementById('signup-password'); // Campo para la contraseña.
const confirmPasswordInput = document.getElementById('signup-confirm-password'); // Campo para confirmar contraseña.
const tokenInput = document.getElementById('signup-token'); // Campo para el token de registro que define el rol.

// Objeto para almacenar los tokens de roles válidos cargados desde el backend.
// La clave será el token y el valor será el nombre del rol (ej. 'superadmin', 'admin', 'user').
let ROLES_VALIDOS = {};

// La función showNotification se importa de utils.js, por lo que no se define localmente.

/**
 * Función global para alternar la visibilidad de los campos de contraseña.
 * Cambia el tipo de input entre 'password' y 'text', y actualiza el icono del ojo.
 * Se asigna a `window` para ser accesible desde atributos `onclick` en el HTML.
 * @param {string} inputId - El ID del campo de contraseña cuyo tipo se va a alternar.
 */
window.togglePasswordVisibility = function(inputId) {
    const input = document.getElementById(inputId); // Obtiene el campo de contraseña.
    // Obtiene el icono (<i>) que está dentro del siguiente elemento hermano (<span>) del input.
    const icon = input.nextElementSibling ? input.nextElementSibling.querySelector('i') : null;

    if (input && icon) { // Verifica que tanto el input como el icono existan.
        if (input.type === "password") { // Si la contraseña está oculta:
            input.type = "text"; // Cambia el tipo a texto para mostrarla.
            icon.classList.remove('fa-eye'); // Quita la clase del icono de ojo cerrado.
            icon.classList.add('fa-eye-slash'); // Añade la clase del icono de ojo abierto.
        } else { // Si la contraseña está visible:
            input.type = "password"; // Cambia el tipo a password para ocultarla.
            icon.classList.remove('fa-eye-slash'); // Quita la clase del icono de ojo abierto.
            icon.classList.add('fa-eye'); // Añade la clase del icono de ojo cerrado.
        }
    }
};

/**
 * Carga los tokens de roles y sus correspondientes nombres de rol desde un endpoint de configuración del backend.
 * Almacena esta información en la variable global `ROLES_VALIDOS`.
 * Esta función se ejecuta al cargar el DOM.
 * @async
 */
async function loadRolesFromBackend() {
    try {
        // Petición al backend para obtener la configuración (que incluye los tokens de roles).
        const response = await fetch('http://localhost:3000/api/config');
        if (!response.ok) { // Manejo de errores de la petición.
            throw new Error(`Error HTTP! estado: ${response.status} - ${response.statusText}`);
        }
        const config = await response.json(); // Parsea la respuesta JSON.
        const tokens = config.ROLES_TOKENS; // Obtiene el objeto de tokens desde la configuración.

        // Crea el mapeo de token a nombre de rol.
        ROLES_VALIDOS = {
            [tokens.SUPER_ADMIN_TOKEN]: 'superadmin',
            [tokens.ADMIN_TOKEN]: 'admin',
            [tokens.USER_TOKEN]: 'user'
        };
        console.log('Configuración de roles y tokens cargada exitosamente desde el backend:', ROLES_VALIDOS);
    } catch (error) {
        console.error("Error crítico al cargar la configuración de roles desde el backend:", error);
        // Muestra una notificación al usuario indicando que la carga de configuración falló.
        // Esto es importante porque el registro de usuarios depende de esta configuración.
        showNotification('Error al cargar la configuración de roles. El registro podría no funcionar. Intenta recargar la página.', 'error');
    }
}

// Event Listener: Ejecuta loadRolesFromBackend cuando el DOM está completamente cargado.
document.addEventListener('DOMContentLoaded', loadRolesFromBackend);

// Event Listener para el envío del formulario de registro.
formC.addEventListener('submit', async e => {
    e.preventDefault(); // Previene el envío tradicional del formulario.

    // Obtiene y recorta los valores de los campos del formulario.
    const nameValue = nameInput.value.trim();
    const userValue = userInput.value.trim();
    const passwordValue = passwordInput.value.trim();
    const confirmPasswordValue = confirmPasswordInput.value.trim();
    const tokenValue = tokenInput.value.trim();

    // 1. Validación: Todos los campos son obligatorios.
    if (!nameValue || !userValue || !passwordValue || !confirmPasswordValue || !tokenValue) {
        showNotification('Todos los campos son obligatorios para el registro.', 'error');
        return;
    }

    // 2. Validación: Las contraseñas deben coincidir.
    if (passwordValue !== confirmPasswordValue) {
        showNotification('Las contraseñas no coinciden. Por favor, verifícalas.', 'error');
        return;
    }

    // 3. Validación y asignación de rol basada en el token.
    // Verifica si la configuración de roles se ha cargado.
    if (Object.keys(ROLES_VALIDOS).length === 0) {
        showNotification('La configuración de roles aún no está disponible. Intentando recargar...', 'error');
        // Intenta cargar los roles nuevamente si no se cargaron al inicio.
        await loadRolesFromBackend(); 
        // Si después de reintentar sigue sin cargarse, detiene el proceso.
        if (Object.keys(ROLES_VALIDOS).length === 0) {
            showNotification('No se pudo cargar la configuración de roles. El registro no puede continuar.', 'error');
            return;
        }
    }

    // Obtiene el nombre del rol correspondiente al token ingresado.
    const userRole = ROLES_VALIDOS[tokenValue];
    if (!userRole) { // Si el token no es válido (no corresponde a ningún rol).
        showNotification('Token de registro inválido. Por favor, verifica el token proporcionado.', 'error');
        return;
    }

    try {
        // 4. Verificar si el nombre de usuario ya existe en la base de datos.
        // Se hace una petición GET al endpoint de usuarios filtrando por el nombre de usuario.
        // json-server devuelve un array, incluso si solo hay un resultado o ninguno.
        const checkResponse = await fetch(`http://localhost:3000/users?username=${userValue}`);
        if (!checkResponse.ok) { // Manejo de errores de la petición de verificación.
            const errorText = await checkResponse.text();
            throw new Error(`Error durante la verificación de existencia del usuario: ${checkResponse.status} ${checkResponse.statusText}. ${errorText}`);
        }

        const existingUsers = await checkResponse.json(); // Parsea la respuesta (espera un array).
        // Si el array no está vacío, significa que ya existe un usuario con ese nombre.
        if (existingUsers && existingUsers.length > 0) { 
            showNotification('El nombre de usuario ya existe. Por favor, elige otro.', 'error');
            return;
        }

        // --- PREPARACIÓN DEL OBJETO DE USUARIO PARA ENVIAR AL BACKEND ---
        // Crea el objeto con los datos del nuevo usuario.
        const userData = {
            name: nameValue,
            username: userValue,
            password: passwordValue, // La contraseña se envía en texto plano. El backend debería encargarse de hashearla.
            role: userRole // Rol asignado según el token.
        };

        // 5. Crear el nuevo usuario mediante una petición POST al backend.
        const createUserResponse = await fetch('http://localhost:3000/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json' // Indica que el cuerpo de la petición es JSON.
            },
            body: JSON.stringify(userData) // Convierte el objeto userData a una cadena JSON.
        });

        // Procesa la respuesta del backend.
        if (createUserResponse.ok) { // Si la creación fue exitosa (status 2xx).
            showNotification(`¡Usuario "${userValue}" registrado exitosamente como ${userRole}!`, 'success');
            // Limpia los campos del formulario.
            nameInput.value = '';
            userInput.value = '';
            passwordInput.value = '';
            confirmPasswordInput.value = '';
            tokenInput.value = '';

            // Cierra el modal de registro y abre el modal de inicio de sesión después de un breve retardo.
            // Esto guía al usuario a iniciar sesión después de un registro exitoso.
            setTimeout(() => {
                closeModal('signupModal'); // Cierra el modal de registro.
                openModal('loginModal');   // Abre el modal de inicio de sesión.
            }, 1500); // Retardo de 1.5 segundos.

        } else { // Si hubo un error al crear el usuario en el backend.
            const errorData = await createUserResponse.json(); // Intenta obtener un mensaje de error del backend.
            showNotification(`Error al crear el usuario: ${errorData.message || 'Error desconocido del servidor.'}`, 'error');
        }
    } catch (error) { // Captura errores de red o excepciones generales.
        console.error("Error en la solicitud de registro:", error);
        showNotification(`Error de conexión o en la operación: ${error.message || 'Desconocido'}. Por favor, inténtalo más tarde.`, 'error');
    }
});