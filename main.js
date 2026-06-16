// traigo el cliente de supabase pa usar login y eso
import { supabase } from './supabase.js';

// traigo analytics de vercel para saber como la usan
import { inject } from '@vercel/analytics';
inject();

// speed insights pa ver si algo va lento
import { injectSpeedInsights } from '@vercel/speed-insights';
injectSpeedInsights();

// ==========================================================================
//   RUTAS Y NAVEGACION (URLs LIMPIAS Y BOTONES ATRAS/ADELANTE)
// ==========================================================================

const linksMenu = document.querySelectorAll('.nav-links a');
const vistas = document.querySelectorAll('.view');

// mapeo de rutas, cada id apunta a su url
const mapaRutas = {
    'home': '/',
    'games': '/juegos',
    'movies': '/peliculas',
    'series': '/series',
    'profile': '/perfil',
    'admin-panel': '/admin',
    'login': '/login',
    'register': '/registro',
    'waiting-confirmation': '/esperando-confirmacion',
    'verified-account': '/cuenta-verificada'
};

// banderas para no cargar 2 veces lo mismo de la api
let juegosCargados = false;
let peliculasCargadas = false;
let seriesCargadas = false;

// guardo donde estaba scrolleado en cada pagina
const memoriaScroll = {};
let vistaActualGlobal = 'home'; // saco cual es la vista actual

function cambiarVista(target, guardarEnHistorial = true, usernameUrl = null) {
    // antes de cambiar, guardo donde estaba
    memoriaScroll[vistaActualGlobal] = window.scrollY;

    // cambio el color del menu
    linksMenu.forEach(link => {
        if (link.getAttribute('data-target') === target) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // muestro la vista que toca
    vistas.forEach(vista => {
        if (vista.id === target) {
            vista.classList.add('active');
        } else {
            vista.classList.remove('active');
        }
    });

    // vuelvo a la posicion de scroll que tenia
    setTimeout(() => {
        window.scrollTo({
            top: memoriaScroll[target] || 0,
            behavior: 'instant'
        });
    }, 10);

    // actualizo cual es la vista actual
    vistaActualGlobal = target;

    // lazy loading, cargo la api solo la primera vez que entro
    if (target === 'games' && !juegosCargados) {
        aplicarFiltros();
        juegosCargados = true;
    } else if (target === 'movies' && !peliculasCargadas) {
        cargarTMDB('movie');
        peliculasCargadas = true;
    } else if (target === 'series' && !seriesCargadas) {
        cargarTMDB('tv');
        seriesCargadas = true;
    } else if (target === 'profile') {
        cargarPerfilPublico(usernameUrl);
    } else if (target === 'admin-panel') {
        iniciarPanelAdmin();
    }

    // cambio la url sin recargar
    if (guardarEnHistorial) {
        if (target === 'profile' && usernameUrl) {
            // URL dinámica para perfiles
            window.history.pushState({ vista: target, user: usernameUrl }, '', `/perfil/usuario/${usernameUrl}`);
        } else if (mapaRutas[target]) {
            // URLs normales
            window.history.pushState({ vista: target }, '', mapaRutas[target]);
        }
    }
}

// cuando hago click en el menu
linksMenu.forEach(link => {
    link.addEventListener('click', (evento) => {
        evento.preventDefault();
        const target = link.getAttribute('data-target');

        // Solo cambiamos si NO estamos ya en esa vista (Evita historiales duplicados)
        if (vistaActualGlobal !== target) {
            cambiarVista(target, true);
        }
    });
});

// ahora el logo es el boton de HOME
const logoHome = document.getElementById('logo-home');
if (logoHome) {
    logoHome.addEventListener('click', () => {
        cambiarVista('home', true);
        // quito el active del menu
        linksMenu.forEach(l => l.classList.remove('active'));
    });
}

// boton especial para admin
const btnAdminTop = document.getElementById('btn-admin');
if (btnAdminTop) {
    btnAdminTop.addEventListener('click', () => {
        cambiarVista('admin-panel', true);
        linksMenu.forEach(l => l.classList.remove('active'));
    });
}

// detecto cuando usan los botones atras/adelante del navegador
window.addEventListener('popstate', (evento) => {
    // Si hay un modal de detalles de juego abierto, lo cerramos primero
    const modalJuego = document.getElementById('game-details-modal');
    if (modalJuego && modalJuego.classList.contains('show')) {
        modalJuego.classList.remove('show');
        document.body.classList.remove('no-scroll');
        document.documentElement.classList.remove('no-scroll');
        return; // Cortamos aquí para que no navegue a otra página
    }

    if (evento.state && evento.state.vista) {
        // vuelvo a la vista anterior sin guardar
        cambiarVista(evento.state.vista, false, evento.state.user || null);
    } else {
        arrancarEnrutador();
    }
});

// cuando entran directamente a una url tipo /juegos o /perfil/usuario/...
function arrancarEnrutador() {
    const rutaActual = window.location.pathname;
    let vistaInicial = 'home'; // default
    let userInitial = null;

    // DETECTAR URL DINÁMICA DE PERFIL
    if (rutaActual.startsWith('/perfil/usuario/')) {
        userInitial = rutaActual.split('/').pop();
        vistaInicial = 'profile';
    } else {
        // busco que vista corresponde a la url normal
        for (const [idVista, url] of Object.entries(mapaRutas)) {
            if (url === rutaActual) {
                vistaInicial = idVista;
                break;
            }
        }
    }

    // muestro esa vista sin empujarla al historial todavía
    cambiarVista(vistaInicial, false, userInitial);

    // Así los botones < y > saben exactamente a dónde volver.
    const urlFinal = userInitial ? `/perfil/usuario/${userInitial}` : (mapaRutas[vistaInicial] || '/');
    window.history.replaceState({ vista: vistaInicial, user: userInitial }, '', urlFinal);
}

// ==========================================================================
//   TEMAS CLARO OSCURO Y ESO
// ==========================================================================

const themeBtn = document.getElementById('theme-toggle');
const themeIcon = themeBtn.querySelector('i');

// creo el menu de temas
const themeMenu = document.createElement('div');
themeMenu.className = 'theme-menu';
themeMenu.innerHTML = `
    <button class="theme-option" data-theme="system">
        <i class="fas fa-desktop"></i>
        <span>Sistema</span>
    </button>
    <button class="theme-option" data-theme="light">
        <i class="fas fa-sun"></i>
        <span>Claro</span>
    </button>
    <button class="theme-option" data-theme="dark">
        <i class="fas fa-moon"></i>
        <span>Oscuro</span>
    </button>
`;

// agrgo el menu al boton
const themeContainer = document.createElement('div');
themeContainer.className = 'theme-dropdown';
themeBtn.parentNode.insertBefore(themeContainer, themeBtn);
themeContainer.appendChild(themeBtn);
themeContainer.appendChild(themeMenu);

// funcion pa cambiar el tema
function setTheme(theme) {
    // guardo en localStorage
    localStorage.setItem('dp_sys_theme', theme);

    // aplico el atributo al root
    document.documentElement.setAttribute('data-theme', theme);

    // actualizo el icono segun el tema
    if (theme === 'system') {
        themeIcon.className = 'fas fa-desktop';
    } else if (theme === 'light') {
        themeIcon.className = 'fas fa-sun';
    } else if (theme === 'dark') {
        themeIcon.className = 'fas fa-moon';
    }

    // actualizo el active en el menu
    document.querySelectorAll('.theme-option').forEach(opt => {
        if (opt.getAttribute('data-theme') === theme) {
            opt.classList.add('active');
        } else {
            opt.classList.remove('active');
        }
    });

    // detecto si el sistema prefiere oscuro
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    console.log(`tema cambiado a: ${theme} | sistema prefiere: ${isDarkMode ? 'oscuro' : 'claro'}`);
}

// cargo el tema guardado o el default
function loadSavedTheme() {
    const savedTheme = localStorage.getItem('dp_sys_theme');

    if (savedTheme && ['system', 'light', 'dark'].includes(savedTheme)) {
        setTheme(savedTheme);
    } else {
        setTheme('system');
    }
}

// controlo si el menu esta abierto
let menuOpen = false;
themeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    // cierra los otros menus
    langMenu.classList.remove('show');
    langMenuOpen = false;
    userMenu.classList.remove('show');
    userMenuOpen = false;
    // abre/cierra el de tema
    menuOpen = !menuOpen;
    if (menuOpen) themeMenu.classList.add('show');
    else themeMenu.classList.remove('show');
});

// Cerrar menú al hacer clic fuera
document.addEventListener('click', (e) => {
    if (!themeContainer.contains(e.target)) {
        themeMenu.classList.remove('show');
        menuOpen = false;
    }
});

// cuando hago click en una opcion de tema
document.querySelectorAll('.theme-option').forEach(option => {
    option.addEventListener('click', (e) => {
        const theme = option.getAttribute('data-theme');
        setTheme(theme);
        themeMenu.classList.remove('show');
        menuOpen = false;
    });
});

// detecto si cambia el modo oscuro del sistema
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const currentTheme = localStorage.getItem('dp_sys_theme');
    if (currentTheme === 'system') {
        // fuerzo actualizar el tema
        setTheme('system');
    }
});

// cargo el tema al iniciar
loadSavedTheme();

// ==========================================================================
//   IDIOMA - MENU DESPLEGABLE (igual que el de tema)
// ==========================================================================

const langBtn = document.getElementById('lang-toggle');
const langFlagImg = langBtn.querySelector('img');

const langMenu = document.createElement('div');
langMenu.className = 'theme-menu lang-menu';
langMenu.innerHTML = `
    <button class="theme-option lang-option active" data-lang="es" data-flag="es">
        <img src="https://flagcdn.com/24x18/es.png" alt="ES"> <span>Español</span>
    </button>
    <button class="theme-option lang-option" data-lang="en" data-flag="us">
        <img src="https://flagcdn.com/24x18/us.png" alt="EN"> <span>English (EE.UU)</span>
    </button>
    <button class="theme-option lang-option" data-lang="fr" data-flag="fr">
        <img src="https://flagcdn.com/24x18/fr.png" alt="FR"> <span>Français</span>
    </button>
    <button class="theme-option lang-option" data-lang="it" data-flag="it">
        <img src="https://flagcdn.com/24x18/it.png" alt="IT"> <span>Italiano</span>
    </button>
    <button class="theme-option lang-option" data-lang="de" data-flag="de">
        <img src="https://flagcdn.com/24x18/de.png" alt="DE"> <span>Deutsch</span>
    </button>
    <button class="theme-option lang-option" data-lang="zh" data-flag="cn">
        <img src="https://flagcdn.com/24x18/cn.png" alt="ZH"> <span>简体中文</span>
    </button>
    <button class="theme-option lang-option" data-lang="ja" data-flag="jp">
        <img src="https://flagcdn.com/24x18/jp.png" alt="JA"> <span>日本語</span>
    </button>
`;

const langContainer = document.createElement('div');
langContainer.className = 'theme-dropdown';
langBtn.parentNode.insertBefore(langContainer, langBtn);
langContainer.appendChild(langBtn);
langContainer.appendChild(langMenu);

let langMenuOpen = false;
langBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    // cierra el de tema si está abierto
    themeMenu.classList.remove('show');
    menuOpen = false;
    // cierra el de usuario si está abierto
    userMenu?.classList.remove('show');
    userMenuOpen = false;

    langMenuOpen = !langMenuOpen;
    if (langMenuOpen) langMenu.classList.add('show');
    else langMenu.classList.remove('show');
});

document.addEventListener('click', (e) => {
    if (!langContainer.contains(e.target)) {
        langMenu.classList.remove('show');
        langMenuOpen = false;
    }
});

document.querySelectorAll('.theme-option.lang-option').forEach(opt => {
    opt.addEventListener('click', () => {
        const lang = opt.dataset.lang;
        const flag = opt.dataset.flag;

        // actualiza la bandera del botón
        langFlagImg.src = `https://flagcdn.com/24x18/${flag}.png`;
        langFlagImg.alt = lang.toUpperCase();

        // marca el active
        document.querySelectorAll('.theme-option.lang-option').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');

        // guarda en localStorage
        localStorage.setItem('dp_sys_lang', lang);

        langMenu.classList.remove('show');
        langMenuOpen = false;
    });
});

// ==========================================================================
//   LOGICA DE JUEGOS Y IGDB API
// ==========================================================================

// vigilo el scroll para cargar mas cosas
const observadorScroll = new IntersectionObserver((entradas) => {
    entradas.forEach(entrada => {
        if (entrada.isIntersecting) {
            const id = entrada.target.id;
            // si veo el boton y no esta cargando, cargo mas
            if (id === 'btn-cargar-mas' && !cargando) {
                cargarMas();
            } else if (id === 'btn-cargar-mas-movie' && !cargandoTMDB) {
                cargarMasTMDB('movie');
            } else if (id === 'btn-cargar-mas-tv' && !cargandoTMDB) {
                cargarMasTMDB('tv');
            }
        }
    });
}, { rootMargin: '300px' }); // cargo antes para que no se vea

const gridJuegos = document.getElementById('games-grid');
const btnBuscar = document.getElementById('btn-buscar-juegos');
const inputBuscar = document.getElementById('search-juegos');

let offsetActual = 0;
let busquedaActual = '';
let cargando = false;
let filtrosGlobales = {};

let autoScanTimeout = null;
let peticionAbort = null;

function crearTarjeta(juego) {
    // 1. Lógica de la imagen
    const tienePortada = juego.cover && juego.cover.url;
    const portada = tienePortada
        ? juego.cover.url.replace('t_thumb', 't_cover_big').replace('//', 'https://')
        : '';

    const fechaFormateada = juego.first_release_date
        ? new Date(juego.first_release_date * 1000).toLocaleDateString('es-ES', {
            day: 'numeric', month: 'long', year: 'numeric'
        })
        : 'TBA';

    // Obtener todas las plataformas únicas
    let htmlPlataformas = '';
    if (juego.platforms && juego.platforms.length > 0) {
        const nombresPlat = [...new Set(juego.platforms.map(p => p.name))];
        htmlPlataformas = nombresPlat.map(name => `
            <span class="plat-tag">${name.split(' ')[0]}</span>
        `).join('');
    }

    // guardo datos ocultos para el filtro (Y AHORA LA URL DE COMPRA)
    const storesData = juego.itad ? juego.itad.stores : 'none';
    const storeUrlData = (juego.itad && juego.itad.url) ? juego.itad.url : ''; // Extraemos URL
    const platformsData = juego.platforms ? juego.platforms.map(p => p.name.toLowerCase()).join(',') : '';

    const pNamesLower = juego.platforms ? juego.platforms.map(p => p.name.toLowerCase()) : [];
    const hasPC = pNamesLower.some(n => n.includes('pc') || n.includes('windows'));

    let htmlPrecio = '';
    if (juego.itad && juego.itad.precio !== null) {
        htmlPrecio = `<span class="price-badge">Desde <strong>${juego.itad.precio.toFixed(2)} €</strong></span>`;
    } else if (!hasPC) {
        htmlPrecio = `<span class="price-na" style="color: var(--text-muted);"><i class="fas fa-gamepad"></i> Edición Consola</span>`;
    } else {
        htmlPrecio = `<span class="price-na">Sin ofertas actuales</span>`;
    }

    // 2. Lógica del contenedor de imagen
    const imgHtml = tienePortada
        ? `<img src="${portada}" alt="${juego.name}" class="game-cover" onerror="this.parentElement.innerHTML='<div class=\\'no-cover\\'><i class=\\'fas fa-gamepad\\'></i></div>'">`
        : `<div class="no-cover"><i class="fas fa-gamepad"></i></div>`;

    // Inyectamos el data-store-url en la etiqueta principal de la tarjeta
    return `
        <div class="game-card" data-game-id="${juego.id}" data-game-title="${juego.name}" data-stores="${storesData}" data-store-url="${storeUrlData}" data-platforms="${platformsData}">
            <div class="game-cover-container">
                <div class="platforms-container" style="position:absolute; top:12px; left:12px; z-index:2; display:flex; flex-wrap:wrap; gap:4px;">
                    ${htmlPlataformas}
                </div>
                ${imgHtml}
            </div>
            <div class="game-info">
                <h3 class="game-title">${juego.name}</h3>
                <div class="game-release-info">
                    <span class="date">${fechaFormateada}</span>
                </div>
                <div class="game-price">
                    ${htmlPrecio}
                </div>
            </div>
        </div>
    `;
}

