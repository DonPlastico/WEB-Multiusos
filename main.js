// ==========================================================================
//   NAVEGACIÓN ENTRE VISTAS
// ==========================================================================

const linksMenu = document.querySelectorAll('.nav-links a');
const vistas = document.querySelectorAll('.view');

linksMenu.forEach(link => {
    link.addEventListener('click', (evento) => {
        evento.preventDefault();

        linksMenu.forEach(l => l.classList.remove('active'));
        link.classList.add('active');

        const target = link.getAttribute('data-target');

        vistas.forEach(vista => {
            vista.classList.remove('active');
            if (vista.id === target) {
                vista.classList.add('active');
            }
        });
    });
});

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
        gridJuegos.innerHTML = '<div style="width:100%; text-align:center; color:var(--primary); font-size:1.2rem;">Sincronizando con la red neuronal de IGDB...</div>';
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

tiendasTodas.addEventListener('change', () => {
    if (tiendasTodas.checked) {
        tiendasItems.forEach(cb => cb.checked = false);
    }
});

tiendasItems.forEach(cb => {
    cb.addEventListener('change', () => {
        if (cb.checked) tiendasTodas.checked = false;
        // si desmarcan todos, vuelve a TODAS
        if ([...tiendasItems].every(c => !c.checked)) tiendasTodas.checked = true;
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