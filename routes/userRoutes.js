// routes/userRoutes.js

/**
 * @file routes/userRoutes.js
 * @description Define las rutas para la gestión de usuarios (creación, inicio de sesión/verificación).
 * Utiliza el userController para manejar la lógica de negocio.
 */

const express = require('express'); // Importa Express.
const router = express.Router(); // Crea un nuevo objeto router de Express.
const userController = require('../controllers/userController'); // Importa el controlador de usuarios.

// --- RUTA PARA CREAR UN NUEVO USUARIO (REGISTRO) ---
// Método: POST
// Endpoint: /users
// Body esperado: { name, username, password, role }
router.post('/', userController.createUser);

// --- RUTA PARA OBTENER USUARIOS (VERIFICACIÓN DE EXISTENCIA O INICIO DE SESIÓN) ---
// Método: POST
// Endpoint: /users
// Query Params opcionales:
//   - `username`: Para buscar un usuario específico por su nombre de usuario.
//   - `password`: Si se proporciona junto con `username`, intenta verificar la contraseña para un inicio de sesión.
// Si no se proporcionan query params, devuelve todos los usuarios (sin sus contraseñas).
router.post('/login', userController.loginUser);

// --- RUTA PARA VERIFICAR SI UN USUARIO EXISTE (POR USERNAME) O LISTAR TODOS LOS USUARIOS ---
// Método: GET
// Endpoint: /users
// Query Params opcionales:
//   - `username`: Para buscar un usuario específico por su nombre de usuario.
// Si no se proporciona `username`, devuelve todos los usuarios.
router.get('/', userController.getUsers);

// Exporta el router para que pueda ser usado en `index.js` (o el archivo principal de la aplicación).
module.exports = router;