async function cargarJuegosIGDB(busqueda = '', resetear = true, filtros = null) {
    // 1. SISTEMA DE FRENADO DE EMERGENCIA
    if (resetear) {
        clearTimeout(autoScanTimeout); // Detenemos cualquier escáner fantasma
        if (peticionAbort) peticionAbort.abort(); // Cortamos la conexión de red anterior

        cargando = false; // Desbloqueamos el sistema
        offsetActual = 0;
        busquedaActual = busqueda;

        if (filtros !== null) {
            filtrosGlobales = filtros;
        }

        // Mostrar loader inicial
        gridJuegos.innerHTML = `
            <div id="loader-games" style="grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 0;">
                <i class="fas fa-circle-notch fa-spin" style="font-size: 3rem; color: var(--primary); margin-bottom: 10px;"></i>
                <h3 class="loading-text" style="color: var(--text-muted); letter-spacing: 3px; font-weight: 600;">CARGANDO DATOS...</h3>
            </div>
        `;

        setTimeout(() => {
            const loaderText = document.querySelector('#loader-games .loading-text');
            if (loaderText) loaderText.textContent = 'ADAPTÁNDONOS A TUS PREFERENCIAS...';
        }, 1200);

        document.getElementById('btn-cargar-mas')?.remove();
    } else {
        const btnMas = document.getElementById('btn-cargar-mas');
        if (btnMas) {
            btnMas.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px 0;">
                    <i class="fas fa-circle-notch fa-spin" style="font-size: 2rem; color: var(--primary); margin-bottom: 10px;"></i>
                    <span style="color: var(--text-muted); letter-spacing: 2px; font-weight: 600; margin-bottom: 15px;">CARGANDO MÁS JUEGOS...</span>
                </div>
            `;
        }
    }

    if (cargando) return;
    cargando = true;

    // 2. CREAMOS UNA NUEVA SEÑAL PARA ESTA PETICIÓN
    const miAbort = new AbortController();
    peticionAbort = miAbort;

    try {
        let url = `/api/igdb?offset=${offsetActual}`;
        if (busquedaActual) url += `&query=${encodeURIComponent(busquedaActual)}`;
        if (filtrosGlobales.platforms) url += `&platforms=${filtrosGlobales.platforms}`;
        if (filtrosGlobales.genres) url += `&genres=${filtrosGlobales.genres}`;
        if (filtrosGlobales.dateMin) url += `&dateMin=${filtrosGlobales.dateMin}`;
        if (filtrosGlobales.dateMax) url += `&dateMax=${filtrosGlobales.dateMax}`;
        if (filtrosGlobales.modes) url += `&modes=${filtrosGlobales.modes}`;

        console.log('📡 Llamada a:', url);

        // Le pasamos la señal a la llamada de red
        const respuesta = await fetch(url, { signal: miAbort.signal });
        if (!respuesta.ok) throw new Error(`Error HTTP ${respuesta.status}`);

        const datos = await respuesta.json();

        if (resetear) gridJuegos.innerHTML = '';
        document.getElementById('btn-cargar-mas')?.remove();

        if (datos.length === 0) {
            if (resetear) {
                gridJuegos.innerHTML = '<div style="color:var(--text-muted); text-align:center; width:100%; padding: 2rem;">Sin resultados. Intenta otra busqueda.</div>';
            }
            if (peticionAbort === miAbort) cargando = false;
            return;
        }

        const precioMin = filtrosGlobales.precioMin ?? 0;
        const precioMax = filtrosGlobales.precioMax ?? 9999;
        const tiendasFiltro = filtrosGlobales.stores || [];

        const datosFiltrados = datos.filter(juego => {
            const precio = juego.itad?.precio;
            let pasaPrecio = true;
            if (precio !== null && precio !== undefined) {
                pasaPrecio = precio >= precioMin && precio <= precioMax;
            }

            let pasaTienda = true;
            if (tiendasFiltro.length > 0) {
                const storesDelJuego = juego.itad?.stores || '';
                pasaTienda = tiendasFiltro.some(tienda => storesDelJuego.includes(tienda));
            }

            return pasaPrecio && pasaTienda;
        });

        datosFiltrados.forEach(juego => {
            gridJuegos.innerHTML += crearTarjeta(juego);
        });

        // 3. AUTO-ESCANEO (SOLO SI NO NOS HAN CANCELADO)
        if (datos.length === 50) {
            const btnMas = document.createElement('div');
            btnMas.id = 'btn-cargar-mas';
            btnMas.style = "grid-column: 1 / -1; text-align: center; margin: 2rem 0;";

            if (datosFiltrados.length === 0) {
                btnMas.innerHTML = `
                    <div style="color: var(--warning); letter-spacing: 1px; font-size: 0.9rem; padding: 20px;">
                        <i class="fas fa-radar fa-spin"></i> Escaneando capas profundas... (Saltando sector irrelevante)
                    </div>
                `;
                gridJuegos.after(btnMas);

                // Programamos el siguiente escáner
                autoScanTimeout = setTimeout(() => {
                    if (peticionAbort === miAbort) {
                        cargando = false;
                        cargarMas();
                    }
                }, 800);

            } else {
                btnMas.innerHTML = `<button onclick="cargarMas()" style="background:transparent; border:1px solid var(--primary); color:var(--primary); padding:0.8rem 2.5rem; border-radius:40px; cursor:pointer; font-weight:600;">Cargar más</button>`;
                gridJuegos.after(btnMas);
                observadorScroll.observe(btnMas);
            }
        } else if (datos.length < 50 && datosFiltrados.length === 0) {
            const btnMas = document.createElement('div');
            btnMas.style = "grid-column: 1 / -1; text-align: center; margin: 2rem 0; color: var(--text-muted);";
            btnMas.innerHTML = '<i class="fas fa-exclamation-circle"></i> No se encontraron más resultados en toda la red.';
            gridJuegos.after(btnMas);
        }

        // Liberamos solo si somos la petición actual
        if (peticionAbort === miAbort) {
            offsetActual += datos.length;
            cargando = false;
        }

    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('🛑 Búsqueda cancelada e interceptada. Iniciando nueva orden.');
        } else {
            console.error("❌ Error cargando juegos:", error);
            if (resetear) {
                gridJuegos.innerHTML = '<div style="color:var(--error); text-align:center; width:100%; padding: 2rem;">Fallo al conectar con la API.</div>';
            }
            if (peticionAbort === miAbort) cargando = false;
        }
    }
}

function cargarMas() {
    cargarJuegosIGDB(busquedaActual, false);
}

// ==========================================================================
//   PERSISTENCIA DE FILTROS EN LOCALSTORAGE
// ==========================================================================
function guardarFiltros() {
    const platSeleccionadas = Array.from(document.querySelectorAll('.plat-item input:checked'))
        .map(cb => cb.value)
        .filter(val => val && val !== 'on');

    const tiendasSeleccionadas = Array.from(document.querySelectorAll('.tienda-item:checked'))
        .map(cb => cb.value);

    const generosSeleccionados = Array.from(document.querySelectorAll('.genre-item input:checked'))
        .map(cb => cb.value);

    // GUARDAR MODOS DE JUEGO (JUGADORES)
    const modosSeleccionados = Array.from(document.querySelectorAll('.mode-item:checked'))
        .map(cb => cb.value);

    const precioMin = document.getElementById('precio-min')?.value || '';
    const precioMax = document.getElementById('precio-max')?.value || '';

    const dateMin = document.getElementById('date-min')?.value || '';
    const dateMax = document.getElementById('date-max')?.value || '';

    const adultMovie = document.getElementById('adult-filter-movie')?.checked || false;
    const adultSeries = document.getElementById('adult-filter-series')?.checked || false;

    const filtrosState = {
        games: {
            platforms: platSeleccionadas,
            stores: tiendasSeleccionadas,
            genres: generosSeleccionados,
            modes: modosSeleccionados,
            precioMin,
            precioMax,
            dateMin,
            dateMax
        },
        movies: { adult: adultMovie },
        series: { adult: adultSeries }
    };

    localStorage.setItem('dp_sys_filters_v2', JSON.stringify(filtrosState));
}

function restaurarFiltrosDOM() {
    const guardados = localStorage.getItem('dp_sys_filters_v2');
    if (!guardados) return;

    try {
        const state = JSON.parse(guardados);

        if (state.games) {
            // Restaurar Plataformas
            if (state.games.platforms && state.games.platforms.length > 0) {
                const platInputs = document.querySelectorAll('.plat-item input');
                platInputs.forEach(cb => {
                    if (state.games.platforms.includes(cb.value)) cb.checked = true;
                });
            }

            // Restaurar Tiendas
            if (state.games.stores && state.games.stores.length > 0) {
                const tiendaInputs = document.querySelectorAll('.tienda-item');
                tiendaInputs.forEach(cb => {
                    if (state.games.stores.includes(cb.value)) cb.checked = true;
                });
            }

            // Restaurar Géneros
            if (state.games.genres && state.games.genres.length > 0) {
                const genreInputs = document.querySelectorAll('.genre-item input');
                genreInputs.forEach(cb => {
                    if (state.games.genres.includes(cb.value)) {
                        cb.checked = true;
                        cb.closest('.genre-item').style.display = '';
                    }
                });
            }

            // RESTAURAR MODOS DE JUEGO
            if (state.games.modes && state.games.modes.length > 0) {
                const modeInputs = document.querySelectorAll('.mode-item');
                modeInputs.forEach(cb => {
                    if (state.games.modes.includes(cb.value)) cb.checked = true;
                });
            }

            if (state.games.precioMin) document.getElementById('precio-min').value = state.games.precioMin;
            if (state.games.precioMax) document.getElementById('precio-max').value = state.games.precioMax;
            if (state.games.dateMin) document.getElementById('date-min').value = state.games.dateMin;
            if (state.games.dateMax) document.getElementById('date-max').value = state.games.dateMax;
        }

        // ... resto de lógica de pelis/series igual ...
        if (state.movies && state.movies.adult) {
            const cbMovie = document.getElementById('adult-filter-movie');
            if (cbMovie) cbMovie.checked = true;
        }
        if (state.series && state.series.adult) {
            const cbSeries = document.getElementById('adult-filter-series');
            if (cbSeries) cbSeries.checked = true;
        }
    } catch (error) {
        console.error('Error al restaurar filtros:', error);
    }
}

// Ejecutamos la restauración del DOM antes de cargar nada
restaurarFiltrosDOM();

window.cargarMas = cargarMas;

arrancarEnrutador();

let temporizadorBusqueda; // para la busqueda

// cuando el usuario escribe busco automaticamente
inputBuscar.addEventListener('input', () => {
    clearTimeout(temporizadorBusqueda); // si sigue escribiendo borro el anterior
    temporizadorBusqueda = setTimeout(() => {
        cargarJuegosIGDB(inputBuscar.value.trim());
    }, 500); // espero 0.5 segs
});

// click en la lupa directa
btnBuscar.addEventListener('click', () => {
    clearTimeout(temporizadorBusqueda);
    cargarJuegosIGDB(inputBuscar.value.trim());
});

// pulsar enter tambien funciona
inputBuscar.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        clearTimeout(temporizadorBusqueda);
        cargarJuegosIGDB(inputBuscar.value.trim());
    }
});

// ==========================================================================
//   BUSCADOR DE GÉNEROS
// ==========================================================================
const buscadorGeneros = document.getElementById('search-genre');
const itemsGenero = document.querySelectorAll('.genre-item');

if (buscadorGeneros) {
    buscadorGeneros.addEventListener('input', (e) => {
        const txt = e.target.value.toLowerCase().trim();

        itemsGenero.forEach(item => {
            // Buscamos el segundo span (el que tiene el texto, no el del checkbox)
            const spanTexto = item.querySelectorAll('span')[1];
            const nombreGenero = spanTexto ? spanTexto.textContent.toLowerCase() : item.textContent.toLowerCase();
            const checkbox = item.querySelector('input');
            const esOculto = item.classList.contains('hidden-genre');

            if (txt === '') {
                // Si borras la búsqueda, los "hidden" se vuelven a ocultar (SALVO que estén marcados)
                item.style.display = (esOculto && !checkbox.checked) ? 'none' : '';
            } else {
                // Si hay texto, revelamos todo lo que coincida
                item.style.display = nombreGenero.includes(txt) ? '' : 'none';
            }
        });
    });
}

// ==========================================================================
//   FILTROS DE TIENDAS, PLATAFORMAS Y GÉNEROS
// ==========================================================================

const tiendasItems = document.querySelectorAll('.tienda-item');
const platItems = document.querySelectorAll('.plat-item input');
const genreItemsInputs = document.querySelectorAll('.genre-item input');

// Temporizador global para el escudo anti-spam
let temporizadorFiltrosPrincipal;

function aplicarFiltros() {
    clearTimeout(temporizadorFiltrosPrincipal);

    // Esperamos 500ms (medio segundo) antes de lanzar la petición. 
    // Así evitamos el Error 500 si haces muchos clics seguidos.
    temporizadorFiltrosPrincipal = setTimeout(() => {
        // 1. Recolectar valores de las plataformas
        const platSeleccionadas = Array.from(document.querySelectorAll('.plat-item input:checked'))
            .map(cb => cb.value)
            .filter(val => val && val !== 'on')
            .join(',');

        // 2. Recolectar valores de Tiendas
        const tiendasSeleccionadas = Array.from(document.querySelectorAll('.tienda-item:checked'))
            .map(cb => cb.value.toLowerCase());

        // 3. Recolectar valores de Géneros
        const generosSeleccionados = Array.from(document.querySelectorAll('.genre-item input:checked'))
            .map(cb => cb.value)
            .join(',');

        // 4. Recolectar valores de Géneros (ahora con el nuevo sistema de tags en el HTML)
        const modosSeleccionados = Array.from(document.querySelectorAll('.mode-item:checked'))
            .map(cb => cb.value)
            .join(',');

        // 5. Recolectar valores de precio
        const precioMin = parseFloat(document.getElementById('precio-min')?.value) || 0;
        const precioMax = parseFloat(document.getElementById('precio-max')?.value) || 9999;

        // 6. RECOLECTAR FECHAS
        const dateMin = document.getElementById('date-min')?.value || '';
        const dateMax = document.getElementById('date-max')?.value || '';

        // GUARDAR ESTADO EN LA MEMORIA
        guardarFiltros();

        console.log("Plataformas:", platSeleccionadas, "| Tiendas:", tiendasSeleccionadas, "| Generos:", generosSeleccionados, "| Precio:", precioMin, "-", precioMax, "| Fechas:", dateMin, "-", dateMax);

        // Lanzar carga pasando todos los filtros
        cargarJuegosIGDB(busquedaActual, true, {
            platforms: platSeleccionadas,
            stores: tiendasSeleccionadas,
            genres: generosSeleccionados,
            modes: modosSeleccionados,
            precioMin,
            precioMax,
            dateMin,
            dateMax
        });
    }, 500);
}

// Listeners: Ahora todos apuntan directamente a aplicarFiltros (que ya tiene el retraso incorporado)
tiendasItems.forEach(cb => {
    cb.addEventListener('change', aplicarFiltros);
});

platItems.forEach(cb => {
    cb.addEventListener('change', aplicarFiltros);
});

genreItemsInputs.forEach(cb => {
    cb.addEventListener('change', aplicarFiltros);
});

// Agregar listeners para los modos de juego (JUGADORES)
const modeItems = document.querySelectorAll('.mode-item');
modeItems.forEach(cb => {
    cb.addEventListener('change', aplicarFiltros);
});

document.getElementById('precio-min')?.addEventListener('input', aplicarFiltros);
document.getElementById('precio-max')?.addEventListener('input', aplicarFiltros);
document.getElementById('date-min')?.addEventListener('change', aplicarFiltros);
document.getElementById('date-max')?.addEventListener('change', aplicarFiltros);

// boton para ver todas las plataformas
const btnVerPlats = document.getElementById('btn-ver-plats');
const platExtra = document.getElementById('plat-extra');
let platExtraVisible = false;

btnVerPlats?.addEventListener('click', () => {
    platExtraVisible = !platExtraVisible;
    if (platExtra) platExtra.style.display = platExtraVisible ? 'block' : 'none';
    btnVerPlats.textContent = platExtraVisible ? '− Ver menos' : '+ Ver todo';
});

// ==========================================================================
//   ACORDEONES
// ==========================================================================

const accordions = document.querySelectorAll('.accordion-header');

accordions.forEach(header => {
    header.addEventListener('click', () => {
        const parentItem = header.parentElement;
        parentItem.classList.toggle('active');
    });
});

// ==========================================================================
//   PELICULAS Y SERIES CON TMDB API
// ==========================================================================

let pageMovies = 1;
let searchMoviesActual = '';
let pageSeries = 1;
let searchSeriesActual = '';
let cargandoTMDB = false;

function crearTarjetaTMDB(media, tipo) {
    const isMovie = tipo === 'movie';
    const fechaFormat = media.fecha ? media.fecha.split('-')[0] : 'TBA'; // solo el año

    // info extra segun si es peli o serie
    let extraInfo = '';
    if (isMovie) {
        extraInfo = media.duracion ? `<span class="plat-count">${media.duracion} min</span>` : '';
    } else {
        extraInfo = media.temporadas ? `<span class="plat-count">T${media.temporadas} | E${media.episodios}</span>` : '';
    }

    const iconoPlataforma = media.plataformas === 'No disponible en streaming'
        ? '<i class="fas fa-times-circle" style="color:var(--error);"></i>'
        : '<i class="fas fa-play-circle" style="color:var(--success);"></i>';

    return `
        <div class="game-card">
            <div class="game-cover-container">
                <div class="top-platform-tag"><i class="fas fa-star" style="color:gold;"></i> ${media.nota}</div>
                <img src="${media.poster}" alt="${media.titulo}" class="game-cover">
            </div>
            <div class="game-info">
                <h3 class="game-title">${media.titulo}</h3>
                <div class="game-release-info">
                    <span class="date">${fechaFormat}</span>
                    <span class="dot">•</span>
                    <span class="main-plat">${isMovie ? 'Película' : 'Serie'}</span>
                    ${extraInfo}
                </div>
                <div class="game-price" style="margin-top: 10px; font-size: 0.8rem; color: var(--text-muted);">
                    ${iconoPlataforma} <strong>${media.plataformas}</strong>
                </div>
            </div>
        </div>
    `;
}

async function cargarTMDB(tipo, busqueda = '', resetear = true) {
    if (cargandoTMDB) return;
    cargandoTMDB = true;

    const grid = document.getElementById(tipo === 'movie' ? 'movies-grid' : 'series-grid');

    if (resetear) {
        if (tipo === 'movie') { pageMovies = 1; searchMoviesActual = busqueda; }
        else { pageSeries = 1; searchSeriesActual = busqueda; }

        // muestro el loader
        grid.innerHTML = `
            <div id="loader-${tipo}" style="grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 0;">
                <i class="fas fa-circle-notch fa-spin" style="font-size: 3rem; color: var(--primary); margin-bottom: 10px;"></i>
                <h3 class="loading-text" style="color: var(--text-muted); letter-spacing: 3px; font-weight: 600;">CARGANDO DATOS...</h3>
            </div>
        `;

        // cambio el texto
        setTimeout(() => {
            const loaderText = document.querySelector(`#loader-${tipo} .loading-text`);
            if (loaderText) loaderText.textContent = 'ADAPTÁNDONOS A TUS PREFERENCIAS...';
        }, 1200);

        document.getElementById(`btn-cargar-mas-${tipo}`)?.remove();
    } else {
        // transformo el boton en loader
        const btnMas = document.getElementById(`btn-cargar-mas-${tipo}`);
        if (btnMas) {
            const textoTipo = tipo === 'movie' ? 'PELÍCULAS' : 'SERIES';
            btnMas.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px 0;">
                    <i class="fas fa-circle-notch fa-spin" style="font-size: 2rem; color: var(--primary); margin-bottom: 10px;"></i>
                    <span style="color: var(--text-muted); letter-spacing: 2px; font-weight: 600; margin-bottom: 15px;">CARGANDO MÁS ${textoTipo}...</span>
                    
                    <button onclick="cargandoTMDB=false; cargarMasTMDB('${tipo}')" style="background:transparent; border:1px solid rgba(255,255,255,0.1); color:var(--text-muted); padding:0.5rem 1.5rem; border-radius:40px; cursor:pointer; font-size: 0.8rem; transition: 0.3s;" onmouseover="this.style.color='var(--primary)'; this.style.borderColor='var(--primary)'" onmouseout="this.style.color='var(--text-muted)'; this.style.borderColor='rgba(255,255,255,0.1)'">
                        <i class="fas fa-redo"></i> ¿Tarda mucho? Reintentar manualmente
                    </button>
                </div>
            `;
        }
    }

    const pageActual = tipo === 'movie' ? pageMovies : pageSeries;
    const searchActual = tipo === 'movie' ? searchMoviesActual : searchSeriesActual;

    // === LEER ESTADO DEL FILTRO +18 ===
    const checkboxAdulto = document.getElementById(tipo === 'movie' ? 'adult-filter-movie' : 'adult-filter-series');
    const isAdult = checkboxAdulto && checkboxAdulto.checked ? 'true' : 'false';

    try {
        // Le pasamos el &adult=true o false al servidor
        const url = `/api/tmdb?tipo=${tipo}&page=${pageActual}&adult=${isAdult}${searchActual ? `&query=${encodeURIComponent(searchActual)}` : ''}`;
        const respuesta = await fetch(url);
        const datos = await respuesta.json();

        if (resetear) grid.innerHTML = '';
        document.getElementById(`btn-cargar-mas-${tipo}`)?.remove();

        datos.forEach(item => {
            grid.innerHTML += crearTarjetaTMDB(item, tipo);
        });

        if (datos.length > 0) {
            const btnMas = document.createElement('div');
            btnMas.id = `btn-cargar-mas-${tipo}`;
            btnMas.style = "grid-column: 1 / -1; text-align: center; margin: 2rem 0;";
            btnMas.innerHTML = `<button onclick="cargarMasTMDB('${tipo}')" style="background:transparent; border:1px solid var(--primary); color:var(--primary); padding:0.8rem 2.5rem; border-radius:40px; cursor:pointer; font-weight:600;">Cargar más</button>`;
            grid.after(btnMas);

            // Le decimos al vigilante que vigile este botón
            observadorScroll.observe(btnMas);
        }

        if (tipo === 'movie') pageMovies++; else pageSeries++;

    } catch (error) {
        console.error(error);
        if (resetear) {
            grid.innerHTML = '<div style="color:var(--error); text-align:center; width:100%;">Fallo al conectar con TMDB.</div>';
        } else {
            // boton de reintento si falla
            const btnMas = document.getElementById(`btn-cargar-mas-${tipo}`);
            if (btnMas) {
                btnMas.innerHTML = `<button onclick="cargarMasTMDB('${tipo}')" style="background:transparent; border:1px solid var(--error); color:var(--error); padding:0.8rem 2.5rem; border-radius:40px; cursor:pointer; font-weight:600;"><i class="fas fa-redo"></i> Reintentar carga</button>`;
            }
        }
    }

    cargandoTMDB = false;
}

window.cargarMasTMDB = function (tipo) {
    cargarTMDB(tipo, tipo === 'movie' ? searchMoviesActual : searchSeriesActual, false);
};

// listeners para pelis
const inputMovies = document.getElementById('search-movies');
const btnMovies = document.getElementById('btn-buscar-movies');
let tempMovies;

inputMovies.addEventListener('input', () => {
    clearTimeout(tempMovies);
    tempMovies = setTimeout(() => cargarTMDB('movie', inputMovies.value.trim()), 500);
});
btnMovies.addEventListener('click', () => { clearTimeout(tempMovies); cargarTMDB('movie', inputMovies.value.trim()); });
inputMovies.addEventListener('keypress', (e) => { if (e.key === 'Enter') { clearTimeout(tempMovies); cargarTMDB('movie', inputMovies.value.trim()); } });

// listeners para series
const inputSeries = document.getElementById('search-series');
const btnSeries = document.getElementById('btn-buscar-series');
let tempSeries;

inputSeries.addEventListener('input', () => {
    clearTimeout(tempSeries);
    tempSeries = setTimeout(() => cargarTMDB('tv', inputSeries.value.trim()), 500);
});
btnSeries.addEventListener('click', () => { clearTimeout(tempSeries); cargarTMDB('tv', inputSeries.value.trim()); });
inputSeries.addEventListener('keypress', (e) => { if (e.key === 'Enter') { clearTimeout(tempSeries); cargarTMDB('tv', inputSeries.value.trim()); } });

// ==========================================================================
//   AUTENTICACION Y SESION
// ==========================================================================

const btnPerfil = document.getElementById('user-profile');

// creo el menu para el usuario
const userMenu = document.createElement('div');
userMenu.className = 'theme-menu user-menu-panel';
userMenu.innerHTML = `
    <div class="user-dropdown-header" id="btn-ver-perfil">
        <span id="dropdown-username" class="dropdown-username">Usuario</span>
        <span class="dropdown-subtext">Ver perfil</span>
    </div>
    
    <div class="dropdown-divider"></div>
    
    <button class="theme-option"><i class="fas fa-list"></i><span>Listas</span></button>
    <button class="theme-option"><i class="fas fa-bookmark"></i><span>Lista de seguimiento</span></button>
    
    <div class="dropdown-divider"></div>
    
    <button class="theme-option"><i class="fas fa-user-edit"></i><span>Editar perfil</span></button>
    <button class="theme-option"><i class="fas fa-cog"></i><span>Ajustes</span></button>
    
    <div class="dropdown-divider"></div>
    
    <button class="theme-option" id="btn-logout">
        <i class="fas fa-sign-out-alt" style="color: var(--error);"></i>
        <span style="color: var(--error);">Cerrar sesión</span>
    </button>
`;

// envolevo el boton del perfil para que funcione el menu
const userContainer = document.createElement('div');
userContainer.className = 'theme-dropdown';
btnPerfil.parentNode.insertBefore(userContainer, btnPerfil);
userContainer.appendChild(btnPerfil);
userContainer.appendChild(userMenu);

// click en la cabecera del menu va al perfil
document.getElementById('btn-ver-perfil')?.addEventListener('click', () => {
    cambiarVista('profile');
    userMenu.classList.remove('show');
    userMenuOpen = false;
});

let userMenuOpen = false;

// 2. Lógica del botón de perfil
btnPerfil.addEventListener('click', (e) => {
    e.stopPropagation();
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            // cierra los otros menus
            themeMenu.classList.remove('show');
            menuOpen = false;
            langMenu.classList.remove('show');
            langMenuOpen = false;
            // abre/cierra el de usuario
            userMenuOpen = !userMenuOpen;
            if (userMenuOpen) userMenu.classList.add('show');
            else userMenu.classList.remove('show');
        } else {
            // si no estoy logueado voy a login
            cambiarVista('login');
            // quito el active del menu
            linksMenu.forEach(l => l.classList.remove('active'));
        }
    });
});

// cierro el menu si hago click afuera
document.addEventListener('click', (e) => {
    if (!userContainer.contains(e.target) && userMenu) {
        userMenu.classList.remove('show');
        userMenuOpen = false;
    }
});

// logica de cerrar sesion
document.getElementById('btn-logout').addEventListener('click', async () => {
    // cierro la sesion
    await supabase.auth.signOut();

    // cierro el menu
    userMenu.classList.remove('show');
    userMenuOpen = false;

    // vuelvo a home
    cambiarVista('home');
    verificarSesion();
});

// boton para ir a registro
document.getElementById('btn-go-register')?.addEventListener('click', () => {
    cambiarVista('register');
    linksMenu.forEach(l => l.classList.remove('active'));
});

// boton para volver a login
document.getElementById('btn-go-login')?.addEventListener('click', () => {
    cambiarVista('login');
    linksMenu.forEach(l => l.classList.remove('active'));
});

// historial del navegador
function navegarA(vista) {
    history.pushState({ vista }, '', `#${vista}`);
    cambiarVista(vista);
    linksMenu.forEach(l => {
        if (l.getAttribute('data-target') === vista) l.classList.add('active');
        else l.classList.remove('active');
    });
}

window.addEventListener('popstate', (e) => {
    const vista = e.state?.vista || 'home';
    cambiarVista(vista);
});

// mostro/oculto la contraseña
document.querySelectorAll('.toggle-password-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const input = btn.previousElementSibling;
        const icon = btn.querySelector('i');
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.replace('fa-eye-slash', 'fa-eye');
        }
    });
});

