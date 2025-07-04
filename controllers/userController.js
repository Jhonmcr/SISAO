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
        const { name, username, password, role } = req.body;

        // Validación de campos obligatorios.
        if (!name || !username || !password || !role) {
            return res.status(400).json({ message: 'Todos los campos (nombre, username, password, role) son obligatorios.' });
        }
        // Validación del rol (debe ser uno de los predefinidos).
        if (!['superadmin', 'admin', 'user'].includes(role)) {
            return res.status(400).json({ message: 'El rol proporcionado no es válido.' });
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

exports.loginUser = async (req, res) => {
    try {
        const { username, password } = req.body; // Acceder a los datos del cuerpo (POST)

        if (!username || !password) {
            return res.status(400).json({ message: 'Usuario y contraseña son obligatorios.' });
        }

        const user = await User.findOne({ username });
        if (!user) {
            // No se debe decir si fue el usuario o la contraseña para seguridad
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        // Comparar la contraseña ingresada con la contraseña hasheada en la base de datos
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        // Si las credenciales son correctas, puedes enviar los datos del usuario (sin password)
        // y quizás un token JWT aquí.
        const userWithoutPassword = user.toObject();
        delete userWithoutPassword.password; // Eliminar la contraseña antes de enviar

        res.status(200).json(userWithoutPassword);

    } catch (error) {
        console.error('Error en el login:', error);
        res.status(500).json({ message: 'Error interno del servidor durante el login.' });
    }
};

// OBTENER USUARIOS (VERIFICACIÓN DE EXISTENCIA O INICIO DE SESIÓN)..................................
/* const getUsers = async (req, res) => {
    try {
        const { username, password } = req.query; // Extrae `username` y `password` de los query params.

        // Si se proporciona un `username`:
        if (username) {
            // Busca un usuario por su nombre de usuario en la base de datos.
            const user = await User.findOne({ username });

            // Si también se proporciona una `password` (intento de inicio de sesión) Y se encontró el usuario:
            if (password && user) {
                // Compara la contraseña proporcionada con la contraseña hasheada almacenada.
                // `comparePassword` es un método definido en el schema de User (usando bcrypt).
                const isMatch = await user.comparePassword(password);
                if (isMatch) { // Si las contraseñas coinciden (inicio de sesión exitoso).
                    const userResponse = user.toObject(); // Prepara la respuesta.
                    delete userResponse.password; // Elimina la contraseña.
                    return res.status(200).json(userResponse); // Devuelve los datos del usuario.
                } else { // Si las contraseñas no coinciden.
                    return res.status(401).json({ message: 'Contraseña incorrecta.' }); // Error de no autorizado.
                }
            } else if (user) { // Si solo se proporcionó `username` y se encontró el usuario (verificación de existencia).
                const userResponse = user.toObject();
                delete userResponse.password;
                return res.status(200).json(userResponse); // Devuelve los datos del usuario (sin contraseña).
            } else { // Si se proporcionó `username` pero no se encontró el usuario.
                return res.status(200).json(null); // Devuelve null para indicar que el usuario no existe.
                                                  // El frontend interpreta esto como "usuario no encontrado".
                                                  // Un 404 podría ser más semántico, pero 200 con null es una convención aceptable para esta lógica.
            }
        }
        
        // Si no se proporciona `username` en los query params, se asume que se quieren obtener todos los usuarios.
        // (Esta parte podría necesitar protección para que solo administradores puedan listar todos los usuarios).
        // TODO: Añadir protección de ruta si es necesario para listar todos los usuarios.
        const allUsers = await User.find({}).select('-password'); // Obtiene todos los usuarios, excluyendo el campo password.
        res.status(200).json(allUsers); // Devuelve la lista de todos los usuarios.

    } catch (error) { // Manejo de errores generales del servidor.
        console.error('Error al obtener usuario(s):', error);
        res.status(500).json({ message: 'Error interno del servidor al buscar usuarios.' });
    }
}; */

module.exports = {
    createUser,
    getUsers
};