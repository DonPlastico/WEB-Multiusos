// Importamos el cliente de Supabase para futuras funcionalidades (registro, login, etc.)
import { supabase } from './supabase.js';

// // Importamos Vercel Analytics para tener datos de uso y mejorar el proyecto con el tiempo
import { inject } from '@vercel/analytics';
inject();

// // Importamos Vercel Speed Insights para monitorear el rendimiento y optimizar la experiencia
import { injectSpeedInsights } from '@vercel/speed-insights';
injectSpeedInsights();

// ==========================================================================
//   NAVEGACIÓN ENTRE VISTAS (CON CACHÉ)
// ==========================================================================

const linksMenu = document.querySelectorAll('.nav-links a');
const vistas = document.querySelectorAll('.view');

function cambiarVista(target) {
    // 1. Guardamos la pestaña actual en la memoria del navegador
    localStorage.setItem('dp_sys_active_view', target);

    // 2. Actualizamos el color del menú
    linksMenu.forEach(link => {
        if (link.getAttribute('data-target') === target) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // 3. Mostramos la vista correcta y ocultamos las demás
    vistas.forEach(vista => {
        if (vista.id === target) {
            vista.classList.add('active');
        } else {
            vista.classList.remove('active');
        }
    });
}

// Evento al hacer clic en los enlaces
linksMenu.forEach(link => {
    link.addEventListener('click', (evento) => {
        evento.preventDefault();
        const target = link.getAttribute('data-target');
        cambiarVista(target);
    });
});

// Navegación especial para el botón oculto de Administrador
const btnAdminTop = document.getElementById('btn-admin');
if (btnAdminTop) {
    btnAdminTop.addEventListener('click', () => {
        cambiarVista('admin-panel');
        // Quitamos la clase 'active' de los enlaces principales para que no parezca que estás en Juegos o Pelis
        linksMenu.forEach(l => l.classList.remove('active'));
    });
}

// Al recargar (F5), leemos qué vista estaba guardada. Si es la primera vez, cargamos 'home'
const vistaGuardada = localStorage.getItem('dp_sys_active_view') || 'home';
cambiarVista(vistaGuardada);

// ==========================================================================
//   SISTEMA DE TEMAS (CLARO / OSCURO / SISTEMA)
// ==========================================================================

const themeBtn = document.getElementById('theme-toggle');
const themeIcon = themeBtn.querySelector('i');

// Crear el menú desplegable
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

// Añadir el menú al botón
const themeContainer = document.createElement('div');
themeContainer.className = 'theme-dropdown';
themeBtn.parentNode.insertBefore(themeContainer, themeBtn);
themeContainer.appendChild(themeBtn);
themeContainer.appendChild(themeMenu);

// Función para cambiar el tema
function setTheme(theme) {
    // Guardar en localStorage
    localStorage.setItem('dp_sys_theme', theme);

    // Aplicar el atributo data-theme al root
    document.documentElement.setAttribute('data-theme', theme);

    // Actualizar el icono del botón principal según el tema actual
    if (theme === 'system') {
        themeIcon.className = 'fas fa-desktop';
    } else if (theme === 'light') {
        themeIcon.className = 'fas fa-sun';
    } else if (theme === 'dark') {
        themeIcon.className = 'fas fa-moon';
    }

    // Actualizar clase active en las opciones del menú
    document.querySelectorAll('.theme-option').forEach(opt => {
        if (opt.getAttribute('data-theme') === theme) {
            opt.classList.add('active');
        } else {
            opt.classList.remove('active');
        }
    });

    // Detectar si el sistema prefiere oscuro (para mostrar en consola)
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    console.log(`Tema cambiado a: ${theme} | Sistema prefiere: ${isDarkMode ? 'oscuro' : 'claro'}`);
}

// Cargar tema guardado o default (sistema)
function loadSavedTheme() {
    const savedTheme = localStorage.getItem('dp_sys_theme');

    if (savedTheme && ['system', 'light', 'dark'].includes(savedTheme)) {
        setTheme(savedTheme);
    } else {
        setTheme('system');
    }
}

// Toggle del menú desplegable
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

// Manejar clic en las opciones del tema
document.querySelectorAll('.theme-option').forEach(option => {
    option.addEventListener('click', (e) => {
        const theme = option.getAttribute('data-theme');
        setTheme(theme);
        themeMenu.classList.remove('show');
        menuOpen = false;
    });
});

// Detectar cambios en la preferencia del sistema (si está en modo sistema)
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const currentTheme = localStorage.getItem('dp_sys_theme');
    if (currentTheme === 'system') {
        // Forzar actualización del tema sistema
        setTheme('system');
    }
});

