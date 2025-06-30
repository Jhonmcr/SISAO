// scripts/main.js

// import { applyFilter, clearFilter, exportTableToExcel } from './filterAndExport.js'; // Ya no se necesitan aquí directamente
import { initializeCaseTable } from './caseTableManager.js';

document.addEventListener('DOMContentLoaded', () => {
    initializeCaseTable(); // Esto ahora también adjuntará los listeners de filtro/exportación

    // El event listener para 'keyup' en 'filterValue' ahora se maneja dentro de populateTable en caseTableManager.js
    // El event listener para el botón 'applyFilterBtn' ahora se maneja dentro de populateTable en caseTableManager.js
    // El event listener para el botón 'clearFilterBtn' ahora se maneja dentro de populateTable en caseTableManager.js
    // El event listener para el botón 'exportBtn' ahora se maneja dentro de populateTable en caseTableManager.js


    document.addEventListener('casoActualizado', () => {
        console.log("Evento 'casoActualizado' detectado (considerar unificar con 'caseDataChanged').");
        document.dispatchEvent(new CustomEvent('caseDataChanged'));
    });
});

// Ya no es necesario exponer estas funciones globalmente si los listeners se adjuntan directamente.
// window.applyFilter = applyFilter;
// window.clearFilter = clearFilter;
// window.exportTableToExcel = exportTableToExcel;