// ==========================================================================
//   FLATPICKR PARA FECHAS
// ==========================================================================
if (document.getElementById('register-birthdate')) {
    flatpickr("#register-birthdate", {
        locale: "es",                  // Idioma español
        dateFormat: "Y-m-d",           // Formato que guarda Supabase (Ej: 1995-10-24)
        altInput: true,                // Crea un input bonito extra para mostrar
        altFormat: "d / m / Y",        // Formato visible para el usuario (Ej: 24 / 10 / 1995)
        maxDate: "today",              // No pueden haber nacido en el futuro
        disableMobile: true            // Fuerza a usar nuestro diseño en móviles (evita la rueda fea de iOS/Android)
    });
}

// --------
// REGISTRO
// --------
document.getElementById('form-register')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msgBox = document.getElementById('register-message');
    const btnSubmit = document.getElementById('btn-register-submit');

    const username = document.getElementById('register-username').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const emailConf = document.getElementById('register-email-confirm').value.trim();
    const password = document.getElementById('register-password').value.trim();
    const passConf = document.getElementById('register-password-confirm').value.trim();
    const birthdate = document.getElementById('register-birthdate').value;

    // CORTAFUEGOS ANTI-CLONES: Extraemos la parte de antes del @
    const [localPart, domainPart] = email.split('@');

    // Bloqueo absoluto: Ni puntos (.) ni símbolos (+) antes del @
    if (!localPart || !domainPart || localPart.includes('+') || localPart.includes('.')) {
        msgBox.style.color = 'var(--error)';
        msgBox.textContent = '❌ Correo inválido. El sistema no permite puntos "." ni alias "+" antes del @.';
        return;
    }

    // valido en el cliente
    if (email !== emailConf) {
        msgBox.style.color = 'var(--error)';
        msgBox.textContent = '❌ Los correos no coinciden.';
        return;
    }
    if (password !== passConf) {
        msgBox.style.color = 'var(--error)';
        msgBox.textContent = '❌ Las contraseñas no coinciden.';
        return;
    }
    if (password.length < 8) {
        msgBox.style.color = 'var(--error)';
        msgBox.textContent = '❌ La contraseña debe tener al menos 8 caracteres.';
        return;
    }

    btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> REGISTRANDO...';
    btnSubmit.disabled = true;

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username, birthdate } }
    });

    if (error) {
        msgBox.style.color = 'var(--error)';
        msgBox.textContent = '❌ ' + error.message;
    } else {
        msgBox.style.color = 'var(--success)';
        msgBox.textContent = '✅ ¡Cuenta creada! Revisa tu correo.';

        // mando a la pantalla de esperando confirmacion
        setTimeout(() => {
            cambiarVista('waiting-confirmation');
            // reseteo el formulario
            document.getElementById('form-register').reset();
        }, 1500);
    }

    btnSubmit.innerHTML = '<i class="fas fa-rocket"></i> REGÍSTRATE';
    btnSubmit.disabled = false;
});

