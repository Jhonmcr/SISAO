// scripts/filterAndExport.js
import { getCasosData, populateTable } from './caseTableManager.js';
import { showNotification, generateAlphanumericId } from './utils.js';

export function applyFilter() {
    const filterInput = document.getElementById('filterInput');
    if (!filterInput) {
        console.warn("Elemento 'filterInput' no encontrado.");
        return;
    }

    const filterValue = filterInput.value.toLowerCase();
    const tableRows = document.querySelectorAll('#casosTable tbody tr');

    // Si el valor del filtro está vacío, asegúrate de que todas las filas sean visibles
    if (filterValue === '') {
        tableRows.forEach(row => {
            row.style.display = '';
        });
        return; // Salir de la función ya que no hay nada que filtrar
    }

    tableRows.forEach(row => {
        // Obtener el texto visible de todas las celdas (td) de la fila
        const rowCells = row.querySelectorAll('td');
        let rowMatchesFilter = false;

        for (let i = 0; i < rowCells.length; i++) {
            const cellText = rowCells[i].textContent.toLowerCase();
            // Si el texto de alguna celda incluye el valor del filtro, la fila coincide
            if (cellText.includes(filterValue)) {
                rowMatchesFilter = true;
                break; // No es necesario revisar más celdas en esta fila
            }
        }

        // Mostrar u ocultar la fila según si coincide con el filtro
        if (rowMatchesFilter) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

export function clearFilter() {
    const filterInput = document.getElementById('filterInput');
    if (filterInput) {
        filterInput.value = ''; // Limpia el campo de entrada
    }
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