const setSecurityHeaders = (req, res, next) => {
    // Content-Security-Policy (CSP)
    // Política estricta: solo permite recursos (scripts, estilos, etc.) del mismo origen.
    // 'self' se refiere al propio dominio. 'unsafe-inline' es necesario para los estilos en línea,
    // pero idealmente debería eliminarse migrando todos los CSS y JS a archivos externos.
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;");

    // X-Frame-Options
    // Evita que la página sea cargada en un <frame>, <iframe>, <embed> u <object>.
    // Ayuda a prevenir ataques de clickjacking.
    res.setHeader('X-Frame-Options', 'DENY');

    // Referrer-Policy
    // Controla cuánta información de referencia (referrer) se incluye con las solicitudes.
    // 'strict-origin-when-cross-origin' envía el origen completo cuando se permanece en el mismo sitio,
    // pero solo el origen (sin la ruta) cuando se navega a otro sitio.
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions-Policy
    // Permite un control detallado sobre qué características del navegador puede usar la página.
    // Aquí deshabilitamos el acceso a características potencialmente sensibles como la cámara,
    // el micrófono y la geolocalización por defecto.
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    next();
};

module.exports = setSecurityHeaders;
