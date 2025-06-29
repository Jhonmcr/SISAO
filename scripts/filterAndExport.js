// scripts/filterAndExport.js
import { getCasosData, populateTable } from './caseTableManager.js';
import { showNotification, generateAlphanumericId } from './utils.js';

// Mapeo de los valores de filterField a las claves de los objetos de caso
const fieldMappings = {
    'id': '_id', // Asumiendo que quieres filtrar por el _id de mongo, que se transforma a OBC-COD
    'tipo_obra': 'tipo_obra',
    'parroquia': 'parroquia',
    'circuito': 'circuito',
    'comuna': 'comuna',
    'eje': 'eje',
    'caseDate': 'caseDate',
    'fechaEntrega': 'fechaEntrega',
    'estado': 'estado'
};

// Campos a considerar cuando se filtra por "Todos los campos"
const allFieldsSearchable = [
    'tipo_obra', 'parroquia', 'circuito', 'eje', 'comuna',
    'codigoComuna', 'nameJC', 'nameJU', 'enlaceComunal',
    'caseDescription', 'estado'
    // No incluimos _id directamente aquí porque se maneja de forma especial (OBC-COD)
    // y las fechas requieren un tratamiento especial si se quiere buscar por partes de ellas.
];

export function applyFilter() {
    const filterFieldSelect = document.getElementById('filterField');
    const filterValueInput = document.getElementById('filterValue');

    if (!filterFieldSelect || !filterValueInput) {
        console.warn("Elementos de filtro ('filterField' o 'filterValue') no encontrados.");
        return;
    }

    const selectedFieldKey = filterFieldSelect.value;
    const searchText = filterValueInput.value.toLowerCase().trim();
    const allData = getCasosData();

    if (searchText === '') {
        populateTable(allData); // Si no hay texto, mostrar todos los datos
        return;
    }

    const filteredData = allData.filter(caso => {
        if (selectedFieldKey === "") { // "Todos los campos"
            // Búsqueda especial para el ID (OBC - COD)
            const displayId = `OBC - ${generateAlphanumericId(caso._id)}`.toLowerCase();
            if (displayId.startsWith(searchText)) {
                return true;
            }
            // Buscar en los campos de texto definidos
            for (const field of allFieldsSearchable) {
                const fieldValue = caso[field];
                if (fieldValue && String(fieldValue).toLowerCase().startsWith(searchText)) {
                    return true;
                }
            }
            // Podríamos añadir búsqueda en fechas si es necesario, pero startsWith es complejo para fechas.
            return false;
        } else { // Un campo específico seleccionado
            const mappedField = fieldMappings[selectedFieldKey];
            if (!mappedField) return false;

            if (mappedField === '_id') {
                const displayId = `OBC - ${generateAlphanumericId(caso._id)}`.toLowerCase();
                return displayId.startsWith(searchText);
            }

            const fieldValue = caso[mappedField];

            if (mappedField === 'caseDate' || mappedField === 'fechaEntrega') {
                // Para fechas, es mejor comparar la representación de cadena que el usuario ve
                if (!fieldValue) return false;
                const dateString = new Date(fieldValue).toLocaleDateString().toLowerCase();
                return dateString.startsWith(searchText);
            }

            if (fieldValue != null) { // Usar != null para cubrir undefined y null
                return String(fieldValue).toLowerCase().startsWith(searchText);
            }
            return false;
        }
    });

    populateTable(filteredData);
}

export function clearFilter() {
    const filterFieldSelect = document.getElementById('filterField');
    const filterValueInput = document.getElementById('filterValue');

    if (filterFieldSelect) filterFieldSelect.value = ""; // Resetear a "Todos los campos"
    if (filterValueInput) filterValueInput.value = "";

    populateTable(getCasosData()); // Mostrar todos los datos
    showNotification('Filtro limpiado y tabla restaurada.');
}