// --------
// LOGIN
// --------
document.getElementById('form-login')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msgBox = document.getElementById('login-message');
    const btnSubmit = document.getElementById('btn-login-submit');

    const identifier = document.getElementById('login-identifier').value.trim();
    const password = document.getElementById('login-password').value.trim();

    btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ACCEDIENDO...';
    btnSubmit.disabled = true;

    let emailToUse = identifier;

    // CORTAFUEGOS ANTI-CLONES EN LOGIN
    if (identifier.includes('@')) {
        const localPart = identifier.split('@')[0];
        if (localPart.includes('+') || localPart.includes('.')) {
            msgBox.style.color = 'var(--error)';
            msgBox.textContent = '❌ Formato inválido. No se permiten puntos "." ni alias "+" en el correo.';
            btnSubmit.innerHTML = '<i class="fas fa-sign-in-alt"></i> ENTRAR AL NEXUS';
            btnSubmit.disabled = false;
            return;
        }
    }

    // si no tiene @ es un usuario
    if (!identifier.includes('@')) {
        // Usamos la función segura (RPC) para obtener el email sin romper la seguridad
        const { data: correoDevuelto, error: errorRpc } = await supabase
            .rpc('get_email_por_usuario', { username_buscado: identifier });

        if (correoDevuelto) {
            emailToUse = correoDevuelto;
        } else {
            msgBox.style.color = 'var(--error)';
            msgBox.textContent = '❌ Usuario no encontrado en el Nexus.';
            btnSubmit.innerHTML = '<i class="fas fa-sign-in-alt"></i> ENTRAR AL NEXUS';
            btnSubmit.disabled = false;
            return;
        }
    }

    // intento loguearme con el correo
    const { data, error } = await supabase.auth.signInWithPassword({ email: emailToUse, password });

    if (error) {
        msgBox.style.color = 'var(--error)';
        if (error.message.includes('Email not confirmed')) {
            msgBox.style.color = 'var(--warning)';
            msgBox.innerHTML = '<i class="fas fa-envelope-open-text"></i> Pendiente de confirmación al correo...';
        } else {
            msgBox.textContent = '❌ Credenciales incorrectas.';
        }
    } else {
        msgBox.style.color = 'var(--success)';
        msgBox.textContent = '✅ ¡Acceso concedido!';
        setTimeout(() => {
            cambiarVista('home');
            verificarSesion();
        }, 1000);
    }

    btnSubmit.innerHTML = '<i class="fas fa-sign-in-alt"></i> ENTRAR AL NEXUS';
    btnSubmit.disabled = false;
});

// === Función matemática para calcular la edad exacta ===
function calcularEdad(fechaNacimiento) {
    const hoy = new Date();
    const cumple = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - cumple.getFullYear();
    const m = hoy.getMonth() - cumple.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) {
        edad--;
    }
    return edad;
}

// verifico si tengo sesion activa
async function verificarSesion() {
    const { data: { session } } = await supabase.auth.getSession();
    const btnAdmin = document.getElementById('btn-admin');

    if (session) {
        // pongo el astronauta temporalmente
        btnPerfil.innerHTML = '<i class="fas fa-user-astronaut" style="color: var(--primary);"></i>';

        // cargo el avatar guardado
        cargarDisenoPerfil(session.user.email);

        // leo el username y la fecha de nacimiento de la sesion
        const usernameDisplay = document.getElementById('dropdown-username');
        const birthdate = session.user.user_metadata?.birthdate; // <--- Sacamos la fecha del registro

        if (usernameDisplay) {
            const nombreReal = session.user.user_metadata?.username || session.user.email.split('@')[0];
            usernameDisplay.textContent = nombreReal;

            const mainProfileUsername = document.getElementById('main-profile-username');
            if (mainProfileUsername) mainProfileUsername.textContent = nombreReal;
        }

        // === LOGICA +18 ===
        let esAdulto = false;
        if (birthdate) {
            const edad = calcularEdad(birthdate);
            esAdulto = edad >= 18;
        }

        // Mostramos u ocultamos el panel secreto
        document.querySelectorAll('.nsfw-filter-container').forEach(el => {
            el.style.display = esAdulto ? 'block' : 'none';
            // SEGURIDAD: Si no es adulto, forzamos a que esté apagado en el DOM y en su disco duro
            if (!esAdulto) {
                const cb = el.querySelector('.adult-checkbox');
                if (cb && cb.checked) {
                    cb.checked = false;
                    guardarFiltros(); // Sobrescribimos el localStorage para borrar la manipulación
                }
            }
        });

        const { data: datosRol } = await supabase
            .from('roles')
            .select('rol')
            .eq('email', session.user.email)
            .maybeSingle();

        if (datosRol?.rol === 'admin') {
            btnAdmin.style.display = 'inline-flex';
        } else {
            btnAdmin.style.display = 'none';
        }
    } else {
        btnPerfil.innerHTML = '<i class="fas fa-user-circle"></i>';
        if (btnAdmin) btnAdmin.style.display = 'none';

        // === Si no hay sesión (usuario temporal), ocultar y apagar +18 ===
        let borrado = false;
        document.querySelectorAll('.nsfw-filter-container').forEach(el => {
            el.style.display = 'none';
            const cb = el.querySelector('.adult-checkbox');
            if (cb && cb.checked) {
                cb.checked = false;
                borrado = true;
            }
        });
        if (borrado) guardarFiltros();
    }
}

verificarSesion();

// ==========================================================================
//   CONFIRMACION DE CORREO
// ==========================================================================
// cuando supabase me redirecciona desde el correo
if (window.location.hash.includes('type=signup')) {
    cambiarVista('verified-account');

    // limpio la url
    window.history.replaceState(null, null, window.location.pathname);
}

// boton para ir a login
document.getElementById('btn-go-login-verified')?.addEventListener('click', () => {
    cambiarVista('login');
});

// ==========================================================================
//   CONFIRMACION AUTOMATICA
// ==========================================================================
// supabase trae el token en la url
if (window.location.hash.includes('type=signup') || window.location.hash.includes('access_token')) {
    // muestro la pantalla de exito
    cambiarVista('verified-account');

    // espero a que supabase procese
    setTimeout(() => {
        window.history.replaceState(null, null, window.location.pathname); // Limpiar URL fea
        verificarSesion(); // Actualiza el icono para que salga el casco de astronauta
    }, 1000);
}

// boton para ir a home
document.getElementById('btn-go-home-verified')?.addEventListener('click', () => {
    cambiarVista('home');
});

// ==========================================================================
//   SCROLL TOP
// ==========================================================================
const btnScrollTop = document.getElementById('btn-scroll-top');

if (btnScrollTop) {
    // detecto cuando scrollean
    window.addEventListener('scroll', () => {
        if (window.scrollY > 500) {
            btnScrollTop.classList.add('visible');
        } else {
            btnScrollTop.classList.remove('visible');
        }
    });

    // subo al tope
    btnScrollTop.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// ==========================================================================
//   MODALES PERFIL BANNER Y AVATAR
// ==========================================================================
const modalEdit = document.getElementById('edit-modal');
const modalClose = document.getElementById('close-modal');
const modalTitle = document.getElementById('modal-title');
const modalGrid = document.getElementById('modal-grid');

const triggerBanner = document.getElementById('banner-edit-trigger');
const triggerAvatar = document.getElementById('avatar-edit-trigger');

function openCustomizationModal(type) {
    // limpio las clases
    modalGrid.className = 'modal-grid';

    // acumulo el html
    let htmlAcumulado = '';

    if (type === 'banner') {
        modalTitle.innerHTML = '<i class="fas fa-image"></i> SELECCIONAR PORTADA';
        modalGrid.classList.add('banner-grid');

        // opcion sin banner
        htmlAcumulado += `
            <div class="custom-card-item" onclick="seleccionarDiseño('banner', 'default')">
                <div style="width:100%; height:100%; background: var(--bg-elevated); display:flex; align-items:center; justify-content:center; color: var(--text-muted); font-family: var(--font-cyber);">
                    <i class="fas fa-ban" style="margin-right: 8px;"></i> SIN PORTADA
                </div>
            </div>
        `;

        // agrego los 5 banners
        for (let i = 1; i <= 5; i++) {
            htmlAcumulado += `
                <div class="custom-card-item" onclick="seleccionarDiseño('banner', '${i}')">
                    <img src="https://raw.githubusercontent.com/DonPlastico/WEB-Multiusos/main/img/Banners/${i}.png" alt="Banner ${i}" loading="lazy" onerror="this.src='https://placehold.co/600x300/14141c/6366f1?text=BANNER+${i}'">
                </div>
            `;
        }

        // agrego opcion de custom
        htmlAcumulado += `
            <div class="custom-card-item special-custom" onclick="seleccionarDiseño('banner', 'custom')">
                <i class="fas fa-upload"></i>
                <span style="font-weight: 700; font-family: var(--font-cyber); letter-spacing: 1px;">SUBIR CUSTOM</span>
            </div>
        `;
    } else if (type === 'avatar') {
        modalTitle.innerHTML = '<i class="fas fa-user-circle"></i> SELECCIONAR AVATAR';
        modalGrid.classList.add('avatar-grid');

        // avatar por defecto
        htmlAcumulado += `
            <div class="custom-card-item" onclick="seleccionarDiseño('avatar', 'default')">
                <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size: 3.5rem; color: var(--primary);">
                    <i class="fas fa-user-astronaut"></i>
                </div>
            </div>
        `;

        // los avatares locales
        const avataresLocales = ['1_m', '1_f', '2_m', '2_f', '3_m', '3_f', '4_m', '4_f'];
        avataresLocales.forEach(avatar => {
            htmlAcumulado += `
                <div class="custom-card-item" onclick="seleccionarDiseño('avatar', '${avatar}')">
                    <img src="https://raw.githubusercontent.com/DonPlastico/WEB-Multiusos/main/img/Avatars/${avatar}.png" alt="Avatar ${avatar}" loading="lazy" onerror="this.src='https://placehold.co/300x300/14141c/2dd4bf?text=${avatar}'">
                </div>
            `;
        });

        // opcion de custom
        htmlAcumulado += `
            <div class="custom-card-item special-custom avatar-custom-btn" onclick="seleccionarDiseño('avatar', 'custom')">
                <i class="fas fa-cloud-upload-alt"></i>
                <span style="font-weight: 700; font-family: var(--font-cyber);">SUBIR CUSTOM</span>
            </div>
        `;
    } else if (type === 'stats') {
        // solo un placeholder de estadisticas
        modalTitle.innerHTML = '<i class="fas fa-chart-bar"></i> ESTADÍSTICAS GLOBALES';
        modalGrid.className = 'modal-grid'; // Aseguramos que no tenga formato de banner o avatar

        htmlAcumulado = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 50px 20px; color: var(--text-muted);">
                <i class="fas fa-satellite-dish fa-pulse" style="font-size: 3.5rem; color: var(--primary); margin-bottom: 25px; opacity: 0.8;"></i>
                <h3 style="letter-spacing: 2px; color: var(--neon-white);">RECIBIENDO TELEMETRÍA...</h3>
                <p style="margin-top: 15px; font-size: 0.95rem;">El panel de desglose de datos y gráficos avanzados se desbloqueará en futuras versiones del sistema.</p>
            </div>
        `;
    }

    // inyecto todo el html
    modalGrid.innerHTML = htmlAcumulado;

    // muestro el modal
    modalEdit.classList.add('show');
    document.body.classList.add('no-scroll');
    document.documentElement.classList.add('no-scroll');
}

// ============================================
// GUARDAR DISEÑO EN BD
// ============================================
window.seleccionarDiseño = async function (tipo, idCard) {
    // cierro el modal al toque
    modalEdit.classList.remove('show');
    document.body.classList.remove('no-scroll');
    document.documentElement.classList.remove('no-scroll');

    // pregunto quien es
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const email = session.user.email;
    const datoActualizar = {};

    if (tipo === 'banner') datoActualizar.banner = idCard;
    if (tipo === 'avatar') datoActualizar.avatar = idCard;

    // guardo en la bd
    const { error } = await supabase
        .from('usuarios')
        .update(datoActualizar)
        .eq('email', email);

    if (!error) {
        // si va bien recargo el diseño
        cargarDisenoPerfil(email);
    } else {
        console.error("Error al guardar diseño:", error);
    }
}

// ============================================
// CARGAR DISEÑO DE LA BD
// ============================================
async function cargarDisenoPerfil(email) {
    // defaults
    let avatarId = 'default';
    let bannerId = 'default';

    // pregunto a la bd
    try {
        const { data: userData } = await supabase
            .from('usuarios')
            .select('avatar, banner')
            .eq('email', email)
            .maybeSingle();

        if (userData) {
            avatarId = userData.avatar || 'default';
            bannerId = userData.banner || 'default';
        }
    } catch (error) {
        console.error("Fallo al leer BD, usando diseño por defecto.");
    }

    // pinto el banner
    const bannerEl = document.querySelector('.profile-banner');
    if (bannerEl) {
        if (bannerId === 'default' || bannerId === 'custom') {
            // si es default sin imagen
            bannerEl.style.backgroundImage = 'none';
        } else {
            // si tiene numero pongo la imagen
            bannerEl.style.backgroundImage = `url('https://raw.githubusercontent.com/DonPlastico/WEB-Multiusos/main/img/Banners/${bannerId}.png')`;
            bannerEl.style.backgroundSize = 'cover';
            bannerEl.style.backgroundPosition = 'center';
        }
    }

    // pinto el avatar
    let avatarHtml = '';
    // si es default el astronauta
    if (avatarId === 'default' || avatarId === 'custom') {
        avatarHtml = '<i class="fas fa-user-astronaut" style="color: var(--primary);"></i>';
    } else {
        // si es uno de los avatares pongo la imagen
        avatarHtml = `<img src="https://raw.githubusercontent.com/DonPlastico/WEB-Multiusos/main/img/Avatars/${avatarId}.png" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
    }

    // cambio el icono del boton
    const navAvatarEl = document.getElementById('user-profile');
    if (navAvatarEl) {
        navAvatarEl.innerHTML = avatarHtml;
    }

    // cambio el avatar gigante
    const perfilAvatarEl = document.querySelector('.profile-avatar');
    if (perfilAvatarEl) {
        // guardo el overlay de editar
        const overlay = perfilAvatarEl.querySelector('.edit-overlay-avatar');
        perfilAvatarEl.innerHTML = '';
        if (overlay) perfilAvatarEl.appendChild(overlay);

        perfilAvatarEl.insertAdjacentHTML('beforeend', avatarHtml);
    }
}

// ==========================================================================
//   DRAWER DE FILTROS — SOLO MÓVIL
// ==========================================================================

const btnMobileFilters = document.getElementById('btn-mobile-filters');
const btnCloseDrawer = document.getElementById('btn-close-filters-drawer');
const filtersOverlay = document.getElementById('filters-overlay');
const filterSidebar = document.querySelector('.filter-sidebar');

function abrirDrawerFiltros() {
    filterSidebar?.classList.add('drawer-open');
    filtersOverlay?.classList.add('active');
}

function cerrarDrawerFiltros() {
    filterSidebar?.classList.remove('drawer-open');
    filtersOverlay?.classList.remove('active');
}

btnMobileFilters?.addEventListener('click', abrirDrawerFiltros);
btnCloseDrawer?.addEventListener('click', cerrarDrawerFiltros);
filtersOverlay?.addEventListener('click', cerrarDrawerFiltros);

// cerrar con Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cerrarDrawerFiltros();
});

