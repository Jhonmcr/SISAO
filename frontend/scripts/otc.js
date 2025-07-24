import { circuitosParroquias } from './home/select_populator.js';
import { getApiBaseUrlAsync } from './config.js';
import { showNotification } from './utils.js';

document.addEventListener('DOMContentLoaded', async () => {
    const userRole = localStorage.getItem('userRole');
    const API_BASE_URL = await getApiBaseUrlAsync();
    const circuitosContainer = document.getElementById('circuitos-container');

    // Cargar contadores de OTC
    const otcStats = await fetch(`${API_BASE_URL}/comunas/stats/otc`).then(res => res.json());
    document.getElementById('comunas-counter').textContent = `Comunas: ${otcStats.totalComunas}`;
    document.getElementById('consejos-comunales-counter').textContent = `Consejos Comunales: ${otcStats.totalConsejos}`;

    // Cargar contadores de casos
    const caseCounts = await fetch(`${API_BASE_URL}/casos/stats/parroquias`).then(res => res.json());
    const caseCountsMap = caseCounts.reduce((map, item) => {
        map[item._id] = item.count;
        return map;
    }, {});

    const updaters = new Map();

    for (const [circuito, parroquias] of Object.entries(circuitosParroquias)) {
        const circuitoDiv = document.createElement('div');
        circuitoDiv.classList.add('circuito');

        const circuitoTitle = document.createElement('h4');
        circuitoTitle.textContent = circuito;
        circuitoDiv.appendChild(circuitoTitle);

        const parroquiasList = document.createElement('ul');
        parroquias.forEach(parroquia => {
            const parroquiaItem = document.createElement('li');
            const parroquiaLink = document.createElement('a');
            parroquiaLink.href = '#';
            parroquiaLink.textContent = parroquia;
            parroquiaLink.dataset.parroquia = parroquia;

            const caseCounter = document.createElement('span');
            caseCounter.classList.add('case-counter');
            caseCounter.textContent = ` (${caseCountsMap[parroquia] || 0})`;

            parroquiaItem.appendChild(parroquiaLink);
            parroquiaItem.appendChild(caseCounter);

            parroquiaItem.classList.add('parroquia-item');
            const popupComunidades = document.createElement('div');
            popupComunidades.classList.add('popup-comunidades');
            popupComunidades.innerHTML = `
                <h4>Comunidades en ${parroquia}</h4>
                <div class="comunidades-list-container">Cargando...</div>
            `;
            parroquiaItem.appendChild(popupComunidades);

            const listContainer = popupComunidades.querySelector('.comunidades-list-container');

            const updatePopupContent = async () => {
                const comunas = await fetch(`${API_BASE_URL}/comunas/parroquia/${parroquia}`).then(res => res.json());
                if (comunas.length > 0) {
                    const totalComunas = comunas.length;
                    const totalConsejos = comunas.reduce((acc, comuna) => acc + comuna.consejos_comunales.length, 0);
            
                    listContainer.innerHTML = `
                        <p>Total de Comunas: ${totalComunas}</p>
                        <p>Total de Consejos Comunales: ${totalConsejos}</p>
                    `;
                } else {
                    listContainer.innerHTML = 'No hay comunidades registradas.';
                }
            };
            
            updaters.set(parroquia, updatePopupContent);
            
            let pressTimer;

            parroquiaItem.addEventListener('mouseenter', updatePopupContent);

            parroquiaItem.addEventListener('touchstart', (e) => {
                pressTimer = window.setTimeout(() => {
                    updatePopupContent();
                    e.preventDefault(); 
                }, 2000);
            });
            
            parroquiaItem.addEventListener('touchend', () => {
                clearTimeout(pressTimer);
            });
            
            parroquiaItem.addEventListener('touchmove', () => {
                clearTimeout(pressTimer);
            });

            parroquiaLink.addEventListener('click', async (e) => {
                e.preventDefault();
                const comunasPopup = document.getElementById('comunas-popup');
                const comunasList = document.getElementById('comunas-list');
                document.getElementById('comunas-popup-title').textContent = `Comunas en ${parroquia}`;

                const comunas = await fetch(`${API_BASE_URL}/comunas/parroquia/${parroquia}`).then(res => res.json());
                comunasList.innerHTML = '';
                if (comunas.length > 0) {
                    comunas.forEach(comuna => {
                        const comunaDiv = document.createElement('div');
                        comunaDiv.className = 'comuna-item';
                        comunaDiv.dataset.id = comuna._id;
                        comunaDiv.dataset.nombre = comuna.nombre;
                        let modifyButtonHtml = '';
                        if (userRole === 'superadmin' || userRole === 'admin') {
                            modifyButtonHtml = `
                            <button class="modify-comuna-btn" data-id="${comuna._id}" data-nombre="${comuna.nombre}" data-codigo="${comuna.codigo_circuito_comunal}">
                                <svg class="modify-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                                <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                                </svg>
                            </button>`;
                        }
                        comunaDiv.innerHTML = `
                            <span>${comuna.nombre} (${comuna.consejos_comunales.length} Consejos Comunales)</span>
                            ${modifyButtonHtml}
                        `;

                        comunaDiv.querySelector('span').addEventListener('click', () => {
                            showConsejosComunales(comuna._id, comuna.nombre);
                        });

                        comunasList.appendChild(comunaDiv);
                    });
                } else {
                    comunasList.innerHTML = 'No hay comunidades registradas.';
                }

                comunasPopup.style.display = 'block';

                const agregarComunaBtn = document.getElementById('agregar-comuna-btn');
                const agregarConsejoComunalBtn = document.getElementById('agregar-consejo-comunal-btn');

                if (userRole === 'superadmin' || userRole === 'admin') {
                    agregarComunaBtn.style.display = 'inline-block';
                    agregarConsejoComunalBtn.style.display = 'inline-block';
                } else {
                    agregarComunaBtn.style.display = 'none';
                    agregarConsejoComunalBtn.style.display = 'none';
                }
            });
            
            parroquiasList.appendChild(parroquiaItem);
        });

        circuitoDiv.appendChild(parroquiasList);
        circuitosContainer.appendChild(circuitoDiv);
    }

    // Lógica de Popups
    const agregarComunaPopup = document.getElementById('agregar-comuna-popup');
    const noTocadasPopup = document.getElementById('no-tocadas-popup');
    const closeButtons = document.querySelectorAll('.close-button');
    const agregarConsejoBtn = document.getElementById('agregar-consejo-btn');
    const consejosComunalesContainer = document.getElementById('consejos-comunales-container');
    
    const agregarComunaBtn = document.getElementById('agregar-comuna-btn');
    agregarComunaBtn.addEventListener('click', () => {
        const comunasPopup = document.getElementById('comunas-popup');
        comunasPopup.style.display = 'none';
        const agregarComunaPopup = document.getElementById('agregar-comuna-popup');
        // El título del popup de agregar ya se establece al hacer clic en la parroquia.
        // No es necesario cambiarlo aquí.
        agregarComunaPopup.style.display = 'block';
    });

    const agregarConsejoComunalBtn = document.getElementById('agregar-consejo-comunal-btn');
    if (agregarConsejoComunalBtn) {
        agregarConsejoComunalBtn.addEventListener('click', async () => {
            const comunasPopup = document.getElementById('comunas-popup');
            comunasPopup.style.display = 'none';
            const agregarConsejoComunalPopup = document.getElementById('agregar-consejo-comunal-popup');
            const parroquia = document.getElementById('comunas-popup-title').textContent.replace('Comunas en ', '');
            const comunaSelect = document.getElementById('comuna-select');
            
            const comunas = await fetch(`${API_BASE_URL}/comunas/parroquia/${parroquia}`).then(res => res.json());
            comunaSelect.innerHTML = '<option value="">Seleccione una Comuna</option>';
            comunas.forEach(comuna => {
                const option = document.createElement('option');
                option.value = comuna._id;
                option.textContent = comuna.nombre;
                comunaSelect.appendChild(option);
            });
    
            agregarConsejoComunalPopup.style.display = 'block';
        });
    }

    const resetAgregarComunaForm = () => {
        const form = document.getElementById('agregar-comuna-form');
        form.reset();
        const container = document.getElementById('comunas-container');
        container.innerHTML = `
            <div class="comuna-item">
                <input type="text" placeholder="Nombre de la Comuna" class="comuna-nombre" required>
                <input type="text" placeholder="Código del Circuito Comunal" class="comuna-codigo" required>
            </div>
        `;
    };

    const resetConsejoComunalForm = () => {
        const form = document.getElementById('agregar-consejo-comunal-form');
        if (form) {
            form.reset();
        }
        const container = document.getElementById('consejos-comunales-container-simple');
        if (container) {
            container.innerHTML = '';
        }
    };

    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.modal-otc');
            if (modal) {
                modal.style.display = 'none';
                if (modal.id === 'agregar-comuna-popup') {
                    resetAgregarComunaForm();
                } else if (modal.id === 'agregar-consejo-comunal-popup') {
                    resetConsejoComunalForm();
                }
            }
        });
    });


    if (agregarConsejoBtn) {
        agregarConsejoBtn.addEventListener('click', () => {
            const consejoDiv = document.createElement('div');
            consejoDiv.classList.add('consejo-comunal-item');
            consejoDiv.innerHTML = `
                <input type="text" placeholder="Nombre del Consejo Comunal" class="consejo-nombre" required>
                <input type="text" placeholder="Código SITUR" class="consejo-situr" required>
                <button type="button" class="remover-consejo-btn">-</button>
            `;
            if (consejosComunalesContainer) {
                consejosComunalesContainer.appendChild(consejoDiv);
            }
        });
    }

    if (consejosComunalesContainer) {
        consejosComunalesContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('remover-consejo-btn')) {
                e.target.parentElement.remove();
            }
        });
    }

    const agregarConsejoSimpleBtn = document.getElementById('agregar-consejo-simple-btn');
    const removerConsejoSimpleBtn = document.getElementById('remover-consejo-simple-btn');
    const consejosComunalesContainerSimple = document.getElementById('consejos-comunales-container-simple');
    const excelFileInput = document.getElementById('excel-file-input');
    const excelFileInputComuna = document.getElementById('excel-file-input-comuna');

    excelFileInputComuna.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) {
            return;
        }
    
        const parroquia = document.getElementById('comunas-popup-title').textContent.replace('Comunas en ', '');
        if (!parroquia) {
            showNotification('No se ha podido determinar la parroquia.', true);
            return;
        }
    
        const formData = new FormData();
        formData.append('excelFile', file);
        formData.append('parroquia', parroquia);
    
        try {
            const response = await fetch(`${API_BASE_URL}/comunas/import-comunas`, {
                method: 'POST',
                body: formData
            });
    
            const result = await response.json();
    
            if (response.ok) {
                showNotification(result.message);
                document.getElementById('agregar-comuna-popup').style.display = 'none';
                resetAgregarComunaForm();
                if (updaters.has(parroquia)) {
                    updaters.get(parroquia)();
                }
            } else {
                showNotification(result.message, true);
            }
        } catch (error) {
            showNotification('Error al subir el archivo', true);
        }
    });

    const agregarNuevoConsejoComunalInput = () => {
        const consejoDiv = document.createElement('div');
        consejoDiv.classList.add('consejo-comunal-item');
        consejoDiv.innerHTML = `
            <input type="text" placeholder="Nombre del Consejo Comunal" class="consejo-nombre" required>
            <input type="text" placeholder="Código SITUR" class="consejo-situr" required>
        `;
        consejosComunalesContainerSimple.appendChild(consejoDiv);
    };

    agregarConsejoSimpleBtn.addEventListener('click', agregarNuevoConsejoComunalInput);

    removerConsejoSimpleBtn.addEventListener('click', () => {
        const items = consejosComunalesContainerSimple.querySelectorAll('.consejo-comunal-item');
        if (items.length > 0) {
            consejosComunalesContainerSimple.removeChild(items[items.length - 1]);
        }
    });

    excelFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) {
            return;
        }

        const comunaId = document.getElementById('comuna-select').value;
        if (!comunaId) {
            showNotification('Por favor, seleccione una comuna primero', true);
            return;
        }

        const formData = new FormData();
        formData.append('excelFile', file);

        try {
            const response = await fetch(`${API_BASE_URL}/comunas/${comunaId}/import-consejos`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (response.ok) {
                showNotification(result.message);
                document.getElementById('agregar-consejo-comunal-popup').style.display = 'none';
                resetConsejoComunalForm();
                const parroquia = document.getElementById('comunas-popup-title').textContent.replace('Comunas en ', '');
                if (updaters.has(parroquia)) {
                    updaters.get(parroquia)();
                }
            } else {
                showNotification(result.message, true);
            }
        } catch (error) {
            showNotification('Error al subir el archivo', true);
        }
    });

    document.getElementById('agregar-consejo-comunal-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const comunaId = document.getElementById('comuna-select').value;
        if (!comunaId) {
            showNotification('Por favor, seleccione una comuna', true);
            return;
        }

        const parroquia = document.getElementById('comunas-popup-title').textContent.replace('Comunas en ', '');

        const consejos_comunales = [];
        let formValido = true;
        document.querySelectorAll('#consejos-comunales-container-simple .consejo-comunal-item').forEach(item => {
            const nombreInput = item.querySelector('.consejo-nombre');
            const codigoInput = item.querySelector('.consejo-situr');
            const nombre = nombreInput.value.trim();
            const codigo_situr = codigoInput.value.trim();

            if (!nombre || !codigo_situr) {
                formValido = false;
            }
            consejos_comunales.push({ nombre, codigo_situr });
        });

        if (consejos_comunales.length === 0) {
            showNotification('Debe agregar al menos un consejo comunal', true);
            return;
        }

        if (!formValido) {
            showNotification('Todos los campos de los consejos comunales son obligatorios', true);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/comunas/${comunaId}/consejos-comunales`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ consejos_comunales })
            });

            if (response.ok) {
                showNotification('Consejos comunales guardados con éxito');
                document.getElementById('agregar-consejo-comunal-popup').style.display = 'none';
                resetConsejoComunalForm();
                if (updaters.has(parroquia)) {
                    updaters.get(parroquia)();
                }
            } else {
                const errorData = await response.json();
                showNotification(errorData.message, true);
            }
        } catch (error) {
            showNotification('Error de conexión al guardar los consejos comunales', true);
        }
    });

    const agregarComunaInputBtn = document.getElementById('agregar-comuna-input-btn');
    const removerComunaInputBtn = document.getElementById('remover-comuna-input-btn');
    const comunasContainer = document.getElementById('comunas-container');

    agregarComunaInputBtn.addEventListener('click', () => {
        const comunaItem = document.createElement('div');
        comunaItem.classList.add('comuna-item');
        comunaItem.innerHTML = `
            <input type="text" placeholder="Nombre de la Comuna" class="comuna-nombre" required>
            <input type="text" placeholder="Código del Circuito Comunal" class="comuna-codigo" required>
        `;
        comunasContainer.appendChild(comunaItem);
    });

    removerComunaInputBtn.addEventListener('click', () => {
        const items = comunasContainer.querySelectorAll('.comuna-item');
        if (items.length > 0) {
            comunasContainer.removeChild(items[items.length - 1]);
        }
    });

    document.getElementById('agregar-comuna-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const parroquia = document.getElementById('comunas-popup-title').textContent.replace('Comunas en ', '');
        const comunas = [];
        let formValido = true;

        document.querySelectorAll('#comunas-container .comuna-item').forEach(item => {
            const nombreInput = item.querySelector('.comuna-nombre');
            const codigoInput = item.querySelector('.comuna-codigo');
            const nombre = nombreInput.value.trim();
            const codigo_circuito_comunal = codigoInput.value.trim();

            if (!nombre || !codigo_circuito_comunal) {
                formValido = false;
            }
            comunas.push({ nombre, codigo_circuito_comunal, parroquia });
        });

        if (comunas.length === 0) {
            showNotification('Debe agregar al menos una comuna', true);
            return;
        }

        if (!formValido) {
            showNotification('Todos los campos de las comunas son obligatorios', true);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/comunas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(comunas)
            });

            if (response.ok) {
                showNotification('Comuna(s) guardada(s) con éxito');
                agregarComunaPopup.style.display = 'none';
                resetAgregarComunaForm();
                if (updaters.has(parroquia)) {
                    updaters.get(parroquia)();
                }
            } else {
                const errorData = await response.json();
                showNotification(errorData.message, true);
            }
        } catch (error) {
            showNotification('Error de conexión al guardar la(s) comuna(s)', true);
        }
    });

    const noTocadasElement = document.getElementById('comunidades-no-tocadas');
    if (noTocadasElement) {
        noTocadasElement.addEventListener('click', async () => {
            const noTocadasList = document.getElementById('no-tocadas-list');
            const comunasNoContactadas = await fetch(`${API_BASE_URL}/comunas/stats/no-contactadas`).then(res => res.json());
            noTocadasList.innerHTML = '';
            comunasNoContactadas.forEach(comuna => {
                const comunaDiv = document.createElement('div');
                comunaDiv.textContent = `${comuna.nombre} (${comuna.parroquia})`;
                noTocadasList.appendChild(comunaDiv);
            });
            noTocadasPopup.style.display = 'block';
        });

        // Cargar comunidades no tocadas al inicio
        try {
            const comunasNoContactadas = await fetch(`${API_BASE_URL}/comunas/stats/no-contactadas`).then(res => res.json());
            noTocadasElement.textContent = `Comunidades sin abordar: ${comunasNoContactadas.length}`;
        } catch (error) {
            console.error('Error al cargar las comunidades no tocadas:', error);
            noTocadasElement.textContent = 'Comunidades sin abordar: (Error al cargar)';
        }
    }

    // New logic for modifying communes and consejos comunales
    const modificarComunaPopup = document.getElementById('modificar-comuna-popup');
    const modificarConsejoComunalPopup = document.getElementById('modificar-consejo-comunal-popup');
    const consejosComunalesPopup = document.getElementById('consejos-comunales-popup');

    document.getElementById('comunas-list').addEventListener('click', (e) => {
        if (e.target.classList.contains('modify-comuna-btn')) {
            const button = e.target;
            document.getElementById('modificar-comuna-id').value = button.dataset.id;
            document.getElementById('modificar-comuna-nombre').value = button.dataset.nombre;
            document.getElementById('modificar-comuna-codigo').value = button.dataset.codigo;
            modificarComunaPopup.style.display = 'block';
        }
    });

    document.getElementById('modificar-comuna-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('modificar-comuna-id').value;
        const nombre = document.getElementById('modificar-comuna-nombre').value;
        const codigo = document.getElementById('modificar-comuna-codigo').value;

        await fetch(`${API_BASE_URL}/comunas/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, codigo })
        });

        modificarComunaPopup.style.display = 'none';
        const parroquia = document.getElementById('comunas-popup-title').textContent.replace('Comunas en ', '');
        const parroquiaLink = document.querySelector(`a[data-parroquia="${parroquia}"]`);
        parroquiaLink.click();
    });

    async function showConsejosComunales(comunaId, comunaNombre) {
        const consejosList = document.getElementById('consejos-comunales-list');
        document.getElementById('consejos-comunales-popup-title').textContent = `Consejos Comunales de la Comuna ${comunaNombre}`;

        const consejos = await fetch(`${API_BASE_URL}/comunas/${comunaId}/consejos`).then(res => res.json());
        consejosList.innerHTML = '';
        if (consejos.length > 0) {
            consejos.forEach(consejo => {
                const consejoDiv = document.createElement('div');
                consejoDiv.className = 'consejo-item';
                let modifyButtonHtml = '';
                if (userRole === 'superadmin' || userRole === 'admin') {
                    modifyButtonHtml = `
                    <button class="modify-consejo-btn" data-id="${consejo._id}" data-nombre="${consejo.nombre}" data-codigo="${consejo.codigo_situr}">
                        <svg class="modify-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                        </svg>
                    </button>`;
                }
                consejoDiv.innerHTML = `
                    <span>${consejo.nombre} (${consejo.codigo_situr})</span>
                    ${modifyButtonHtml}
                `;
                consejosList.appendChild(consejoDiv);
            });
        } else {
            consejosList.innerHTML = 'No hay consejos comunales registrados.';
        }

        consejosComunalesPopup.style.display = 'block';
    }

    document.getElementById('consejos-comunales-list').addEventListener('click', (e) => {
        if (e.target.classList.contains('modify-consejo-btn')) {
            const button = e.target;
            document.getElementById('modificar-consejo-comunal-id').value = button.dataset.id;
            document.getElementById('modificar-consejo-comunal-nombre').value = button.dataset.nombre;
            document.getElementById('modificar-consejo-comunal-codigo').value = button.dataset.codigo;
            modificarConsejoComunalPopup.style.display = 'block';
        }
    });

    document.getElementById('modificar-consejo-comunal-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('modificar-consejo-comunal-id').value;
        const nombre = document.getElementById('modificar-consejo-comunal-nombre').value;
        const codigo = document.getElementById('modificar-consejo-comunal-codigo').value;

        await fetch(`${API_BASE_URL}/comunas/consejo/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, codigo })
        });

        modificarConsejoComunalPopup.style.display = 'none';
        const comunaId = document.querySelector('.comuna-item.active').dataset.id;
        const comunaNombre = document.querySelector('.comuna-item.active').dataset.nombre;
        showConsejosComunales(comunaId, comunaNombre);
    });
});