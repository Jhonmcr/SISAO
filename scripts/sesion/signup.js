// scripts/sesion/signup.js

import { showNotification } from '../utils.js'; // Importamos showNotification
import { openModal, closeModal } from './auth.js'; // Importamos openModal y closeModal

// 'notification' ya no se necesita aquí
// const notification = document.querySelector('.notification'); // Eliminar esta línea
const formC = document.getElementById('form-signup');
const nameInput = document.getElementById('signup-name');
const userInput = document.getElementById('signup-user');
const passwordInput = document.getElementById('signup-password');
const confirmPasswordInput = document.getElementById('signup-confirm-password');
const tokenInput = document.getElementById('signup-token');

let ROLES_VALIDOS = {};

// showNotification ya no se define localmente, viene de utils.js

// Función global para alternar la visibilidad de la contraseña
// Esto debe seguir siendo global para que funcione con el 'onclick' en el HTML
window.togglePasswordVisibility = function(inputId) {
    const input = document.getElementById(inputId);
    const icon = input.nextElementSibling ? input.nextElementSibling.querySelector('i') : null;

    if (input && icon) {
        if (input.type === "password") {
            input.type = "text";
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            input.type = "password";
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    }
};

// Función para cargar los tokens de rol desde el backend
async function loadRolesFromBackend() {
    try {
        const response = await fetch('http://localhost:3000/api/config');
        if (!response.ok) {
            throw new Error(`Error HTTP! estado: ${response.status} - ${response.statusText}`);
        }
        const config = await response.json();
        const tokens = config.ROLES_TOKENS;

        ROLES_VALIDOS = {
            [tokens.SUPER_ADMIN_TOKEN]: 'superadmin',
            [tokens.ADMIN_TOKEN]: 'admin',
            [tokens.USER_TOKEN]: 'user'
        };
        console.log('Roles válidos cargados:', ROLES_VALIDOS);
    } catch (error) {
        console.error("Error al cargar los roles desde el backend:", error);
        showNotification('Error al cargar la configuración de roles. Intenta recargar la página.', 'error');
    }
}

// Llama a la función para cargar los roles cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', loadRolesFromBackend);

// Evento de envío del formulario de registro
formC.addEventListener('submit', async e => {
    e.preventDefault();

    const nameValue = nameInput.value.trim();
    const userValue = userInput.value.trim();
    const passwordValue = passwordInput.value.trim();
    const confirmPasswordValue = confirmPasswordInput.value.trim();
    const tokenValue = tokenInput.value.trim();

    // 1. Validación de campos obligatorios
    if (!nameValue || !userValue || !passwordValue || !confirmPasswordValue || !tokenValue) {
        showNotification('Todos los campos son obligatorios', 'error');
        return;
    }

    // 2. Validación de confirmación de contraseña
    if (passwordValue !== confirmPasswordValue) {
        showNotification('Las contraseñas no coinciden. Por favor, verifícalas.', 'error');
        return;
    }

    // 3. Validación y asignación de rol basada en el token
    if (Object.keys(ROLES_VALIDOS).length === 0) {
        showNotification('La configuración de roles aún no se ha cargado. Intenta de nuevo en unos segundos.', 'error');
        await loadRolesFromBackend();
        if (Object.keys(ROLES_VALIDOS).length === 0) return;
    }

    const userRole = ROLES_VALIDOS[tokenValue];
    if (!userRole) {
        showNotification('Token de registro inválido. Por favor, verifica tu token.', 'error');
        return;
    }

    try {
        // 4. Verificar si el usuario ya existe
        const checkResponse = await fetch(`http://localhost:3000/users?username=${userValue}`);
        if (!checkResponse.ok) {
            const errorText = await checkResponse.text();
            throw new Error(`Error en la verificación de usuario: ${checkResponse.status} ${checkResponse.statusText}. ${errorText}`);
        }

        const existingUsers = await checkResponse.json(); // Puede devolver un array en json-server
        if (existingUsers && existingUsers.length > 0) { // Comprobar si el array no está vacío
            showNotification('El nombre de usuario ya existe. Por favor, elige otro.', 'error');
            return;
        }

        // --- PREPARAR EL OBJETO DE USUARIO PARA ENVIAR AL BACKEND ---
        const userData = {
            name: nameValue,
            username: userValue,
            password: passwordValue,
            role: userRole
        };

        // 5. Crear el usuario
        const createUserResponse = await fetch('http://localhost:3000/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });

        if (createUserResponse.ok) {
            showNotification(`¡Usuario "${userValue}" registrado como ${userRole}!`, 'success');
            // Limpiar los campos del formulario
            nameInput.value = '';
            userInput.value = '';
            passwordInput.value = '';
            confirmPasswordInput.value = '';
            tokenInput.value = '';

            // Usamos las funciones importadas closeModal y openModal
            setTimeout(() => {
                closeModal('signupModal');
                openModal('loginModal');
            }, 1500);

        } else {
            const errorData = await createUserResponse.json();
            showNotification(`Error al crear el usuario: ${errorData.message || 'Error desconocido del servidor.'}`, 'error');
        }
    } catch (error) {
        console.error("Error en la solicitud:", error);
        showNotification(`Error de conexión o en la operación: ${error.message || 'Desconocido'}. Por favor, inténtalo más tarde.`, 'error');
    }
});