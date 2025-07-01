// scripts/loader.js

/**
 * Muestra el indicador de carga global.
 */
export function showLoader() {
    let loader = document.getElementById('globalLoader');
    if (!loader) {
        // Si no existe, lo crea dinámicamente (aunque es mejor tenerlo en el HTML)
        console.warn('Loader element not found, creating it dynamically. Consider adding it to your HTML.');
        loader = document.createElement('div');
        loader.id = 'globalLoader';
        loader.className = 'loader-container'; // Usa la clase principal del CSS
        
        const spinner = document.createElement('div');
        spinner.className = 'loader-spinner'; // Usa la clase para el spinner
        loader.appendChild(spinner);
        
        document.body.appendChild(loader);
    }
    // Asegúrate de que el display sea 'flex' para que las propiedades justify-content y align-items funcionen.
    loader.style.display = 'flex'; 
}

/**
 * Oculta el indicador de carga global.
 */
export function hideLoader() {
    const loader = document.getElementById('globalLoader');
    if (loader) {
        loader.style.display = 'none';
    }
}