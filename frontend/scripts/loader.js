// scripts/loader.js

/**
 * @file scripts/loader.js
 * @description Este script proporciona funciones para mostrar y ocultar un indicador de carga (spinner) global.
 * Se espera que exista un elemento en el HTML con ID 'globalLoader' que contenga el spinner,
 * o este script lo creará dinámicamente si no lo encuentra (aunque se recomienda tenerlo en el HTML).
 */

/**
 * Muestra el indicador de carga global.
 * Busca un elemento con ID 'globalLoader'. Si no lo encuentra, lo crea dinámicamente
 * con la estructura esperada por el CSS (`loader-container` y `loader-spinner`).
 * Establece el estilo `display` del contenedor del loader a 'flex' para hacerlo visible
 * y permitir que las propiedades de centrado del CSS (justify-content, align-items) funcionen.
 * @export
 */
export function showLoader() {
    let loader = document.getElementById('globalLoader'); // Intenta obtener el elemento loader existente.

    // Si el elemento loader no existe en el DOM:
    if (!loader) {
        // Muestra una advertencia en consola, ya que es preferible que el loader esté definido en el HTML.
        //console.warn('Elemento loader no encontrado, creándolo dinámicamente. Considera añadirlo a tu HTML para mejor rendimiento y estructura.');
        
        // Crea el contenedor principal del loader.
        loader = document.createElement('div');
        loader.id = 'globalLoader'; // Asigna el ID esperado.
        loader.className = 'loader-container'; // Asigna la clase CSS principal para el overlay.
        
        // Crea el elemento spinner.
        const spinner = document.createElement('div');
        spinner.className = 'loader-spinner'; // Asigna la clase CSS para el spinner animado.
        
        // Añade el spinner como hijo del contenedor del loader.
        loader.appendChild(spinner);
        
        // Añade el contenedor del loader al final del body del documento.
        document.body.appendChild(loader);
    }
    // Establece el estilo display a 'flex' para mostrar el loader.
    // Se usa 'flex' para que las propiedades de centrado definidas en el CSS para '.loader-container' tengan efecto.
    loader.style.display = 'flex'; 
}

/**
 * Oculta el indicador de carga global.
 * Busca el elemento con ID 'globalLoader' y establece su estilo `display` a 'none'.
 * @export
 */
export function hideLoader() {
    const loader = document.getElementById('globalLoader'); // Obtiene el elemento loader.
    // Si el elemento loader existe, lo oculta.
    if (loader) {
        loader.style.display = 'none';
    }
}