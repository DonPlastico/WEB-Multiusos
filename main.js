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

function cambiarVista(target, guardarEnHistorial = true) {
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
    // espero 10ms para que el navegador pinte primero
    setTimeout(() => {
        window.scrollTo({
            top: memoriaScroll[target] || 0, // si no habia entrado scroll en 0
            behavior: 'instant' // sin animacion
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
    }

    // cambio la url sin recargar
    if (guardarEnHistorial && mapaRutas[target]) {
        window.history.pushState({ vista: target }, '', mapaRutas[target]);
    }
}

// cuando hago click en el menu
linksMenu.forEach(link => {
    link.addEventListener('click', (evento) => {
        evento.preventDefault();
        const target = link.getAttribute('data-target');
        cambiarVista(target, true);
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

// detecto cuando usan los botones atras/adelante
window.addEventListener('popstate', (evento) => {
    if (evento.state && evento.state.vista) {
        // vuelvo a la vista anterior sin guardar
        cambiarVista(evento.state.vista, false);
    } else {
        cambiarVista('home', false);
    }
});

// cuando entran directamente a una url tipo /juegos
function arrancarEnrutador() {
    const rutaActual = window.location.pathname;
    let vistaInicial = 'home'; // default

    // busco que vista corresponde a la url
    for (const [idVista, url] of Object.entries(mapaRutas)) {
        if (url === rutaActual) {
            vistaInicial = idVista;
            break;
        }
    }

    // muestro esa vista
    cambiarVista(vistaInicial, false);
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
    menuOpen = !menuOpen;
    if (menuOpen) {
        themeMenu.classList.add('show');
    } else {
        themeMenu.classList.remove('show');
    }
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

function crearTarjeta(juego) {
    const portada = juego.cover
        ? juego.cover.url.replace('t_thumb', 't_cover_big').replace('//', 'https://')
        : 'https://via.placeholder.com/264x374?text=SIN+PORTADA';

    const fechaFormateada = juego.first_release_date
        ? new Date(juego.first_release_date * 1000).toLocaleDateString('es-ES', {
            day: 'numeric', month: 'long', year: 'numeric'
        })
        : 'TBA';

    // Obtener todas las plataformas únicas
    let htmlPlataformas = '';
    if (juego.platforms && juego.platforms.length > 0) {
        // Obtenemos los nombres únicos para no repetir (ej: si tiene PC y Windows, que salga una vez)
        const nombresPlat = [...new Set(juego.platforms.map(p => p.name))];

        // Creamos una etiqueta por cada plataforma
        htmlPlataformas = nombresPlat.map(name => `
            <span class="plat-tag">${name.split(' ')[0]}</span>
        `).join('');
    }

    // guardo datos ocultos para el filtro
    const storesData = juego.itad ? juego.itad.stores : 'none';
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

    return `
        <div class="game-card" data-game-title="${juego.name}" data-stores="${storesData}" data-platforms="${platformsData}">
            <div class="game-cover-container">
                <div class="platforms-container" style="position:absolute; top:12px; left:12px; z-index:2; display:flex; flex-wrap:wrap; gap:4px;">
                    ${htmlPlataformas}
                </div>
                <img src="${portada}" alt="${juego.name}" class="game-cover">
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

async function cargarJuegosIGDB(busqueda = '', resetear = true, filtros = {}) {
    if (cargando) return;
    cargando = true;

    if (resetear) {
        offsetActual = 0;
        busquedaActual = busqueda;

        // muestro el loader
        gridJuegos.innerHTML = `
            <div id="loader-games" style="grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 0;">
                <i class="fas fa-circle-notch fa-spin" style="font-size: 3rem; color: var(--primary); margin-bottom: 10px;"></i>
                <h3 class="loading-text" style="color: var(--text-muted); letter-spacing: 3px; font-weight: 600;">CARGANDO DATOS...</h3>
            </div>
        `;

        // cambio el texto del loader
        setTimeout(() => {
            const loaderText = document.querySelector('#loader-games .loading-text');
            if (loaderText) loaderText.textContent = 'ADAPTÁNDONOS A TUS PREFERENCIAS...';
        }, 1200);

        document.getElementById('btn-cargar-mas')?.remove();
    } else {
        // transformo el boton en un loader
        const btnMas = document.getElementById('btn-cargar-mas');
        if (btnMas) {
            btnMas.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px 0;">
                    <i class="fas fa-circle-notch fa-spin" style="font-size: 2rem; color: var(--primary); margin-bottom: 10px;"></i>
                    <span style="color: var(--text-muted); letter-spacing: 2px; font-weight: 600; margin-bottom: 15px;">CARGANDO MÁS JUEGOS...</span>
                    
                    <button onclick="cargando=false; cargarMas()" style="background:transparent; border:1px solid rgba(255,255,255,0.1); color:var(--text-muted); padding:0.5rem 1.5rem; border-radius:40px; cursor:pointer; font-size: 0.8rem; transition: 0.3s;" onmouseover="this.style.color='var(--primary)'; this.style.borderColor='var(--primary)'" onmouseout="this.style.color='var(--text-muted)'; this.style.borderColor='rgba(255,255,255,0.1)'">
                        <i class="fas fa-redo"></i> ¿Tarda mucho? Reintentar manualmente
                    </button>
                </div>
            `;
        }
    }

    try {
        // Construimos la URL incluyendo los nuevos filtros
        let url = `/api/igdb?offset=${offsetActual}`;
        if (busquedaActual) url += `&query=${encodeURIComponent(busquedaActual)}`;
        if (filtros.platforms) url += `&platforms=${filtros.platforms}`;

        console.log('📡 Llamada a:', url);
        const respuesta = await fetch(url);
        if (!respuesta.ok) {
            const errorMsg = `Error HTTP ${respuesta.status}`;
            console.error('❌ API error:', errorMsg);
            throw new Error(errorMsg);
        }

        const datos = await respuesta.json();
        console.log('✅ Datos recibidos:', datos.length, 'juegos');

        if (resetear) gridJuegos.innerHTML = '';
        document.getElementById('btn-cargar-mas')?.remove();

        // si no hay datos, muestra mensaje
        if (datos.length === 0) {
            if (resetear) {
                gridJuegos.innerHTML = '<div style="color:var(--text-muted); text-align:center; width:100%; padding: 2rem;">Sin resultados. Intenta otra busqueda.</div>';
            }
            cargando = false;
            return;
        }

        // inyecto las tarjetas
        const precioMin = filtros.precioMin ?? 0;
        const precioMax = filtros.precioMax ?? 9999;
        const tiendasFiltro = filtros.stores || [];

        const datosFiltrados = datos.filter(juego => {
            // A) Filtro de Precio
            const precio = juego.itad?.precio;
            let pasaPrecio = true;
            if (precio !== null && precio !== undefined) {
                pasaPrecio = precio >= precioMin && precio <= precioMax;
            }

            // B) Filtro de Tiendas
            let pasaTienda = true;
            if (tiendasFiltro.length > 0) {
                const storesDelJuego = juego.itad?.stores || '';
                // Comprobamos si el juego tiene alguna de las tiendas marcadas
                pasaTienda = tiendasFiltro.some(tienda => storesDelJuego.includes(tienda));
            }

            return pasaPrecio && pasaTienda;
        });

        datosFiltrados.forEach(juego => {
            gridJuegos.innerHTML += crearTarjeta(juego);
        });

        if (datos.length === 50) {
            const btnMas = document.createElement('div');
            btnMas.id = 'btn-cargar-mas';
            btnMas.style = "grid-column: 1 / -1; text-align: center; margin: 2rem 0;";
            btnMas.innerHTML = `<button onclick="cargarMas()" style="background:transparent; border:1px solid var(--primary); color:var(--primary); padding:0.8rem 2.5rem; border-radius:40px; cursor:pointer; font-weight:600;">Cargar más</button>`;
            gridJuegos.after(btnMas);

            // Le decimos al vigilante que vigile este botón
            observadorScroll.observe(btnMas);
        }

        offsetActual += datos.length;

    } catch (error) {
        console.error("❌ Error cargando juegos:", error);
        if (resetear) {
            gridJuegos.innerHTML = `
                <div style="color:var(--error); text-align:center; width:100%; padding: 2rem;">
                    <i class="fas fa-exclamation-circle"></i> Fallo al conectar con la API<br>
                    <small style="font-size: 0.8rem; color: var(--text-muted);">${error.message}</small>
                    <button onclick="location.reload()" style="margin-top: 1rem; background:transparent; border:1px solid var(--error); color:var(--error); padding:0.5rem 1rem; border-radius:20px; cursor:pointer;">Reintentar</button>
                </div>
            `;
        } else {
            // si falla muestro el boton para reintentar
            const btnMas = document.getElementById('btn-cargar-mas');
            if (btnMas) {
                btnMas.innerHTML = `<button onclick="cargarMas()" style="background:transparent; border:1px solid var(--error); color:var(--error); padding:0.8rem 2.5rem; border-radius:40px; cursor:pointer; font-weight:600;"><i class="fas fa-redo"></i> Reintentar carga</button>`;
            }
        }
    }

    cargando = false;
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

    // NUEVO: Guardar tiendas
    const tiendasSeleccionadas = Array.from(document.querySelectorAll('.tienda-item:checked'))
        .map(cb => cb.value);

    const precioMin = document.getElementById('precio-min')?.value || '';
    const precioMax = document.getElementById('precio-max')?.value || '';

    const adultMovie = document.getElementById('adult-filter-movie')?.checked || false;
    const adultSeries = document.getElementById('adult-filter-series')?.checked || false;

    const filtrosState = {
        games: { platforms: platSeleccionadas, stores: tiendasSeleccionadas, precioMin, precioMax },
        movies: { adult: adultMovie },
        series: { adult: adultSeries }
    };

    localStorage.setItem('dp_sys_filters_v1', JSON.stringify(filtrosState));
}

function restaurarFiltrosDOM() {
    const guardados = localStorage.getItem('dp_sys_filters_v1');
    if (!guardados) return;

    try {
        const state = JSON.parse(guardados);

        // Restaurar Juegos
        if (state.games) {
            // Restaurar Plataformas
            if (state.games.platforms && state.games.platforms.length > 0) {
                const platInputs = document.querySelectorAll('.plat-item input');
                platInputs.forEach(cb => {
                    if (state.games.platforms.includes(cb.value)) cb.checked = true;
                });
            }

            // NUEVO: Restaurar Tiendas
            if (state.games.stores && state.games.stores.length > 0) {
                const tiendaInputs = document.querySelectorAll('.tienda-item');
                tiendaInputs.forEach(cb => {
                    if (state.games.stores.includes(cb.value)) cb.checked = true;
                });
            }

            if (state.games.precioMin) document.getElementById('precio-min').value = state.games.precioMin;
            if (state.games.precioMax) document.getElementById('precio-max').value = state.games.precioMax;
        }

        // Restaurar Películas (+18)
        if (state.movies && state.movies.adult) {
            const cbMovie = document.getElementById('adult-filter-movie');
            if (cbMovie) cbMovie.checked = true;
        }

        // Restaurar Series (+18)
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
//   FILTROS DE JUEGOS
// ==========================================================================

const buscadorGeneros = document.getElementById('search-genre');
const itemsGenero = document.querySelectorAll('.genre-item');

if (buscadorGeneros) {
    buscadorGeneros.addEventListener('input', (e) => {
        const txt = e.target.value.toLowerCase().trim();

        itemsGenero.forEach(item => {
            const nombreGenero = item.querySelector('span').textContent.toLowerCase();
            const checkbox = item.querySelector('input');
            const esOculto = item.classList.contains('hidden-genre');

            if (txt === '') {
                // al borrar muestro solo los marcados
                item.style.display = (esOculto && !checkbox.checked) ? 'none' : '';
            } else {
                // con texto muestro lo que coincida
                item.style.display = nombreGenero.includes(txt) ? '' : 'none';
            }
        });
    });
}

// ==========================================================================
//   FILTROS DE TIENDAS Y PLATAFORMAS
// ==========================================================================

const tiendasItems = document.querySelectorAll('.tienda-item');
const platItems = document.querySelectorAll('.plat-item input');

function aplicarFiltros() {
    // 1. Recolectar valores de las plataformas
    const platSeleccionadas = Array.from(document.querySelectorAll('.plat-item input:checked'))
        .map(cb => cb.value)
        .filter(val => val && val !== 'on')
        .join(',');

    // 2. Recolectar valores de Tiendas
    const tiendasSeleccionadas = Array.from(document.querySelectorAll('.tienda-item:checked'))
        .map(cb => cb.value.toLowerCase());

    // 3. Recolectar valores de precio
    const precioMin = parseFloat(document.getElementById('precio-min')?.value) || 0;
    const precioMax = parseFloat(document.getElementById('precio-max')?.value) || 9999;

    // === GUARDAR ESTADO EN LA MEMORIA ===
    guardarFiltros();

    console.log("Plataformas:", platSeleccionadas, "| Tiendas:", tiendasSeleccionadas, "| Precio:", precioMin, "-", precioMax);

    // 4. Lanzar carga pasando todos los filtros
    cargarJuegosIGDB(busquedaActual, true, {
        platforms: platSeleccionadas,
        stores: tiendasSeleccionadas,
        precioMin,
        precioMax
    });
}

// Eventos de tiendas (limpios, sin el "TODAS")
tiendasItems.forEach(cb => {
    cb.addEventListener('change', () => {
        aplicarFiltros();
    });
});

// Eventos de plataformas (limpios, sin el "TODAS")
platItems.forEach(cb => {
    cb.addEventListener('change', () => {
        aplicarFiltros();
    });
});

// filtro de precio
let tempPrecio;
document.getElementById('precio-min')?.addEventListener('input', () => {
    clearTimeout(tempPrecio);
    tempPrecio = setTimeout(() => aplicarFiltros(), 600);
});
document.getElementById('precio-max')?.addEventListener('input', () => {
    clearTimeout(tempPrecio);
    tempPrecio = setTimeout(() => aplicarFiltros(), 600);
});

// boton para ver todas las plataformas (¡RESTURADO!)
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
            // si estas logueado abro el menu
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
        // guardo el usuario en la bd
        await supabase.from('usuarios').insert([{ username: username, email: email, birthdate: birthdate }]);

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

    // si no tiene @ es un usuario
    if (!identifier.includes('@')) {
        // pregunto cual es el correo del usuario
        const { data: userData } = await supabase
            .from('usuarios')
            .select('email')
            .eq('username', identifier)
            .maybeSingle();

        if (userData && userData.email) {
            emailToUse = userData.email; // Traducción completada
        } else {
            msgBox.style.color = 'var(--error)';
            msgBox.textContent = '❌ Usuario no encontrado en el Nexus.';
            btnSubmit.innerHTML = '<i class="fas fa-sign-in-alt"></i> ENTRAR AL NEXUS';
            btnSubmit.disabled = false;
            return; // Cortamos aquí porque el usuario no existe
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
}

// ============================================
// GUARDAR DISEÑO EN BD
// ============================================
window.seleccionarDiseño = async function (tipo, idCard) {
    // cierro el modal al toque
    modalEdit.classList.remove('show');

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
    document.body.style.overflow = 'hidden'; // evita scroll del fondo
}

function cerrarDrawerFiltros() {
    filterSidebar?.classList.remove('drawer-open');
    filtersOverlay?.classList.remove('active');
    document.body.style.overflow = '';
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
});

// cierro click afuera
modalEdit?.addEventListener('click', (evento) => {
    if (evento.target === modalEdit) {
        modalEdit.classList.remove('show');
    }
});

// click en estadisticas
document.getElementById('btn-open-stats-modal')?.addEventListener('click', () => {
    openCustomizationModal('stats');
});

// boton de agregar amigo
document.getElementById('btn-add-friend')?.addEventListener('click', () => {
    console.log('📡 Abriendo panel de busqueda de amigos...');
    // aqui luego hago un modal o mando una solicitud, ya vere
});

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
    // Limpiamos checks
    document.querySelectorAll('.plat-item input').forEach(cb => cb.checked = false);
    document.querySelectorAll('.tienda-item').forEach(cb => cb.checked = false);

    // Limpiamos precios
    const pMin = document.getElementById('precio-min');
    if (pMin) pMin.value = '';
    const pMax = document.getElementById('precio-max');
    if (pMax) pMax.value = '';

    aplicarFiltros(); // Al aplicarlos vacíos, se guarda en memoria y recarga el listado limpio
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
        document.body.style.overflow = 'hidden';
    };

    const cerrar = () => {
        sidebar.classList.remove('drawer-open');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
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