// Cargar tema al iniciar
loadSavedTheme();

// ==========================================================================
//   LOGICA DE JUEGOS (IGDB API via Vercel Serverless)
// ==========================================================================

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

    // 1. SOLUCIÓN A LA ILUSIÓN ÓPTICA DE LAS ETIQUETAS
    // Priorizamos de forma inteligente qué logo mostrar en la tarjeta
    let platPrincipal = 'PC';
    const pNamesLower = juego.platforms ? juego.platforms.map(p => p.name.toLowerCase()) : [];
    const hasPC = pNamesLower.some(n => n.includes('pc') || n.includes('windows'));

    if (juego.platforms && juego.platforms.length > 0) {
        if (hasPC) {
            platPrincipal = 'PC';
        } else if (pNamesLower.some(n => n.includes('playstation'))) {
            platPrincipal = 'PlayStation';
        } else if (pNamesLower.some(n => n.includes('xbox'))) {
            platPrincipal = 'Xbox';
        } else if (pNamesLower.some(n => n.includes('nintendo') || n.includes('switch'))) {
            platPrincipal = 'Nintendo';
        } else {
            platPrincipal = juego.platforms[0].name.split(' ')[0];
        }
    }

    const extraCount = juego.platforms && juego.platforms.length > 1
        ? `<span class="plat-count">+${juego.platforms.length - 1}</span>`
        : '';

    // Guardamos los datos ocultos para que el filtro unificado los lea perfectamente
    const storesData = juego.itad ? juego.itad.stores : 'none';
    const platformsData = juego.platforms ? juego.platforms.map(p => p.name.toLowerCase()).join(',') : '';

    // 2. SOLUCIÓN AL TEXTO CONFUSO DE "NO DISPONIBLE"
    let htmlPrecio = '';
    if (juego.itad && juego.itad.precio !== null) {
        // Encontró oferta en ITAD (Es de PC)
        htmlPrecio = `<span class="price-badge">Desde <strong>${juego.itad.precio.toFixed(2)} €</strong>${juego.itad.voucher ? ' <span class="voucher-tag">🏷️ Cupón</span>' : ''}</span>`;
    } else if (!hasPC) {
        // No está en PC, así que es imposible que ITAD tenga su precio
        htmlPrecio = `<span class="price-na" style="color: var(--text-muted);"><i class="fas fa-gamepad"></i> Edición Consola</span>`;
    } else {
        // Está en PC pero no hay ofertas ahora mismo
        htmlPrecio = `<span class="price-na">Sin ofertas actuales</span>`;
    }

    return `
        <div class="game-card" data-game-title="${juego.name}" data-stores="${storesData}" data-platforms="${platformsData}">
            <div class="game-cover-container">
                <div class="top-platform-tag">${platPrincipal}</div>
                <img src="${portada}" alt="${juego.name}" class="game-cover">
            </div>
            <div class="game-info">
                <h3 class="game-title">${juego.name}</h3>
                <div class="game-release-info">
                    <span class="date">${fechaFormateada}</span>
                    <span class="dot">•</span>
                    <span class="main-plat">${platPrincipal}</span>
                    ${extraCount}
                </div>
                <div class="game-price">
                    ${htmlPrecio}
                </div>
            </div>
        </div>
    `;
}

