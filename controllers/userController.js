// controllers/userController.js

/**
 * @file controllers/userController.js
 * @description Lógica de negocio para la gestión de usuarios (creación, inicio de sesión/verificación).
 * Utiliza el modelo `User` de Mongoose para interactuar con la base de datos MongoDB.
 */

const User = require('../models/User'); // Importa el modelo de Mongoose para los usuarios.
const bcrypt = require('bcrypt'); // Para comparar contraseñas encriptadas

// --- CONTROLADORES PARA LAS RUTAS DE USUARIOS ---

// CREAR UN NUEVO USUARIO (REGISTRO)
const createUser = async (req, res) => {
    try {
        // Extrae los datos del cuerpo de la solicitud.
        const { name, username, password, token } = req.body;

        // Validación de campos obligatorios.
        if (!name || !username || !password || !token) {
            return res.status(400).json({ message: 'Todos los campos son obligatorios, incluyendo el token de registro.' });
        }
        
        let role;
        if (token === process.env.SUPER_ADMIN_TOKEN) {
            role = 'superadmin';
        } else if (token === process.env.ADMIN_TOKEN) {
            role = 'admin';
        } else if (token === process.env.USER_TOKEN) {
            role = 'user';
        } else {
            return res.status(403).json({ message: 'Token de registro inválido.' });
        }

        // Verifica si ya existe un usuario con el mismo nombre de usuario.
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            // Si el usuario ya existe, devuelve un error de conflicto (409).
            return res.status(409).json({ message: 'El nombre de usuario ya está en uso. Por favor, elige otro.' });
        }

        // Crea una nueva instancia del modelo User con los datos proporcionados.
        // La contraseña se hasheará automáticamente gracias al pre-save hook en el modelo User.
        const newUser = new User({ name, username, password, role });
        // Guarda el nuevo usuario en la base de datos.
        await newUser.save();

        // Prepara la respuesta al cliente.
        // Convierte el objeto Mongoose a un objeto JavaScript plano.
        const userResponse = newUser.toObject();
        // Elimina el campo de la contraseña hasheada de la respuesta para no exponerla.
        delete userResponse.password;

        // Envía una respuesta de éxito (201 Created) con un mensaje y los datos del usuario creado (sin contraseña).
        res.status(201).json({ message: `Usuario "${username}" creado exitosamente con el rol: ${role}.`, user: userResponse });

    } catch (error) { // Manejo de errores generales del servidor.
        console.error('Error al intentar crear un nuevo usuario:', error);
        res.status(500).json({ message: 'Error interno del servidor al intentar registrar el usuario.' });
    }
};

// INICIO DE SESIÓN (LOGIN)
// Move jwt require to top of file for efficiency
const jwt = require('jsonwebtoken');

// INICIO DE SESIÓN (LOGIN)
const loginUser = async (req, res) => {
    try {
        const { username, password } = req.body;
        // Validación de campos obligatorios para login
        if (!username || !password) {
            return res.status(400).json({ message: 'Usuario y contraseña son obligatorios.' });
        }
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }
        const userResponse = user.toObject();
        delete userResponse.password;
        const token = jwt.sign(
            { id: user._id, username: user.username, role: user.role },
            process.env.JWT_SECRET || 'secreto_temporal_por_defecto',
            { expiresIn: '24h' }
        );
        return res.status(200).json({ user: userResponse, token });
    } catch (error) {
        console.error('Error en loginUser:', error);
        res.status(500).json({ message: 'Error interno del servidor durante el inicio de sesión.', error: error.message });
    }
};


// OBTENER USUARIOS (general: por username o todos)
// ESTA FUNCIÓN YA NO MANEJA EL LOGIN CON CONTRASEÑA POR SEGURIDAD.
const getUsers = async (req, res) => {
    try {
        const { username } = req.query; // Solo extrae `username` de los query params.

        // Si se proporciona un `username`:
        if (username) {
            // Busca un usuario por su nombre de usuario en la base de datos.
            const user = await User.findOne({ username });

            // Si se encontró el usuario, devuelve sus datos (sin contraseña)
            if (user) {
                const userResponse = user.toObject();
                delete userResponse.password;
                return res.status(200).json(userResponse);
            } else { // Si no se encontró el usuario
                return res.status(200).json(null); // Devuelve null para indicar que el usuario no existe.
            }
        }

        // Si no se proporciona `username` en los query params, se asume que se quieren obtener todos los usuarios.
        // TODO: Añadir protección de ruta si es necesario para listar todos los usuarios (solo administradores).
        const allUsers = await User.find({}).select('-password'); // Obtiene todos los usuarios, excluyendo el campo password.
        res.status(200).json(allUsers); // Devuelve la lista de todos los usuarios.

    } catch (error) { // Manejo de errores generales del servidor.
        console.error('Error al obtener usuario(s):', error);
        res.status(500).json({ message: 'Error interno del servidor al buscar usuarios.' });
    }
};

// Exporta las funciones controladoras.
module.exports = {
    createUser,
    loginUser, // <-- ¡Asegúrate de exportar la nueva función de login!
    getUsers
};