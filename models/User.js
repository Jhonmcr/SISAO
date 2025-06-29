const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    username: {
        type: String,
        required: true,
        unique: true, // Asegura que los nombres de usuario sean únicos
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['superadmin', 'admin', 'user'], // Define los roles permitidos
        default: 'user', // Rol por defecto si no se especifica
        required: true
    },
    // Puedes añadir otros campos específicos si son comunes a todos los roles
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// En un entorno de producción, aquí usarías bcrypt para hashear la contraseña
// antes de guardar:
// userSchema.pre('save', async function(next) {
//     if (!this.isModified('password')) return next();
//     const salt = await bcrypt.genSalt(10);
//     this.password = await bcrypt.hash(this.password, salt);
//     next();
// });

module.exports = mongoose.model('User', userSchema);