async function cargarJuegosIGDB(busqueda = '', resetear = true) {
    if (cargando) return;
    cargando = true;

    if (resetear) {
        offsetActual = 0;
        busquedaActual = busqueda;
        gridJuegos.innerHTML = `
            <div style="grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 0;">
                <i class="fas fa-circle-notch fa-spin" style="font-size: 3rem; color: var(--primary); margin-bottom: 20px;"></i>
                <h3 style="color: var(--text-muted); letter-spacing: 3px; font-weight: 600;">SINTETIZANDO DATOS...</h3>
            </div>
        `;
        document.getElementById('btn-cargar-mas')?.remove();
    }

    try {
        const url = `/api/igdb?offset=${offsetActual}${busquedaActual ? `&query=${encodeURIComponent(busquedaActual)}` : ''}`;
        const respuesta = await fetch(url);
        if (!respuesta.ok) throw new Error('Error en el servidor');

        const datos = await respuesta.json();

        if (resetear) gridJuegos.innerHTML = '';
        document.getElementById('btn-cargar-mas')?.remove();

        // Inyectar tarjetas instantáneamente, ¡ya tienen el precio y la tienda!
        datos.forEach(juego => {
            gridJuegos.innerHTML += crearTarjeta(juego);
        });

        // Al terminar de pintar todo, aplicamos los filtros que estén marcados
        aplicarFiltros();

        if (datos.length === 50) {
            const btnMas = document.createElement('div');
            btnMas.id = 'btn-cargar-mas';
            btnMas.innerHTML = `<button onclick="cargarMas()">Cargar 50 más</button>`;
            gridJuegos.after(btnMas);
        }

        offsetActual += datos.length;

    } catch (error) {
        console.error("Error:", error);
        gridJuegos.innerHTML = '<div style="color:var(--error); text-align:center; width:100%;">Fallo al conectar.</div>';
    }

    cargando = false;
}

function cargarMas() {
    cargarJuegosIGDB(busquedaActual, false);
}

window.cargarMas = cargarMas;

cargarJuegosIGDB();

let temporizadorBusqueda; // Guardará el tiempo de espera

// 1. Evento cuando el usuario escribe (Auto-búsqueda a los 2 segundos)
inputBuscar.addEventListener('input', () => {
    clearTimeout(temporizadorBusqueda); // Si sigue escribiendo, reiniciamos el reloj
    temporizadorBusqueda = setTimeout(() => {
        cargarJuegosIGDB(inputBuscar.value.trim());
    }, 500); // 500 ms = 0.5 segundos
});

// 2. Click en la lupa (por si el usuario es impaciente y no quiere esperar)
btnBuscar.addEventListener('click', () => {
    clearTimeout(temporizadorBusqueda);
    cargarJuegosIGDB(inputBuscar.value.trim());
});

// 3. Pulsar Enter (por la misma razón)
inputBuscar.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        clearTimeout(temporizadorBusqueda);
        cargarJuegosIGDB(inputBuscar.value.trim());
    }
});

// ==========================================================================
//   LOGICA DEL PANEL DE FILTROS DE JUEGOS
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
                // al borrar: los hidden-genre solo se muestran si están marcados
                item.style.display = (esOculto && !checkbox.checked) ? 'none' : '';
            } else {
                // con texto: muestra si coincide, oculta si no
                item.style.display = nombreGenero.includes(txt) ? '' : 'none';
            }
        });
    });
}

// ==========================================================================
//   LOGICA DE FILTROS UNIFICADA (TIENDAS + PLATAFORMAS)
// ==========================================================================

const tiendasTodas = document.getElementById('tienda-todas');
const tiendasItems = document.querySelectorAll('.tienda-item');
const platTodas = document.getElementById('plat-todas');
const platItems = document.querySelectorAll('.plat-item input'); // Son los inputs dentro de los label .plat-item

