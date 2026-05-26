const fs = require('fs');
const path = require('path');

const scriptsDir = path.join(__dirname, 'frontend', 'scripts');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
    });
}

const skipFiles = ['utils.js', 'login.js', 'config.js']; // config.js usa /api/config que es público, login.js ya fue modificado

walkDir(scriptsDir, (filePath) => {
    if (!filePath.endsWith('.js')) return;
    const fileName = path.basename(filePath);
    if (skipFiles.includes(fileName)) return;

    let content = fs.readFileSync(filePath, 'utf8');
    
    // Si no tiene fetch, no hacemos nada
    if (!content.includes('fetch(')) return;

    console.log(`Modificando: ${filePath}`);

    // Reemplazar fetch( por fetchConToken(
    content = content.replace(/\bfetch\(/g, 'fetchConToken(');

    // Calcular el path relativo hacia utils.js
    let relPath = path.relative(path.dirname(filePath), path.join(scriptsDir, 'utils.js')).replace(/\\/g, '/');
    if (!relPath.startsWith('.')) relPath = './' + relPath;

    // Verificar si utils.js ya está importado
    const importRegex = new RegExp(`import\\s+\\{([^}]*)\\}\\s+from\\s+['"](?:\\.\\/|\\.\\.\\/)*utils\\.js['"];?`);
    const match = content.match(importRegex);

    if (match) {
        // Ya hay un import de utils.js, añadir fetchConToken si no está
        let imported = match[1];
        if (!imported.includes('fetchConToken')) {
            let newImport = match[0].replace(match[1], match[1] + ', fetchConToken');
            content = content.replace(match[0], newImport);
        }
    } else {
        // Añadir el import al principio del archivo (después de los comentarios iniciales o al principio)
        const importStatement = `import { fetchConToken } from '${relPath}';\n`;
        // Buscar la primera línea de código real (que no sea comentario)
        content = importStatement + content;
    }

    fs.writeFileSync(filePath, content, 'utf8');
});

console.log('Finalizado.');
