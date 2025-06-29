// scripts/main.js

import { applyFilter, clearFilter, exportTableToExcel } from './filterAndExport.js';
import { initializeCaseTable } from './caseTableManager.js';

document.addEventListener('DOMContentLoaded', () => {
    initializeCaseTable();

    // Event listener para el campo de filtro:
    const filterInput = document.getElementById('filterInput');
    if (filterInput) {
        filterInput.addEventListener('keyup', applyFilter); // Llama a applyFilter en cada pulsación de tecla
    }

    document.addEventListener('casoActualizado', () => {
        console.log("Evento 'casoActualizado' detectado (considerar unificar con 'caseDataChanged').");
        document.dispatchEvent(new CustomEvent('caseDataChanged'));
    });
});

window.applyFilter = applyFilter;
window.clearFilter = clearFilter;
window.exportTableToExcel = exportTableToExcel;