function aplicarFiltros() {
    // 1. Sacamos qué tiendas están marcadas
    const tiendasSeleccionadas = Array.from(tiendasItems)
        .filter(cb => cb.checked)
        .map(cb => cb.parentElement.textContent.trim().toLowerCase());
    const filtroTodasTiendas = tiendasTodas.checked;

    // 2. Sacamos qué plataformas están marcadas
    const platSeleccionadas = Array.from(platItems)
        .filter(cb => cb.checked)
        .map(cb => cb.parentElement.textContent.trim().toLowerCase());
    const filtroTodasPlat = platTodas.checked;

    let cartasVisibles = 0;

    // 3. Revisamos tarjeta por tarjeta
    document.querySelectorAll('.game-card').forEach(card => {
        const storesStr = card.getAttribute('data-stores') || '';
        const platStr = card.getAttribute('data-platforms') || '';

        // ¿Pasa el filtro de la tienda?
        let pasaTienda = false;
        if (filtroTodasTiendas) {
            pasaTienda = true;
        } else if (storesStr !== 'none') {
            pasaTienda = tiendasSeleccionadas.some(t => storesStr.includes(t));
        }

        // ¿Pasa el filtro de la plataforma?
        let pasaPlat = false;
        if (filtroTodasPlat) {
            pasaPlat = true;
        } else {
            pasaPlat = platSeleccionadas.some(p => platStr.includes(p));
        }

        // Mostrar solo si pasa AMBOS filtros
        if (pasaTienda && pasaPlat) {
            card.style.display = 'flex';
            cartasVisibles++;
        } else {
            card.style.display = 'none';
        }
    });

    // 4. Auto-recarga inteligente (Lazy loading)
    const btnMas = document.getElementById('btn-cargar-mas');
    if ((!filtroTodasTiendas || !filtroTodasPlat) && cartasVisibles < 20 && !cargando && btnMas) {
        btnMas.querySelector('button').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Auto-buscando...';
        cargarMas();
    }
}

// ----- EVENTOS TIENDAS -----
tiendasTodas.addEventListener('change', () => {
    if (tiendasTodas.checked) tiendasItems.forEach(cb => cb.checked = false);
    aplicarFiltros();
});
tiendasItems.forEach(cb => {
    cb.addEventListener('change', () => {
        if (cb.checked) tiendasTodas.checked = false;
        if ([...tiendasItems].every(c => !c.checked)) tiendasTodas.checked = true;
        aplicarFiltros();
    });
});

// ----- EVENTOS PLATAFORMAS -----
platTodas.addEventListener('change', () => {
    if (platTodas.checked) platItems.forEach(cb => cb.checked = false);
    aplicarFiltros();
});
platItems.forEach(cb => {
    cb.addEventListener('change', () => {
        if (cb.checked) platTodas.checked = false;
        if ([...platItems].every(c => !c.checked)) platTodas.checked = true;
        aplicarFiltros();
    });
});

// VER TODO plataformas
const btnVerPlats = document.getElementById('btn-ver-plats');
const platExtra = document.getElementById('plat-extra');
let platExtraVisible = false;

btnVerPlats.addEventListener('click', () => {
    platExtraVisible = !platExtraVisible;
    platExtra.style.display = platExtraVisible ? 'block' : 'none';
    btnVerPlats.textContent = platExtraVisible ? '− Ver menos' : '+ Ver todo';
});

// ==========================================================================
//   LOGICA DE LOS ACORDEONES
// ==========================================================================

const accordions = document.querySelectorAll('.accordion-header');

accordions.forEach(header => {
    header.addEventListener('click', () => {
        const parentItem = header.parentElement;
        parentItem.classList.toggle('active');
    });
});

// ==========================================================================
//   LOGICA DE PELICULAS Y SERIES (TMDB API)
// ==========================================================================

let pageMovies = 1;
let searchMoviesActual = '';
let pageSeries = 1;
let searchSeriesActual = '';
let cargandoTMDB = false;

function crearTarjetaTMDB(media, tipo) {
    const isMovie = tipo === 'movie';
    const fechaFormat = media.fecha ? media.fecha.split('-')[0] : 'TBA'; // Solo el año

    // Configurar la info extra dependiente de si es peli o serie
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

        grid.innerHTML = `
            <div style="grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 0;">
                <i class="fas fa-circle-notch fa-spin" style="font-size: 3rem; color: var(--primary); margin-bottom: 20px;"></i>
                <h3 style="color: var(--text-muted); letter-spacing: 3px; font-weight: 600;">SINTETIZANDO DATOS DE TMDB...</h3>
            </div>
        `;
        document.getElementById(`btn-cargar-mas-${tipo}`)?.remove();
    }

    const pageActual = tipo === 'movie' ? pageMovies : pageSeries;
    const searchActual = tipo === 'movie' ? searchMoviesActual : searchSeriesActual;

    try {
        const url = `/api/tmdb?tipo=${tipo}&page=${pageActual}${searchActual ? `&query=${encodeURIComponent(searchActual)}` : ''}`;
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
        }

        if (tipo === 'movie') pageMovies++; else pageSeries++;

    } catch (error) {
        console.error(error);
        grid.innerHTML = '<div style="color:var(--error); text-align:center; width:100%;">Fallo al conectar con TMDB.</div>';
    }

    cargandoTMDB = false;
}

