// scripts/filterAndExport.js
import { getCasosData, populateTable } from './caseTableManager.js';
import { showNotification, generateAlphanumericId } from './utils.js';

export function applyFilter() {
    const filterFieldSelect = document.getElementById('filterField');
    const filterValueInput = document.getElementById('filterValue');

    if (!filterFieldSelect || !filterValueInput) {
        console.warn("Elementos 'filterField' o 'filterValue' no encontrados.");
        return;
    }

    const selectedField = filterFieldSelect.value;
    const filterValue = filterValueInput.value.toLowerCase().trim();
    const tableRows = document.querySelectorAll('#casosTable tbody tr');

    if (filterValue === '') {
        // Si el valor del filtro está vacío, mostrar todas las filas y salir.
        tableRows.forEach(row => {
            row.style.display = '';
        });
        // Opcionalmente, podrías llamar a populateTable(getCasosData()) para restaurar el orden original.
        // Pero si solo se borra el texto del filtro, mantener el orden actual filtrado (si lo hubo)
        // y simplemente mostrar todo podría ser lo esperado.
        // Para una limpieza completa, el botón "Limpiar Filtro" llamará a clearFilter().
        return;
    }

    tableRows.forEach(row => {
        let rowMatchesFilter = false;
        const cells = row.querySelectorAll('td');

        // Mapeo de los valores de filterField a los índices de las columnas (ajusta según tu tabla)
        // Esto debe coincidir con el orden de las columnas en tu HTML y los <option> value.
        const fieldColumnMapping = {
            'id': 0,
            'tipo_obra': 1,
            'parroquia': 2,
            'circuito': 3,
            'eje': 4,
            'comuna': 5,
            // 'enlaceComunal' // Esta columna no está en los options, pero podría añadirse
            // 'actuaciones' // Esta columna no está en los options
            'caseDate': 8, // Fecha de Inicio
            'fechaEntrega': 9, // Fecha de Entrega
            // 'archivo' // Esta columna no está en los options
            'estado': 11 // Estado de la Obra
        };

        if (selectedField === "") { // "Todos los campos"
            for (let i = 0; i < cells.length; i++) {
                const cell = cells[i];
                let cellText = cell.textContent.toLowerCase();

                if (i === 0) { // Lógica especial para la columna de ID (índice 0)
                    const idLink = cell.querySelector('a.case-id-link');
                    if (idLink) {
                        const displayId = idLink.textContent.toLowerCase(); // "obc - abc123xyz"
                        const internalId = idLink.dataset.id.toLowerCase(); // el _id de mongo
                        const alphanumericPart = displayId.replace('obc - ', ''); // "abc123xyz"
                        if (displayId.includes(filterValue) || alphanumericPart.includes(filterValue) || internalId.includes(filterValue)) {
                            rowMatchesFilter = true;
                            break;
                        }
                    } else if (cellText.includes(filterValue)) {
                        rowMatchesFilter = true;
                        break;
                    }
                } else if (cellText.includes(filterValue)) {
                    rowMatchesFilter = true;
                    break;
                }
            }
        } else { // Un campo específico está seleccionado
            const columnIndex = fieldColumnMapping[selectedField];
            if (columnIndex !== undefined && cells[columnIndex]) {
                let cellText = cells[columnIndex].textContent.toLowerCase();
                if (selectedField === 'id') { // Lógica especial para la columna de ID
                    const idLink = cells[columnIndex].querySelector('a.case-id-link');
                    if (idLink) {
                        const displayId = idLink.textContent.toLowerCase();
                        const internalId = idLink.dataset.id.toLowerCase();
                        const alphanumericPart = displayId.replace('obc - ', '');
                        if (displayId.includes(filterValue) || alphanumericPart.includes(filterValue) || internalId.includes(filterValue)) {
                            rowMatchesFilter = true;
                        }
                    } else if (cellText.includes(filterValue)) {
                        rowMatchesFilter = true;
                    }
                } else if (cellText.includes(filterValue)) {
                    rowMatchesFilter = true;
                }
            }
        }

        if (rowMatchesFilter) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

export function clearFilter() {
    const filterFieldSelect = document.getElementById('filterField');
    const filterValueInput = document.getElementById('filterValue');

    if (filterFieldSelect) {
        filterFieldSelect.value = ""; // Restablece el selector a "Todos los campos"
    }
    if (filterValueInput) {
        filterValueInput.value = ''; // Limpia el campo de entrada de texto
    }
    // // Vuelve a poblar la tabla con todos los datos originales y su orden por defecto
    // if (filterInput) {
    //     filterInput.value = ''; // Limpia el campo de entrada
    // }
    // Vuelve a poblar la tabla con todos los datos originales
    // Esto asegura que todos los elementos sean visibles de nuevo y se reordenen
    populateTable(getCasosData());
    showNotification('Filtro limpiado y tabla restaurada.');
}

export function exportTableToExcel() {
    const dataToExport = getCasosData(); // Llama a la función para obtener los datos

    if (!dataToExport || dataToExport.length === 0) {
        showNotification('No hay datos para exportar.', true);
        return;
    }

    const ws = XLSX.utils.json_to_sheet(dataToExport.map(caso => ({
        'OBC - COD': generateAlphanumericId(caso._id),
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