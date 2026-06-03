// Importamos el cliente de Supabase para futuras funcionalidades (registro, login, etc.)
import { supabase } from './supabase.js';

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
//   SISTEMA DE AUTENTICACIÓN (SUPABASE) - SEPARADO EN LOGIN/REGISTRO
// ==========================================================================

const btnPerfil = document.getElementById('user-profile');
const modalAuth = document.getElementById('auth-modal');
const btnCloseModal = document.getElementById('close-modal');
const msgBox = document.getElementById('auth-message');

// Elementos de las pestañas
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const formLogin = document.getElementById('form-login');
const formRegister = document.getElementById('form-register');

const inputLoginEmail = document.getElementById('login-email');
const inputLoginPass = document.getElementById('login-password');
const inputRegEmail = document.getElementById('register-email');
const inputRegPass = document.getElementById('register-password');

// Abrir y cerrar Modal
btnPerfil.addEventListener('click', () => {
    modalAuth.classList.add('active');
    msgBox.textContent = '';
    tabLogin.click(); // Obligamos a que siempre empiece en Login limpio
});

btnCloseModal.addEventListener('click', () => {
    modalAuth.classList.remove('active');
});

// Cambiar entre Pestañas de Login y Registro
tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    formLogin.style.display = 'flex';
    formRegister.style.display = 'none';

    // TRUCO BITWARDEN: Activamos Login, Desactivamos Registro
    inputLoginEmail.disabled = false;
    inputLoginPass.disabled = false;
    inputRegEmail.disabled = true;
    inputRegPass.disabled = true;

    msgBox.textContent = '';
});

tabRegister.addEventListener('click', () => {
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    formRegister.style.display = 'flex';
    formLogin.style.display = 'none';

    // TRUCO BITWARDEN: Activamos Registro, Desactivamos Login oculto
    inputRegEmail.disabled = false;
    inputRegPass.disabled = false;
    inputLoginEmail.disabled = true;
    inputLoginPass.disabled = true;

    msgBox.textContent = '';
});

// MOSTRAR / OCULTAR CONTRASEÑA (Sirve para los dos ojitos a la vez)
document.querySelectorAll('.toggle-password-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // Buscamos el input que está justo antes del botón dentro de su caja
        const input = e.currentTarget.previousElementSibling;
        const icon = e.currentTarget.querySelector('i');

        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    });
});

// -------------------------------------------
// FLUJO DE REGISTRO
// -------------------------------------------
formRegister.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = inputRegEmail.value.trim();
    const password = inputRegPass.value.trim();
    const btnSubmit = document.getElementById('btn-register-submit');

    btnSubmit.textContent = "REGISTRANDO...";

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
        msgBox.style.color = "var(--error)";
        msgBox.textContent = "Error: " + error.message;
    } else {
        msgBox.style.color = "var(--success)";
        msgBox.textContent = "¡Registro exitoso! Iniciando sesión...";
        inputRegPass.value = '';

        // Magia extra: Iniciar sesión automáticamente tras registrarse
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        if (!loginError) {
            setTimeout(() => {
                modalAuth.classList.remove('active');
                verificarSesion();
            }, 1000);
        } else {
            tabLogin.click(); // Si falla el auto-login, lo mandamos a la pestaña normal
        }
    }
    btnSubmit.textContent = "CREAR CUENTA";
});

// -------------------------------------------
// FLUJO DE INICIO DE SESIÓN
// -------------------------------------------
formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = inputLoginEmail.value.trim();
    const password = inputLoginPass.value.trim();
    const btnSubmit = document.getElementById('btn-login-submit');

    btnSubmit.textContent = "ACCEDIENDO...";

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        msgBox.style.color = "var(--error)";
        msgBox.textContent = "Credenciales incorrectas.";
    } else {
        msgBox.style.color = "var(--success)";
        msgBox.textContent = "¡Acceso concedido!";
        setTimeout(() => {
            modalAuth.classList.remove('active');
            verificarSesion(); // Actualizar el icono y revelar el escudo
        }, 1000);
    }
    btnSubmit.textContent = "ENTRAR AL NEXUS";
});

// VERIFICAR SESIÓN ACTIVA Y ROLES
async function verificarSesion() {
    const { data: { session } } = await supabase.auth.getSession();
    const btnAdmin = document.getElementById('btn-admin');

    if (session) {
        btnPerfil.innerHTML = '<i class="fas fa-user-astronaut" style="color: var(--primary);"></i>';

        const { data: datosRol } = await supabase
            .from('roles')
            .select('rol')
            .eq('email', session.user.email)
            .maybeSingle();

        if (datosRol && datosRol.rol === 'admin') {
            btnAdmin.style.display = 'inline-flex';
        } else {
            btnAdmin.style.display = 'none';
        }
    } else {
        btnPerfil.innerHTML = '<i class="fas fa-user-circle"></i>';
        if (btnAdmin) btnAdmin.style.display = 'none';
    }
}

// Ejecutar al cargar la página
verificarSesion();