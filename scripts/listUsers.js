// Script temporal para listar todos los usuarios (sin contraseñas)
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function listUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Conectado a MongoDB.');
        const users = await User.find({}).select('-password');
        if (users.length === 0) {
            console.log('⚠️  No hay usuarios en la base de datos.');
        } else {
            console.log(`✅ Usuarios encontrados (${users.length}):`);
            users.forEach(u => console.log(`  - username: "${u.username}" | role: "${u.role}" | name: "${u.name}"`));
        }
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

listUsers();