// ============================================
// LISTENERS
// ============================================

// click en el banner
triggerBanner?.addEventListener('click', () => {
    openCustomizationModal('banner');
});

// click en el avatar
triggerAvatar?.addEventListener('click', (evento) => {
    evento.stopPropagation();
    openCustomizationModal('avatar');
});

// cierro con la x
modalClose?.addEventListener('click', () => {
    modalEdit.classList.remove('show');
    document.body.classList.remove('no-scroll');
    document.documentElement.classList.remove('no-scroll');
});

// cierro click afuera
modalEdit?.addEventListener('click', (evento) => {
    if (evento.target === modalEdit) {
        modalEdit.classList.remove('show');
        document.body.classList.remove('no-scroll');
        document.documentElement.classList.remove('no-scroll');
    }
});

// click en estadisticas
document.getElementById('btn-open-stats-modal')?.addEventListener('click', () => {
    openCustomizationModal('stats');
});

// ==========================================================================
//   BUSCADOR DE AMIGOS / CONTACTOS (AÑADIR)
// ==========================================================================
const modalAddFriend = document.getElementById('add-friend-modal');
const btnCloseAddFriend = document.getElementById('close-add-friend-modal');
const inputSearchFriend = document.getElementById('search-friend-input');
const btnSearchFriend = document.getElementById('btn-search-friend');
const friendEmptyState = document.getElementById('friend-search-empty');
const friendEmptyText = document.getElementById('friend-empty-text');
const friendResultsGrid = document.getElementById('friend-results-grid');

// 1. Abrir/Cerrar Modal
function openAddFriendModal() {
    modalAddFriend?.classList.add('show');
    document.body.classList.add('no-scroll');
    document.documentElement.classList.add('no-scroll');

    // Limpiar búsqueda anterior
    if (inputSearchFriend) inputSearchFriend.value = '';
    if (friendResultsGrid) {
        friendResultsGrid.style.display = 'none';
        friendResultsGrid.innerHTML = '';
    }
    if (friendEmptyState) {
        friendEmptyState.style.display = 'flex';
        const icon = friendEmptyState.querySelector('i');
        if (icon) icon.className = 'fas fa-satellite-dish fa-fade empty-icon';
        if (friendEmptyText) friendEmptyText.textContent = 'Esperando parámetros de búsqueda...';
    }
}

function closeAddFriendModal() {
    modalAddFriend?.classList.remove('show');
    document.body.classList.remove('no-scroll');
    document.documentElement.classList.remove('no-scroll');
}

// Escuchadores de apertura/cierre
document.getElementById('btn-add-friend')?.addEventListener('click', openAddFriendModal);
btnCloseAddFriend?.addEventListener('click', closeAddFriendModal);

modalAddFriend?.addEventListener('click', (e) => {
    if (e.target === modalAddFriend) closeAddFriendModal();
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalAddFriend?.classList.contains('show')) closeAddFriendModal();
});

async function buscarAmigos() {
    const query = inputSearchFriend.value.trim();
    if (!query) return;

    // Ponemos estado de carga
    friendResultsGrid.style.display = 'none';
    friendEmptyState.style.display = 'flex';
    const icon = friendEmptyState.querySelector('i');
    if (icon) icon.className = 'fas fa-circle-notch fa-spin empty-icon';
    friendEmptyText.textContent = 'Rastreando base de datos...';

    try {
        // 1. Obtener mi sesión y mi ID secreto
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const miId = session.user.id;

        // 2. BUSQUEDA: Traer usuarios que coincidan y no sea yo (ahora pedimos el auth_id)
        const { data: coincidencias, error } = await supabase
            .from('perfiles_publicos')
            .select('auth_id, username, avatar')
            .ilike('username', `%${query}%`)
            .neq('auth_id', miId)
            .limit(20);

        if (error) throw error;

        // 3. Traer a todos los que YA SIGO usando mi ID
        const { data: seguidos } = await supabase
            .from('amistades')
            .select('receptor_id')
            .eq('solicitante_id', miId);

        const listaSeguidos = seguidos.map(s => s.receptor_id);

        // 4. FILTRAR: Quitamos de la lista los que ya están en listaSeguidos (comparamos IDs)
        const resultadosFinales = coincidencias.filter(u => !listaSeguidos.includes(u.auth_id));

        // 5. Manejo de vacío
        if (resultadosFinales.length === 0) {
            if (icon) icon.className = 'fas fa-user-slash empty-icon';
            friendEmptyText.textContent = `No se encontró gente nueva con "${query}".`;
            return;
        }

        // 6. Pintar grid
        friendEmptyState.style.display = 'none';
        friendResultsGrid.style.display = 'flex';
        friendResultsGrid.innerHTML = '';

        resultadosFinales.forEach(user => {
            const avatarDB = user.avatar ? user.avatar.replace(/'/g, "") : 'default';
            let avatarHtml = (avatarDB === 'default' || avatarDB === 'custom')
                ? '<i class="fas fa-user-astronaut" style="color: var(--primary);"></i>'
                : `<img src="https://raw.githubusercontent.com/DonPlastico/WEB-Multiusos/main/img/Avatars/${avatarDB}.png" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-user-astronaut\\' style=\\'color: var(--primary);\\'></i>'">`;

            const userCard = document.createElement('div');
            userCard.className = 'friend-user-card';
            userCard.innerHTML = `
                <div class="friend-card-avatar">${avatarHtml}</div>
                <div class="friend-card-info">
                    <h4 class="friend-card-username">${user.username}</h4>
                </div>
                <button class="btn-send-request" onclick="seguirUsuario('${user.auth_id}', '${user.username}', this)" title="Seguir usuario">
                    <i class="fas fa-user-plus"></i>
                </button>
            `;
            friendResultsGrid.appendChild(userCard);
        });

    } catch (error) {
        console.error("Error buscando usuarios:", error);
        if (icon) icon.className = 'fas fa-exclamation-triangle empty-icon';
        friendEmptyText.textContent = 'Error al conectar con el Nexus.';
    }
}

// 3. Listeners de búsqueda
btnSearchFriend?.addEventListener('click', buscarAmigos);
inputSearchFriend?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') buscarAmigos();
});

// 4. Acción de seguir (Ahora usa el targetId)
window.seguirUsuario = async function (targetId, targetUsername, btnElement) {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            showToast('error', 'Error de conexión', 'Debes estar identificado.');
            return;
        }

        const miId = session.user.id; // Ya no buscamos nuestro username, usamos el token

        // Comprobamos si ya lo seguimos (Por UUID)
        const { data: yaSigue } = await supabase
            .from('amistades')
            .select('id')
            .eq('solicitante_id', miId)
            .eq('receptor_id', targetId)
            .maybeSingle();

        if (yaSigue) {
            showToast('warning', 'Ya le sigues', `Ya eres seguidor de ${targetUsername}.`);
            return;
        }

        // INSERT DIRECTO CON UUIDs
        const { error: insertError } = await supabase
            .from('amistades')
            .insert([{
                solicitante_id: miId,
                receptor_id: targetId
            }]);

        if (insertError) throw insertError;

        showToast('success', 'Nueva Conexión', `Ahora sigues a ${targetUsername}.`);

        // 1. Ocultar el botón
        if (btnElement) btnElement.style.display = 'none';

        // 2. Refrescar contadores
        const mainProfileUsername = document.getElementById('main-profile-username')?.textContent;
        if (mainProfileUsername) {
            cargarPerfilPublico(mainProfileUsername);
        }

    } catch (error) {
        console.error("❌ Error al seguir:", error);
        showToast('error', 'Fallo de Red', 'No se pudo procesar el seguimiento.');
    }
};

// ============================================
// LISTENERS PARA FILTROS +18 Y BOTONES LIMPIAR
// ============================================
document.getElementById('adult-filter-movie')?.addEventListener('change', () => {
    guardarFiltros(); // Guardamos el estado
    cargarTMDB('movie', searchMoviesActual, true);
});

document.getElementById('adult-filter-series')?.addEventListener('change', () => {
    guardarFiltros(); // Guardamos el estado
    cargarTMDB('tv', searchSeriesActual, true);
});

// Botón de Limpiar Filtros de JUEGOS
document.getElementById('btn-reset-filters')?.addEventListener('click', () => {
    // 1. Limpiamos todos los checkboxes
    document.querySelectorAll('.plat-item input').forEach(cb => cb.checked = false);
    document.querySelectorAll('.tienda-item').forEach(cb => cb.checked = false);
    document.querySelectorAll('.mode-item').forEach(cb => cb.checked = false);

    document.querySelectorAll('.genre-item input').forEach(cb => {
        cb.checked = false;
        // Si el género era oculto, lo volvemos a esconder al limpiar
        if (cb.closest('.hidden-genre')) {
            cb.closest('.genre-item').style.display = 'none';
        }
    });

    // 2. Limpiamos las barras de búsqueda (géneros y juegos general)
    const searchGenre = document.getElementById('search-genre');
    if (searchGenre) searchGenre.value = '';

    const searchJuegos = document.getElementById('search-juegos');
    if (searchJuegos) {
        searchJuegos.value = '';
        busquedaActual = ''; // Reseteamos la memoria de búsqueda
    }

    // 3. Limpiamos precios
    const pMin = document.getElementById('precio-min');
    if (pMin) pMin.value = '';
    const pMax = document.getElementById('precio-max');
    if (pMax) pMax.value = '';

    // 4. Limpiamos fechas
    const dMin = document.getElementById('date-min');
    if (dMin) dMin.value = '';
    const dMax = document.getElementById('date-max');
    if (dMax) dMax.value = '';

    // 5. Aplicamos y guardamos el estado limpio
    aplicarFiltros();
});

// Botones de Limpiar de SERIES y PELÍCULAS
document.querySelectorAll('.btn-reset-tmdb').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const target = e.target.getAttribute('data-target');
        if (target === 'movie') {
            const cb = document.getElementById('adult-filter-movie');
            if (cb) cb.checked = false;
            guardarFiltros();
            cargarTMDB('movie', searchMoviesActual, true);
        } else if (target === 'tv') {
            const cb = document.getElementById('adult-filter-series');
            if (cb) cb.checked = false;
            guardarFiltros();
            cargarTMDB('tv', searchSeriesActual, true);
        }
    });
});

// ==========================================================================
//   DRAWER DE FILTROS MÓVIL (SISTEMA DINÁMICO PARA LAS 3 SECCIONES)
// ==========================================================================
function configurarDrawer(btnAbrir, btnCerrar, overlay, sidebar) {
    if (!btnAbrir || !sidebar) return;

    const abrir = () => {
        sidebar.classList.add('drawer-open');
        if (overlay) overlay.classList.add('active');
        document.body.classList.add('no-scroll');
        document.documentElement.classList.add('no-scroll');
    };

    const cerrar = () => {
        sidebar.classList.remove('drawer-open');
        if (overlay) overlay.classList.remove('active');
        document.body.classList.remove('no-scroll');
        document.documentElement.classList.remove('no-scroll');
    };

    btnAbrir.addEventListener('click', abrir);
    btnCerrar?.addEventListener('click', cerrar);
    overlay?.addEventListener('click', cerrar);
}

// 1. Juegos
configurarDrawer(
    document.getElementById('btn-mobile-filters'),
    document.getElementById('btn-close-filters-drawer'),
    document.getElementById('filters-overlay'),
    document.querySelector('#games .filter-sidebar')
);

// 2. Películas
configurarDrawer(
    document.getElementById('btn-filters-movies-mobile'),
    document.getElementById('btn-close-movies-mobile'),
    document.getElementById('overlay-filters-movies'),
    document.getElementById('sidebar-filters-movies')
);

// 3. Series
configurarDrawer(
    document.getElementById('btn-filters-series-mobile'),
    document.getElementById('btn-close-series-mobile'),
    document.getElementById('overlay-filters-series'),
    document.getElementById('sidebar-filters-series')
);

// ==========================================================================
//   MODAL DE DETALLES DEL JUEGO (Estilo Playnite)
// ==========================================================================
const modalJuego = document.getElementById('game-details-modal');
const btnCerrarModalJuego = document.getElementById('close-game-modal');

