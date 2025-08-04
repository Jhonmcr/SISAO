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
    let loader = document.getElementById('globalLoader');

    // Si el loader no existe, lo crea y lo añade al body.
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'globalLoader';
        loader.className = 'loader-container';
        document.body.appendChild(loader);
    }

    // Busca el spinner dentro del loader.
    let spinner = loader.querySelector('.loader-spinner');
    // Si no hay spinner, lo crea y limpia el contenido previo del loader.
    if (!spinner) {
        spinner = document.createElement('div');
        spinner.className = 'loader-spinner';
        loader.innerHTML = ''; // Limpia el contenido para evitar duplicados.
        loader.appendChild(spinner);
    }

    // Busca el logo dentro del spinner.
    let logo = spinner.querySelector('.loader-logo');
    // Si no hay logo, lo crea y lo añade al spinner.
    if (!logo) {
        logo = document.createElement('div');
        logo.className = 'loader-logo';
        spinner.appendChild(logo);
    }

    // Finalmente, muestra el loader.
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