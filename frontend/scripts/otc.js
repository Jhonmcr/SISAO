import { circuitosParroquias } from './home/select_populator.js';
import { getApiBaseUrlAsync } from './config.js';

document.addEventListener('DOMContentLoaded', async () => {
    const API_BASE_URL = await getApiBaseUrlAsync();
    const circuitosContainer = document.getElementById('circuitos-container');

    // Cargar contadores de casos
    const caseCounts = await fetch(`${API_BASE_URL}/casos/stats/parroquias`).then(res => res.json());
    const caseCountsMap = caseCounts.reduce((map, item) => {
        map[item._id] = item.count;
        return map;
    }, {});

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
            parroquiasList.appendChild(parroquiaItem);
        });

        circuitoDiv.appendChild(parroquiasList);
        circuitosContainer.appendChild(circuitoDiv);
    }

    // Lógica de Popups
    const comunasPopup = document.getElementById('comunas-popup');
    const agregarComunaPopup = document.getElementById('agregar-comuna-popup');
    const noTocadasPopup = document.getElementById('no-tocadas-popup');
    const closeButtons = document.querySelectorAll('.close-button');
    const agregarComunaBtn = document.getElementById('agregar-comuna-btn');
    const agregarConsejoBtn = document.getElementById('agregar-consejo-btn');
    const consejosComunalesContainer = document.getElementById('consejos-comunales-container');
    const comunasList = document.getElementById('comunas-list');

    document.querySelectorAll('.parroquia a').forEach(link => {
        const parroquia = link.dataset.parroquia;
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.style.display = 'none';
        link.parentElement.appendChild(tooltip);

        link.addEventListener('mouseenter', async () => {
            const comunas = await fetch(`${API_BASE_URL}/comunas/parroquia/${parroquia}`).then(res => res.json());
            const numComunas = comunas.length;
            const numConsejos = comunas.reduce((total, comuna) => total + comuna.consejos_comunales.length, 0);
            tooltip.textContent = `${numComunas} Comunas, ${numConsejos} Consejos Comunales`;
            tooltip.style.display = 'block';
        });

        link.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
        });

        link.addEventListener('click', async (e) => {
            e.preventDefault();
            document.getElementById('comunas-popup-title').textContent = `Comunas en ${parroquia}`;

            const comunas = await fetch(`${API_BASE_URL}/comunas/parroquia/${parroquia}`).then(res => res.json());
            comunasList.innerHTML = '';
            comunas.forEach(comuna => {
                const comunaDiv = document.createElement('div');
                comunaDiv.textContent = comuna.nombre;
                comunasList.appendChild(comunaDiv);
            });

            comunasPopup.style.display = 'block';
        });
    });

    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            comunasPopup.style.display = 'none';
            agregarComunaPopup.style.display = 'none';
            noTocadasPopup.style.display = 'none';
        });
    });

    agregarComunaBtn.addEventListener('click', () => {
        comunasPopup.style.display = 'none';
        agregarComunaPopup.style.display = 'block';
    });

    agregarConsejoBtn.addEventListener('click', () => {
        const consejoDiv = document.createElement('div');
        consejoDiv.innerHTML = `
            <input type="text" placeholder="Nombre del Consejo Comunal" class="consejo-nombre">
            <input type="text" placeholder="Código SITUR" class="consejo-situr">
        `;
        consejosComunalesContainer.appendChild(consejoDiv);
    });

    document.getElementById('agregar-comuna-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombre = document.getElementById('comuna-nombre').value;
        const codigo_circuito_comunal = document.getElementById('comuna-codigo').value;
        const parroquia = document.getElementById('comunas-popup-title').textContent.replace('Comunas en ', '');

        const consejos_comunales = [];
        document.querySelectorAll('#consejos-comunales-container .consejo-nombre').forEach((input, index) => {
            const nombre = input.value;
            const codigo_situr = document.querySelectorAll('#consejos-comunales-container .consejo-situr')[index].value;
            consejos_comunales.push({ nombre, codigo_situr });
        });

        const comunaData = { nombre, codigo_circuito_comunal, parroquia, consejos_comunales };

        await fetch(`${API_BASE_URL}/comunas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(comunaData)
        });

        agregarComunaPopup.style.display = 'none';
        document.getElementById('agregar-comuna-form').reset();
        consejosComunalesContainer.innerHTML = '';
    });

    document.getElementById('comunidades-no-tocadas').addEventListener('click', async () => {
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
    const comunasNoContactadas = await fetch(`${API_BASE_URL}/comunas/stats/no-contactadas`).then(res => res.json());
    document.getElementById('comunidades-no-tocadas').textContent = `Comunidades sin abordar: ${comunasNoContactadas.length}`;
});