// Escuchamos los clics en toda la grilla de juegos
document.getElementById('games-grid')?.addEventListener('click', (e) => {
    const card = e.target.closest('.game-card');
    if (!card) return;

    // 1. Extraemos info de la tarjeta
    const idJuego = card.getAttribute('data-game-id');
    const titulo = card.getAttribute('data-game-title');
    const storesRaw = card.getAttribute('data-stores');
    const storeUrlRaw = card.getAttribute('data-store-url'); // <--- NUEVO: Leemos la URL oculta

    // 2. Actualizamos URL (ej: /juegos/007_First_Light)
    const urlAmigable = titulo.replace(/[^a-zA-Z0-9 \-]/g, '').trim().replace(/\s+/g, '_');
    history.pushState({ modal: 'detalles_juego', titulo: titulo }, '', `/juegos/${urlAmigable}`);

    // 3. Rellenamos el modal con la info visual de la tarjeta (Carga Instantánea)
    const portadaSrc = card.querySelector('img.game-cover')?.src || '';
    const htmlPlataformas = card.querySelector('.platforms-container').innerHTML;
    const fecha = card.querySelector('.date').textContent;
    const priceBadge = card.querySelector('.price-badge strong');
    const priceNa = card.querySelector('.price-na');

    document.getElementById('detail-title').textContent = titulo;
    document.getElementById('detail-platforms').innerHTML = htmlPlataformas;

    if (portadaSrc) {
        document.getElementById('detail-cover-img').src = portadaSrc;
        document.getElementById('detail-cover-img').style.display = 'block';
        document.getElementById('detail-hero-bg').style.backgroundImage = `url('${portadaSrc}')`;
    } else {
        document.getElementById('detail-cover-img').style.display = 'none';
        document.getElementById('detail-hero-bg').style.backgroundImage = 'none';
    }

    document.getElementById('detail-date').textContent = fecha;

    // LÓGICA DE PRECIO Y TIENDA (CON ENLACE OFICIAL Y MERCADO GRIS) ---
    const detailPriceEl = document.getElementById('detail-price');
    if (detailPriceEl) {
        detailPriceEl.style.display = 'flex';
        detailPriceEl.style.flexDirection = 'column';
        detailPriceEl.style.gap = '10px';

        // 1. EL PRECIO OFICIAL (ITAD)
        let htmlPrecioOficial = '';
        if (priceBadge) {
            if (storesRaw && storesRaw !== 'none') {
                const storeMap = {
                    'steam': 'Steam', 'epic': 'Epic Games', 'gog': 'GOG',
                    'blizzard': 'Battle.net', 'ubisoft': 'Ubisoft Connect',
                    'ea': 'EA App', 'wingamestore': 'WinGameStore',
                    'greenmangaming': 'Green Man Gaming', 'humblestore': 'Humble Store'
                };

                let primeraTienda = storesRaw.split(',')[0].trim().toLowerCase();
                let tiendaBonita = storeMap[primeraTienda] || (primeraTienda.charAt(0).toUpperCase() + primeraTienda.slice(1));

                if (storeUrlRaw && storeUrlRaw !== 'undefined' && storeUrlRaw !== '') {
                    htmlPrecioOficial = `
                        <a href="${storeUrlRaw}" target="_blank" rel="noopener noreferrer" style="display:inline-block; color: var(--success); text-decoration: none; font-weight: bold; font-size: 1.1rem; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                            <i class="fas fa-check-circle"></i> Oficial: ${priceBadge.textContent} <span style="color: var(--text-muted); font-size: 0.9rem; font-weight: normal;">en ${tiendaBonita}</span>
                        </a>
                    `;
                } else {
                    htmlPrecioOficial = `
                        <span style="color: var(--success); font-weight: bold; font-size: 1.1rem;"><i class="fas fa-check-circle"></i> Oficial: ${priceBadge.textContent}</span>
                        <span style="color: var(--text-muted); font-size: 0.9rem;">en ${tiendaBonita}</span>
                    `;
                }
            } else {
                htmlPrecioOficial = `<span style="color: var(--success); font-weight: bold;"><i class="fas fa-check-circle"></i> ${priceBadge.textContent}</span>`;
            }
        } else if (priceNa) {
            htmlPrecioOficial = `<span style="color: var(--text-muted); font-size: 0.85rem;">${priceNa.textContent}</span>`;
        } else {
            htmlPrecioOficial = '<span style="color: var(--text-muted);">--</span>';
        }

        // 2. GENERADORES DE URLS DINÁMICAS (MERCADO GRIS)
        // Limpiamos el título para la URL (quitamos símbolos raros)
        const tituloLimpio = titulo.replace(/[^a-zA-Z0-9 ]/g, "").trim().replace(/\s+/g, '+');

        const urlAllKeyShop = `https://www.allkeyshop.com/blog/catalogue/search-${tituloLimpio}/`;
        const urlCDKeys = `https://www.cdkeys.com/es_es/catalogsearch/result/?q=${tituloLimpio}`;

        // 3. INYECTAMOS TODO EN EL CONTENEDOR
        detailPriceEl.innerHTML = `
            <div style="margin-bottom: 6px;">${htmlPrecioOficial}</div>
            
            <div style="display: flex; flex-direction: row; gap: 8px; flex-wrap: wrap; align-items: center;">
                <a href="${urlAllKeyShop}" target="_blank" rel="noopener noreferrer" style="background: rgba(255, 153, 0, 0.1); border: 1px solid rgba(255, 153, 0, 0.3); color: #ff9900; padding: 4px 12px; border-radius: 6px; text-decoration: none; font-size: 0.8rem; font-weight: bold; display: flex; align-items: center; gap: 5px; transition: 0.2s; white-space: nowrap;" onmouseover="this.style.background='rgba(255, 153, 0, 0.2)'" onmouseout="this.style.background='rgba(255, 153, 0, 0.1)'">
                    <i class="fas fa-fire"></i> AllKeyShop
                </a>
                <a href="${urlCDKeys}" target="_blank" rel="noopener noreferrer" style="background: rgba(0, 153, 255, 0.1); border: 1px solid rgba(0, 153, 255, 0.3); color: #0099ff; padding: 4px 12px; border-radius: 6px; text-decoration: none; font-size: 0.8rem; font-weight: bold; display: flex; align-items: center; gap: 5px; transition: 0.2s; white-space: nowrap;" onmouseover="this.style.background='rgba(0, 153, 255, 0.2)'" onmouseout="this.style.background='rgba(0, 153, 255, 0.1)'">
                    <i class="fas fa-key"></i> CDKeys
                </a>
            </div>
        `;
    }

    // 4. Reseteamos textos mientras esperamos a conectar con la API de detalles
    document.getElementById('detail-description').innerHTML = '<i class="fas fa-circle-notch fa-spin" style="color:var(--primary);"></i> Estableciendo conexión cifrada...';
    document.getElementById('detail-dev').textContent = 'Escaneando...';
    document.getElementById('detail-pub').textContent = 'Escaneando...';
    document.getElementById('detail-genres').textContent = 'Escaneando...';
    document.getElementById('detail-modes').textContent = 'Escaneando...';

    // 5. Mostramos modal
    modalJuego.classList.add('show');
    document.body.classList.add('no-scroll');
    document.documentElement.classList.add('no-scroll');

    // 6. AQUÍ LLAMAREMOS A LA API PRÓXIMAMENTE PARA RELLENAR LO QUE FALTA
    llamarDetallesJuego(idJuego, titulo);
});

// Función para cerrar el modal y restaurar todo
function cerrarModalJuego() {
    if (!modalJuego.classList.contains('show')) return;

    modalJuego.classList.remove('show');
    document.body.classList.remove('no-scroll');
    document.documentElement.classList.remove('no-scroll');

    // Restaurar URL limpia de juegos
    history.pushState({ vista: 'games' }, '', '/juegos');
}

// Eventos de cierre
btnCerrarModalJuego?.addEventListener('click', cerrarModalJuego);

modalJuego?.addEventListener('click', (e) => {
    if (e.target === modalJuego) cerrarModalJuego();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cerrarModalJuego();
});