export function exportTableToExcel() {
    // Usar los datos actualmente mostrados en la tabla (podrían estar filtrados)
    // Para ello, necesitamos una forma de obtener los datos que populateTable usó la última vez,
    // o filtrar de nuevo aquí. Por simplicidad, filtraremos de nuevo.

    const filterFieldSelect = document.getElementById('filterField');
    const filterValueInput = document.getElementById('filterValue');
    const selectedFieldKey = filterFieldSelect ? filterFieldSelect.value : "";
    const searchText = filterValueInput ? filterValueInput.value.toLowerCase().trim() : "";

    let dataToExport = getCasosData();

    if (searchText !== '') {
        dataToExport = dataToExport.filter(caso => {
            if (selectedFieldKey === "") {
                const displayId = `OBC - ${generateAlphanumericId(caso._id)}`.toLowerCase();
                if (displayId.startsWith(searchText)) return true;
                for (const field of allFieldsSearchable) {
                    const fieldValue = caso[field];
                    if (fieldValue && String(fieldValue).toLowerCase().startsWith(searchText)) return true;
                }
                return false;
            } else {
                const mappedField = fieldMappings[selectedFieldKey];
                if (!mappedField) return false;
                if (mappedField === '_id') {
                    const displayId = `OBC - ${generateAlphanumericId(caso._id)}`.toLowerCase();
                    return displayId.startsWith(searchText);
                }
                const fieldValue = caso[mappedField];
                if (mappedField === 'caseDate' || mappedField === 'fechaEntrega') {
                    if (!fieldValue) return false;
                    const dateString = new Date(fieldValue).toLocaleDateString().toLowerCase();
                    return dateString.startsWith(searchText);
                }
                if (fieldValue != null) return String(fieldValue).toLowerCase().startsWith(searchText);
                return false;
            }
        });
    }

    if (!dataToExport || dataToExport.length === 0) {
        showNotification('No hay datos (filtrados) para exportar.', true);
        return;
    }

    const ws = XLSX.utils.json_to_sheet(dataToExport.map(caso => ({
        'OBC - COD': `OBC - ${generateAlphanumericId(caso._id)}`,
        'Tipo de Obra': caso.tipo_obra,
        'Parroquia': caso.parroquia,
        'Circuito': caso.circuito,
        'Eje': caso.eje,
        'Comuna': caso.comuna,
        'Código Comunal': caso.codigoComuna,
        'Nombre JC': caso.nameJC,
        'Nombre JU': caso.nameJU,
        'Enlace Comunal': caso.enlaceComunal,
        'Descripción': caso.caseDescription,
        'Fecha de Inicio': caso.caseDate ? new Date(caso.caseDate).toLocaleDateString() : 'N/A',
        'Fecha de Entrega': caso.fechaEntrega && caso.estado === 'Entregado' ? new Date(caso.fechaEntrega).toLocaleDateString() : 'N/A',
        'Archivo': caso.archivo ? `http://localhost:3000/uploads/pdfs/${caso.archivo}` : 'N/A',
        'Estado': caso.estado,
        'Actuaciones': Array.isArray(caso.actuaciones) ? caso.actuaciones.map(act => {
            const date = act.fecha ? new Date(act.fecha).toLocaleString() : 'Fecha desconocida';
            const user = act.usuario ? `(${act.usuario})` : '';
            return `${user} ${date}: ${act.descripcion}`;
        }).join('; ') : 'N/A',
        'Modificaciones': Array.isArray(caso.modificaciones) ? caso.modificaciones.map(mod => {
            const date = mod.fecha ? new Date(mod.fecha).toLocaleString() : 'Fecha desconocida';
            const user = mod.usuario ? `(${mod.usuario})` : '';
            if (mod.campo === 'revisión') {
                return `${user} ${date}: Revisión sin cambios específicos`;
            }
            return `${user} ${date}: ${mod.campo} de '${mod.valorAntiguo}' a '${mod.valorNuevo}'`;
        }).join('; ') : 'N/A'
    })));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Casos");
    XLSX.writeFile(wb, "Casos.xlsx");
    showNotification('Tabla exportada a Excel exitosamente.');
}

export function initializeFilters() {
    const filterValueInput = document.getElementById('filterValue');
    const applyFilterBtn = document.getElementById('applyFilterBtn');
    const clearFilterBtn = document.getElementById('clearFilterBtn');
    const exportBtn = document.getElementById('exportBtn'); // ID añadido en el HTML

    if (filterValueInput) {
        filterValueInput.addEventListener('input', applyFilter); // Filtrar mientras se escribe
    }
    if (applyFilterBtn) {
        applyFilterBtn.addEventListener('click', applyFilter);
    }
    if (clearFilterBtn) {
        clearFilterBtn.addEventListener('click', clearFilter);
    }
    if (exportBtn) {
        exportBtn.addEventListener('click', exportTableToExcel);
    }
}