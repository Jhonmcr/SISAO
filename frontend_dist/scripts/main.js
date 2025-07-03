// scripts/main.js

/**
 * @file scripts/main.js
 * @description Este es el script principal que se ejecuta en varias páginas, principalmente
 * inicializando componentes comunes como la tabla de casos.
 * Actúa como un punto de entrada para la funcionalidad de la tabla.
 */

// Importa la función para inicializar la tabla de casos desde caseTableManager.js.
// Las funciones de filtro y exportación (`applyFilter`, `clearFilter`, `exportTableToExcel`)
// ya no se importan aquí directamente porque su lógica de event listener
// ha sido integrada dentro de `initializeCaseTable` o `populateTable` en `caseTableManager.js`.
import { initializeCaseTable } from './caseTableManager.js';

// Event Listener que se ejecuta cuando el DOM está completamente cargado y parseado.
document.addEventListener('DOMContentLoaded', () => {
    // Llama a la función para inicializar la tabla de casos.
    // Esta función ahora es responsable de configurar la tabla, cargar los datos iniciales
    // y también de adjuntar los event listeners necesarios para los filtros y botones de exportación
    // que están asociados a la tabla.
    initializeCaseTable(); 

    // Los event listeners para los filtros y exportación que antes estaban aquí
    // (para 'keyup' en 'filterValue', 'click' en 'applyFilterBtn', 'clearFilterBtn', 'exportBtn')
    // ahora son manejados internamente por las funciones dentro de 'caseTableManager.js',
    // específicamente cuando se (re)puebla la tabla, para asegurar que siempre estén
    // conectados a los elementos correctos, incluso si la tabla se regenera dinámicamente.

    // Event Listener para un evento personalizado 'casoActualizado'.
    // Cuando se detecta este evento (posiblemente disparado después de modificar un caso),
    // se dispara otro evento personalizado 'caseDataChanged'.
    // 'caseDataChanged' es un evento más genérico que otros módulos (como charts_renderer.js o counter_loader.js)
    // escuchan para actualizar sus datos.
    // TODO: Considerar unificar el uso de 'casoActualizado' y 'caseDataChanged' a un solo evento estándar
    // para simplificar la comunicación entre módulos.
    document.addEventListener('casoActualizado', () => {
        console.log("Evento 'casoActualizado' detectado. Disparando 'caseDataChanged'.");
        document.dispatchEvent(new CustomEvent('caseDataChanged')); // Dispara el evento para actualizar otros componentes.
    });
});

// Las funciones como applyFilter, clearFilter, exportTableToExcel ya no se exponen globalmente
// en el objeto `window` porque los event listeners se adjuntan directamente en el código
// que maneja la tabla (`caseTableManager.js`), promoviendo un mejor encapsulamiento.
// Esto elimina la necesidad de usar `onclick` directamente en el HTML para estas funciones.