// frontend_dist/scripts/config.js

/**
 * @file frontend_dist/scripts/config.js
 * @description Proporciona funciones para obtener la configuración de la aplicación desde el backend,
 * como los tokens de roles y la URL base de la API.
 */

// Variable para almacenar en caché la configuración una vez obtenida.
let apiConfigCache = null;

// Fallback para la configuración en caso de que el backend no esté disponible
const fallbackConfig = {
    ROLES_TOKENS: {
        SUPER_ADMIN_TOKEN: "super_admin_token_placeholder",
        ADMIN_TOKEN: "admin_token_placeholder",
        USER_TOKEN: "user_token_placeholder"
    },
    // CORRECCIÓN: Se actualiza la URL de respaldo para que apunte al entorno de desarrollo local.
    API_BASE_URL: "http://localhost:3000" 
};

/**
 * Obtiene la configuración completa desde el endpoint /api/config del backend.
 * Utiliza una caché simple para evitar múltiples llamadas si la configuración ya fue obtenida.
 * @async
 * @private
 * @returns {Promise<Object>} Una promesa que se resuelve con el objeto de configuración del backend.
 * @throws {Error} Si la petición al backend falla o la respuesta no es la esperada.
 */
async function _fetchApiConfig() {
    if (apiConfigCache) {
        return apiConfigCache;
    }

    // Determinar la URL del backend para /api/config dinámicamente
    let configApiUrl;
    if (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') {
        configApiUrl = 'http://localhost:3000/api/config'; // URL para desarrollo local
    } else {
        configApiUrl = 'https://gabinete5-backend.onrender.com/api/config'; // URL para producción/despliegue
    }

    try {
        const response = await fetch(configApiUrl);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error al obtener la configuración del servidor desde ${configApiUrl}: ${response.status} ${response.statusText}. ${errorText}`);
        }
        apiConfigCache = await response.json();
        if (!apiConfigCache || !apiConfigCache.ROLES_TOKENS || !apiConfigCache.API_BASE_URL) {
            console.error('Configuración inválida recibida:', apiConfigCache);
            throw new Error('La configuración recibida del servidor es inválida o incompleta.');
        }
        return apiConfigCache;
    } catch (error) {
        console.warn("[config.js] Error en _fetchApiConfig al obtener la configuración. Usando configuración de fallback.", error);
        apiConfigCache = fallbackConfig; // Usar fallback
        return apiConfigCache;
    }
}

/**
 * Obtiene los tokens de roles desde la configuración del backend.
 * @export
 * @async
 * @returns {Promise<Object>} Una promesa que se resuelve con el objeto ROLES_TOKENS.
 */
export async function getRolesTokensAsync() {
    try {
        const config = await _fetchApiConfig();
        return config.ROLES_TOKENS;
    } catch (error) {
        console.error("Error al intentar obtener los ROLES_TOKENS:", error.message);
        throw new Error("No se pudieron cargar los tokens de roles desde el backend.");
    }
}

/**
 * Obtiene la URL base de la API.
 * Para desarrollo local, devuelve directamente la URL local para asegurar la conexión correcta.
 * Para producción, obtiene la URL de la configuración del backend.
 * @export
 * @async
 * @returns {Promise<string>} Una promesa que se resuelve con la cadena de la URL base de la API.
 */
export async function getApiBaseUrlAsync() {
    // CORRECCIÓN: Se fuerza la URL local para el entorno de desarrollo para evitar
    // que la configuración de respaldo apunte a producción.
    if (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') {
        return 'http://localhost:3000';
    }
    
    try {
        const config = await _fetchApiConfig();
        if (config && config.API_BASE_URL) {
            return config.API_BASE_URL;
        } else {
            throw new Error("API_BASE_URL no encontrada en la configuración del backend.");
        }
    } catch (error) {
        console.error("[config.js] Error en getApiBaseUrlAsync:", error.message);
        // Devuelve la URL de respaldo como último recurso.
        return fallbackConfig.API_BASE_URL;
    }
}