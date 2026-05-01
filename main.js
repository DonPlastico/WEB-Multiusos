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

let offsetActual = 0;        // pa saber por donde vamos
let busquedaActual = '';     // pa q el "cargar mas" use el mismo filtro
let cargando = false;        // evita doble click

function crearTarjeta(juego) {
    const portada = juego.cover
        ? juego.cover.url.replace('t_thumb', 't_cover_big').replace('//', 'https://')
        : 'https://via.placeholder.com/264x374?text=SIN+PORTADA';

    const fechaFormateada = juego.first_release_date
        ? new Date(juego.first_release_date * 1000).toLocaleDateString('es-ES', {
            day: 'numeric', month: 'long', year: 'numeric'
        })
        : 'TBA';

    const platPrincipal = juego.platforms ? juego.platforms[0].name : 'PC';
    const extraCount = juego.platforms && juego.platforms.length > 1
        ? `<span class="plat-count">+${juego.platforms.length - 1}</span>`
        : '';

    return `
        <div class="game-card" data-game-title="${juego.name}">
            <div class="game-cover-container">
                <div class="top-platform-tag">${platPrincipal.split(' ')[0]}</div>
                <img src="${portada}" alt="${juego.name}" class="game-cover">
            </div>
            <div class="game-info">
                <h3 class="game-title">${juego.name}</h3>
                <div class="game-release-info">
                    <span class="date">${fechaFormateada}</span>
                    <span class="dot">•</span>
                    <span class="main-plat">PC</span>
                    ${extraCount}
                </div>
                <div class="game-price" data-title="${juego.name}">
                    <span class="price-loading">Buscando precio...</span>
                </div>
            </div>
        </div>
    `;
}

function cargarPrecios(elementos) {
    elementos.forEach(async (el, index) => {
        await new Promise(resolve => setTimeout(resolve, index * 300));
        const title = el.getAttribute('data-title');
        try {
            const r = await fetch(`/api/itad?title=${encodeURIComponent(title)}`);
            const data = await r.json();
            if (data.precio) {
                el.innerHTML = `<span class="price-badge">Desde <strong>${data.precio.toFixed(2)} €</strong>${data.voucher ? ' <span class="voucher-tag">🏷️ Cupón</span>' : ''}</span>`;
            } else {
                el.innerHTML = `<span class="price-na">No disponible</span>`;
            }
        } catch {
            el.innerHTML = '';
        }
    });
}

async function cargarJuegosIGDB(busqueda = '', resetear = true) {
    if (cargando) return;
    cargando = true;

    if (resetear) {
        offsetActual = 0;
        busquedaActual = busqueda;
        gridJuegos.innerHTML = '<div style="width:100%; text-align:center; color:#00f3ff; font-size:1.2rem; text-shadow:0 0 10px rgba(0,243,255,0.5);">Sincronizando con la red neuronal de IGDB...</div>';
        // borro el botón de cargar más si existía
        document.getElementById('btn-cargar-mas')?.remove();
    }

    try {
        const url = `/api/igdb?offset=${offsetActual}${busquedaActual ? `&query=${encodeURIComponent(busquedaActual)}` : ''}`;
        const respuesta = await fetch(url);
        if (!respuesta.ok) throw new Error('Error en el servidor de Vercel');

        const datos = await respuesta.json();

        if (resetear) gridJuegos.innerHTML = '';

        // quitamos el botón viejo antes de añadir tarjetas nuevas
        document.getElementById('btn-cargar-mas')?.remove();

        // guardamos cuántos elementos había antes pa pillar solo los nuevos
        const anteriorCount = gridJuegos.querySelectorAll('.game-price').length;

        datos.forEach(juego => {
            gridJuegos.innerHTML += crearTarjeta(juego);
        });

        // pillamos solo los nuevos elementos pa cargar sus precios
        const todosLosPrecios = gridJuegos.querySelectorAll('.game-price');
        const nuevosPrecios = Array.from(todosLosPrecios).slice(anteriorCount);
        cargarPrecios(nuevosPrecios);

        // si devuelve 50 juegos, puede haber más — mostramos el botón
        if (datos.length === 50) {
            const btnMas = document.createElement('div');
            btnMas.id = 'btn-cargar-mas';
            btnMas.innerHTML = `<button onclick="cargarMas()">Cargar 50 más</button>`;
            gridJuegos.after(btnMas);
        }

        offsetActual += datos.length;

    } catch (error) {
        console.error("Error cargando juegos:", error);
        gridJuegos.innerHTML = '<div style="color:#ff4757; text-align:center; width:100%;">Error crítico al conectar con IGDB. Revisa los logs de Vercel.</div>';
    }

    cargando = false;
}

function cargarMas() {
    cargarJuegosIGDB(busquedaActual, false);
}

// Carga inicial
cargarJuegosIGDB();

btnBuscar.addEventListener('click', () => {
    cargarJuegosIGDB(inputBuscar.value.trim());
});

inputBuscar.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        cargarJuegosIGDB(inputBuscar.value.trim());
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