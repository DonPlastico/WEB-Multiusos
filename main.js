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
        const card = el.closest('.game-card'); // Seleccionamos la tarjeta entera

        try {
            const r = await fetch(`/api/itad?title=${encodeURIComponent(title)}`);
            const data = await r.json();
            if (data.precio) {
                // Extraemos todas las tiendas disponibles y las guardamos como un string en el dataset
                const stores = data.todos.map(d => d.shop.name.toLowerCase()).join(',');
                card.setAttribute('data-stores', stores);

                el.innerHTML = `<span class="price-badge">Desde <strong>${data.precio.toFixed(2)} €</strong>${data.voucher ? ' <span class="voucher-tag">🏷️ Cupón</span>' : ''}</span>`;
            } else {
                card.setAttribute('data-stores', 'none');
                el.innerHTML = `<span class="price-na">No disponible</span>`;
            }
        } catch {
            card.setAttribute('data-stores', 'none');
            el.innerHTML = '';
        }

        aplicarFiltrosTienda(); // Refrescar filtros cada vez que carga un precio
    });
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
                <h3 style="color: var(--text-muted); letter-spacing: 3px; font-weight: 600;">CARGANDO DATOS...</h3>
            </div>
        `;
        document.getElementById('btn-cargar-mas')?.remove();
    }

    try {
        const url = `/api/igdb?offset=${offsetActual}${busquedaActual ? `&query=${encodeURIComponent(busquedaActual)}` : ''}`;
        const respuesta = await fetch(url);
        if (!respuesta.ok) throw new Error('Error en el servidor de Vercel');

        const datos = await respuesta.json();

        if (resetear) gridJuegos.innerHTML = '';

        document.getElementById('btn-cargar-mas')?.remove();

        const anteriorCount = gridJuegos.querySelectorAll('.game-price').length;

        datos.forEach(juego => {
            gridJuegos.innerHTML += crearTarjeta(juego);
        });

        const todosLosPrecios = gridJuegos.querySelectorAll('.game-price');
        const nuevosPrecios = Array.from(todosLosPrecios).slice(anteriorCount);
        cargarPrecios(nuevosPrecios);

        if (datos.length === 50) {
            const btnMas = document.createElement('div');
            btnMas.id = 'btn-cargar-mas';
            btnMas.innerHTML = `<button onclick="cargarMas()">Cargar 50 más</button>`;
            gridJuegos.after(btnMas);
        }

        offsetActual += datos.length;

    } catch (error) {
        console.error("Error cargando juegos:", error);
        gridJuegos.innerHTML = '<div style="color:var(--error); text-align:center; width:100%;">Error crítico al conectar con IGDB. Revisa los logs de Vercel.</div>';
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
//   LOGICA DE FILTROS
// ==========================================================================

// TODAS exclusivo para TIENDAS
const tiendasTodas = document.getElementById('tienda-todas');
const tiendasItems = document.querySelectorAll('.tienda-item');

function aplicarFiltrosTienda() {
    const tiendasSeleccionadas = Array.from(tiendasItems)
        .filter(cb => cb.checked)
        .map(cb => cb.parentElement.textContent.trim().toLowerCase());

    const filtroTodas = tiendasTodas.checked;
    let cartasVisibles = 0; // Llevaremos la cuenta de cuántas quedan en pantalla

    document.querySelectorAll('.game-card').forEach(card => {
        const storesStr = card.getAttribute('data-stores');

        // Si no hay filtro o el precio aún no ha cargado, lo mostramos
        if (filtroTodas || !storesStr) {
            card.style.display = 'flex';
            cartasVisibles++;
            return;
        }

        // Si ITAD respondió pero no hay tiendas, lo ocultamos
        if (storesStr === 'none') {
            card.style.display = 'none';
            return;
        }

        // Verifica si el string de tiendas incluye ALGUNA de las seleccionadas
        const coincide = tiendasSeleccionadas.some(tiendaBuscada => storesStr.includes(tiendaBuscada));

        card.style.display = coincide ? 'flex' : 'none';
        if (coincide) cartasVisibles++; // Sumamos si la tarjeta ha pasado el filtro
    });

    // AUTO-RELLENADO (Lazy Loading Inteligente)
    const btnMas = document.getElementById('btn-cargar-mas');

    // Si NO estamos en "Todas", quedan menos de 20 tarjetas visibles,
    // no estamos ya buscando datos, y el botón de cargar más existe...
    if (!filtroTodas && cartasVisibles < 20 && !cargando && btnMas) {
        // Cambiamos el texto del botón para que el usuario sepa qué pasa
        btnMas.querySelector('button').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Auto-buscando...';
        // Disparamos la carga de la siguiente página automáticamente
        cargarMas();
    }
}

tiendasTodas.addEventListener('change', () => {
    if (tiendasTodas.checked) {
        tiendasItems.forEach(cb => cb.checked = false);
    }
    aplicarFiltrosTienda();
});

tiendasItems.forEach(cb => {
    cb.addEventListener('change', () => {
        if (cb.checked) tiendasTodas.checked = false;
        // si desmarcan todos, vuelve a TODAS
        if ([...tiendasItems].every(c => !c.checked)) tiendasTodas.checked = true;
        aplicarFiltrosTienda();
    });
});

// TODAS exclusivo para PLATAFORMAS
const platTodas = document.getElementById('plat-todas');
const platItems = document.querySelectorAll('.plat-item input');

platTodas.addEventListener('change', () => {
    if (platTodas.checked) {
        platItems.forEach(cb => cb.checked = false);
    }
});

platItems.forEach(cb => {
    cb.addEventListener('change', () => {
        if (cb.checked) platTodas.checked = false;
        if ([...platItems].every(c => !c.checked)) platTodas.checked = true;
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