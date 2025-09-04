const setSecurityHeaders = (req, res, next) => {
    // Content-Security-Policy (CSP)
    // Política estricta: solo permite recursos (scripts, estilos, etc.) del mismo origen.
    // 'self' se refiere al propio dominio. 'unsafe-inline' es necesario para los estilos en línea,
    // pero idealmente debería eliminarse migrando todos los CSS y JS a archivos externos.
    const isProduction = process.env.NODE_ENV === 'production';
    let csp;

    if (isProduction) {
        // Política más estricta para producción
        csp = "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://unpkg.com; style-src 'self' https://cdnjs.cloudflare.com; font-src 'self' https://cdnjs.cloudflare.com; img-src 'self' data:;";
    } else {
        // Política más laxa para desarrollo local
        csp = "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://unpkg.com; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; font-src 'self' https://cdnjs.cloudflare.com; img-src 'self' data:;";
    }
    res.setHeader('Content-Security-Policy', csp);

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
