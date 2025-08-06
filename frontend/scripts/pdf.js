document.addEventListener('DOMContentLoaded', () => {
    const pdfItems = document.querySelectorAll('.pdf-item');

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Nueva función para obtener la extensión del archivo
    function getFileExtension(filename) {
        return filename.split('.').pop().toUpperCase();
    }

    pdfItems.forEach(item => {
        const downloadLink = item.querySelector('.pdf-download-btn');
        const sizeSpan = item.querySelector('.pdf-size');
        
        if (downloadLink && sizeSpan) {
            const url = downloadLink.href;
            
            fetch(url, { method: 'HEAD' })
                .then(response => {
                    if (response.ok) {
                        const contentLength = response.headers.get('Content-Length');
                        if (contentLength) {
                            const fileSize = parseInt(contentLength, 10);
                            
                            // Obtiene la extensión del archivo a partir de la URL
                            const extension = getFileExtension(url);

                            // Muestra el tamaño y la extensión en el span
                            sizeSpan.textContent = `${formatFileSize(fileSize)} - ${extension}`;
                        } else {
                            sizeSpan.textContent = 'Tamaño no disponible';
                        }
                    } else {
                        sizeSpan.textContent = 'Error al obtener tamaño';
                    }
                })
                .catch(error => {
                    console.error('Error fetching file size:', error);
                    sizeSpan.textContent = 'Error de red';
                });
        }
    });
});