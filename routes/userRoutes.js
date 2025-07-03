const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Ajusta la ruta según tu estructura

// Ruta para CREAR un nuevo usuario (POST)
// POST /users
router.post('/', async (req, res) => {
    try {
        const { name, username, password, role } = req.body;

        if (!name || !username || !password || !role) {
            return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
        }
        if (!['superadmin', 'admin', 'user'].includes(role)) {
            return res.status(400).json({ message: 'Rol inválido.' });
        }

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(409).json({ message: 'El nombre de usuario ya existe.' });
        }

        const newUser = new User({ name, username, password, role });
        await newUser.save();
        
        const userResponse = newUser.toObject();
        delete userResponse.password;

        res.status(201).json({ message: `Usuario ${username} creado exitosamente con rol: ${role}`, user: userResponse });
    } catch (error) {
        console.error('Error al crear usuario:', error);
        res.status(500).json({ message: 'Error interno del servidor al registrar usuario.' });
    }
});

// Ruta para VERIFICAR la existencia de un usuario o INICIAR SESIÓN (GET)
// GET /users
// Query params: username, password (opcional para login)
router.get('/', async (req, res) => {
    try {
        const { username, password } = req.query;

        if (username) {
            const user = await User.findOne({ username });

            if (password && user) {
                const isMatch = await user.comparePassword(password);
                if (isMatch) {
                    const userResponse = user.toObject();
                    delete userResponse.password;
                    return res.status(200).json(userResponse);
                } else {
                    return res.status(401).json({ message: 'Contraseña incorrecta.' });
                }
            } else if (username && user) {
                const userResponse = user.toObject();
                delete userResponse.password;
                return res.status(200).json(userResponse);
            } else if (username && !user) {
                return res.status(200).json(null);
            }
        }
        
        const allUsers = await User.find({}).select('-password');
        res.status(200).json(allUsers);

    } catch (error) {
        console.error('Error al obtener usuario(s):', error);
        res.status(500).json({ message: 'Error interno del servidor al buscar usuarios.' });
    }
});

module.exports = router;