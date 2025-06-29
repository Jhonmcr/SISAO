// scripts/main.js

import { initializeFilters } from './filterAndExport.js'; // Importar la nueva función de inicialización
import { initializeCaseTable } from './caseTableManager.js';

document.addEventListener('DOMContentLoaded', () => {
    initializeCaseTable();
    initializeFilters(); // Llamar a la función para configurar listeners de filtros y exportación

    // Listener para unificar eventos de actualización de datos
    document.addEventListener('casoActualizado', () => {
        console.log("Evento 'casoActualizado' detectado, disparando 'caseDataChanged'.");
        document.dispatchEvent(new CustomEvent('caseDataChanged'));
    });
});

// Ya no es necesario exponer funciones globalmente si los listeners se manejan internamente
// window.applyFilter = applyFilter;
// window.clearFilter = clearFilter;
// window.exportTableToExcel = exportTableToExcel;