async function llamarDetallesJuego(idJuego, titulo) {
    try {
        const respuesta = await fetch(`/api/igdb?query=${encodeURIComponent(titulo)}`);
        const datos = await respuesta.json();
        const juego = datos.find(j => j.id.toString() === idJuego.toString());

        if (!juego) {
            document.getElementById('detail-description').textContent = "No se pudieron obtener los detalles.";
            return;
        }

        // Rellenar Descripción con un control de calidad
        const descElement = document.getElementById('detail-description');
        if (juego.summary) {
            descElement.textContent = juego.summary;
        } else {
            descElement.textContent = "No hay descripción disponible para este título en nuestra base de datos.";
            descElement.style.fontStyle = "italic";
        }

        // Rellenar Desarrollador y Editor con seguridad
        const empresas = juego.involved_companies || [];
        const dev = empresas.find(e => e.developer)?.company.name || 'Desconocido';
        const pub = empresas.find(e => e.publisher)?.company.name || 'Desconocido';

        document.getElementById('detail-dev').textContent = dev;
        document.getElementById('detail-pub').textContent = pub;

        // Rellenar Géneros y Modos
        document.getElementById('detail-genres').textContent = juego.genres
            ? juego.genres.map(g => g.name).join(', ')
            : 'N/A';

        document.getElementById('detail-modes').textContent = juego.game_modes
            ? juego.game_modes.map(m => m.name).join(', ')
            : 'N/A';

        // Enlaces
        const containerLinks = document.getElementById('detail-links');
        if (juego.websites && juego.websites.length > 0) {
            const web = juego.websites[0];
            containerLinks.innerHTML = `<a href="${web.url}" target="_blank" style="color:var(--secondary); text-decoration:none;">Sitio Oficial</a>`;
        } else {
            containerLinks.textContent = 'N/A';
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

// ==========================================================================
//   CARGA DINÁMICA DE PERFILES PÚBLICOS
// ==========================================================================
async function cargarPerfilPublico(usernameTarget) {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        let miPropioUsername = null;
        let emailLogueado = null;

        // Sacamos nuestros datos si estamos logueados
        if (session) {
            emailLogueado = session.user.email;
            const { data: miPerfil } = await supabase.from('usuarios').select('username').eq('email', emailLogueado).single();
            if (miPerfil) miPropioUsername = miPerfil.username;
        }

        // Si no me pasan usuario por la URL (entrar desde el menú normal), asumo que quiero ver MI perfil
        const usuarioABuscar = usernameTarget || miPropioUsername;

        if (!usuarioABuscar) {
            document.querySelector('.profile-username').textContent = "Inicia sesión para ver tu perfil";
            return;
        }

        // Buscamos en Supabase
        const { data: perfilTarget, error } = await supabase
            .from('perfiles_publicos')
            .select('*')
            .eq('username', usuarioABuscar)
            .single();

        if (error || !perfilTarget) {
            document.querySelector('.profile-username').textContent = "Usuario no encontrado en el Nexus";
            return;
        }

        // Pintamos el Nombre
        document.querySelector('.profile-username').textContent = perfilTarget.username;

        // Pintar Avatar
        const avatarDB = perfilTarget.avatar ? perfilTarget.avatar.replace(/'/g, "") : 'default';
        const bannerDB = perfilTarget.banner ? perfilTarget.banner.replace(/'/g, "") : 'default';

        // Pintar Avatar
        const avatarElement = document.querySelector('.profile-avatar');
        if (avatarElement) {
            const overlay = avatarElement.querySelector('.edit-overlay-avatar');
            avatarElement.innerHTML = ''; // Limpiamos
            if (overlay) avatarElement.appendChild(overlay); // Devolvemos el lapicero

            if (avatarDB === 'default' || avatarDB === 'custom') {
                avatarElement.insertAdjacentHTML('beforeend', '<i class="fas fa-user-astronaut" style="color: var(--primary);"></i>');
            } else {
                avatarElement.insertAdjacentHTML('beforeend', `<img src="https://raw.githubusercontent.com/DonPlastico/WEB-Multiusos/main/img/Avatars/${avatarDB}.png" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`);
            }
        }

        // Pintar Banner
        const bannerElement = document.querySelector('.profile-banner');
        if (bannerElement) {
            if (bannerDB === 'default' || bannerDB === 'custom') {
                bannerElement.style.backgroundImage = 'none'; // Esto limpiará tu banner si el otro no tiene
            } else {
                bannerElement.style.backgroundImage = `url('https://raw.githubusercontent.com/DonPlastico/WEB-Multiusos/main/img/Banners/${bannerDB}.png')`;
                bannerElement.style.backgroundSize = 'cover';
                bannerElement.style.backgroundPosition = 'center';
            }
        }

        // ============================================
        // CARGAR CONTADORES DE SEGUIDORES/SIGUIENDO
        // ============================================
        try {
            // Extraemos el UUID del perfil que estamos mirando en pantalla
            const targetId = perfilTarget.auth_id;

            // Contamos a cuántos sigue esta persona
            const { count: siguiendoCount } = await supabase
                .from('amistades')
                .select('*', { count: 'exact', head: true })
                .eq('solicitante_id', targetId);

            // Contamos cuántos siguen a esta persona
            const { count: seguidoresCount } = await supabase
                .from('amistades')
                .select('*', { count: 'exact', head: true })
                .eq('receptor_id', targetId);

            const statNums = document.querySelectorAll('.profile-stats .stat-num');
            if (statNums.length >= 2) {
                statNums[0].textContent = siguiendoCount || 0;
                statNums[1].textContent = seguidoresCount || 0;
            }
        } catch (err) {
            console.error("Error al extraer telemetría de amistades:", err);
        }


        // CONTROL DE SEGURIDAD (Ocultar edición si no es mi perfil)
        const overlayBanner = document.querySelector('.edit-overlay');
        const overlayAvatar = document.querySelector('.edit-overlay-avatar');

        // Elementos privados
        const btnAddFriend = document.getElementById('btn-add-friend');

        if (miPropioUsername === usuarioABuscar) {
            // === ES MI PROPIO PERFIL ===
            if (overlayBanner) overlayBanner.style.display = 'flex';
            if (overlayAvatar) overlayAvatar.style.display = 'flex';
            document.querySelector('.profile-banner').style.cursor = 'pointer';
            document.querySelector('.profile-avatar').style.cursor = 'pointer';

            // Muestro mi botón de añadir amigos
            if (btnAddFriend) btnAddFriend.style.display = 'flex';

        } else {
            // === ES EL PERFIL DE OTRA PERSONA ===
            if (overlayBanner) overlayBanner.style.display = 'none';
            if (overlayAvatar) overlayAvatar.style.display = 'none';
            document.querySelector('.profile-banner').style.cursor = 'default';
            document.querySelector('.profile-avatar').style.cursor = 'default';

            // Oculto botón
            if (btnAddFriend) btnAddFriend.style.display = 'none';
        }

    } catch (err) {
        console.error("Error al cargar perfil dinámico:", err);
    }
}

// ==========================================================================
//   PANEL DE ADMINISTRACIÓN (NEXUS)
// ==========================================================================
let adminPanelIniciado = false;
let miEmailGlobalAdmin = null;

async function iniciarPanelAdmin() {
    if (adminPanelIniciado) return; // Solo lo arrancamos la primera vez
    adminPanelIniciado = true;

    addAdminLog("Inicializando conexión con Base de Datos...", "system");

    // Obtenemos nuestro usuario para evitar quitarnos el admin a nosotros mismos
    const { data: { session } } = await supabase.auth.getSession();
    miEmailGlobalAdmin = session?.user?.email;

    addAdminLog("Credenciales de administrador validadas.", "success");

    // Arrancamos la carga de la tabla (sin simulador de telemetría falso)
    cargarTablaUsuarios();

    // Evento del buscador de la tabla
    document.getElementById('admin-search-input')?.addEventListener('input', (e) => {
        cargarTablaUsuarios(e.target.value.toLowerCase());
    });

    // Escuchador para crear usuario de pruebas verificado instantáneo
    document.getElementById('btn-admin-create-test-user')?.addEventListener('click', async () => {
        addAdminLog("Generando clon de pruebas en el Nexus...", "warning");
        try {
            const rand = Math.floor(1000 + Math.random() * 9000);
            const testUser = `test_${rand}`;
            const testEmail = `${testUser}@nexus.com`;
            const testPassword = 'PasswordTest123'; // Contraseña maestra para todos los clones

            // Forzar registro en Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: testEmail,
                password: testPassword,
                options: { data: { username: testUser, birthdate: '2000-01-01' } }
            });

            if (authError) throw authError;

            addAdminLog(`Sujeto de pruebas creado: ${testUser}. RLS Bypass Completo.`, "success");
            showToast('success', 'Clon Creado', `Identidad ${testUser} lista para simulación.`);

            // Actualizar la tabla para verlo reflejado
            cargarTablaUsuarios();

        } catch (err) {
            addAdminLog(`Fallo al inyectar usuario de pruebas: ${err.message}`, "error");
            showToast('error', 'Error de Matriz', 'Revisa la consola o desactiva "Confirm Email" en Supabase.');
        }
    });

    // Función global para cambiar de cuenta al instante con un clic
    window.loginComoTestUser = async function (emailUser) {
        addAdminLog(`Destruyendo sesión de administrador e iniciando bypass para ${emailUser}...`, "warning");
        try {
            // El login de Supabase pisa automáticamente la sesión actual en localStorage
            const { error } = await supabase.auth.signInWithPassword({
                email: emailUser,
                password: 'PasswordTest123'
            });

            if (error) throw error;

            showToast('success', 'Identidad Suplantada', 'Bypass completado. Redireccionando al inicio...');

            // Forzamos un reload limpio al home para inicializar toda la app con la sesión del clon
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);

        } catch (err) {
            addAdminLog(`Fallo crítico en el bypass: ${err.message}`, "error");
            showToast('error', 'Bypass Fallido', 'No se pudo forzar el inicio de sesión.');
        }
    };
}

// --- TERMINAL DE REGISTRO DE EVENTOS ---
function addAdminLog(mensaje, tipo = "system") {
    const terminal = document.getElementById('admin-terminal-logs');
    if (!terminal) return;

    const hora = new Date().toLocaleTimeString('es-ES', { hour12: false });
    let prefijo = "[SYS]";
    if (tipo === "success") prefijo = "[OK]";
    if (tipo === "error") prefijo = "[ERR]";
    if (tipo === "warning") prefijo = "[WARN]";

    const linea = document.createElement('div');
    linea.className = `log-line ${tipo}`;
    linea.innerHTML = `<span class="log-time" style="color: var(--text-muted);">[${hora}] ${prefijo}</span> ${mensaje}`;

    terminal.appendChild(linea);
    terminal.scrollTop = terminal.scrollHeight; // Auto-scroll
}

// --- GESTIÓN DE BASE DE DATOS (USUARIOS Y ROLES) ---
async function cargarTablaUsuarios(filtro = "") {
    addAdminLog("Descargando identidades y cruce de roles...", "system");

    try {
        // 1. Extraemos TODOS los usuarios
        const { data: usuarios, error: errUsuarios } = await supabase
            .from('usuarios')
            .select('*')
            .order('created_at', { ascending: false });

        if (errUsuarios) throw errUsuarios;

        // 2. Extraemos TODOS los roles de la segunda tabla
        const { data: roles, error: errRoles } = await supabase
            .from('roles')
            .select('email, rol');

        if (errRoles) throw errRoles;

        const tbody = document.getElementById('admin-users-tbody');
        if (!tbody) return;
        tbody.innerHTML = ''; // Limpiamos tabla

        // Filtrado
        const usuariosFiltrados = usuarios.filter(u =>
            u.username.toLowerCase().includes(filtro) ||
            u.email.toLowerCase().includes(filtro)
        );

        // Actualizamos métrica del Total de Usuarios
        const metricTotal = document.getElementById('metric-total-users');
        if (metricTotal) metricTotal.textContent = usuarios.length;

        usuariosFiltrados.forEach(u => {
            const esMiCuenta = u.email === miEmailGlobalAdmin;

            // Detectar si es cuenta de pruebas automática
            const esTestUser = u.username.startsWith('test_');

            // Cruzamos datos usando el email
            const infoRol = roles.find(r => r.email === u.email);
            const nombreRol = infoRol ? infoRol.rol : 'user';
            const esAdmin = nombreRol === 'admin';

            const iconoVerificado = `<i class="fas fa-check-circle status-icon verified" style="color: var(--success);" title="Correo Verificado"></i>`;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${u.username}</strong></td>
                <td>${u.email}</td>
                <td>${new Date(u.created_at).toLocaleDateString()}</td>
                <td>${iconoVerificado}</td>
                <td><span class="role-badge ${esAdmin ? 'admin' : ''}" style="background: ${esAdmin ? 'var(--primary-soft)' : 'var(--bg-secondary)'}; color: ${esAdmin ? 'var(--primary)' : 'var(--text-muted)'}; padding: 5px 10px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; border: 1px solid ${esAdmin ? 'var(--primary)' : 'var(--border-color)'};">${esAdmin ? 'ADMIN' : 'USER'}</span></td>
                <td>
                    <div class="table-actions">
                        ${esTestUser ? `<button class="action-btn promote" onclick="loginComoTestUser('${u.email}')" title="Suplantar / Iniciar Sesión" style="color: var(--secondary); border-color: var(--secondary);"><i class="fas fa-sign-in-alt"></i></button>` : ''}
                        
                        <button class="action-btn edit" onclick="alert('Editor de perfiles en desarrollo para ${u.username}')" title="Editar datos"><i class="fas fa-pen"></i></button>
                        ${esAdmin
                    ? `<button class="action-btn demote" onclick="cambiarRolUsuario('${u.email}', '${u.username}', 'user', ${esMiCuenta})" title="Quitar Administrador"><i class="fas fa-user-minus"></i></button>`
                    : `<button class="action-btn promote" onclick="cambiarRolUsuario('${u.email}', '${u.username}', 'admin', ${esMiCuenta})" title="Hacer Administrador"><i class="fas fa-user-shield"></i></button>`
                }
                        <button class="action-btn delete" onclick="borrarUsuarioPanel('${u.id}', '${u.email}', '${u.username}', ${esMiCuenta})" title="Eliminar cuenta permanente"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        addAdminLog(`Tabla actualizada: ${usuariosFiltrados.length} registros listados.`, "success");

    } catch (err) {
        addAdminLog("Error al extraer usuarios: " + err.message, "error");
    }
}

window.cambiarRolUsuario = async function (emailUser, username, nuevoRol, esMiCuenta) {
    if (esMiCuenta && nuevoRol === 'user') {
        alert("🛡️ PROTOCOLO DE SEGURIDAD: No puedes quitarte el rol de Administrador a ti mismo.");
        addAdminLog("Bloqueada auto-degradación de permisos.", "warning");
        return;
    }

    if (!confirm(`¿Seguro que quieres cambiar el rol de ${username} a ${nuevoRol.toUpperCase()}?`)) return;

    addAdminLog(`Actualizando rol de ${username} a ${nuevoRol}...`, "system");

    try {
        const { data: existeRol } = await supabase.from('roles').select('id').eq('email', emailUser).maybeSingle();

        let errorQuery = null;
        if (existeRol) {
            const { error } = await supabase.from('roles').update({ rol: nuevoRol }).eq('email', emailUser);
            errorQuery = error;
        } else {
            const { error } = await supabase.from('roles').insert([{ email: emailUser, rol: nuevoRol }]);
            errorQuery = error;
        }

        if (errorQuery) throw errorQuery;

        addAdminLog(`Permisos de ${username} modificados con éxito.`, "success");
        cargarTablaUsuarios();

    } catch (err) {
        addAdminLog(`Fallo al cambiar rol de ${username}: ${err.message}`, "error");
    }
};

window.borrarUsuarioPanel = async function (idUser, emailUser, username, esMiCuenta) {
    if (esMiCuenta) {
        alert("🛡️ PROTOCOLO DE SEGURIDAD: No puedes eliminar tu propia cuenta desde el panel de administrador.");
        return;
    }

    const seguro = confirm(`⚠️ PELIGRO: ¿Estás ABSOLUTAMENTE seguro de querer eliminar la cuenta de ${username}? Esta acción borrará sus datos de la base de datos pública.`);
    if (!seguro) return;

    addAdminLog(`Iniciando purga de datos para el usuario ${username}...`, "warning");

    try {
        await supabase.from('roles').delete().eq('email', emailUser);
        const { error } = await supabase.from('usuarios').delete().eq('id', idUser);

        if (error) throw error;

        addAdminLog(`Usuario ${username} eliminado de los registros exitosamente.`, "success");
        cargarTablaUsuarios();
    } catch (err) {
        addAdminLog(`Error crítico al intentar purgar a ${username}: ${err.message}`, "error");
    }
};

// --- ACCIONES RÁPIDAS (Botones Globales) ---
document.getElementById('btn-admin-clear-cache')?.addEventListener('click', () => {
    addAdminLog("Iniciando purga de caché de APIs...", "warning");
    setTimeout(() => {
        addAdminLog("Caché limpiada con éxito. Memoria liberada.", "success");
        showToast('success', 'Caché Purgada', 'La memoria caché de las APIs ha sido liberada correctamente.');
    }, 1200);
});

document.getElementById('btn-admin-lockdown')?.addEventListener('click', () => {
    addAdminLog("⚠️ PROTOCOLO DE BLOQUEO RECHAZADO: Se requiere autorización de nivel 5.", "error");
    showToast('error', 'Acceso Denegado', 'Se requiere autorización de nivel 5 para iniciar el Bloqueo Global.');
});

// ==========================================================================
//   MODAL DE TRANSMISIÓN GLOBAL (ANUNCIOS)
// ==========================================================================
const modalAnnounce = document.getElementById('announce-modal');
const btnCloseAnnounce = document.getElementById('btn-close-announce');
const selectWrapper = document.getElementById('announce-select-wrapper');
const selectTrigger = document.getElementById('announce-select-trigger');
const selectLabel = document.getElementById('announce-select-label');
const selectInput = document.getElementById('announce-target');
const selectOptions = document.querySelectorAll('#announce-select-dropdown .cyber-select-option');
const specificUserGroup = document.getElementById('announce-specific-user-group');
const btnSendAnnounce = document.getElementById('btn-send-announce');
const announceMessage = document.getElementById('announce-message');
const announceSpecificUser = document.getElementById('announce-specific-user');

// Función reutilizable de abrir/cerrar
function openAnnounceModal() {
    modalAnnounce?.classList.add('show');
    document.body.classList.add('no-scroll');
    document.documentElement.classList.add('no-scroll');
}

function closeAnnounceModal() {
    modalAnnounce?.classList.remove('show');  // era .active
    document.body.classList.remove('no-scroll');
    document.documentElement.classList.remove('no-scroll');
    if (announceMessage) announceMessage.value = '';
    if (announceSpecificUser) announceSpecificUser.value = '';
    if (specificUserGroup) specificUserGroup.style.display = 'none';
    selectOptions.forEach(o => o.classList.remove('selected'));
    selectOptions[0]?.classList.add('selected');
    if (selectLabel) selectLabel.textContent = 'Todos los Usuarios';
    if (selectInput) selectInput.value = 'all_users';
    selectWrapper?.classList.remove('open');
}

// Abrir
document.getElementById('btn-admin-announce')?.addEventListener('click', openAnnounceModal);

// Cerrar con botón X
btnCloseAnnounce?.addEventListener('click', closeAnnounceModal);

// Cerrar al clicar el fondo (igual que el resto de modales)
modalAnnounce?.addEventListener('click', (e) => {
    if (e.target === modalAnnounce) closeAnnounceModal();
});

// --- Cyber Select ---
selectTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    selectWrapper.classList.toggle('open');
});

selectOptions.forEach(opt => {
    opt.addEventListener('click', () => {
        selectOptions.forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        selectLabel.textContent = opt.textContent.trim();
        selectInput.value = opt.dataset.value;
        specificUserGroup.style.display = opt.dataset.value === 'specific_user' ? 'flex' : 'none';
        selectWrapper.classList.remove('open');
    });
});

// Cierra el select al clicar fuera
document.addEventListener('click', (e) => {
    if (!selectWrapper?.contains(e.target)) {
        selectWrapper?.classList.remove('open');
    }
});

// --- Enviar Alerta ---
btnSendAnnounce?.addEventListener('click', () => {
    const target = selectInput?.value || 'all_users';
    const message = announceMessage?.value.trim();
    const specificUser = announceSpecificUser?.value.trim();

    if (!message) {
        showToast('error', 'Error de transmisión', 'El cuerpo del mensaje no puede estar vacío.');
        return;
    }

    if (target === 'specific_user' && !specificUser) {
        showToast('error', 'Destinatario inválido', 'Debes especificar el nombre de usuario destino.');
        return;
    }

    const destinatarioLog = target === 'all_users' ? 'Todos los Usuarios' :
        target === 'all_admins' ? 'Administradores' : specificUser;

    addAdminLog(`Transmitiendo mensaje a [${destinatarioLog}]: "${message}"`, "system");

    setTimeout(() => {
        addAdminLog(`Transmisión completada exitosamente.`, "success");
        showToast('success', 'Transmisión Enviada', `El mensaje ha sido entregado a la red.`);

        if (target === 'all_users' || target === 'all_admins') {
            setTimeout(() => showToast('success', 'NUEVA TRANSMISIÓN', message), 1500);
        }
    }, 800);

    closeAnnounceModal();
});

// ==========================================================================
//   SISTEMA DE NOTIFICACIONES FLOTANTES (TOASTS)
// ==========================================================================
window.showToast = async function (tipo, titulo, descripcion) {
    // 1. REGLA ESTRICTA: Solo mostrar si hay sesión iniciada
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const container = document.getElementById('toast-container');
    const templateId = tipo === 'success' ? 'toast-success-template' : 'toast-error-template';
    const template = document.getElementById(templateId);

    if (!container || !template) return;

    // 2. Clonamos la plantilla oculta del HTML
    const clone = template.content.cloneNode(true);
    const wrapper = clone.querySelector('.toast-wrapper');
    const titleEl = clone.querySelector('.toast-title');
    const descEl = clone.querySelector('.toast-desc');
    const closeBtn = clone.querySelector('.toast-close');

    // 3. Inyectamos nuestros textos
    titleEl.textContent = titulo;
    descEl.textContent = descripcion;

    // 4. Funcionalidad de cerrar manual
    closeBtn.addEventListener('click', () => {
        wrapper.classList.add('toast-leave');
        setTimeout(() => wrapper.remove(), 250); // Esperamos que termine la animación
    });

    // 5. Auto-destrucción a los 5 segundos
    setTimeout(() => {
        if (wrapper.parentElement) {
            wrapper.classList.add('toast-leave');
            setTimeout(() => wrapper.remove(), 250);
        }
    }, 5000);

    // 6. Lanzamos el Toast a la pantalla
    container.appendChild(clone);
};

// ==========================================================================
//   CHATBOX Y NOTIFICACIONES FLOTANTE
// ==========================================================================
const nexusChatbox = document.getElementById('nexus-chatbox');
const chatboxNavBar = document.querySelector('.chatbox-nav-bar');
const tabChat = document.getElementById('tab-btn-chat');
const tabNotifs = document.getElementById('tab-btn-notifs');
const viewChat = document.getElementById('chat-view-messages');
const viewNotifs = document.getElementById('chat-view-notifs');

// 1. Abrir/Expandir el panel
window.abrirChatbox = function (pestaña = 'chat') {
    if (!nexusChatbox) return;
    nexusChatbox.classList.remove('collapsed');

    if (pestaña === 'notifs') {
        tabNotifs.click();
    } else {
        tabChat.click();
    }
};

// Clic en el header: Expande si está colapsado y mantiene la pestaña activa
chatboxNavBar?.addEventListener('click', () => {
    if (nexusChatbox.classList.contains('collapsed')) {
        abrirChatbox('chat');
    }
});

// Clic en la flechita para minimizar
const btnCollapseChat = document.getElementById('btn-collapse-chat');
btnCollapseChat?.addEventListener('click', (e) => {
    e.stopPropagation(); // ¡Súper importante! Evita que el clic llegue al nav-bar y lo vuelva a abrir
    nexusChatbox.classList.add('collapsed');
});

// CLIC FUERA: Colapsar si clicas fuera del chatbox
document.addEventListener('click', (e) => {
    if (!nexusChatbox.contains(e.target) && !nexusChatbox.classList.contains('collapsed')) {
        nexusChatbox.classList.add('collapsed');
    }
});

// 2. Cambio de Pestañas
tabChat?.addEventListener('click', (e) => {
    e.stopPropagation(); // Evita que se dispare el evento del header
    nexusChatbox.classList.remove('collapsed'); // Asegura expansión
    tabChat.classList.add('active');
    tabNotifs.classList.remove('active');
    viewChat.style.display = 'flex';
    viewNotifs.style.display = 'none';
});

tabNotifs?.addEventListener('click', (e) => {
    e.stopPropagation(); // Evita que se dispare el evento del header
    nexusChatbox.classList.remove('collapsed'); // Asegura expansión
    tabNotifs.classList.add('active');
    tabChat.classList.remove('active');
    viewNotifs.style.display = 'flex';
    viewChat.style.display = 'none';

    cargarAlertas();
});

// ==========================================================================
//   LOGICA DE ALERTAS / NOTIFICACIONES (Simplificado a Seguidores)
// ==========================================================================

window.cargarAlertas = async function () {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const areaNotifs = document.getElementById('chatbox-notifs-scroll');
    if (!areaNotifs) return;

    areaNotifs.innerHTML = '<div style="text-align:center; padding: 40px;"><i class="fas fa-circle-notch fa-spin" style="font-size: 2rem; color: var(--primary);"></i><p style="margin-top:10px; color:var(--text-muted);">Sincronizando red...</p></div>';

    try {
        const miId = session.user.id; // Usamos nuestro UUID directamente

        // 1. Buscamos quién nos sigue (en la tabla amistades usando receptor_id)
        const { data: seguidores, error } = await supabase
            .from('amistades')
            .select('solicitante_id, created_at')
            .eq('receptor_id', miId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!seguidores || seguidores.length === 0) {
            areaNotifs.innerHTML = `
                <div style="text-align: center; color: #828E9E; padding-top: 40px; font-size: 0.85rem;">
                    <i class="fas fa-users-slash" style="font-size: 2rem; margin-bottom: 10px; opacity: 0.5;"></i><br>
                    Sin nuevos seguidores
                </div>`;
            return;
        }

        // 2. Extraemos los IDs y buscamos sus perfiles en la VISTA SEGURA
        const solicitantesIds = seguidores.map(s => s.solicitante_id);
        const { data: perfiles } = await supabase.from('perfiles_publicos').select('auth_id, username, avatar').in('auth_id', solicitantesIds);

        areaNotifs.innerHTML = '';

        seguidores.forEach(seg => {
            const perfil = perfiles?.find(u => u.auth_id === seg.solicitante_id);
            if (!perfil) return;

            const avatarDB = perfil.avatar ? perfil.avatar.replace(/'/g, "") : 'default';

            let avatarHtml = (avatarDB === 'default' || avatarDB === 'custom')
                ? '<i class="fas fa-user-astronaut"></i>'
                : `<img src="https://raw.githubusercontent.com/DonPlastico/WEB-Multiusos/main/img/Avatars/${avatarDB}.png" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-user-astronaut\\' style=\\'color: var(--primary);\\'></i>'">`;

            areaNotifs.innerHTML += `
                <div class="notif-card">
                    <div class="notif-card-avatar">${avatarHtml}</div>
                    <div class="notif-card-info">
                        <span class="notif-subtitle">Nuevo seguidor</span>
                        <span class="notif-title">${perfil.username}</span>
                    </div>
                </div>
            `;
        });

    } catch (err) {
        console.error("Error cargando seguidores:", err);
        areaNotifs.innerHTML = '<div style="text-align:center; color: var(--error); padding:20px;">Fallo de conexión.</div>';
    }
};

// 3. Escuchador inteligente para abrir el chat
document.addEventListener('click', (e) => {
    const statBoxClick = e.target.closest('.stat-box');
    if (statBoxClick) {
        const label = statBoxClick.querySelector('.stat-label');
        if (label && label.textContent.trim().toLowerCase() === 'mensajes') {
            abrirChatbox('chat');
        }
    }
});

// ==========================================================================
//   MODAL DE LISTAS SOCIALES (SIGUIENDO / SEGUIDORES)
// ==========================================================================
const socialModal = document.getElementById('social-list-modal');
const btnCloseSocial = document.getElementById('close-social-list-modal');
const socialTitle = document.getElementById('social-list-title');
const socialSubtitle = document.getElementById('social-list-subtitle');
const socialGrid = document.getElementById('social-list-grid');
const socialEmpty = document.getElementById('social-list-empty');
const socialPageInfo = document.getElementById('social-page-info');
const btnSocialPrev = document.getElementById('btn-social-prev');
const btnSocialNext = document.getElementById('btn-social-next');
const socialIcon = document.querySelector('#social-list-icon i');

let currentSocialType = 'siguiendo'; // 'siguiendo' o 'seguidores'
let currentSocialPage = 1;
const ITEMS_PER_SOCIAL_PAGE = 8; // Cuántos usuarios mostrar por página
let totalSocialItems = 0;

// 1. Abrir Modal
window.abrirListaSocial = function (tipo) {
    currentSocialType = tipo;
    currentSocialPage = 1; // Reiniciamos a la página 1 siempre que se abre

    socialModal?.classList.add('show');
    document.body.classList.add('no-scroll');
    document.documentElement.classList.add('no-scroll');

    if (tipo === 'siguiendo') {
        socialTitle.textContent = 'SIGUIENDO';
        socialSubtitle.textContent = 'Usuarios a los que sigue';
        if (socialIcon) socialIcon.className = 'fas fa-user-check';
    } else {
        socialTitle.textContent = 'SEGUIDORES';
        socialSubtitle.textContent = 'Usuarios que le siguen';
        if (socialIcon) socialIcon.className = 'fas fa-users';
    }

    cargarDatosSociales();
};

// Listeners para abrir desde las cajas del perfil
document.getElementById('btn-ver-siguiendo')?.addEventListener('click', () => abrirListaSocial('siguiendo'));
document.getElementById('btn-ver-seguidores')?.addEventListener('click', () => abrirListaSocial('seguidores'));

// 2. Cerrar Modal
function cerrarListaSocial() {
    socialModal?.classList.remove('show');
    document.body.classList.remove('no-scroll');
    document.documentElement.classList.remove('no-scroll');
}

btnCloseSocial?.addEventListener('click', cerrarListaSocial);
socialModal?.addEventListener('click', (e) => {
    if (e.target === socialModal) cerrarListaSocial();
});

// 3. Cargar Datos Paginados de Supabase
async function cargarDatosSociales() {
    const usuarioVisto = document.getElementById('main-profile-username')?.textContent;
    if (!usuarioVisto) return;

    // Saber quién soy yo (Mi ID)
    const { data: { session } } = await supabase.auth.getSession();
    let miId = session?.user?.id;

    // Mostrar estado de carga
    socialGrid.style.display = 'none';
    socialEmpty.style.display = 'flex';
    socialEmpty.innerHTML = '<i class="fas fa-circle-notch fa-spin empty-icon" style="color: var(--primary);"></i><p id="social-empty-text">Rastreando conexiones en el Nexus...</p>';

    // Calcular Offsets de paginación
    const fromIdx = (currentSocialPage - 1) * ITEMS_PER_SOCIAL_PAGE;
    const toIdx = fromIdx + ITEMS_PER_SOCIAL_PAGE - 1;

    try {
        // PRIMERO: Obtenemos el ID del usuario cuyo perfil estamos viendo
        const { data: perfilVisto } = await supabase.from('perfiles_publicos').select('auth_id').eq('username', usuarioVisto).single();
        if (!perfilVisto) throw new Error("Perfil no encontrado para extraer ID");
        const targetId = perfilVisto.auth_id;

        // Preparar consulta base a 'amistades'
        let query = supabase.from('amistades').select('*', { count: 'exact' });

        if (currentSocialType === 'siguiendo') {
            query = query.eq('solicitante_id', targetId);
        } else {
            query = query.eq('receptor_id', targetId);
        }

        // Ordenar y aplicar límite
        const { data: relaciones, count, error } = await query
            .order('created_at', { ascending: false })
            .range(fromIdx, toIdx);

        if (error) throw error;

        // Configurar UI de Paginación
        totalSocialItems = count || 0;
        const totalPages = Math.ceil(totalSocialItems / ITEMS_PER_SOCIAL_PAGE) || 1;
        socialPageInfo.textContent = `${currentSocialPage} / ${totalPages}`;
        btnSocialPrev.disabled = currentSocialPage <= 1;
        btnSocialNext.disabled = currentSocialPage >= totalPages;

        if (!relaciones || relaciones.length === 0) {
            socialEmpty.innerHTML = '<i class="fas fa-user-astronaut fa-fade empty-icon"></i><p id="social-empty-text">La red está vacía.</p>';
            return;
        }

        // Extraer IDs a buscar y consultar perfiles
        const idsBuscar = relaciones.map(r => currentSocialType === 'siguiendo' ? r.receptor_id : r.solicitante_id);
        const { data: perfiles } = await supabase.from('perfiles_publicos').select('auth_id, username, avatar').in('auth_id', idsBuscar);

        // Pintar cuadrícula
        socialEmpty.style.display = 'none';
        socialGrid.style.display = 'grid';
        socialGrid.innerHTML = '';

        relaciones.forEach(rel => {
            const currId = currentSocialType === 'siguiendo' ? rel.receptor_id : rel.solicitante_id;
            const perfil = perfiles?.find(p => p.auth_id === currId);
            if (!perfil) return;

            const avatarDB = perfil.avatar ? perfil.avatar.replace(/'/g, "") : 'default';
            let avatarHtml = (avatarDB === 'default' || avatarDB === 'custom')
                ? '<i class="fas fa-user-astronaut" style="color: var(--primary);"></i>'
                : `<img src="https://raw.githubusercontent.com/DonPlastico/WEB-Multiusos/main/img/Avatars/${avatarDB}.png" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-user-astronaut\\' style=\\'color: var(--primary);\\'></i>'">`;

            // Botón de Dejar de Seguir (Comparamos MI ID con el TARGET ID)
            let actionBtnHtml = '';
            if (currentSocialType === 'siguiendo' && miId === targetId) {
                actionBtnHtml = `
                    <button class="btn-remove-friend" onclick="dejarDeSeguir('${currId}', '${perfil.username}', this, event)" title="Dejar de seguir">
                        <i class="fas fa-user-minus"></i>
                    </button>
                `;
            }

            const card = document.createElement('div');
            card.className = 'friend-user-card';
            card.onclick = () => irAPerfilDesdeLista(perfil.username);
            card.style.cursor = 'pointer';

            card.innerHTML = `
                <div class="friend-card-avatar">${avatarHtml}</div>
                <div class="friend-card-info">
                    <h4 class="friend-card-username">${perfil.username}</h4>
                    <span style="font-size:0.7rem; color:var(--text-muted);">${new Date(rel.created_at).toLocaleDateString()}</span>
                </div>
                ${actionBtnHtml}
            `;
            socialGrid.appendChild(card);
        });

    } catch (err) {
        console.error("Error cargando lista social:", err);
        socialEmpty.innerHTML = '<i class="fas fa-exclamation-triangle empty-icon" style="color: var(--error);"></i><p id="social-empty-text">Fallo de conexión al extraer datos.</p>';
    }
}

// 4. Controles de Paginación
btnSocialPrev?.addEventListener('click', () => {
    if (currentSocialPage > 1) {
        currentSocialPage--;
        cargarDatosSociales();
    }
});

btnSocialNext?.addEventListener('click', () => {
    const totalPages = Math.ceil(totalSocialItems / ITEMS_PER_SOCIAL_PAGE) || 1;
    if (currentSocialPage < totalPages) {
        currentSocialPage++;
        cargarDatosSociales();
    }
});

// 5. Función de Dejar de Seguir (Ahora usa ID)
window.dejarDeSeguir = async function (targetId, targetUsername, btnElement, evento) {
    evento.stopPropagation();

    if (!confirm(`¿Estás seguro de que quieres dejar de seguir a ${targetUsername}?`)) return;

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const miId = session.user.id;

        const { error } = await supabase.from('amistades')
            .delete()
            .eq('solicitante_id', miId)
            .eq('receptor_id', targetId);

        if (error) throw error;

        showToast('warning', 'Enlace cortado', `Has dejado de seguir a ${targetUsername}.`);

        const card = btnElement.closest('.friend-user-card');
        if (card) card.style.display = 'none';

        const mainProfileUsername = document.getElementById('main-profile-username')?.textContent;
        if (mainProfileUsername) cargarPerfilPublico(mainProfileUsername);

    } catch (err) {
        console.error(err);
        showToast('error', 'Error', 'No se pudo procesar la desconexión.');
    }
};

// 6. Navegar al perfil al clickear una tarjeta
window.irAPerfilDesdeLista = function (usernameTarget) {
    cerrarListaSocial(); // Cerramos el modal
    cambiarVista('profile', true, usernameTarget); // Usamos tu router para ir a su perfil
};