window.cargarMasTMDB = function (tipo) {
    cargarTMDB(tipo, tipo === 'movie' ? searchMoviesActual : searchSeriesActual, false);
};

// ----- LISTENERS PELICULAS -----
const inputMovies = document.getElementById('search-movies');
const btnMovies = document.getElementById('btn-buscar-movies');
let tempMovies;

inputMovies.addEventListener('input', () => {
    clearTimeout(tempMovies);
    tempMovies = setTimeout(() => cargarTMDB('movie', inputMovies.value.trim()), 500);
});
btnMovies.addEventListener('click', () => { clearTimeout(tempMovies); cargarTMDB('movie', inputMovies.value.trim()); });
inputMovies.addEventListener('keypress', (e) => { if (e.key === 'Enter') { clearTimeout(tempMovies); cargarTMDB('movie', inputMovies.value.trim()); } });

// ----- LISTENERS SERIES -----
const inputSeries = document.getElementById('search-series');
const btnSeries = document.getElementById('btn-buscar-series');
let tempSeries;

inputSeries.addEventListener('input', () => {
    clearTimeout(tempSeries);
    tempSeries = setTimeout(() => cargarTMDB('tv', inputSeries.value.trim()), 500);
});
btnSeries.addEventListener('click', () => { clearTimeout(tempSeries); cargarTMDB('tv', inputSeries.value.trim()); });
inputSeries.addEventListener('keypress', (e) => { if (e.key === 'Enter') { clearTimeout(tempSeries); cargarTMDB('tv', inputSeries.value.trim()); } });

// Llamada inicial
cargarTMDB('movie');
cargarTMDB('tv');

// ==========================================================================
//   SISTEMA DE AUTENTICACIÓN — PÁGINAS DEDICADAS Y CERRAR SESIÓN
// ==========================================================================

const btnPerfil = document.getElementById('user-profile');

// 1. Crear el menú desplegable avanzado para el usuario
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

// Envolvemos el botón del perfil para que funcione el desplegable
const userContainer = document.createElement('div');
userContainer.className = 'theme-dropdown';
btnPerfil.parentNode.insertBefore(userContainer, btnPerfil);
userContainer.appendChild(btnPerfil);
userContainer.appendChild(userMenu);

let userMenuOpen = false;

// 2. Lógica del botón de perfil
btnPerfil.addEventListener('click', (e) => {
    e.stopPropagation();
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            // Si estás logueado, abrimos el menú
            userMenuOpen = !userMenuOpen;
            if (userMenuOpen) userMenu.classList.add('show');
            else userMenu.classList.remove('show');
        } else {
            // Si NO estás logueado, te lleva al login
            cambiarVista('login');
            // Quitamos el subrayado activo de la barra superior
            linksMenu.forEach(l => l.classList.remove('active'));
        }
    });
});

// Cerrar menú al hacer clic fuera
document.addEventListener('click', (e) => {
    if (!userContainer.contains(e.target) && userMenu) {
        userMenu.classList.remove('show');
        userMenuOpen = false;
    }
});

// 3. Lógica para CERRAR SESIÓN
document.getElementById('btn-logout').addEventListener('click', async () => {
    // Le decimos a la caja fuerte que destruya el carnet de identidad
    await supabase.auth.signOut();

    // Ocultamos el menú
    userMenu.classList.remove('show');
    userMenuOpen = false;

    // Volvemos a la pantalla de inicio y actualizamos la interfaz (vuelve a ser el icono gris)
    cambiarVista('home');
    verificarSesion();
});

// Botón "Crear cuenta nueva" en la página de login → va a register
document.getElementById('btn-go-register')?.addEventListener('click', () => {
    cambiarVista('register');
    linksMenu.forEach(l => l.classList.remove('active'));
});

// Botón "Iniciar sesión" en la página de register → vuelve a login
document.getElementById('btn-go-login')?.addEventListener('click', () => {
    cambiarVista('login');
    linksMenu.forEach(l => l.classList.remove('active'));
});

// Historial del navegador para el botón ATRÁS
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

