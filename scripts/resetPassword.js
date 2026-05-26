// scripts/resetPassword.js
// Script temporal para resetear la contraseña de un usuario SISAO.
// Uso: node scripts/resetPassword.js <username> <nueva_contraseña>
// Ejemplo: node scripts/resetPassword.js jmcr MiNuevaPass123

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const [,, username, newPassword] = process.argv;

if (!username || !newPassword) {
    console.error('Uso: node scripts/resetPassword.js <username> <nueva_contraseña>');
    process.exit(1);
}

async function resetPassword() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Conectado a MongoDB.');

        const user = await User.findOne({ username });
        if (!user) {
            console.error(`Usuario "${username}" no encontrado.`);
            process.exit(1);
        }

        user.password = newPassword; // El pre-save hook hashea automáticamente
        await user.save();
        console.log(`✅ Contraseña del usuario "${username}" actualizada exitosamente.`);
        console.log('Ahora usa esta contraseña en el popup de confirmación de la app.');
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

resetPassword();
