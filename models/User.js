const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

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

// Hashear la contraseña antes de guardar
userSchema.pre('save', async function(next) {
    // Solo hashear la contraseña si ha sido modificada (o es nueva)
    if (!this.isModified('password')) return next();

    try {
        // Generar un salt
        const salt = await bcrypt.genSalt(10);
        // Hashear la contraseña con el salt
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error); // Pasar el error al siguiente middleware/manejador
    }
});

// Método para comparar la contraseña proporcionada con la contraseña hasheada
userSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw error;
    }
};

module.exports = mongoose.model('User', userSchema);