// Mostrar/Ocultar contraseña (universal)
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
//   INICIALIZACIÓN DE FLATPICKR (Selector de Fecha Personalizado)
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

// -------------------------------------------
// FLUJO DE REGISTRO
// -------------------------------------------
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

    // Validaciones cliente
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
        // 1. Guardamos la relación usuario-correo en nuestro "traductor" (la tabla usuarios)
        await supabase.from('usuarios').insert([{ username: username, email: email }]);

        msgBox.style.color = 'var(--success)';
        msgBox.textContent = '✅ ¡Cuenta creada! Revisa tu correo.';

        // En lugar de hacer auto-login, mandamos a la pantalla de aviso de correo
        setTimeout(() => {
            cambiarVista('waiting-confirmation');
            // Reseteamos el formulario por si acaso
            document.getElementById('form-register').reset();
        }, 1500);
    }

    btnSubmit.innerHTML = '<i class="fas fa-rocket"></i> REGÍSTRATE';
    btnSubmit.disabled = false;
});

// -------------------------------------------
// FLUJO DE INICIO DE SESIÓN
// -------------------------------------------
document.getElementById('form-login')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msgBox = document.getElementById('login-message');
    const btnSubmit = document.getElementById('btn-login-submit');

    const identifier = document.getElementById('login-identifier').value.trim();
    const password = document.getElementById('login-password').value.trim();

    btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ACCEDIENDO...';
    btnSubmit.disabled = true;

    let emailToUse = identifier;

    // Si NO tiene una arroba (@), asumimos que es un nombre de usuario
    if (!identifier.includes('@')) {
        // Le preguntamos a nuestra tabla 'usuarios' cuál es el correo de este usuario
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

    // Ahora intentamos iniciar sesión con el correo real
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

// VERIFICAR SESIÓN ACTIVA Y ROLES
async function verificarSesion() {
    const { data: { session } } = await supabase.auth.getSession();
    const btnAdmin = document.getElementById('btn-admin');

    if (session) {
        btnPerfil.innerHTML = '<i class="fas fa-user-astronaut" style="color: var(--primary);"></i>';

        // Buscamos el nombre de usuario real en nuestra tabla 'usuarios'
        const usernameDisplay = document.getElementById('dropdown-username');
        if (usernameDisplay) {
            const { data: userData } = await supabase
                .from('usuarios')
                .select('username')
                .eq('email', session.user.email)
                .maybeSingle();

            // Si lo encuentra ponemos el usuario (ej: PacaMascachapas), si falla, cortamos el correo
            const nombre = userData?.username || session.user.email.split('@')[0];
            usernameDisplay.textContent = nombre;
        }

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
    }
}

verificarSesion();

// ==========================================================================
//   DETECTOR DE CONFIRMACIÓN DE CORREO
// ==========================================================================
// Cuando Supabase redirecciona desde el correo, añade "type=signup" en la URL
if (window.location.hash.includes('type=signup')) {
    // 1. Mostramos tu nueva miniweb
    cambiarVista('verified-account');

    // 2. Limpiamos la URL para que no quede un churrete largo y feo arriba
    window.history.replaceState(null, null, window.location.pathname);
}

// Botón de la pantalla de verificado para ir al login
document.getElementById('btn-go-login-verified')?.addEventListener('click', () => {
    cambiarVista('login');
});

// ==========================================================================
//   DETECTOR DE CONFIRMACIÓN DE CORREO Y AUTO-LOGIN
// ==========================================================================
// Cuando Supabase redirecciona desde el correo, trae el token mágico en la URL
if (window.location.hash.includes('type=signup') || window.location.hash.includes('access_token')) {
    // 1. Mostramos tu pantalla de éxito
    cambiarVista('verified-account');

    // 2. Le damos 1 segundo a Supabase para que procese el token en la sombra y te loguee
    setTimeout(() => {
        window.history.replaceState(null, null, window.location.pathname); // Limpiar URL fea
        verificarSesion(); // Actualiza el icono para que salga el casco de astronauta
    }, 1000);
}

// 3. Ahora el botón sí tiene el ID correcto y te manda directo al HOME (ya estarás logueado)
document.getElementById('btn-go-home-verified')?.addEventListener('click', () => {
    cambiarVista('home');
});