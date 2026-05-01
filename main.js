// me guardo los botones del menu pa dales vida
const linksMenu = document.querySelectorAll('.nav-links a');
const vistas = document.querySelectorAll('.view');

linksMenu.forEach(link => {
    link.addEventListener('click', (evento) => {
        // corto el recargo de pagina pa q sea super fluido todo
        evento.preventDefault();

        // kito la luz a todos los links y se la pongo al q e pinchao
        linksMenu.forEach(l => l.classList.remove('active'));
        link.classList.add('active');

        // pillo a k seccion kiere ir el nota
        const target = link.getAttribute('data-target');

        // escondo too y muestro solo lo q kiere ver
        vistas.forEach(vista => {
            vista.classList.remove('active');
            if (vista.id === target) {
                vista.classList.add('active');
            }
        });
    });
});

// LOGICA PAL BOTON DE TEMAS (claro/oscuro/sistema)
const themeBtn = document.getElementById('theme-toggle');
const themeIcon = themeBtn.querySelector('i');

// array con los tres iconos k kiero q rote
const themeIcons = ['fa-desktop', 'fa-moon', 'fa-sun'];
let currentThemeIndex = 0; // empiezo en el cero k es el pc (sistema)

themeBtn.addEventListener('click', () => {
    // kito el icono k tiene ahora
    themeIcon.classList.remove(themeIcons[currentThemeIndex]);

    // paso al siguiente, si me paso de 3 vuelvo a empezar el circulo
    currentThemeIndex = (currentThemeIndex + 1) % themeIcons.length;

    // le pongo el nuevo icono
    themeIcon.classList.add(themeIcons[currentThemeIndex]);

    // aki luego le meto la logica pa q me cambie las variables de css d verda
    if (currentThemeIndex === 1) {
        console.log("e puesto el modo oscuro");
    } else if (currentThemeIndex === 2) {
        console.log("e puesto el modo claro... m kema los ojos");
    } else {
        console.log("q decida el pc del nota");
    }
});

// ==========================================================================
//   LOGICA DE JUEGOS (IGDB API via Vercel Serverless)
// ==========================================================================

const gridJuegos = document.getElementById('games-grid');
const btnBuscar = document.getElementById('btn-buscar-juegos');
const inputBuscar = document.getElementById('search-juegos');

async function cargarJuegosIGDB() {
    gridJuegos.innerHTML = '<div style="width:100%; text-align:center; color:#00f3ff; font-size:1.2rem; text-shadow:0 0 10px rgba(0,243,255,0.5);">Sincronizando con la red neuronal de IGDB...</div>';

    try {
        // Llamamos a tu API interna de Vercel (el archivo igdb.js de la carpeta api)
        const respuesta = await fetch('/api/igdb');
        if (!respuesta.ok) throw new Error('Error en el servidor de Vercel');

        const datos = await respuesta.json();
        gridJuegos.innerHTML = '';

        datos.forEach(juego => {
            // Ajustamos la imagen: IGDB da miniaturas por defecto, las pasamos a 720p (t_720p) o cover_big
            const portada = juego.cover
                ? juego.cover.url.replace('t_thumb', 't_cover_big').replace('//', 'https://')
                : 'https://via.placeholder.com/264x374?text=SIN+PORTADA';

            // Convertimos el Timestamp de IGDB a año
            const año = juego.first_release_date
                ? new Date(juego.first_release_date * 1000).getFullYear()
                : 'TBA';

            // Lógica de plataformas (PC +X)
            const platPrincipal = juego.platforms ? juego.platforms[0].name : 'PC';
            const extraCount = juego.platforms && juego.platforms.length > 1
                ? `<span class="plat-count">+${juego.platforms.length - 1}</span>`
                : '';

            const tarjetaHTML = `
                <div class="game-card">
                    <div class="game-cover-container">
                        <div class="top-platform-tag">${platPrincipal.split(' ')[0]}</div>
                        <img src="${portada}" alt="${juego.name}" class="game-cover">
                    </div>
                    <div class="game-info">
                        <h3 class="game-title">${juego.name}</h3>
                        <div class="game-release-info">
                            <span class="date">${año}</span>
                            <span class="dot">•</span>
                            <span class="main-plat">PC</span>
                            ${extraCount}
                        </div>
                    </div>
                </div>
            `;
            gridJuegos.innerHTML += tarjetaHTML;
        });
    } catch (error) {
        console.error("Error cargando juegos:", error);
        gridJuegos.innerHTML = '<div style="color:#ff4757; text-align:center; width:100%;">Error crítico al conectar con IGDB. Revisa los logs de Vercel.</div>';
    }
}

// Disparo la carga inicial
cargarJuegosIGDB();

// Eventos para el buscador (aunque ahora cargan los top por defecto)
btnBuscar.addEventListener('click', () => {
    // Por ahora recarga los destacados, luego implementaremos el buscador real de IGDB
    cargarJuegosIGDB();
});

inputBuscar.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        cargarJuegosIGDB();
    }
});

// ==========================================================================
//   LOGICA DEL PANEL DE FILTROS DE JUEGOS
// ==========================================================================

// pillo la barra de buscar generos y todos los botones d genero
const buscadorGeneros = document.getElementById('search-genre');
const itemsGenero = document.querySelectorAll('.genre-item');

if (buscadorGeneros) {
    // le pongo la oreja pa q a cada letra q escriba, se ponga a mirar
    buscadorGeneros.addEventListener('input', (e) => {
        const txt = e.target.value.toLowerCase().trim();

        itemsGenero.forEach(item => {
            // saco el texto del span de ese filtro
            const nombreGenero = item.querySelector('span').textContent.toLowerCase();
            const checkbox = item.querySelector('input');

            if (txt === '') {
                // si lo borra to, restauro a como tava de frabrica
                // escondo los raros (q tienen la clase hidden-genre) si no tan markaos
                if (item.classList.contains('hidden-genre') && !checkbox.checked) {
                    item.style.display = 'none';
                } else {
                    item.style.display = 'inline-block';
                }
            } else {
                // si escrive algo, miro si encaja y si es asi, lo pongo visible aunke fuera oculto
                if (nombreGenero.includes(txt)) {
                    item.style.display = 'inline-block';
                } else {
                    item.style.display = 'none';
                }
            }
        });
    });
}

// ==========================================================================
//   LOGICA DE LOS ACORDEONES D LA BARRA LATERAL
// ==========================================================================

const accordions = document.querySelectorAll('.accordion-header');

accordions.forEach(header => {
    header.addEventListener('click', () => {
        // busco el div padre q contiene too
        const parentItem = header.parentElement;

        // le kito o le pongo la clase active
        parentItem.classList.toggle('active');
    });
});