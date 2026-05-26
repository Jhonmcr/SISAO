const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    // Obtenemos el token de la cabecera 'Authorization'
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Acceso denegado. Token no proporcionado o formato inválido.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        // Verificamos el token usando la clave secreta del .env
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secreto_temporal_por_defecto');
        // Adjuntamos la información del usuario a la request para usarla en los controladores
        req.user = decoded;
        next(); // Permitimos continuar a la ruta original
    } catch (error) {
        return res.status(401).json({ message: 'Token inválido o expirado.' });
    }
};

module.exports = authMiddleware;
