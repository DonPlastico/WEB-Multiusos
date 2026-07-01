// traigo el cliente de supabase pa usar login y eso
import { supabase } from './supabase.js';

// Hacer supabase global para depuración
window.supabase = supabase;

// Vercel Analytics
import { inject } from '@vercel/analytics';
inject();

// Vercel Speed Insights
import { injectSpeedInsights } from '@vercel/speed-insights';
injectSpeedInsights();

// =============================================
//   OPEN GRAPH - META TAGS DINÁMICOS
// =============================================

/**
 * CONFIGURACIÓN DE META TAGS POR PÁGINA
 */
const baseUrl = 'https://web-multiusos.vercel.app';

const OG_CONFIG = {
    home: {
        title: 'DP-SYS | Nexus - Tu centro multimedia personal',
        description: 'DP-SYS - Tu nexus personal de juegos, películas y series. Descubre tendencias, guarda tu progreso y conecta con otros usuarios que comparten tus gustos.',
        image: `${baseUrl}/img/Pruebas/HOME.png`,
        url: '/'
    },
    games: {
        title: 'DP-SYS | Nexus - Juegos: Tu biblioteca de videojuegos',
        description: 'Explora una extensa base de datos de videojuegos para PC, consolas y móviles. Descubre ofertas, crea tu lista de pendientes y comparte tus experiencias.',
        image: `${baseUrl}/img/Pruebas/JUEGOS.png`,
        url: '/juegos'
    },
    movies: {
        title: 'DP-SYS | Nexus - Películas: Tu cine personal',
        description: 'Sumérgete en el mundo del cine con nuestra colección de películas. Guarda tu progreso, califica y descubre recomendaciones personalizadas.',
        image: `${baseUrl}/img/Pruebas/PELÍCULAS.png`,
        url: '/peliculas'
    },
    series: {
        title: 'DP-SYS | Nexus - Series: Tu maratón perfecta',
        description: 'Explora el fascinante mundo de las series con nuestra guía completa. Controla tu progreso y nunca pierdas el hilo de tus historias favoritas.',
        image: `${baseUrl}/img/Pruebas/SERIES.png`,
        url: '/series'
    },
    profile: {
        title: 'DP-SYS | Nexus - Perfil: Tu espacio personal',
        description: 'Personaliza tu perfil, gestiona tu información, controla tu lista de amistades y comparte tu progreso con la comunidad.',
        image: `${baseUrl}/img/Pruebas/PERFIL.png`,
        url: '/perfil'
    }
};

// Mapeo de vistas a claves de configuración
const VIEW_TO_CONFIG = {
    'home': 'home',
    'games': 'games',
    'movies': 'movies',
    'series': 'series',
    'profile': 'profile',
    'edit-profile': 'profile',
    'mis-listas': 'home',
    'admin-panel': 'home',
    'login': 'home',
    'register': 'home',
    'waiting-confirmation': 'home',
    'verified-account': 'home'
};

/**
 * Actualiza las meta tags de Open Graph
 */
function updateMetaTags(pageKey) {
    const config = OG_CONFIG[pageKey] || OG_CONFIG.home;

    // Actualizar title
    document.title = config.title;

    // Actualizar meta description
    updateMetaTag('description', config.description);

    // Actualizar Open Graph (property)
    updateMetaTag('og:title', config.title);
    updateMetaTag('og:description', config.description);
    updateMetaTag('og:image', baseUrl + config.image);
    updateMetaTag('og:url', baseUrl + config.url);
    updateMetaTag('og:type', 'website');
    updateMetaTag('og:site_name', 'DP-SYS | Nexus');
    updateMetaTag('og:locale', 'es_ES');

    // Actualizar Twitter Cards (name)
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', config.title);
    updateMetaTag('twitter:description', config.description);
    updateMetaTag('twitter:image', baseUrl + config.image);
}

/**
 * Función auxiliar para actualizar o crear meta tags
 */
function updateMetaTag(attrName, content) {
    let meta;

    if (attrName.startsWith('og:')) {
        // Open Graph usa property
        meta = document.querySelector(`meta[property="${attrName}"]`);
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('property', attrName);
            document.head.appendChild(meta);
        }
    } else if (attrName.startsWith('twitter:')) {
        // Twitter Cards usa name
        meta = document.querySelector(`meta[name="${attrName}"]`);
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('name', attrName);
            document.head.appendChild(meta);
        }
    } else {
        // Meta description estándar
        meta = document.querySelector(`meta[name="${attrName}"]`);
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('name', attrName);
            document.head.appendChild(meta);
        }
    }

    if (meta) {
        meta.setAttribute('content', content);
    }
}

/**
 * Detecta la vista actual y actualiza las meta tags
 */
function detectPageAndUpdate() {
    const vista = vistaActualGlobal || 'home';
    const configKey = VIEW_TO_CONFIG[vista] || 'home';
    updateMetaTags(configKey);
}

// =============================================
//   INYECTAR EN EL FLUJO EXISTENTE
// =============================================

// 1. Guardar referencia a la función original
const _originalCambiarVista = window.cambiarVista || cambiarVista;

// 2. Sobrescribir cambiarVista para incluir la actualización de meta tags
window.cambiarVista = async function (target, guardarEnHistorial = true, usernameUrl = null) {
    // Llamar a la función original
    if (typeof _originalCambiarVista === 'function') {
        await _originalCambiarVista(target, guardarEnHistorial, usernameUrl);
    }

    // Actualizar meta tags DESPUÉS de cambiar la vista
    setTimeout(() => {
        detectPageAndUpdate();
    }, 50);
};

// 3. Actualizar al cargar la página
document.addEventListener('DOMContentLoaded', function () {
    setTimeout(detectPageAndUpdate, 100);
});

// 4. También actualizar cuando cambia el historial (popstate)
window.addEventListener('popstate', function () {
    setTimeout(detectPageAndUpdate, 50);
});

console.log('✅ Open Graph meta tags dinámicos activados');

// ==========================================================================
//   MENÚ CONTEXTUAL FLOTANTE: GUARDAR EN LISTA (estilo YouTube)
// ==========================================================================

// Variables globales para el menú contextual
let menuAddToListVisible = false;
let mediaActualParaLista = null;
let listasEditablesCache = null;
let menuAddToListX = 0;
let menuAddToListY = 0;

// Mapeo de tipos de contenido a iconos
const ICONO_TIPO = {
    game: 'fa-gamepad',
    movie: 'fa-film',
    tv: 'fa-tv',
    mixta: 'fa-layer-group'
};

// ==========================================================================
//   SISTEMA DE LISTAS SOCIALES - DEFINICIÓN GLOBAL
// ==========================================================================

let listasTabActual = 'mias';       // mias | compartidas | siguiendo
let listasFiltroActual = 'all';     // all | game | movie | tv
let listasEventosListos = false;    // pa no duplicar listeners

// Usar var para que esté disponible en todo el ámbito
var listasCache = { mias: null, compartidas: null, siguiendo: null };

// Exponer globalmente para depuración
window.listasCache = listasCache;

// Elemento del menú contextual flotante
const addToListMenu = document.getElementById('add-to-list-menu');

// Elementos internos del menú
const quickListChecklist = document.getElementById('quick-list-checklist');
const quickListLoading = document.getElementById('quick-list-loading');
const quickListEmpty = document.getElementById('quick-list-empty');
const btnQuickCreateList = document.getElementById('btn-quick-create-list');

// Template para cada item del menú
const quickListItemTemplate = document.getElementById('quick-list-item-template');

// ==========================================================================
//   ABRIR / CERRAR MENÚ CONTEXTUAL
// ==========================================================================

function abrirMenuAddToList(event, mediaId, mediaType) {
    event.stopPropagation();

    const addToListMenu = document.getElementById('add-to-list-menu');
    if (!addToListMenu) {
        console.error('❌ Menú no encontrado');
        return;
    }

    mediaActualParaLista = { id: String(mediaId), tipo: mediaType };

    // Posicionar y mostrar
    const x = event.clientX || event.pageX || 0;
    const y = event.clientY || event.pageY || 0;

    const menuWidth = 280;
    const menuHeight = 300;
    const posX = Math.min(x, window.innerWidth - menuWidth - 20);
    const posY = Math.min(y, window.innerHeight - menuHeight - 20);

    // FORZAR VISIBILIDAD
    addToListMenu.style.display = 'block';
    addToListMenu.style.position = 'fixed';
    addToListMenu.style.left = `${Math.max(10, posX)}px`;
    addToListMenu.style.top = `${Math.max(10, posY)}px`;
    addToListMenu.style.zIndex = '999999';
    addToListMenu.style.opacity = '1';
    addToListMenu.style.transform = 'scale(1)';
    addToListMenu.style.visibility = 'visible';
    addToListMenu.style.pointerEvents = 'auto';

    menuAddToListVisible = true;

    cargarListasEditables();
}

// Exponer funciones globalmente para los onclick de las tarjetas
window.abrirMenuAddToList = abrirMenuAddToList;
window.cerrarMenuAddToList = cerrarMenuAddToList;

function cerrarMenuAddToList() {
    const addToListMenu = document.getElementById('add-to-list-menu');
    if (!addToListMenu) return;

    addToListMenu.style.display = 'none';
    menuAddToListVisible = false;
    mediaActualParaLista = null;

    const quickListChecklist = document.getElementById('quick-list-checklist');
    if (quickListChecklist) {
        quickListChecklist.querySelectorAll('.quick-list-item').forEach(el => el.remove());
    }
}

// Cerrar al hacer clic fuera
document.addEventListener('click', (e) => {
    if (menuAddToListVisible && addToListMenu && !addToListMenu.contains(e.target)) {
        cerrarMenuAddToList();
    }
});

// Cerrar con Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuAddToListVisible) {
        cerrarMenuAddToList();
    }
});

// Ocultar al hacer scroll
window.addEventListener('scroll', () => {
    if (menuAddToListVisible) {
        cerrarMenuAddToList();
    }
}, { passive: true });

// ==========================================================================
//   CARGAR LISTAS EDITABLES (cacheado)
// ==========================================================================

async function cargarListasEditables() {
    if (!quickListChecklist || !quickListLoading || !quickListEmpty) {
        console.error('❌ Elementos del menú no encontrados');
        return;
    }

    // Limpiar items anteriores
    quickListChecklist.querySelectorAll('.quick-list-item').forEach(el => el.remove());

    quickListLoading.style.display = 'flex';
    quickListEmpty.style.display = 'none';

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        cerrarMenuAddToList();
        showToast('error', 'Inicia sesión', 'Debes iniciar sesión para guardar en listas.');
        return;
    }

    const userId = session.user.id;

    if (listasEditablesCache === null) {
        try {
            // 1. Listas propias (owner)
            const { data: propias, error: errPropias } = await supabase
                .from('listas_maestra')
                .select('id, titulo, tag_tipo')
                .eq('owner_id', userId);

            if (errPropias) throw errPropias;

            // 2. Listas compartidas donde tengo rol editor o moderator
            const { data: compartidas, error: errCompartidas } = await supabase
                .from('listas_miembros')
                .select('rol, lista:listas_maestra!inner(id, titulo, tag_tipo)')
                .eq('user_id', userId)
                .eq('estado', 'accepted')
                .in('rol', ['editor', 'moderator']);

            if (errCompartidas) throw errCompartidas;

            const deCompartidas = (compartidas || []).map(m => ({
                id: m.lista.id,
                titulo: m.lista.titulo,
                tag_tipo: m.lista.tag_tipo
            }));

            listasEditablesCache = [...(propias || []), ...deCompartidas];

        } catch (err) {
            console.error('Error cargando listas editables:', err);
            listasEditablesCache = [];
        }
    }

    quickListLoading.style.display = 'none';

    // VERIFICAR QUE mediaActualParaLista EXISTE
    if (!mediaActualParaLista) {
        console.warn('⚠️ mediaActualParaLista es null, no se pueden filtrar listas');
        quickListEmpty.style.display = 'flex';
        return;
    }

    // Filtrar listas compatibles con el tipo de media actual
    const listasCompatibles = listasEditablesCache.filter(lista => {
        return lista.tag_tipo === 'mixta' || lista.tag_tipo === mediaActualParaLista.tipo;
    });

    if (listasCompatibles.length === 0) {
        quickListEmpty.style.display = 'flex';
        return;
    }

    // Verificar en qué listas ya está guardado este item
    let idsConItem = [];
    try {
        const { data: itemsExistentes } = await supabase
            .from('listas_items')
            .select('lista_id')
            .eq('media_id', mediaActualParaLista.id)
            .eq('media_tipo', mediaActualParaLista.tipo)
            .in('lista_id', listasEditablesCache.map(l => l.id));

        idsConItem = (itemsExistentes || []).map(i => i.lista_id);
    } catch (err) {
        console.error('Error comprobando items existentes:', err);
    }

    // Renderizar cada lista
    listasCompatibles.forEach(lista => {
        const clone = quickListItemTemplate.content.cloneNode(true);
        const label = clone.querySelector('.quick-list-item');
        label.dataset.listaId = lista.id;

        const icono = ICONO_TIPO[lista.tag_tipo] || 'fa-layer-group';
        clone.querySelector('.quick-list-item-tipo i').className = `fas ${icono}`;
        clone.querySelector('.quick-list-item-title').textContent = lista.titulo;

        const checkbox = clone.querySelector('.quick-list-checkbox');
        checkbox.checked = idsConItem.includes(lista.id);
        checkbox.addEventListener('change', () => toggleItemEnLista(lista.id, checkbox.checked, checkbox));

        quickListChecklist.appendChild(clone);
    });
}

// ==========================================================================
//   MARCAR / DESMARCAR ITEM EN UNA LISTA
// ==========================================================================

async function toggleItemEnLista(listaId, marcado, checkboxEl) {
    if (!mediaActualParaLista) return;
    checkboxEl.disabled = true;

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const userId = session.user.id;

        if (marcado) {
            const { error } = await supabase.from('listas_items').insert({
                lista_id: listaId,
                media_id: mediaActualParaLista.id,
                media_tipo: mediaActualParaLista.tipo,
                added_by_user_id: userId
            });
            if (error) throw error;
            showToast('success', 'Añadido', 'Se ha guardado en la lista.');
        } else {
            const { error } = await supabase
                .from('listas_items')
                .delete()
                .eq('lista_id', listaId)
                .eq('media_id', mediaActualParaLista.id)
                .eq('media_tipo', mediaActualParaLista.tipo);
            if (error) throw error;
            showToast('success', 'Quitado', 'Se ha quitado de la lista.');
        }

        // Invalidar caché de listas
        listasCache.mias = null;
        listasCache.compartidas = null;

    } catch (err) {
        console.error('Error guardando en la lista:', err);
        showToast('error', 'Error', 'No se pudo actualizar la lista.');
        checkboxEl.checked = !marcado;
    } finally {
        checkboxEl.disabled = false;
    }
}

// ==========================================================================
//   BOTÓN "+ CREAR NUEVA LISTA" (dentro del menú)
// ==========================================================================

btnQuickCreateList?.addEventListener('click', () => {
    cerrarMenuAddToList();
    // Abrir el modal de creación de lista (debe existir la función)
    if (typeof openCreateListModal === 'function') {
        openCreateListModal();
    } else {
        // Fallback: mostrar toast
        showToast('info', 'Próximamente', 'El modal de creación de listas está en desarrollo.');
    }
});

// ==========================================================================
//   FAVORITOS
// ==========================================================================

let mediaFavoritoActual = null; // Guarda el estado de favorito del media actual
const FAVORITOS_KEY = 'nexus_favoritos'; // Clave para localStorage

// ==========================================================================
//   COLOR DINÁMICO DEL USUARIO
// ==========================================================================

let colorUsuarioActual = '#6366f1'; // Color por defecto

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
    'edit-profile': '/editar-perfil',
    'mis-listas': '/mis-listas',
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

async function cambiarVista(target, guardarEnHistorial = true, usernameUrl = null) {
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
        cargarGeneros('movie');
    } else if (target === 'series' && !seriesCargadas) {
        cargarTMDB('tv');
        seriesCargadas = true;
        cargarGeneros('tv');
    } else if (target === 'profile') {
        // Si no hay usernameUrl, usamos el de la sesión
        if (!usernameUrl) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.user_metadata?.username) {
                usernameUrl = session.user.user_metadata.username;
            }
        }
        await cargarPerfilPublico(usernameUrl);

        // FORZAR SINCRONIZACIÓN DE WATCHLIST DESPUÉS DE CARGAR EL PERFIL
        setTimeout(() => {
            if (window.sincronizarWatchlistGlobal) {
                window.sincronizarWatchlistGlobal();
            }
        }, 500);
    } else if (target === 'admin-panel') {
        iniciarPanelAdmin();
    } else if (target === 'edit-profile') {
        inicializarEditProfile();
    } else if (target === 'mis-listas') {
        inicializarMisListas();
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
    link.addEventListener('click', async (evento) => {
        evento.preventDefault();
        const target = link.getAttribute('data-target');

        // Solo cambiamos si NO estamos ya en esa vista (Evita historiales duplicados)
        if (vistaActualGlobal !== target) {
            await cambiarVista(target, true);
        }
    });
});

// ahora el logo es el boton de HOME
const logoHome = document.getElementById('logo-home');
if (logoHome) {
    logoHome.addEventListener('click', async () => {
        await cambiarVista('home', true);
        // quito el active del menu
        linksMenu.forEach(l => l.classList.remove('active'));
    });
}

// boton especial para admin
const btnAdminTop = document.getElementById('btn-admin');
btnAdminTop.setAttribute('aria-label', 'Panel de administración');
if (btnAdminTop) {
    btnAdminTop.addEventListener('click', async () => {
        await cambiarVista('admin-panel', true);
        linksMenu.forEach(l => l.classList.remove('active'));
    });
}

// detecto cuando usan los botones atras/adelante del navegador
window.addEventListener('popstate', async (evento) => {
    // Si hay un modal de detalles de juego abierto, lo cerramos primero
    const modalJuego = document.getElementById('game-details-modal');
    if (modalJuego && modalJuego.classList.contains('show')) {
        modalJuego.classList.remove('show');
        document.body.classList.remove('no-scroll');
        document.documentElement.classList.remove('no-scroll');
        return;
    }

    // Limpiar vista de editar perfil
    if (vistaActualGlobal === 'edit-profile') {
        limpiarVistaEditarPerfil();
    }

    if (evento.state && evento.state.vista) {
        // vuelvo a la vista anterior sin guardar
        await cambiarVista(evento.state.vista, false, evento.state.user || null);
    } else {
        arrancarEnrutador();
    }
});

// cuando entran directamente a una url tipo /juegos o /perfil/usuario/...
function arrancarEnrutador() {
    const rutaActual = window.location.pathname;
    let vistaInicial = 'home';
    let userInitial = null;

    // DETECTAR URL DINÁMICA DE PERFIL Y DE MODALES
    if (rutaActual.startsWith('/perfil/usuario/')) {
        userInitial = rutaActual.split('/').pop();
        vistaInicial = 'profile';
    } else if (rutaActual.startsWith('/juegos')) {
        vistaInicial = 'games';
    } else if (rutaActual.startsWith('/peliculas')) {
        vistaInicial = 'movies';
    } else if (rutaActual.startsWith('/series')) {
        vistaInicial = 'series';
    } else {
        for (const [idVista, url] of Object.entries(mapaRutas)) {
            if (url === rutaActual) {
                vistaInicial = idVista;
                break;
            }
        }
    }

    // muestro esa vista sin empujarla al historial todavía
    cambiarVista(vistaInicial, false, userInitial);

    // Mantenemos la url actual si es un modal (para no borrar el /juegos/Mufasa de la barra)
    const urlFinal = userInitial ? `/perfil/usuario/${userInitial}` : rutaActual;
    window.history.replaceState({ vista: vistaInicial, user: userInitial }, '', urlFinal);

    // ==========================================
    // MAGIA F5: RESTAURAR MODALES SI EXISTEN
    // ==========================================
    setTimeout(() => {
        if (vistaInicial === 'movies' || vistaInicial === 'series') {
            const mediaAbierta = localStorage.getItem('modalMediaAbierto');
            if (mediaAbierta) {
                const data = JSON.parse(mediaAbierta);
                if (rutaActual.includes(data.urlAmigable)) {
                    // Si la URL coincide con lo guardado, ¡abrimos el modal! (false = no empujar al historial otra vez)
                    abrirModalMedia(data.id, data.tipo, false);
                } else {
                    localStorage.removeItem('modalMediaAbierto');
                }
            }
        } else if (vistaInicial === 'games') {
            const juegoAbierto = localStorage.getItem('modalJuegoAbierto');
            if (juegoAbierto) {
                const j = JSON.parse(juegoAbierto);
                if (rutaActual.includes(j.urlAmigable)) {
                    procesarAperturaModalJuego(j, false);
                } else {
                    localStorage.removeItem('modalJuegoAbierto');
                }
            }
        }
    }, 300); // Le damos 300ms a la web para que pinte el fondo antes de lanzar el modal
}

// ==========================================================================
//   TEMAS CLARO OSCURO Y ESO
// ==========================================================================

const themeBtn = document.getElementById('theme-toggle');
themeBtn.setAttribute('aria-label', 'Cambiar tema');
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

        // Si el botón no tiene un tema (porque es del menú de usuario o del ojo), ignoramos esta función
        if (!theme) return;

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
//   SISTEMA DE TRADUCCIONES (INTERNACIONALIZACIÓN)
// ==========================================================================

let currentLang = 'es';
let translations = {};

// Promesa compartida: se resuelve la PRIMERA vez que las traducciones terminan de
// cargar y aplicarse. Cualquier carga inicial de datos (juegos/películas/series/
// tendencias) debe esperar a esto antes de pintar textos con t(), para no mostrar
// la key cruda mientras el fetch de /locales/<lang>.json todavía está en curso.
let _resolveTranslationsReady;
const translationsReadyPromise = new Promise(resolve => { _resolveTranslationsReady = resolve; });
// Red de seguridad: si por lo que sea initLanguage() nunca llega a resolver esto
// (error inesperado en otra parte del código), no queremos que TODA la carga de
// datos se quede colgada para siempre. Pasados 4s, se desbloquea igualmente.
setTimeout(() => _resolveTranslationsReady(), 4000);

// 1. Cargar idioma guardado
function loadSavedLanguage() {
    // Primero intentamos desde localStorage (para usuarios no logueados)
    const saved = localStorage.getItem('dp_sys_lang');
    if (saved && ['es', 'en', 'fr', 'it', 'de', 'zh', 'ja', 'ko'].includes(saved)) {
        currentLang = saved;
    } else {
        currentLang = 'es';
    }
    return currentLang;
}

// 1.5. Cargar idioma desde Supabase (para usuarios logueados)
async function loadLanguageFromSupabase() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return null;

        const { data: perfil, error } = await supabase
            .from('usuarios')
            .select('idioma')
            .eq('email', session.user.email)
            .single();

        if (error) throw error;
        if (perfil?.idioma && ['es', 'en', 'fr', 'it', 'de', 'zh', 'ja', 'ko'].includes(perfil.idioma)) {
            return perfil.idioma;
        }
        return null;
    } catch (error) {
        console.warn('⚠️ Error cargando idioma desde Supabase:', error);
        return null;
    }
}

// 1.6. Guardar idioma en Supabase
async function saveLanguageToSupabase(lang) {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return false;

        const { error } = await supabase
            .from('usuarios')
            .update({ idioma: lang })
            .eq('email', session.user.email);

        if (error) throw error;
        return true;
    } catch (error) {
        console.warn('⚠️ Error guardando idioma en Supabase:', error);
        return false;
    }
}

// 2. Cargar archivo de traducciones
async function loadTranslations(lang) {
    try {
        const response = await fetch(`/locales/${lang}.json`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        translations = await response.json();
        return translations;
    } catch (error) {
        console.error(`❌ Error cargando traducciones para ${lang}:`, error);
        // Fallback a español si falla
        if (lang !== 'es') {
            return loadTranslations('es');
        }
        translations = {};
        return {};
    }
}

// 3. Función de traducción t(key, params)
function t(key, params = {}) {
    // Navegación por puntos: "nav.home" -> translations.nav.home
    const keys = key.split('.');
    let value = translations;
    for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
            value = value[k];
        } else {
            console.warn(`⚠️ Traducción faltante: "${key}"`);
            return key;
        }
    }

    if (typeof value !== 'string') {
        console.warn(`⚠️ Traducción no es string: "${key}"`);
        return key;
    }

    // Reemplazar parámetros {param}
    for (const [param, val] of Object.entries(params)) {
        value = value.replace(new RegExp(`\\{${param}\\}`, 'g'), val);
    }

    return value;
}

// 4. Aplicar traducciones al DOM
function applyTranslations() {
    // Si no hay traducciones, NO hacer nada (esto ya no debería pasar porque siempre cargamos el JSON)
    if (!translations || Object.keys(translations).length === 0) {
        return;
    }

    const emptyChat = document.querySelector('.chatbox-messages-area .empty-chat-message');
    if (emptyChat) {
        emptyChat.textContent = t('chat_extra.select_friend');
    }

    // --- NAVEGACIÓN ---
    const navMap = {
        'nav-home': 'nav.home',
        'nav-games': 'nav.games',
        'nav-movies': 'nav.movies',
        'nav-series': 'nav.series',
        'nav-profile': 'nav.profile',
    };
    for (const [id, key] of Object.entries(navMap)) {
        const el = document.getElementById(id);
        if (el) el.textContent = t(key);
    }

    // --- HERO ---
    const heroMap = {
        'hero-title': 'hero.title',
        'hero-subtitle': 'hero.subtitle',
        'hero-description': 'hero.description',
        'btn-hero-games': 'hero.btn_games',
        'btn-hero-movies': 'hero.btn_movies',
        'btn-hero-series': 'hero.btn_series',
    };
    for (const [id, key] of Object.entries(heroMap)) {
        const el = document.getElementById(id);
        if (el) el.innerHTML = t(key);
    }

    // --- TENDENCIAS (títulos de sección) ---
    const trendsMap = {
        'trends-games-title': 'trends.games_title',
        'trends-movies-title': 'trends.movies_title',
        'trends-series-title': 'trends.series_title',
        'trailers-title': 'trends.trailers_title',
        'watchlist-title': 'watchlist.title',
    };
    for (const [id, key] of Object.entries(trendsMap)) {
        const el = document.getElementById(id);
        if (el) el.textContent = t(key);
    }

    // --- BOTONES DE TENDENCIAS (día, semana, mes) ---
    document.querySelectorAll('.trend-tab').forEach(tab => {
        const period = tab.dataset.period;
        if (period === 'day') {
            tab.textContent = t('trends.today');
        } else if (period === 'week') {
            tab.textContent = t('trends.this_week');
        } else if (period === 'month') {
            tab.textContent = t('trends.this_month');
        } else if (period === 'year') {
            tab.textContent = t('trends.this_year');
        }
    });

    // --- BUSCADORES ---
    const searchMap = {
        'search-juegos': 'search.games_placeholder',
        'search-movies': 'search.movies_placeholder',
        'search-series': 'search.series_placeholder',
        'btn-buscar-juegos': 'search.btn_search',
        'btn-buscar-movies': 'search.btn_search',
        'btn-buscar-series': 'search.btn_search',
        'search-genre': 'search.genre_placeholder',
        'search-lang-movie': 'search.country_placeholder',
        'search-lang-tv': 'search.country_placeholder',
        'search-genre-movie': 'search.genre_placeholder',
        'search-genre-tv': 'search.genre_placeholder',
    };
    for (const [id, key] of Object.entries(searchMap)) {
        const el = document.getElementById(id);
        if (el && el.tagName === 'INPUT') {
            el.placeholder = t(key);
        } else if (el) {
            el.textContent = t(key);
        }
    }

    // --- FILTROS (acordeones) ---
    const filterMap = {
        'filter-plats': 'filters.platforms',
        'filter-stores': 'filters.stores',
        'filter-genres': 'filters.genres',
        'filter-modes': 'filters.modes',
        'filter-price': 'filters.price',
        'filter-date': 'filters.date',
        'filter-adult': 'filters.adult_content',
        'filter-countries': 'filters.countries',
        'filter-votes': 'filters.min_votes',
        'btn-reset-filters': 'filters.reset',
        'btn-ver-plats': 'filters.see_all',
        'filter-from': 'filters.from',
        'filter-to': 'filters.to',
        'filter-adult-label': 'filters.adult_content',
        'filter-adult-toggle': 'filters.adult_toggle',
    };
    for (const [id, key] of Object.entries(filterMap)) {
        const el = document.getElementById(id);
        if (el) {
            // Si es label dentro de un accordion-header
            const label = el.querySelector('label');
            if (label) {
                label.textContent = t(key);
            } else {
                el.textContent = t(key);
            }
        }
    }

    // --- PRECIO ---
    const priceMap = {
        'price-min': 'filters.price_min',
        'price-max': 'filters.price_max',
    };
    for (const [id, key] of Object.entries(priceMap)) {
        const el = document.getElementById(id);
        if (el && el.tagName === 'INPUT') {
            el.placeholder = t(key);
        }
    }

    // --- MODALES ---
    const modalMap = {
        'modal-title': 'modal.select_title',
        'btn-save-crop': 'modal.upload',
        'crop-modal-title': 'modal.crop_title',
    };
    for (const [id, key] of Object.entries(modalMap)) {
        const el = document.getElementById(id);
        if (el) el.textContent = t(key);
    }

    // 'close-modal' tiene un icono <i class="fas fa-times"> dentro: NO usar textContent
    // (lo borraría y dejaría el texto "Cerrar" en vez del icono). Solo se traduce el
    // aria-label/title, el icono se queda intacto.
    const closeModalBtn = document.getElementById('close-modal');
    if (closeModalBtn) {
        closeModalBtn.setAttribute('aria-label', t('modal.close'));
        closeModalBtn.title = t('modal.close');
    }

    // --- LOGIN / REGISTRO ---
    const authMap = {
        'login-title': 'auth.login_title',
        'login-identifier': 'auth.login_identifier',
        'login-password': 'auth.login_password',
        'btn-login-submit': 'auth.login_btn',
        'login-message': 'auth.login_message',
        'register-title': 'auth.register_title',
        'register-username': 'auth.register_username',
        'register-email': 'auth.register_email',
        'register-email-confirm': 'auth.register_email_confirm',
        'register-password': 'auth.register_password',
        'register-password-confirm': 'auth.register_password_confirm',
        'register-birthdate': 'auth.register_birthdate',
        'btn-register-submit': 'auth.register_btn',
        'register-message': 'auth.register_message',
        'btn-go-login': 'auth.go_login',
        'btn-go-register': 'auth.go_register',
        'btn-go-home-verified': 'auth.go_home',
        'btn-waiting-login': 'auth.go_login',
        'waiting-title': 'auth.waiting_title',
        'waiting-subtitle': 'auth.waiting_subtitle',
        'verified-title': 'auth.verified_title',
        'verified-subtitle': 'auth.verified_subtitle',
        'btn-go-login-verified': 'auth.go_login',
    };
    for (const [id, key] of Object.entries(authMap)) {
        const el = document.getElementById(id);
        if (el) {
            if (el.tagName === 'INPUT') {
                el.placeholder = t(key);
            } else if (el.tagName === 'BUTTON') {
                el.innerHTML = t(key);
            } else {
                el.textContent = t(key);
            }
        }
    }

    // --- PERFIL ---
    const profileMap = {
        'profile-username': 'profile.username',
        'profile-stats-following': 'profile.following',
        'profile-stats-followers': 'profile.followers',
        'profile-stats-messages': 'profile.messages',
        'profile-stats': 'profile.stats_title',
        'profile-series': 'profile.series_title',
        'profile-movies': 'profile.movies_title',
        'stat-series-episodes': 'profile.series_episodes',
        'stat-series-months': 'profile.months',
        'stat-series-days': 'profile.days',
        'stat-series-hours': 'profile.hours',
        'stat-movies-count': 'profile.movies_count',
        'stat-movies-months': 'profile.months',
        'stat-movies-days': 'profile.days',
        'stat-movies-hours': 'profile.hours',
        'edit-profile-title': 'profile.edit_title',
        'edit-profile-username': 'profile.edit_username',
        'edit-profile-firstname': 'profile.edit_firstname',
        'edit-profile-lastname': 'profile.edit_lastname',
        'edit-profile-description': 'profile.edit_description',
        'edit-profile-gender': 'profile.edit_gender',
        'edit-profile-color': 'profile.edit_color',
        'edit-profile-email': 'profile.edit_email',
        'edit-profile-joined': 'profile.edit_joined',
        'edit-profile-status': 'profile.edit_status',
        'btn-save-profile': 'profile.save_btn',
        'btn-back-to-profile': 'profile.back_btn',
    };
    for (const [id, key] of Object.entries(profileMap)) {
        const el = document.getElementById(id);
        if (el) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = t(key);
            } else {
                el.textContent = t(key);
            }
        }
    }

    // --- ADMIN ---
    const adminMap = {
        'admin-title': 'admin.title',
        'admin-search': 'admin.search',
        'admin-users': 'admin.users',
        'admin-username': 'admin.username',
        'admin-email': 'admin.email',
        'admin-joined': 'admin.joined',
        'admin-verified': 'admin.verified',
        'admin-role': 'admin.role',
        'admin-actions': 'admin.actions',
        'admin-total-users': 'admin.total_users',
        'admin-total-admins': 'admin.total_admins',
        'admin-terminal-title': 'admin.terminal_title',
        'btn-admin-clear-cache': 'admin.clear_cache',
        'btn-admin-lockdown': 'admin.lockdown',
        'btn-admin-announce': 'admin.announce',
        'btn-admin-create-test-user': 'admin.create_test',
        'announce-title': 'admin.announce_title',
        'announce-select': 'admin.announce_select',
        'announce-message': 'admin.announce_message',
        'announce-specific-user': 'admin.announce_specific',
        'btn-send-announce': 'admin.announce_send',
        'announce-all-users': 'admin.announce_all',
        'announce-admins': 'admin.announce_admins',
        'announce-specific': 'admin.announce_specific_label',
    };
    for (const [id, key] of Object.entries(adminMap)) {
        const el = document.getElementById(id);
        if (el) {
            if (el.tagName === 'INPUT') {
                el.placeholder = t(key);
            } else {
                el.textContent = t(key);
            }
        }
    }

    // --- CHATBOX ---
    const chatMap = {
        'tab-btn-chat': 'chat.chat_tab',
        'tab-btn-notifs': 'chat.notifs_tab',
        'chatbox-input': 'chat.input_placeholder',
        'btn-chat-send': 'chat.send_btn',
    };
    for (const [id, key] of Object.entries(chatMap)) {
        const el = document.getElementById(id);
        if (el) {
            if (el.tagName === 'INPUT') {
                el.placeholder = t(key);
            } else {
                el.textContent = t(key);
            }
        }
    }

    // --- FAVORITOS ---
    const favMap = {
        'btn-add-to-favorites': 'favorites.add_btn',
    };
    for (const [id, key] of Object.entries(favMap)) {
        const el = document.getElementById(id);
        if (el) {
            el.title = t(key);
            el.setAttribute('aria-label', t(key));
        }
    }

    // --- CARGAR MÁS ---
    const loadMoreMap = {
        'btn-cargar-mas': 'search.load_more',
        'btn-cargar-mas-movie': 'search.load_more',
        'btn-cargar-mas-tv': 'search.load_more',
    };
    for (const [id, key] of Object.entries(loadMoreMap)) {
        const el = document.getElementById(id);
        if (el) {
            const btn = el.querySelector('button');
            if (btn) btn.textContent = t(key);
        }
    }

    // --- MODAL DE DETALLES (juegos) ---
    const detailMap = {
        'detail-price-label': 'details.price',
        'detail-dev-label': 'details.developer',
        'detail-pub-label': 'details.publisher',
        'detail-genres-label': 'details.genres',
        'detail-modes-label': 'details.modes',
        'detail-links-label': 'details.links',
        'detail-description-label': 'details.description',
        'detail-trailer-label': 'details.trailer',
    };
    for (const [id, key] of Object.entries(detailMap)) {
        const el = document.getElementById(id);
        if (el) el.textContent = t(key);
    }

    // --- MODAL DE MEDIA (películas/series) ---
    const mediaMap = {
        'media-detail-rating-label': 'details.rating',
        'media-detail-original-title-label': 'details.original_title',
        'media-detail-release-date-label': 'details.release_date',
        'media-detail-status-label': 'details.status',
        'media-detail-budget-label': 'details.budget',
        'media-detail-duration-label': 'details.duration',
        'media-detail-seasons-label': 'details.seasons',
        'media-detail-episodes-label': 'details.episodes',
        'media-detail-remaining-label': 'details.remaining',
        'media-detail-watch-date-label': 'details.watch_date',
        'media-detail-watch-status-label': 'details.watch_status',
        'media-detail-trailer-label': 'details.trailer',
        'media-detail-cast-label': 'details.cast',
        'media-detail-personal-label': 'details.personal_rating',
        'media-detail-watch-btn': 'details.watch_btn',
        'media-detail-providers-label': 'details.providers',
        'media-detail-rent-label': 'details.rent',
        'media-detail-buy-label': 'details.buy',
        'media-detail-seasons-title': 'details.seasons_title',
        'btn-context-rewatch': 'details.rewatch_btn',
        'btn-context-unwatch': 'details.unwatch_btn',
    };
    for (const [id, key] of Object.entries(mediaMap)) {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = t(key);
        }
    }

    // 'btn-watch-toggle' tiene un icono <i id="icon-watch-status"> dentro que cambia
    // dinámicamente (ojo / ojo tachado según visto/no visto). NO usar textContent aquí
    // porque borraría el icono. Se traduce solo como title/aria-label.
    const watchToggleBtn = document.getElementById('btn-watch-toggle');
    if (watchToggleBtn) {
        const watchLabel = window.estadoMediaActual?.visto ? t('details.watch_status') : t('details.watch_btn');
        watchToggleBtn.setAttribute('aria-label', watchLabel);
        watchToggleBtn.title = watchLabel;
    }

    // --- GÉNEROS (checkbox labels) ---
    document.querySelectorAll('.genre-item input, .genre-item-movie input, .genre-item-tv input').forEach(cb => {
        const label = cb.closest('label');
        if (label) {
            const textNode = label.childNodes[2];
            if (textNode) {
                // No traducimos nombres de géneros porque vienen de la API
            }
        }
    });

    // --- ESTADOS DE VISTO (watch status) ---
    const watchStatusMap = {
        'media-detail-watch-status': 'details.not_watched',
    };
    for (const [id, key] of Object.entries(watchStatusMap)) {
        const el = document.getElementById(id);
        if (el && !window.estadoMediaActual?.visto) {
            el.textContent = t(key);
        }
    }
    // --- ACTUALIZAR MENÚ DE TEMAS (si existe) ---
    document.querySelectorAll('.theme-option[data-theme]').forEach(opt => {
        const theme = opt.dataset.theme;
        const label = opt.querySelector('span');
        if (label) {
            if (theme === 'system') label.textContent = t('theme.system');
            else if (theme === 'light') label.textContent = t('theme.light');
            else if (theme === 'dark') label.textContent = t('theme.dark');
        }
    });

    // --- ACTUALIZAR TEXTO DE MENÚ DE USUARIO (solo textos estáticos) ---
    document.querySelectorAll('.user-dropdown-header .dropdown-subtext').forEach(el => {
        el.textContent = t('user.view_profile');
    });

    // 'dropdown-username' se crea con t('user.guest') en el momento en que main.js arranca,
    // ANTES de que las traducciones hayan cargado (fetch async). Si el usuario sigue siendo
    // invitado (no hay sesión), lo volvemos a traducir aquí. Si ya hay sesión, NO lo tocamos:
    // ya contiene el nombre real del usuario, no la palabra "Invitado".
    if (!window._nexus_user_id) {
        const dropdownUsernameEl = document.getElementById('dropdown-username');
        if (dropdownUsernameEl) dropdownUsernameEl.textContent = t('user.guest');
    }

    // Actualizar botones del menú de usuario usando IDs específicos (fiable, no depende
    // de que el texto siga siendo literalmente el string en español)
    const userMenuIdMap = {
        'btn-mis-listas': 'user.lists',
        'btn-editar-perfil': 'user.edit_profile',
        'btn-ajustes': 'user.settings',
        'btn-logout': 'user.logout',
    };
    for (const [id, key] of Object.entries(userMenuIdMap)) {
        const span = document.getElementById(id)?.querySelector('span');
        if (span) span.textContent = t(key);
    }

    // --- ACTUALIZAR MENÚ CONTEXTUAL DE TARJETAS ---
    document.querySelectorAll('#card-watch-menu .theme-option span').forEach(span => {
        const text = span.textContent.trim();
        if (text === 'Vista de nuevo') span.textContent = t('details.rewatch_btn');
        if (text === 'Cambiar a NO VISTA') span.textContent = t('details.unwatch_btn');
    });
}

// 5. Cambiar idioma y recargar
async function setLanguage(lang) {
    if (!['es', 'en', 'fr', 'it', 'de', 'zh', 'ja', 'ko'].includes(lang)) return;
    currentLang = lang;

    // 1. Guardar en localStorage (siempre, para todos los usuarios)
    localStorage.setItem('dp_sys_lang', lang);

    // 2. Guardar en Supabase (SOLO si hay sesión)
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        await saveLanguageToSupabase(lang);
    }

    // 3. Cargar traducciones
    await loadTranslations(lang);

    // 4. Aplicar al DOM
    applyTranslations();

    // 5. Actualizar API de IGDB y TMDB con el nuevo idioma
    document.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));

    // 6. Recargar tendencias y datos si es necesario
    if (vistaActualGlobal === 'games') {
        cargarTendencias(trendPeriod, true);
        cargarJuegosIGDB(busquedaActual, true, filtrosGlobales);
    } else if (vistaActualGlobal === 'movies') {
        cargarTendenciasPeliculas(trendMoviesPeriod, true);
        cargarTMDB('movie', searchMoviesActual, true);
    } else if (vistaActualGlobal === 'series') {
        cargarTendenciasSeries(trendSeriesPeriod, true);
        cargarTMDB('tv', searchSeriesActual, true);
    }
}

// 6. Inicializar idioma al cargar (con prioridad: Supabase > localStorage > español)
async function initLanguage() {
    let idiomaFinal = 'es'; // Fallback

    // 1. Intentar cargar desde Supabase (si hay sesión)
    const idiomaSupabase = await loadLanguageFromSupabase();
    if (idiomaSupabase) {
        idiomaFinal = idiomaSupabase;
        // Sincronizar localStorage con Supabase
        localStorage.setItem('dp_sys_lang', idiomaFinal);
    } else {
        // 2. Si no hay en Supabase, usar localStorage
        const saved = loadSavedLanguage();
        idiomaFinal = saved;
    }

    currentLang = idiomaFinal;

    // 3. Cargar traducciones
    await loadTranslations(idiomaFinal);

    // 4. Aplicar al DOM
    applyTranslations();

    // Avisamos a cualquier carga inicial de datos que ya puede pintar textos con t()
    _resolveTranslationsReady();

    // 5. Sincronizar el menú de idiomas con el idioma actual
    document.querySelectorAll('.lang-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.lang === idiomaFinal);
    });

    // 6. Actualizar bandera en el botón
    const flagBtn = document.querySelector('.lang-option.active');
    if (flagBtn) {
        const flagImg = document.getElementById('lang-toggle').querySelector('img');
        if (flagImg) {
            flagImg.src = `https://flagcdn.com/32x24/${flagBtn.dataset.flag || flagBtn.dataset.lang}.png`;
        }
    }
}

// 7. MODIFICAR EL MENÚ DE IDIOMAS (reemplazar el existente)
document.addEventListener('DOMContentLoaded', function () {
    // El menú ya existe en el HTML, solo añadimos el evento de cambio
    document.querySelectorAll('.lang-option').forEach(opt => {
        opt.addEventListener('click', async function (e) {
            e.preventDefault();
            const lang = this.dataset.lang;
            const flag = this.dataset.flag;

            // Actualizar bandera en el botón
            const flagImg = document.getElementById('lang-toggle').querySelector('img');
            if (flagImg) {
                flagImg.src = `https://flagcdn.com/32x24/${flag || lang}.png`;
                flagImg.alt = lang.toUpperCase();
            }

            // Marcar como activo
            document.querySelectorAll('.lang-option').forEach(o => o.classList.remove('active'));
            this.classList.add('active');

            // Cambiar idioma
            await setLanguage(lang);

            // Cerrar el menú
            document.querySelector('.lang-menu')?.classList.remove('show');
            langMenuOpen = false;
        });
    });

    // Inicializar idioma
    initLanguage();
});

// 8. Exponer funciones globalmente
window.t = t;
window.setLanguage = setLanguage;
window.currentLang = currentLang;

// ==========================================================================
//   IDIOMA - MENU DESPLEGABLE (igual que el de tema)
// ==========================================================================

const langBtn = document.getElementById('lang-toggle');
langBtn.setAttribute('aria-label', 'Cambiar idioma');
const langFlagImg = langBtn.querySelector('img');

const langMenu = document.createElement('div');
langMenu.className = 'theme-menu lang-menu';
langMenu.innerHTML = `
    <button class="theme-option lang-option active" data-lang="es" data-flag="es">
        <img src="https://flagcdn.com/32x24/es.png" alt="ES"> <span>Español</span>
    </button>
    <button class="theme-option lang-option" data-lang="en" data-flag="us">
        <img src="https://flagcdn.com/32x24/us.png" alt="EN"> <span>English (EE.UU)</span>
    </button>
    <button class="theme-option lang-option" data-lang="fr" data-flag="fr">
        <img src="https://flagcdn.com/32x24/fr.png" alt="FR"> <span>Français</span>
    </button>
    <button class="theme-option lang-option" data-lang="it" data-flag="it">
        <img src="https://flagcdn.com/32x24/it.png" alt="IT"> <span>Italiano</span>
    </button>
    <button class="theme-option lang-option" data-lang="de" data-flag="de">
        <img src="https://flagcdn.com/32x24/de.png" alt="DE"> <span>Deutsch</span>
    </button>
    <button class="theme-option lang-option" data-lang="zh" data-flag="cn">
        <img src="https://flagcdn.com/32x24/cn.png" alt="ZH"> <span>简体中文</span>
    </button>
    <button class="theme-option lang-option" data-lang="ja" data-flag="jp">
        <img src="https://flagcdn.com/32x24/jp.png" alt="JA"> <span>日本語</span>
    </button>
    <button class="theme-option lang-option" data-lang="ko" data-flag="kr">
        <img src="https://flagcdn.com/32x24/kr.png" alt="KR"> <span>한국인</span>
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
    opt.addEventListener('click', async function (e) {
        e.preventDefault();
        const lang = this.dataset.lang;
        const flag = this.dataset.flag;

        // ACTUALIZAR TAMAÑO DE LA BANDERA A 32x24
        langFlagImg.src = `https://flagcdn.com/32x24/${flag || lang}.png`;
        langFlagImg.alt = lang.toUpperCase();

        // marca el active
        document.querySelectorAll('.theme-option.lang-option').forEach(o => o.classList.remove('active'));
        this.classList.add('active');

        // Cambiar idioma (llama a setLanguage)
        await setLanguage(lang);

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
        : t('common.tba');

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
        htmlPrecio = `<span class="price-badge">${t('games.from')} <strong>${juego.itad.precio.toFixed(2)} €</strong></span>`;
    } else if (!hasPC) {
        htmlPrecio = `<span class="price-na" style="color: var(--text-muted);"><i class="fas fa-gamepad"></i> ${t('games.console_edition')}</span>`;
    } else {
        htmlPrecio = `<span class="price-na">${t('games.no_offers')}</span>`;
    }

    // 2. Lógica del contenedor de imagen
    const imgHtml = tienePortada
        ? `<img src="${portada}" alt="${juego.name}" class="game-cover" loading="lazy" width="264" height="374" onerror="this.parentElement.innerHTML='<div class=\\'no-cover\\'><i class=\\'fas fa-gamepad\\'></i></div>'">`
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

                <div style="display: flex;gap: 5px;width: 100%;margin-top: 5px;padding-top: 5px;border-top: 1px solid var(--border-color);">
                    <button class="btn-add-list" title="${t('movies.add_to_list')}" style="flex: 1; background: rgba(245, 158, 11, 0.15); border: 1px solid var(--warning); color: var(--warning); height: 38px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s;" onclick="event.stopPropagation(); abrirMenuAddToList(event, '${juego.id}', 'game');" onmouseover="this.style.background='var(--warning)'; this.style.color='white';" onmouseout="this.style.background='rgba(245, 158, 11, 0.15)'; this.style.color='var(--warning)';">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

async function cargarJuegosIGDB(busqueda = '', resetear = true, filtros = null) {
    await translationsReadyPromise; // Esperamos a que t() tenga datos reales antes de pintar nada
    // 1. SISTEMA DE FRENADO DE EMERGENCIA
    if (resetear) {
        // GUARDAR BÚSQUEDA PARA PERSISTENCIA F5
        if (busqueda) {
            localStorage.setItem('last_search_games', busqueda);
        } else {
            localStorage.removeItem('last_search_games');
        }

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
                <h3 class="loading-text" style="color: var(--text-muted); letter-spacing: 3px; font-weight: 600;">${t('games.loading')}</h3>
            </div>
        `;

        document.getElementById('btn-cargar-mas')?.remove();
    } else {
        const btnMas = document.getElementById('btn-cargar-mas');
        if (btnMas) {
            btnMas.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px 0;">
                    <i class="fas fa-circle-notch fa-spin" style="font-size: 2rem; color: var(--primary); margin-bottom: 10px;"></i>
                    <span style="color: var(--text-muted); letter-spacing: 2px; font-weight: 600; margin-bottom: 15px;">${t('games.loading_more')}</span>
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
        let url = `/api/igdb?offset=${offsetActual}&lang=${currentLang}`;
        if (busquedaActual) url += `&query=${encodeURIComponent(busquedaActual)}`;
        if (filtrosGlobales.platforms) url += `&platforms=${filtrosGlobales.platforms}`;
        if (filtrosGlobales.genres) url += `&genres=${filtrosGlobales.genres}`;
        if (filtrosGlobales.dateMin) url += `&dateMin=${filtrosGlobales.dateMin}`;
        if (filtrosGlobales.dateMax) url += `&dateMax=${filtrosGlobales.dateMax}`;
        if (filtrosGlobales.modes) url += `&modes=${filtrosGlobales.modes}`;

        // Le pasamos la señal a la llamada de red
        const respuesta = await fetch(url, { signal: miAbort.signal });
        if (!respuesta.ok) throw new Error(`Error HTTP ${respuesta.status}`);

        const datos = await respuesta.json();

        if (resetear) gridJuegos.innerHTML = '';
        document.getElementById('btn-cargar-mas')?.remove();

        // Si IGDB no encontró resultados y hay búsqueda, probar en Steam
        let datosFinales = datos;
        if (datos.length === 0 && busquedaActual) {
            console.log('🔍 IGDB sin resultados, buscando en Steam...');
            try {
                const steamRes = await fetch(`/api/steam?query=${encodeURIComponent(busquedaActual)}`);
                if (steamRes.ok) {
                    const steamData = await steamRes.json();
                    if (steamData.length > 0) {
                        console.log(`✅ Steam devolvió ${steamData.length} resultados`);
                        datosFinales = steamData;
                    }
                }
            } catch (e) {
                console.warn('⚠️ Error en Steam API:', e);
            }
        }

        if (datosFinales.length === 0) {
            if (resetear) {
                gridJuegos.innerHTML = `<div style="color:var(--text-muted); text-align:center; width:100%; padding: 2rem;">${t('games.no_results')}</div>`;
            }
            if (peticionAbort === miAbort) cargando = false;
            return;
        }

        // Ahora usa datosFinales en lugar de datos para todo lo demás
        const precioMin = filtrosGlobales.precioMin ?? 0;
        const precioMax = filtrosGlobales.precioMax ?? 9999;
        const tiendasFiltro = filtrosGlobales.stores || [];

        const datosFiltrados = datosFinales.filter(juego => {
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

        // Filtrar juegos sin portada
        const juegosConPortada = datosFiltrados.filter(juego => {
            return juego.cover && juego.cover.url;
        });

        // Si no hay juegos con portada, mostrar mensaje
        if (juegosConPortada.length === 0 && resetear) {
            gridJuegos.innerHTML = `<div style="color:var(--text-muted); text-align:center; width:100%; padding: 2rem;">
                No se encontraron juegos con portada disponible.
            </div>`;
            if (peticionAbort === miAbort) cargando = false;
            return;
        }

        // Renderizar solo juegos con portada
        juegosConPortada.forEach(juego => {
            gridJuegos.innerHTML += crearTarjeta(juego);
        });

        // 3. AUTO-ESCANEO (SOLO SI NO NOS HAN CANCELADO)
        if (datosFinales.length === limit) {
            const btnMas = document.createElement('div');
            btnMas.id = 'btn-cargar-mas';
            btnMas.style = "grid-column: 1 / -1; text-align: center; margin: 2rem 0;";

            if (datosFiltrados.length === 0 && datosFinales.length === limit) {
                btnMas.innerHTML = `
            <div style="color: var(--warning); letter-spacing: 1px; font-size: 0.9rem; padding: 20px;">
                <i class="fas fa-radar fa-spin"></i> ${t('games.deep_scan')}
            </div>
        `;
                gridJuegos.after(btnMas);

                autoScanTimeout = setTimeout(() => {
                    if (peticionAbort === miAbort) {
                        cargando = false;
                        cargarMas();
                    }
                }, 800);

            } else {
                btnMas.innerHTML = `<button onclick="cargarMas()" style="background:transparent; border:1px solid var(--primary); color:var(--primary); padding:0.8rem 2.5rem; border-radius:40px; cursor:pointer; font-weight:600;" aria-label="Cargar más juegos">${t('games.load_more_btn')}</button>`;
                gridJuegos.after(btnMas);
                observadorScroll.observe(btnMas);
            }
        } else if (datosFinales.length < limit && datosFiltrados.length === 0) {
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
                gridJuegos.innerHTML = `<div style="color:var(--error); text-align:center; width:100%; padding: 2rem;">${t('games.api_error')}</div>`;
            }
            if (peticionAbort === miAbort) cargando = false;
        }
    }
}

function cargarMas() {
    cargarJuegosIGDB(busquedaActual, false);
}

// ==========================================================================
//   TENDENCIAS EN JUEGOS (RETRO + NEON)
// ==========================================================================

let trendPeriod = 'day'; // 'day', 'week', 'month'
let trendOffset = 0;
let trendCargando = false;

// SISTEMA DE CACHÉ EN MEMORIA PARA TENDENCIAS
let cacheTendenciasJuegos = {};
let cacheTendenciasPelis = {};

// Mapeo de períodos a fecha de inicio
function getDateRange(period) {
    const now = new Date();
    let startDate = new Date(now);

    // Guardamos la fecha actual en timestamp
    const nowTimestamp = Math.floor(now.getTime() / 1000);

    switch (period) {
        case 'day':
            startDate.setDate(now.getDate() - 1);
            break;
        case 'week':
            startDate.setDate(now.getDate() - 7);
            break;
        case 'month':
            startDate.setMonth(now.getMonth() - 1);
            break;
        case 'year':
            startDate.setFullYear(now.getFullYear() - 1);
            break;
        default:
            startDate.setDate(now.getDate() - 7);
    }

    // Poner a 00:00:00 y 23:59:59 para evitar problemas
    startDate.setHours(0, 0, 0, 0);
    now.setHours(23, 59, 59, 999);

    // Usa getTime() correctamente (en milisegundos -> dividir por 1000)
    const fromTimestamp = Math.floor(startDate.getTime() / 1000);
    const toTimestamp = Math.floor(now.getTime() / 1000);

    // Si la fecha de inicio es mayor que la actual, usar un año atrás
    let finalFrom = fromTimestamp;
    if (fromTimestamp > nowTimestamp) {
        const fallback = new Date(now);
        fallback.setFullYear(now.getFullYear() - 1);
        fallback.setHours(0, 0, 0, 0);
        finalFrom = Math.floor(fallback.getTime() / 1000);
        console.warn('⚠️ Fecha de inicio en el futuro, usando fallback:', new Date(finalFrom * 1000));
    }

    console.log(`📅 Período ${period}: from=${finalFrom} (${new Date(finalFrom * 1000).toISOString()}) to=${toTimestamp} (${new Date(toTimestamp * 1000).toISOString()})`);

    return {
        from: finalFrom,
        to: toTimestamp
    };
}

async function cargarTendencias(period = 'week', resetear = true, intentos = 0) {
    await translationsReadyPromise;
    if (trendCargando) return;
    trendCargando = true;

    const container = document.getElementById('trend-games');
    if (!container) {
        trendCargando = false;
        return;
    }

    // 1. INTERCEPTOR DE CACHÉ
    if (resetear && intentos === 0 && cacheTendenciasJuegos[period]) {
        container.scrollLeft = 0;
        trendOffset = 0;
        container.innerHTML = '';

        const sorted = cacheTendenciasJuegos[period];
        const topGames = sorted.slice(0, 15);

        topGames.forEach((juego, index) => {
            const card = crearTarjetaTrend(juego, trendOffset + index + 1);
            container.appendChild(card);
        });

        if (sorted.length > 15) {
            const moreIndicator = document.createElement('div');
            moreIndicator.className = 'trend-more-indicator';
            moreIndicator.onclick = () => cargarMasTendencias(period);
            moreIndicator.innerHTML = `
                <div style="display:flex;flex-direction:column;align-items:center;padding:20px;color:var(--text-muted);">
                    <i class="fas fa-chevron-right" style="font-size:2rem;color:var(--primary);"></i>
                    <span>+${sorted.length - 15} más</span>
                </div>`;
            container.appendChild(moreIndicator);
        }

        trendPeriod = period;
        trendCargando = false;
        return;
    }

    if (intentos === 0) {
        container.scrollLeft = 0;
    }

    if (resetear && intentos === 0) {
        trendOffset = 0;
        const textos = {
            'week': 'de esta semana',
            'month': 'de este mes',
            'year': 'de este año'
        };
        container.innerHTML = `
        <div class="trends-loading">
            <i class="fas fa-circle-notch fa-spin"></i>
            <span>Cargando tendencias ${textos[period] || 'de esta semana'}...</span>
        </div>
        `;
    }

    try {
        let url = `/api/igdb?offset=${trendOffset}&limit=20&sort=rating.desc&period=${period}&lang=${currentLang}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        if (!Array.isArray(data)) throw new Error('Formato de respuesta inválido');

        if (resetear) container.innerHTML = '';

        if (!data || data.length === 0) {
            if (resetear) {
                container.innerHTML = `<div class="trends-empty"><i class="fas fa-gamepad"></i><span>No hay tendencias</span></div>`;
            }
            trendCargando = false;
            return;
        }

        const sorted = [...data].sort((a, b) => (b.rating || 0) - (a.rating || 0));

        if (resetear) {
            cacheTendenciasJuegos[period] = sorted;
        }

        const topGames = sorted.slice(0, 15);

        topGames.forEach((juego, index) => {
            const card = crearTarjetaTrend(juego, trendOffset + index + 1);
            container.appendChild(card);
        });

        if (data.length > 15) {
            const moreIndicator = document.createElement('div');
            moreIndicator.className = 'trend-more-indicator';
            moreIndicator.onclick = () => cargarMasTendencias(period);
            moreIndicator.innerHTML = `
                <div style="display:flex;flex-direction:column;align-items:center;padding:20px;color:var(--text-muted);">
                    <i class="fas fa-chevron-right" style="font-size:2rem;color:var(--primary);"></i>
                    <span>+${data.length - 15} más</span>
                </div>`;
            container.appendChild(moreIndicator);
        }

        trendPeriod = period;

    } catch (error) {
        console.error(`Error cargando tendencias (Intento ${intentos + 1}):`, error);

        if (intentos < 1) {
            trendCargando = false;
            setTimeout(() => cargarTendencias(period, resetear, intentos + 1), 1500);
            return;
        }

        if (resetear) {
            container.innerHTML = `
            <div class="trends-empty">
                <i class="fas fa-exclamation-triangle" style="color: var(--error);"></i>
                <span>Error de conexión con el servidor</span>
                <span style="font-size: 0.7rem; opacity: 0.6; margin-top: 4px;">IGDB está tardando. Recarga la página.</span>
            </div>`;
        }
    } finally {
        trendCargando = false;
    }

    requestAnimationFrame(() => {
        if (container) container.scrollLeft = 0;
    });
}

// Cargar más juegos en tendencias (botón +5 más)
async function cargarMasTendencias(period = 'day') {
    if (trendCargando) return;
    trendCargando = true;

    const container = document.getElementById('trend-games');
    if (!container) return;

    const moreIndicator = container.querySelector('.trend-more-indicator');
    if (moreIndicator) {
        moreIndicator.remove();
    }

    const loader = document.createElement('div');
    loader.className = 'trend-load-more';
    loader.style.cssText = 'display:flex;align-items:center;justify-content:center;min-width:120px;padding:20px;';
    loader.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;color:var(--text-muted);">
            <i class="fas fa-circle-notch fa-spin" style="font-size:2rem;color:var(--primary);"></i>
            <span style="margin-top:8px;font-size:0.7rem;">Cargando...</span>
        </div>
    `;
    container.appendChild(loader);

    try {
        // Aumentar el offset para cargar más
        trendOffset += 15;

        let url = `/api/igdb?offset=${trendOffset}&limit=10&sort=rating.desc&period=${period}&lang=${currentLang}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        if (!Array.isArray(data)) throw new Error('Formato inválido');

        // Eliminar el loader
        loader.remove();

        if (data.length === 0) {
            // Mostrar mensaje de que no hay más
            const emptyMsg = document.createElement('div');
            emptyMsg.style.cssText = 'display:flex;align-items:center;justify-content:center;min-width:120px;padding:20px;color:var(--text-muted);font-size:0.7rem;text-align:center;';
            emptyMsg.innerHTML = `
                <div>
                    <i class="fas fa-ellipsis-h" style="font-size:1.5rem;display:block;margin-bottom:8px;opacity:0.5;"></i>
                    No hay más
                </div>
            `;
            container.appendChild(emptyMsg);
            trendCargando = false;
            return;
        }

        // Ordenar por rating y tomar hasta 5 juegos
        const sorted = [...data].sort((a, b) => (b.rating || 0) - (a.rating || 0));
        const newGames = sorted.slice(0, 5);

        // Crear y añadir las nuevas tarjetas
        newGames.forEach((juego, index) => {
            const card = crearTarjetaTrend(juego, trendOffset + index + 1);
            container.appendChild(card);
        });

        // Si hay más juegos, añadir nuevo botón "+X más"
        if (data.length > 5) {
            const remaining = data.length - 5;
            const moreBtn = document.createElement('div');
            moreBtn.className = 'trend-more-indicator';
            moreBtn.style.cursor = 'pointer';
            moreBtn.onclick = function () {
                cargarMasTendencias(period);
            };
            moreBtn.innerHTML = `
                <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:20px;color:var(--text-muted);font-size:0.8rem;text-align:center;min-width:120px;transition: all 0.3s ease;"
                     onmouseover="this.style.color='var(--primary)'; this.querySelector('i').style.transform='scale(1.2)';"
                     onmouseout="this.style.color='var(--text-muted)'; this.querySelector('i').style.transform='scale(1)';">
                    <i class="fas fa-chevron-right" style="font-size:2rem;color:var(--primary);transition: transform 0.3s ease;"></i>
                    <span style="margin-top:8px;font-weight:600;">+${remaining} más</span>
                </div>
            `;
            container.appendChild(moreBtn);
        }

        trendOffset += data.length;

    } catch (error) {
        console.error('Error cargando más tendencias:', error);
        // Si falla, restaurar el botón
        loader.remove();
        const retryBtn = document.createElement('div');
        retryBtn.className = 'trend-more-indicator';
        retryBtn.style.cursor = 'pointer';
        retryBtn.onclick = function () {
            cargarMasTendencias(period);
        };
        retryBtn.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:20px;color:var(--error);font-size:0.8rem;text-align:center;min-width:120px;">
                <i class="fas fa-redo" style="font-size:1.5rem;color:var(--error);"></i>
                <span style="margin-top:8px;">Reintentar</span>
            </div>
        `;
        container.appendChild(retryBtn);
    }

    trendCargando = false;
}

function crearTarjetaTrend(juego, posicion) {
    const card = document.createElement('div');
    card.className = 'trend-card';
    card.setAttribute('data-game-id', juego.id);
    card.setAttribute('data-game-title', juego.name);

    // Portada
    const tienePortada = juego.cover && juego.cover.url;
    const portada = tienePortada
        ? juego.cover.url.replace('t_thumb', 't_cover_big').replace('//', 'https://')
        : '';

    // Fecha
    const fecha = juego.first_release_date
        ? new Date(juego.first_release_date * 1000).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })
        : t('common.tba');

    // Precio
    let precioHtml = '';
    if (juego.itad && juego.itad.precio !== null) {
        precioHtml = `<span class="price-badge" style="font-size:0.7rem;">${juego.itad.precio.toFixed(2)} €</span>`;
    }

    // Mantenemos las clases por si quieres conservar los colores (oro, plata, bronce)
    let posClass = '';
    if (posicion === 1) posClass = 'top1';
    else if (posicion === 2) posClass = 'top2';
    else if (posicion === 3) posClass = 'top3';

    // Ahora siempre mostrará #1, #2, #3...
    const posText = `#${posicion}`;

    // Rating - IGDB usa 'rating' (0-100) o 'total_rating' (0-100)
    const rating = juego.rating ? (juego.rating / 10).toFixed(1) :
        juego.total_rating ? (juego.total_rating / 10).toFixed(1) : '--';

    card.innerHTML = `
        <div class="game-cover-container">
            <div class="trend-position ${posClass}">${posText}</div>
            ${tienePortada
            ? `<img src="${portada}" alt="${juego.name}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'no-cover\\' style=\\'width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--bg-elevated);\\'><i class=\\'fas fa-gamepad\\' style=\\'font-size:3rem;color:var(--text-muted);\\'></i></div>'">`
            : `<div class="no-cover" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--bg-elevated);"><i class="fas fa-gamepad" style="font-size:3rem;color:var(--text-muted);"></i></div>`
        }
        </div>
        <div class="game-info">
            <h3 class="game-title">${juego.name}</h3>
            <div class="game-release-info">
                <span class="date">${fecha}</span>
                <span class="dot">•</span>
                <span style="color:gold;font-size:0.7rem;">⭐ ${rating}</span>
            </div>
            <div class="game-price">
                ${precioHtml || `<span style="color:var(--text-muted);font-size:0.65rem;">${t('trends_extra.no_offers')}</span>`}
            </div>
        </div>
    `;

    // Evento click para abrir modal
    card.addEventListener('click', () => {
        const juegoData = {
            idJuego: juego.id,
            titulo: juego.name,
            urlAmigable: juego.name.replace(/[^a-zA-Z0-9 \-]/g, '').trim().replace(/\s+/g, '_'),
            storesRaw: juego.itad?.stores || 'none',
            storeUrlRaw: juego.itad?.url || '',
            portadaSrc: portada,
            htmlPlataformas: '',
            fecha: fecha,
            priceText: juego.itad?.precio ? `${juego.itad.precio.toFixed(2)} €` : null,
            priceNaText: null
        };
        procesarAperturaModalJuego(juegoData, true);
    });

    return card;
}

// ==========================================================================
//   SISTEMA UNIFICADO DE PESTAÑAS (GAMES, MOVIES Y SERIES)
// ==========================================================================
function initTrendTabs() {
    const seccionesTendencias = document.querySelectorAll('.trends-container');

    seccionesTendencias.forEach(seccion => {
        const tabs = seccion.querySelectorAll('.trend-tab');
        const scrollContainer = seccion.querySelector('.horizontal-scroll');

        if (tabs.length === 0 || !scrollContainer) return;

        const tipoTendencia = scrollContainer.id;

        tabs.forEach(tab => {
            const newTab = tab.cloneNode(true);
            tab.parentNode.replaceChild(newTab, tab);

            newTab.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();

                const allTabsThisSection = seccion.querySelectorAll('.trend-tab');
                allTabsThisSection.forEach(t => t.classList.remove('active'));
                this.classList.add('active');

                const period = this.getAttribute('data-period');

                if (scrollContainer) {
                    scrollContainer.style.opacity = '0.5';
                    scrollContainer.style.transition = 'opacity 0.2s';
                }

                if (tipoTendencia === 'trend-games') {
                    trendOffset = 0;
                    cargarTendencias(period, true);
                }
                else if (tipoTendencia === 'trend-movies') {
                    cargarTendenciasPeliculas(period, true);
                }
                else if (tipoTendencia === 'trend-series') {
                    cargarTendenciasSeries(period, true);
                }

                setTimeout(() => {
                    if (scrollContainer) {
                        scrollContainer.style.opacity = '1';
                        scrollContainer.scrollLeft = 0;
                    }
                }, 300);
            });
        });
    });
}

// Cargar tendencias de JUEGOS al iniciar
function cargarTendenciasInicial() {
    setTimeout(() => {
        cargarTendencias('day', true);
        initTrendTabs();
        const container = document.getElementById('trend-games');
        if (container) {
            setTimeout(() => { container.scrollLeft = 0; }, 100);
        }
    }, 500);
}

// Ejecutar cuando se carga la página
document.addEventListener('DOMContentLoaded', function () {
    // Cargar tendencias de juegos
    cargarTendenciasInicial();

    // Cargar tendencias de películas
    cargarTendenciasPeliculasInicial();
});

// También cargar cuando se cambie a la vista de juegos
// Modificar la función cambiarVista para que cargue tendencias al entrar a juegos
const originalCambiarVista = cambiarVista;
cambiarVista = async function (target, guardarEnHistorial = true, usernameUrl = null) {
    // Llamar a la función original
    await originalCambiarVista(target, guardarEnHistorial, usernameUrl);

    // Si es la vista de juegos, cargar tendencias
    if (target === 'games') {
        // Verificar si ya están cargadas
        const container = document.getElementById('trend-games');
        if (container && container.querySelector('.trends-loading')) {
            cargarTendencias('day', true);
        }
    }
};

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
let countryFilterMovie = [];
let countryFilterSeries = [];
let genreFilterMovie = [];
let genreFilterSeries = [];
let generosCargadosMovie = false;
let generosCargadosSeries = false;
let listaGenerosMovie = [];
let listaGenerosSeries = [];
let dateMinMovie = '';
let dateMaxMovie = '';
let dateMinSeries = '';
let dateMaxSeries = '';

function crearTarjetaTMDB(media, tipo, userMediaInfo = null) {
    const isMovie = tipo === 'movie';
    // FECHA COMPLETA (AÑO-MES-DIA)
    const fechaFormat = media.fecha ? media.fecha : t('common.tba');

    // Filtro nativo de TMDB para mostrar etiqueta NSFW
    const esContenidoAdulto = media.adult;
    const nsfwTag = esContenidoAdulto ? '<span class="nsfw-tag">+18</span>' : '';

    // info extra segun si es peli o serie
    let extraInfo = '';
    if (isMovie) {
        extraInfo = media.duracion ? `<span class="plat-count">${media.duracion} min</span>` : '';
    } else {
        extraInfo = media.temporadas ? `<span class="plat-count">T${media.temporadas} | E${media.episodios}</span>` : '';
    }

    // SIMPLIFICACIÓN DE TEXTO DE PLATAFORMAS
    const textoPlataforma = media.plataformas === 'No disponible en streaming'
        ? t('movies.not_streaming')
        : t('movies.streaming');

    // LÓGICA DE LOS BOTONES INFERIORES
    let btnVistoHtml = '';

    // MAGIA: Solo inyectamos el botón del ojo si es una PELÍCULA
    if (isMovie) {
        if (userMediaInfo) {
            const veces = userMediaInfo.veces_vista || 1;
            const badgeExtra = veces > 1 ? `<span style="position: absolute; top: -6px; right: -6px; background: var(--primary); font-size: 0.6rem; padding: 2px 5px; border-radius: 10px; font-weight: bold; border: 1px solid var(--bg-card); color: white;">${veces > 20 ? '+20' : 'x' + veces}</span>` : '';

            btnVistoHtml = `
                <button class="btn-card-watched-status watched" data-id="${media.id}" data-tipo="${tipo}" data-db-id="${userMediaInfo.id}" data-veces="${veces}" title="Vista. Clic para opciones" style="position: relative; flex: 1; background: var(--primary-soft); border: 1px solid var(--primary); color: var(--primary); height: 38px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='var(--primary)'; this.style.color='white';" onmouseout="this.style.background='var(--primary-soft)'; this.style.color='var(--primary)';" onclick="abrirMenuTarjeta(event, this)">
                    <i class="fas fa-eye" style="font-size: 0.9rem;"></i>
                    ${badgeExtra}
                </button>
            `;
        } else {
            // Botón gris: ahora tiene el evento onclick="marcarVistaRapida" que corta la propagación
            btnVistoHtml = `
                <button class="btn-watch-indicator not-watched" data-id="${media.id}" data-tipo="${tipo}" data-db-id="" data-veces="0" title="Marcar como vista" style="position: relative; flex: 1; background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-muted); height: 38px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s;" onmouseover="this.style.color='var(--neon-white)'; this.style.borderColor='var(--text-muted)';" onmouseout="this.style.color='var(--text-muted)'; this.style.borderColor='var(--border-color)';" onclick="marcarVistaRapida(event, this, ${media.id}, '${tipo}')">
                    <i class="fas fa-eye-slash" style="font-size: 0.9rem;"></i>
                </button>
            `;
        }
    }

    return `
        <div class="game-card" data-id="${media.id}" data-type="${tipo}" style="cursor: pointer;">
            <div class="game-cover-container">
                <div class="top-platform-tag">
                    <i class="fas fa-star" style="color:gold;"></i> ${media.nota}
                </div>
                ${nsfwTag} 
                <img src="${media.poster}" alt="${media.titulo}" class="game-cover" loading="lazy" width="264" height="374">
            </div>
            <div class="game-info">
                <h3 class="game-title">${media.titulo}</h3>
                <div class="game-release-info">
                    <span class="date">${fechaFormat}</span>
                    ${extraInfo ? `<span class="dot">•</span>${extraInfo}` : ''}
                </div>
                <div class="game-price" style="font-size: 0.8rem; color: var(--text-muted);">
                    <i class="fas fa-globe" style="margin-right: 4px;"></i> <strong>${textoPlataforma}</strong>
                </div>
                
                <div style="display: flex;gap: 5px;width: 100%;margin-top: 5px;padding-top: 5px;border-top: 1px solid var(--border-color);">
                    <button class="btn-add-list" title="${t('movies.add_to_list')}" style="flex: 1; background: rgba(245, 158, 11, 0.15); border: 1px solid var(--warning); color: var(--warning); height: 38px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s;" onclick="event.stopPropagation(); abrirMenuAddToList(event, '${media.id}', '${tipo}');" onmouseover="this.style.background='var(--warning)'; this.style.color='white';" onmouseout="this.style.background='rgba(245, 158, 11, 0.15)'; this.style.color='var(--warning)';">
                        <i class="fas fa-plus"></i>
                    </button>
                    ${btnVistoHtml}
                </div>
            </div>
        </div>
    `;
}

async function cargarTMDB(tipo, busqueda = '', resetear = true) {
    await translationsReadyPromise;
    if (cargandoTMDB) return;
    cargandoTMDB = true;

    const grid = document.getElementById(tipo === 'movie' ? 'movies-grid' : 'series-grid');

    if (resetear) {
        if (tipo === 'movie') {
            pageMovies = 1;
            searchMoviesActual = busqueda;
            // GUARDAR BÚSQUEDA DE PELÍCULAS
            if (busqueda) {
                localStorage.setItem('last_search_movies', busqueda);
            } else {
                localStorage.removeItem('last_search_movies');
            }
        } else {
            pageSeries = 1;
            searchSeriesActual = busqueda;
            // GUARDAR BÚSQUEDA DE SERIES
            if (busqueda) {
                localStorage.setItem('last_search_tv', busqueda);
            } else {
                localStorage.removeItem('last_search_tv');
            }
        }

        // muestro el loader
        grid.innerHTML = `
            <div id="loader-${tipo}" style="grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 0;">
                <i class="fas fa-circle-notch fa-spin" style="font-size: 3rem; color: var(--primary); margin-bottom: 10px;"></i>
                <h3 class="loading-text" style="color: var(--text-muted); letter-spacing: 3px; font-weight: 600;">${t('movies.loading')}</h3>
            </div>
        `;

        document.getElementById(`btn-cargar-mas-${tipo}`)?.remove();
    } else {
        // transformo el boton en loader
        const btnMas = document.getElementById(`btn-cargar-mas-${tipo}`);
        if (btnMas) {
            const textoTipo = tipo === 'movie' ? t('common.movies_uppercase') : t('common.series_uppercase');
            btnMas.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px 0;">
                    <i class="fas fa-circle-notch fa-spin" style="font-size: 2rem; color: var(--primary); margin-bottom: 10px;"></i>
                    <span style="color: var(--text-muted); letter-spacing: 2px; font-weight: 600; margin-bottom: 15px;">CARGANDO MÁS ${textoTipo}...</span>
                    
                    <button onclick="cargandoTMDB=false; cargarMasTMDB('${tipo}')" ...>
                        <i class="fas fa-redo"></i> ${t('common.retry_manual')}
                    </button>
                </div>
            `;
        }
    }

    const pageActual = tipo === 'movie' ? pageMovies : pageSeries;
    const searchActual = tipo === 'movie' ? searchMoviesActual : searchSeriesActual;

    // === LEER ESTADO DEL FILTRO +18 (SIEMPRE CONSULTAMOS EL DOM) ===
    const checkboxAdulto = document.getElementById(tipo === 'movie' ? 'adult-filter-movie' : 'adult-filter-series');
    // FORZAMOS a que sea 'true' o 'false' en minúsculas, sin excepciones
    const isAdult = checkboxAdulto && checkboxAdulto.checked ? 'true' : 'false';

    try {
        // Le pasamos el &adult=true o false al servidor
        const timestamp = Date.now();
        // Leer el valor del slider de votos
        const minVotes = tipo === 'movie'
            ? parseInt(document.getElementById('votes-slider-movie')?.value || 0)
            : parseInt(document.getElementById('votes-slider-tv')?.value || 0);

        // Leer filtros de país
        const countryCodes = tipo === 'movie' ? countryFilterMovie : countryFilterSeries;
        const countryParam = (countryCodes && countryCodes.length > 0) ? countryCodes.join(',') : '';

        // Leer filtros de géneros
        const genreCodes = tipo === 'movie' ? genreFilterMovie : genreFilterSeries;
        const genreParam = (genreCodes && genreCodes.length > 0) ? genreCodes.join(',') : '';

        // Leer filtros de fechas
        const dateMin = tipo === 'movie' ? window.dateMinMovie : window.dateMinSeries;
        const dateMax = tipo === 'movie' ? window.dateMaxMovie : window.dateMaxSeries;

        // Construir URL base
        let url = `/api/tmdb?tipo=${tipo}&page=${pageActual}&adult=${isAdult}&minVotes=${minVotes}&lang=${currentLang}`;

        // Añadir país SOLO si hay algo seleccionado
        if (countryParam) {
            url += `&country=${countryParam}`;
        }

        // Añadir géneros SOLO si hay algo seleccionado
        if (genreParam) {
            url += `&genres=${genreParam}`;
        }

        // Añadir fechas
        if (dateMin) {
            url += `&dateMin=${dateMin}`;
        }
        if (dateMax) {
            url += `&dateMax=${dateMax}`;
        }

        // Añadir búsqueda si existe
        if (searchActual) {
            url += `&query=${encodeURIComponent(searchActual)}`;
        }

        // Añadir timestamp para evitar caché
        url += `&_=${timestamp}`;
        const respuesta = await fetch(url);
        const datos = await respuesta.json();

        // FILTRAR DUPLICADOS Y BLOQUEAR "MAKING OF / DETRÁS DE CÁMARAS"
        const vistos = new Set();
        const datosUnicos = datos.filter(item => {
            const key = item.titulo ? item.titulo.toLowerCase().trim() : '';

            // 1. Si no hay título o ya está en la lista (duplicado), lo ignoramos
            if (!key || vistos.has(key)) return false;

            // 2. ESCUDO ANTI-EXTRAS
            const palabrasProhibidas = [
                'making of',
                'behind the scenes',
                'detrás de las cámaras',
                'detras de camaras',
                'así se hizo',
                'marvel studios: assembled',
                'marvel studios assembled',
                'unseen footage'
            ];

            // Si el título contiene alguna de las palabras prohibidas, lo descartamos
            const esUnExtra = palabrasProhibidas.some(palabra => key.includes(palabra));
            if (esUnExtra) return false;

            // 3. Si ha pasado todos los filtros, lo guardamos
            vistos.add(key);
            return true;
        });

        if (resetear) grid.innerHTML = '';
        document.getElementById(`btn-cargar-mas-${tipo}`)?.remove();

        // CRUCE DE DATOS CON SUPABASE
        const { data: { session } } = await supabase.auth.getSession();
        let vistosMap = {};

        if (session && datosUnicos && datosUnicos.length > 0) {
            const idsTMDB = datosUnicos.map(d => d.id.toString());
            const { data: vistosData } = await supabase
                .from('user_media')
                .select('media_id, veces_vista, id')
                .eq('user_id', session.user.id)
                .eq('tipo', tipo)
                .in('media_id', idsTMDB); // Pide solo los que están en pantalla de golpe

            if (vistosData) {
                vistosData.forEach(v => vistosMap[v.media_id] = v);
            }
        }

        datosUnicos.forEach(item => {
            const checkboxAdulto = document.getElementById(tipo === 'movie' ? 'adult-filter-movie' : 'adult-filter-series');
            const isAdultFilterActive = checkboxAdulto && checkboxAdulto.checked;

            // Bloquea ÚNICAMENTE si TMDB lo clasifica oficialmente como contenido para adultos
            const esContenidoAdulto = item.adult;

            if (esContenidoAdulto && !isAdultFilterActive) return;

            // Pasamos la variable de si está vista a la función  
            const userMediaInfo = vistosMap[item.id.toString()];
            grid.innerHTML += crearTarjetaTMDB(item, tipo, userMediaInfo);
        });

        if (datosUnicos.length > 0) {
            const btnMas = document.createElement('div');
            btnMas.id = `btn-cargar-mas-${tipo}`;
            btnMas.style = "grid-column: 1 / -1; text-align: center; margin: 2rem 0;";
            btnMas.innerHTML = `<button onclick="cargarMasTMDB('${tipo}')" style="background:transparent; border:1px solid var(--primary); color:var(--primary); padding:0.8rem 2.5rem; border-radius:40px; cursor:pointer; font-weight:600;" aria-label="Cargar más ${tipo === 'movie' ? 'películas' : 'series'}">Cargar más</button>`;
            grid.after(btnMas);

            // Le decimos al vigilante que vigile este botón
            observadorScroll.observe(btnMas);
        }

        if (tipo === 'movie') pageMovies++; else pageSeries++;

    } catch (error) {
        console.error(error);
        if (resetear) {
            grid.innerHTML = `<div style="color:var(--error); text-align:center; width:100%;">${t('movies.api_error')}</div>`;
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

// ==========================================================================
//   FILTROS DE VOTOS MÍNIMOS (PELÍCULAS Y SERIES)
// ==========================================================================

function initVoteFilters() {
    // Slider de Películas
    const sliderMovie = document.getElementById('votes-slider-movie');
    const displayMovie = document.getElementById('votes-display-movie');

    if (sliderMovie && displayMovie) {
        sliderMovie.addEventListener('input', function () {
            const value = parseInt(this.value);
            displayMovie.textContent = `${value} votos`;
            // Recargar películas con el nuevo filtro
            cargarTMDB('movie', searchMoviesActual, true);
        });
    }

    // Slider de Series
    const sliderTv = document.getElementById('votes-slider-tv');
    const displayTv = document.getElementById('votes-display-tv');

    if (sliderTv && displayTv) {
        sliderTv.addEventListener('input', function () {
            const value = parseInt(this.value);
            displayTv.textContent = `${value} votos`;
            // Recargar series con el nuevo filtro
            cargarTMDB('tv', searchSeriesActual, true);
        });
    }
}

// ==========================================================================
//   FILTROS DE PAÍS / IDIOMA - SOLO PAÍSES VISIBLES POR DEFECTO
// ==========================================================================

// Países que se muestran SIEMPRE en la lista
const PAISES_VISIBLES = [
    // Occidentales (solo Español e Inglés)
    { code: 'ES', name: 'España' },
    { code: 'US', name: 'Estados Unidos' },
    // Asiáticos (solo Corea, Japón, China)
    { code: 'KR', name: 'Corea' },
    { code: 'JP', name: 'Japón' },
    { code: 'CN', name: 'China' },
];

// Países OCULTOS que SOLO aparecen al buscar
const PAISES_OCULTOS = [
    // Occidentales (ocultos)
    { code: 'FR', name: 'Francia' },
    { code: 'GB', name: 'Reino Unido' },
    { code: 'DE', name: 'Alemania' },
    { code: 'IT', name: 'Italia' },
    { code: 'PT', name: 'Portugal' },
    { code: 'NL', name: 'Países Bajos' },
    { code: 'SE', name: 'Suecia' },
    { code: 'NO', name: 'Noruega' },
    { code: 'DK', name: 'Dinamarca' },
    { code: 'FI', name: 'Finlandia' },
    { code: 'PL', name: 'Polonia' },
    { code: 'RU', name: 'Rusia' },
    { code: 'UA', name: 'Ucrania' },
    { code: 'GR', name: 'Grecia' },
    { code: 'TR', name: 'Turquía' },
    { code: 'IL', name: 'Israel' },
    { code: 'AR', name: 'Argentina' },
    { code: 'MX', name: 'México' },
    { code: 'CO', name: 'Colombia' },
    { code: 'BR', name: 'Brasil' },
    { code: 'CL', name: 'Chile' },
    { code: 'PE', name: 'Perú' },
    { code: 'VE', name: 'Venezuela' },
    { code: 'CU', name: 'Cuba' },
    { code: 'PR', name: 'Puerto Rico' },
    { code: 'DO', name: 'República Dominicana' },
    // Asiáticos (ocultos)
    { code: 'TW', name: 'Taiwán' },
    { code: 'HK', name: 'Hong Kong' },
    { code: 'TH', name: 'Tailandia' },
    { code: 'VN', name: 'Vietnam' },
    { code: 'PH', name: 'Filipinas' },
    { code: 'MY', name: 'Malasia' },
    { code: 'ID', name: 'Indonesia' },
    { code: 'IN', name: 'India' },
    { code: 'PK', name: 'Pakistán' },
    { code: 'IR', name: 'Irán' },
    { code: 'SA', name: 'Arabia Saudita' },
    { code: 'AE', name: 'Emiratos Árabes' },
    { code: 'EG', name: 'Egipto' },
    // Otros (ocultos)
    { code: 'ZA', name: 'Sudáfrica' },
    { code: 'NG', name: 'Nigeria' },
    { code: 'KE', name: 'Kenia' },
    { code: 'AU', name: 'Australia' },
    { code: 'NZ', name: 'Nueva Zelanda' },
    { code: 'CA', name: 'Canadá' },
];

function initCountryFilters() {
    // --- PELÍCULAS ---
    initCountryFilterForType('movie', 'lang-item-movie', 'search-lang-movie', 'lang-extra-list-movie', 'lang-extra-movie');

    // --- SERIES ---
    initCountryFilterForType('tv', 'lang-item-tv', 'search-lang-tv', 'lang-extra-list-tv', 'lang-extra-tv');
}

// ==========================================================================
//   FILTROS DE FECHAS (PELÍCULAS Y SERIES) - CON FLATPICKR
// ==========================================================================

function initDateFilters() {
    // --- PELÍCULAS ---
    const dateMinMovie = document.getElementById('date-min-movie');
    const dateMaxMovie = document.getElementById('date-max-movie');

    if (dateMinMovie) {
        flatpickr(dateMinMovie, {
            locale: "es",
            dateFormat: "Y-m-d",
            altInput: true,
            altFormat: "d / m / Y",
            maxDate: "today",
            disableMobile: true,
            onChange: function (selectedDates, dateStr) {
                window.dateMinMovie = dateStr || '';
                aplicarFechas('movie');
            }
        });
    }

    if (dateMaxMovie) {
        flatpickr(dateMaxMovie, {
            locale: "es",
            dateFormat: "Y-m-d",
            altInput: true,
            altFormat: "d / m / Y",
            maxDate: "today",
            disableMobile: true,
            onChange: function (selectedDates, dateStr) {
                window.dateMaxMovie = dateStr || '';
                aplicarFechas('movie');
            }
        });
    }

    // --- SERIES ---
    const dateMinSeries = document.getElementById('date-min-tv');
    const dateMaxSeries = document.getElementById('date-max-tv');

    if (dateMinSeries) {
        flatpickr(dateMinSeries, {
            locale: "es",
            dateFormat: "Y-m-d",
            altInput: true,
            altFormat: "d / m / Y",
            maxDate: "today",
            disableMobile: true,
            onChange: function (selectedDates, dateStr) {
                window.dateMinSeries = dateStr || '';
                aplicarFechas('tv');
            }
        });
    }

    if (dateMaxSeries) {
        flatpickr(dateMaxSeries, {
            locale: "es",
            dateFormat: "Y-m-d",
            altInput: true,
            altFormat: "d / m / Y",
            maxDate: "today",
            disableMobile: true,
            onChange: function (selectedDates, dateStr) {
                window.dateMaxSeries = dateStr || '';
                aplicarFechas('tv');
            }
        });
    }
}

// Función para aplicar filtros de fecha
function aplicarFechas(tipo) {
    const isMovie = tipo === 'movie';
    const dateMin = isMovie ? window.dateMinMovie : window.dateMinSeries;
    const dateMax = isMovie ? window.dateMaxMovie : window.dateMaxSeries;

    // Solo recargar si hay al menos una fecha seleccionada
    if (dateMin || dateMax) {
        cargarTMDB(tipo, isMovie ? searchMoviesActual : searchSeriesActual, true);
    }
}

// ==========================================================================
//   FILTROS DE GÉNEROS (PELÍCULAS Y SERIES)
// ==========================================================================

async function cargarGeneros(tipo) {
    const isMovie = tipo === 'movie';
    const containerId = isMovie ? 'genre-list-movie' : 'genre-list-tv';
    const container = document.getElementById(containerId);

    if (!container) return;

    // Si ya están cargados, no volver a cargar
    if (isMovie && generosCargadosMovie) {
        renderGeneros('movie');
        return;
    }
    if (!isMovie && generosCargadosSeries) {
        renderGeneros('tv');
        return;
    }

    // Mostrar loading
    container.innerHTML = `
        <div style="color:var(--text-muted); font-size:0.8rem; text-align:center; padding:10px;">
            <i class="fas fa-spinner fa-spin"></i> Cargando géneros...
        </div>
    `;

    try {
        const response = await fetch(`/api/tmdb?tipo=${tipo}&generos=1`);
        const data = await response.json();

        if (data && data.genres) {
            if (isMovie) {
                listaGenerosMovie = data.genres;
                generosCargadosMovie = true;
                renderGeneros('movie');
            } else {
                listaGenerosSeries = data.genres;
                generosCargadosSeries = true;
                renderGeneros('tv');
            }
        } else {
            container.innerHTML = `
                <div style="color:var(--text-muted); font-size:0.8rem; text-align:center; padding:10px;">
                    <i class="fas fa-exclamation-circle"></i> No se pudieron cargar los géneros
                </div>
            `;
        }
    } catch (error) {
        console.error('Error cargando géneros:', error);
        container.innerHTML = `
            <div style="color:var(--error); font-size:0.8rem; text-align:center; padding:10px;">
                <i class="fas fa-exclamation-triangle"></i> Error al cargar géneros
            </div>
        `;
    }
}

function renderGeneros(tipo) {
    const isMovie = tipo === 'movie';
    const containerId = isMovie ? 'genre-list-movie' : 'genre-list-tv';
    const container = document.getElementById(containerId);
    const searchId = isMovie ? 'search-genre-movie' : 'search-genre-tv';
    const searchInput = document.getElementById(searchId);
    const listaGeneros = isMovie ? listaGenerosMovie : listaGenerosSeries;
    const generosSeleccionados = isMovie ? genreFilterMovie : genreFilterSeries;

    if (!container) return;

    // Ordenar géneros alfabéticamente
    const generosOrdenados = [...listaGeneros].sort((a, b) => a.name.localeCompare(b.name));

    let html = '';
    generosOrdenados.forEach(genero => {
        const checked = generosSeleccionados.includes(genero.id.toString()) ? 'checked' : '';
        html += `
            <label class="custom-check genre-item-${tipo}">
                <input type="checkbox" value="${genero.id}" ${checked}>
                <span class="box"></span> ${genero.name}
            </label>
        `;
    });

    container.innerHTML = html;

    // Añadir eventos a los checkboxes
    container.querySelectorAll(`input[type="checkbox"]`).forEach(cb => {
        cb.addEventListener('change', function () {
            const selected = [];
            container.querySelectorAll(`input[type="checkbox"]:checked`).forEach(c => {
                selected.push(c.value);
            });

            if (isMovie) {
                genreFilterMovie = selected;
            } else {
                genreFilterSeries = selected;
            }

            // Recargar con los filtros
            cargarTMDB(tipo, isMovie ? searchMoviesActual : searchSeriesActual, true);
        });
    });

    // Configurar buscador de géneros
    if (searchInput) {
        // Remover event listeners anteriores
        const newSearchInput = searchInput.cloneNode(true);
        searchInput.parentNode.replaceChild(newSearchInput, searchInput);

        newSearchInput.addEventListener('input', function () {
            const query = this.value.toLowerCase().trim();
            const items = container.querySelectorAll('.genre-item-' + tipo);

            items.forEach(item => {
                const text = item.textContent.toLowerCase();
                if (query === '') {
                    item.style.display = '';
                } else {
                    item.style.display = text.includes(query) ? '' : 'none';
                }
            });
        });
    }
}

function initCountryFilterForType(tipo, itemClass, searchId, extraListId, extraContainerId) {
    const searchInput = document.getElementById(searchId);
    const items = document.querySelectorAll(`.${itemClass}`);
    const extraList = document.getElementById(extraListId);
    const extraContainer = document.getElementById(extraContainerId);

    // Si no hay items o no hay buscador, salimos
    if (!searchInput || items.length === 0) return;

    // Guardar referencia a los grupos normales (excluyendo el grupo extra)
    const accordionContent = searchInput.closest('.accordion-content');
    const langGroups = accordionContent ? accordionContent.querySelectorAll(`.lang-group:not(#${extraContainerId})`) : [];

    // Estado de búsqueda activa
    let isSearchActive = false;

    // Función para mostrar/ocultar los grupos según la búsqueda
    function toggleGroups(showExtraOnly) {
        langGroups.forEach(group => {
            if (showExtraOnly) {
                group.style.display = 'none';
            } else {
                group.style.display = '';
            }
        });
        if (extraContainer) {
            if (showExtraOnly) {
                extraContainer.style.display = 'block';
            } else {
                extraContainer.style.display = 'none';
            }
        }
        isSearchActive = showExtraOnly;
    }

    // Función para restaurar el estado normal (mostrar grupos, ocultar extra)
    function restoreNormalState() {
        toggleGroups(false);
        if (searchInput) searchInput.value = '';
        if (extraList) extraList.innerHTML = '';
    }

    // Función para verificar si hay países seleccionados (ocultos o visibles)
    function hasHiddenCountriesSelected() {
        const selected = [];
        document.querySelectorAll(`.${itemClass} input:checked`).forEach(c => {
            selected.push(c.value);
        });
        // Verificar si alguno de los seleccionados está en PAISES_OCULTOS
        return selected.some(code => PAISES_OCULTOS.some(p => p.code === code));
    }

    // Función para actualizar la visibilidad según los checkboxes seleccionados
    function updateVisibilityBasedOnSelection() {
        const hiddenSelected = hasHiddenCountriesSelected();
        if (hiddenSelected) {
            // Si hay países ocultos seleccionados, ocultamos los defaults y mostramos solo los seleccionados
            toggleGroups(true);
            // Pero solo mostramos los países seleccionados (los ocultos)
            // Los defaults se ocultan
            if (extraContainer) {
                extraContainer.style.display = 'block';
                extraList.innerHTML = '';
                // Mostrar SOLO los países ocultos que están seleccionados
                const selectedHidden = [];
                document.querySelectorAll(`.${itemClass} input:checked`).forEach(c => {
                    const code = c.value;
                    const isHidden = PAISES_OCULTOS.some(p => p.code === code);
                    if (isHidden) {
                        selectedHidden.push(code);
                    }
                });
                // No mostramos nada en extraList porque ya están marcados en el DOM
                // Pero ocultamos los grupos normales
                langGroups.forEach(group => {
                    group.style.display = 'none';
                });
                if (extraContainer) extraContainer.style.display = 'none';
            }
        } else {
            // Si no hay países ocultos seleccionados, restaurar estado normal
            restoreNormalState();
        }
    }

    // Función para actualizar la lista de búsqueda
    function updateSearchResults(query) {
        if (!extraList) return;

        const q = query.toLowerCase().trim();
        extraList.innerHTML = '';

        // Mapear códigos ya existentes (los visibles por defecto)
        const existingCodes = new Set();
        items.forEach(item => {
            const cb = item.querySelector('input[type="checkbox"]');
            if (cb) existingCodes.add(cb.value);
        });

        if (q === '') {
            // Si no hay búsqueda, actualizar según selección
            updateVisibilityBasedOnSelection();
            return;
        }

        // BUSCAR en PAISES_OCULTOS (los que no son visibles por defecto)
        const matches = PAISES_OCULTOS.filter(p =>
            p.name.toLowerCase().includes(q) &&
            !existingCodes.has(p.code) // Excluir los que ya están visibles
        );

        if (matches.length === 0) {
            // No hay resultados: mostrar mensaje
            toggleGroups(true);
            if (extraContainer) extraContainer.style.display = 'block';
            extraList.innerHTML = `<div style="color:var(--text-muted); font-size:0.8rem; padding:8px 0; text-align:center; opacity:0.5;">No se encontraron países con "${q}"</div>`;
            return;
        }

        // Ocultar los grupos normales y mostrar solo el extra
        toggleGroups(true);

        matches.forEach(p => {
            const label = document.createElement('label');
            label.className = `custom-check ${itemClass}`;
            label.innerHTML = `
                <input type="checkbox" value="${p.code}">
                <span class="box"></span> ${p.name}
            `;

            // Añadir evento al checkbox
            const cb = label.querySelector('input[type="checkbox"]');
            cb.addEventListener('change', function () {
                // Recolectar países seleccionados
                const selected = [];
                document.querySelectorAll(`.${itemClass} input:checked`).forEach(c => {
                    selected.push(c.value);
                });

                // Actualizar la variable global
                if (tipo === 'movie') {
                    countryFilterMovie = selected;
                } else {
                    countryFilterSeries = selected;
                }

                // Recargar
                cargarTMDB(tipo, tipo === 'movie' ? searchMoviesActual : searchSeriesActual, true);

                // Limpiar búsqueda y actualizar visibilidad
                searchInput.value = '';
                updateVisibilityBasedOnSelection();
            });

            extraList.appendChild(label);
        });
    }

    // Evento de búsqueda
    searchInput.addEventListener('input', function () {
        updateSearchResults(this.value);
    });

    // Escuchar cambios en TODOS los checkboxes (visibles y ocultos)
    document.addEventListener('change', function (e) {
        const cb = e.target.closest(`.${itemClass} input[type="checkbox"]`);
        if (!cb) return;

        // Si estamos en modo búsqueda, limpiar
        if (isSearchActive) {
            searchInput.value = '';
            extraList.innerHTML = '';
        }

        // Recolectar países seleccionados
        const selected = [];
        document.querySelectorAll(`.${itemClass} input:checked`).forEach(c => {
            selected.push(c.value);
        });

        // Actualizar la variable global
        if (tipo === 'movie') {
            countryFilterMovie = selected;
        } else {
            countryFilterSeries = selected;
        }

        // Recargar
        cargarTMDB(tipo, tipo === 'movie' ? searchMoviesActual : searchSeriesActual, true);

        // Actualizar visibilidad
        updateVisibilityBasedOnSelection();
    });

    // Si el usuario hace clic fuera del buscador, limpiar la búsqueda
    document.addEventListener('click', function (e) {
        const container = searchInput.closest('.accordion-content');
        if (container && !container.contains(e.target) && searchInput.value !== '') {
            searchInput.value = '';
            updateVisibilityBasedOnSelection();
        }
    });

    // Inicializar visibilidad
    setTimeout(() => {
        updateVisibilityBasedOnSelection();
    }, 100);
}

// Inicializar cuando se carga la página
document.addEventListener('DOMContentLoaded', function () {
    initVoteFilters();
    initCountryFilters();
    initCountryFilterForType();
    initDateFilters();
});

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

document.getElementById('movies-grid')?.addEventListener('click', (e) => capturarClicMedia(e, 'movie'));
document.getElementById('series-grid')?.addEventListener('click', (e) => capturarClicMedia(e, 'tv'));

function capturarClicMedia(e, tipo) {
    const card = e.target.closest('.game-card');
    if (!card) return;

    const id = card.getAttribute('data-id');
    abrirModalMedia(id, tipo);
}

// ==========================================================================
//   AUTENTICACION Y SESION
// ==========================================================================

const btnPerfil = document.getElementById('user-profile');
btnPerfil.setAttribute('aria-label', 'Perfil de usuario');

// creo el menu para el usuario
const userMenu = document.createElement('div');
userMenu.className = 'theme-menu user-menu-panel';
userMenu.innerHTML = `
    <div class="user-dropdown-header" id="btn-ver-perfil">
        <span id="dropdown-username" class="dropdown-username">Invitado</span>
        <span class="dropdown-subtext">Ver perfil</span>
    </div>
    
    <div class="dropdown-divider"></div>
    
    <button class="theme-option" id="btn-mis-listas"><i class="fas fa-list"></i><span>${t('user.lists')}</span></button>
    
    <div class="dropdown-divider"></div>
    
    <button class="theme-option" id="btn-editar-perfil"><i class="fas fa-user-edit"></i><span>${t('user.edit_profile')}</span></button>
    <button class="theme-option" id="btn-ajustes"><i class="fas fa-cog"></i><span>${t('user.settings')}</span></button>
    
    <div class="dropdown-divider"></div>
    
    <button class="theme-option" id="btn-logout">
        <i class="fas fa-sign-out-alt" style="color: var(--error);"></i>
        <span style="color: var(--error);">${t('user.logout')}</span>
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

// click en "Mis Listas" abre la nueva vista de listas sociales
document.getElementById('btn-mis-listas')?.addEventListener('click', () => {
    cambiarVista('mis-listas');
    linksMenu.forEach(l => l.classList.remove('active'));
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

    // Limpiar favoritos
    delete window._nexus_user_id;
    localStorage.removeItem('nexus_user_id');

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
//   EDITAR PERFIL - LISTENER DEL MENÚ
// ==========================================================================

// El menú se crea dinámicamente en el bloque de AUTENTICACION Y SESION. Buscamos el botón "Editar perfil" dentro del userMenu que ya existe
const editProfileBtn = userMenu.querySelector('.theme-option .fa-user-edit')?.closest('.theme-option');
if (editProfileBtn) {
    editProfileBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Evita que el click se propague al botón de perfil

        // Guardar la vista actual para volver después
        vistaAnteriorAlEditar = vistaActualGlobal;
        localStorage.setItem('vista_anterior_editar', vistaAnteriorAlEditar);

        // Cambiar a la vista de editar perfil
        cambiarVista('edit-profile');
        userMenu.classList.remove('show');
        userMenuOpen = false;
    });
} else {
    console.warn('⚠️ No se encontró el botón "Editar perfil" en el menú');
}

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
        // GUARDAR ID PARA FAVORITOS
        window._nexus_user_id = session.user.id;
        localStorage.setItem('nexus_user_id', session.user.id);

        // pongo el astronauta temporalmente
        btnPerfil.innerHTML = '<i class="fas fa-user-astronaut" style="color: var(--primary);"></i>';

        // cargo el avatar guardado
        cargarDisenoPerfil(session.user.email);

        // leo el username y la fecha de nacimiento de la sesion
        const usernameDisplay = document.getElementById('dropdown-username');
        const birthdate = session.user.user_metadata?.birthdate;

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

        // Cargar color del usuario
        const { data: perfilColor } = await supabase
            .from('usuarios')
            .select('color_destacado')
            .eq('email', session.user.email)
            .single();

        if (perfilColor?.color_destacado) {
            aplicarColorDinamico(perfilColor.color_destacado);
        }

        // Cargar idioma del usuario desde Supabase
        if (perfilColor?.idioma) {
            const idiomaGuardado = perfilColor.idioma;
            if (['es', 'en', 'fr', 'it', 'de', 'zh', 'ja', 'ko'].includes(idiomaGuardado)) {
                // Solo si no es el mismo que ya tenemos cargado
                if (idiomaGuardado !== localStorage.getItem('dp_sys_lang')) {
                    await setLanguage(idiomaGuardado);
                }
            }
        }
    } else {
        // LIMPIAR ID AL CERRAR SESIÓN
        delete window._nexus_user_id;
        localStorage.removeItem('nexus_user_id');

        btnPerfil.innerHTML = '<i class="fas fa-user-circle"></i>';
        if (btnAdmin) btnAdmin.style.display = 'none';

        // === Si no hay sesión (usuario temporal), ocultar y apagar +18 ===
        let borrado = false;
        document.querySelectorAll('.nsfw-filter-container').forEach(el => {
            el.style.display = 'none';
            const cb = el.querySelector('.adult-checkbox');
            if (cb) {
                cb.checked = false;
                cb.disabled = true;
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
btnScrollTop.setAttribute('aria-label', 'Volver arriba');

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
modalClose.setAttribute('aria-label', 'Cerrar modal');
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
                    <img src="https://raw.githubusercontent.com/DonPlastico/WEB-Multiusos/main/img/Banners/${i}.webp" alt="Banner ${i}" loading="lazy" onerror="this.src='https://placehold.co/600x300/14141c/6366f1?text=BANNER+${i}'">
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
                    <img src="https://raw.githubusercontent.com/DonPlastico/WEB-Multiusos/main/img/Avatars/${avatar}.webp" alt="Avatar ${avatar}" loading="lazy" onerror="this.src='https://placehold.co/300x300/14141c/2dd4bf?text=${avatar}'">
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
    // 1. Cierro el modal al toque
    modalEdit.classList.remove('show');
    document.body.classList.remove('no-scroll');
    document.documentElement.classList.remove('no-scroll');

    // 2. INTERCEPTACIÓN PARA SUBIDA CUSTOM (Avatar O Banner)
    if (idCard === 'custom') {
        // Seleccionamos el input correcto según el tipo
        const inputId = (tipo === 'banner') ? 'banner-upload-input' : 'avatar-upload-input';
        const inputEl = document.getElementById(inputId);

        if (inputEl) {
            inputEl.click(); // Esto abre el explorador de archivos
        } else {
            console.error(`No se encontró el input: ${inputId}`);
        }
        return; // ¡CRÍTICO! Cortamos la función aquí para que no guarde "custom" en Supabase
    }

    // 3. Lógica normal para avatares/banners predefinidos
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

    // PINTAR EL BANNER (CORREGIDO)
    const bannerEl = document.querySelector('.profile-banner');
    if (bannerEl) {
        // Caso 1: Banner por defecto o "custom" (sin imagen)
        if (bannerId === 'default' || bannerId === 'custom') {
            bannerEl.style.backgroundImage = 'none';
            bannerEl.style.backgroundSize = '';
            bannerEl.style.backgroundPosition = '';
        }
        // Caso 2: Banner es una URL de Supabase (empieza con http)
        else if (bannerId.startsWith('http')) {
            bannerEl.style.backgroundImage = `url('${bannerId}')`;
            bannerEl.style.backgroundSize = 'cover';
            bannerEl.style.backgroundPosition = 'center';
        }
        // Caso 3: Banner es un número predefinido (1-5)
        else {
            bannerEl.style.backgroundImage = `url('https://raw.githubusercontent.com/DonPlastico/WEB-Multiusos/main/img/Banners/${bannerId}.webp')`;
            bannerEl.style.backgroundSize = 'cover';
            bannerEl.style.backgroundPosition = 'center';
        }
    }

    // PINTAR EL AVATAR (ya funciona correctamente)
    let avatarHtml = '';
    if (avatarId === 'default' || avatarId === 'custom') {
        avatarHtml = '<i class="fas fa-user-astronaut" style="color: var(--primary);"></i>';
    } else if (avatarId.startsWith('http')) {
        avatarHtml = `<img src="${avatarId}" alt="Avatar" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
    } else {
        avatarHtml = `<img src="https://raw.githubusercontent.com/DonPlastico/WEB-Multiusos/main/img/Avatars/${avatarId}.webp" alt="Avatar" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
    }

    // Cambiar el icono del botón de la navbar
    const navAvatarEl = document.getElementById('user-profile');
    if (navAvatarEl) {
        navAvatarEl.innerHTML = avatarHtml;
    }

    // Cambiar el avatar gigante del perfil
    const perfilAvatarEl = document.querySelector('.profile-avatar');
    if (perfilAvatarEl) {
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
btnCloseAddFriend.setAttribute('aria-label', 'Cerrar búsqueda de amigos');
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
                : `<img src="https://raw.githubusercontent.com/DonPlastico/WEB-Multiusos/main/img/Avatars/${avatarDB}.webp" alt="Resultados" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-user-astronaut\\' style=\\'color: var(--primary);\\'></i>'">`;

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
document.getElementById('adult-filter-movie')?.addEventListener('change', (e) => {
    guardarFiltros();
    cargarTMDB('movie', searchMoviesActual, true);
});

document.getElementById('adult-filter-series')?.addEventListener('change', (e) => {
    guardarFiltros();
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

document.querySelectorAll('#btn-reset-filters[data-target]').forEach(btn => {
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

// Botones de Limpiar de SERIES y PELÍCULAS
document.querySelectorAll('.btn-reset-tmdb').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const target = e.target.getAttribute('data-target');
        if (target === 'movie') {
            const cb = document.getElementById('adult-filter-movie');
            if (cb) cb.checked = false;
            const slider = document.getElementById('votes-slider-movie');
            const display = document.getElementById('votes-display-movie');
            if (slider) slider.value = 0;
            if (display) display.textContent = '0 votos';
            document.querySelectorAll('.lang-item-movie input:checked').forEach(c => c.checked = false);
            countryFilterMovie = [];
            document.querySelectorAll('.genre-item-movie input:checked').forEach(c => c.checked = false);
            genreFilterMovie = [];
            const dateMinMovie = document.getElementById('date-min-movie');
            const dateMaxMovie = document.getElementById('date-max-movie');
            if (dateMinMovie) {
                dateMinMovie._flatpickr?.clear();
                window.dateMinMovie = '';
            }
            if (dateMaxMovie) {
                dateMaxMovie._flatpickr?.clear();
                window.dateMaxMovie = '';
            }
            guardarFiltros();
            cargarTMDB('movie', searchMoviesActual, true);
        } else if (target === 'tv') {
            const cb = document.getElementById('adult-filter-series');
            if (cb) cb.checked = false;
            const slider = document.getElementById('votes-slider-tv');
            const display = document.getElementById('votes-display-tv');
            if (slider) slider.value = 0;
            if (display) display.textContent = '0 votos';
            document.querySelectorAll('.lang-item-tv input:checked').forEach(c => c.checked = false);
            countryFilterSeries = [];
            document.querySelectorAll('.genre-item-tv input:checked').forEach(c => c.checked = false);
            genreFilterSeries = [];
            const dateMinTv = document.getElementById('date-min-tv');
            const dateMaxTv = document.getElementById('date-max-tv');
            if (dateMinTv) {
                dateMinTv._flatpickr?.clear();
                window.dateMinSeries = '';
            }
            if (dateMaxTv) {
                dateMaxTv._flatpickr?.clear();
                window.dateMaxSeries = '';
            }
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

// Para Juegos
document.getElementById('btn-mobile-filters')?.setAttribute('aria-label', 'Abrir filtros de juegos');
document.getElementById('btn-close-filters-drawer')?.setAttribute('aria-label', 'Cerrar filtros de juegos');

// Para Películas
document.getElementById('btn-filters-movies-mobile')?.setAttribute('aria-label', 'Abrir filtros de películas');
document.getElementById('btn-close-movies-mobile')?.setAttribute('aria-label', 'Cerrar filtros de películas');

// Para Series
document.getElementById('btn-filters-series-mobile')?.setAttribute('aria-label', 'Abrir filtros de series');
document.getElementById('btn-close-series-mobile')?.setAttribute('aria-label', 'Cerrar filtros de series');

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
btnCerrarModalJuego.setAttribute('aria-label', 'Cerrar detalles del juego');

// Escuchamos los clics en toda la grilla de juegos
document.getElementById('games-grid')?.addEventListener('click', (e) => {
    const card = e.target.closest('.game-card');
    if (!card) return;

    // 1. Extraemos info de la tarjeta
    const titulo = card.getAttribute('data-game-title');
    const juegoData = {
        idJuego: card.getAttribute('data-game-id'),
        titulo: titulo,
        urlAmigable: titulo.replace(/[^a-zA-Z0-9 \-]/g, '').trim().replace(/\s+/g, '_'),
        storesRaw: card.getAttribute('data-stores'),
        storeUrlRaw: card.getAttribute('data-store-url'),
        portadaSrc: card.querySelector('img.game-cover')?.src || '',
        htmlPlataformas: card.querySelector('.platforms-container')?.innerHTML || '',
        fecha: card.querySelector('.date')?.textContent || 'TBA',
        priceText: card.querySelector('.price-badge strong')?.textContent || null,
        priceNaText: card.querySelector('.price-na')?.textContent || null
    };

    procesarAperturaModalJuego(juegoData, true);
});

// Función centralizada para abrir (usada por click y por F5)
window.procesarAperturaModalJuego = function (data, updateHistory = true) {
    if (updateHistory) {
        history.pushState({ modal: 'detalles_juego' }, '', `/juegos/${data.urlAmigable}`);
    }
    // Guardamos recuerdo para el F5
    localStorage.setItem('modalJuegoAbierto', JSON.stringify(data));

    document.getElementById('detail-title').textContent = data.titulo;
    document.getElementById('detail-platforms').innerHTML = data.htmlPlataformas;

    if (data.portadaSrc) {
        document.getElementById('detail-cover-img').src = data.portadaSrc;
        document.getElementById('detail-cover-img').style.display = 'block';
        document.getElementById('detail-hero-bg').style.backgroundImage = `url('${data.portadaSrc}')`;
    } else {
        document.getElementById('detail-cover-img').style.display = 'none';
        document.getElementById('detail-hero-bg').style.backgroundImage = 'none';
    }

    document.getElementById('detail-date').textContent = data.fecha;

    const detailPriceEl = document.getElementById('detail-price');
    if (detailPriceEl) {
        detailPriceEl.style.display = 'flex';
        detailPriceEl.style.flexDirection = 'column';
        detailPriceEl.style.gap = '10px';

        let htmlPrecioOficial = '';
        if (data.priceText) {
            if (data.storesRaw && data.storesRaw !== 'none') {
                const storeMap = { 'steam': 'Steam', 'epic': 'Epic Games', 'gog': 'GOG', 'blizzard': 'Battle.net', 'ubisoft': 'Ubisoft Connect', 'ea': 'EA App' };
                let primeraTienda = data.storesRaw.split(',')[0].trim().toLowerCase();
                let tiendaBonita = storeMap[primeraTienda] || (primeraTienda.charAt(0).toUpperCase() + primeraTienda.slice(1));

                if (data.storeUrlRaw && data.storeUrlRaw !== 'undefined' && data.storeUrlRaw !== '') {
                    htmlPrecioOficial = `<a href="${data.storeUrlRaw}" target="_blank" rel="noopener noreferrer" style="display:inline-block; color: var(--success); text-decoration: none; font-weight: bold; font-size: 1.1rem; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'"><i class="fas fa-check-circle"></i> Oficial: ${data.priceText} <span style="color: var(--text-muted); font-size: 0.9rem; font-weight: normal;">en ${tiendaBonita}</span></a>`;
                } else {
                    htmlPrecioOficial = `<span style="color: var(--success); font-weight: bold; font-size: 1.1rem;"><i class="fas fa-check-circle"></i> Oficial: ${data.priceText}</span> <span style="color: var(--text-muted); font-size: 0.9rem;">en ${tiendaBonita}</span>`;
                }
            } else {
                htmlPrecioOficial = `<span style="color: var(--success); font-weight: bold;"><i class="fas fa-check-circle"></i> ${data.priceText}</span>`;
            }
        } else if (data.priceNaText) {
            htmlPrecioOficial = `<span style="color: var(--text-muted); font-size: 0.85rem;">${data.priceNaText}</span>`;
        } else {
            htmlPrecioOficial = '<span style="color: var(--text-muted);">--</span>';
        }

        const tituloLimpio = data.titulo.replace(/[^a-zA-Z0-9 ]/g, "").trim().replace(/\s+/g, '+');
        detailPriceEl.innerHTML = `
            <div style="margin-bottom: 6px;">${htmlPrecioOficial}</div>
            <div style="display: flex; flex-direction: row; gap: 8px; flex-wrap: wrap; align-items: center;">
                <a href="https://www.allkeyshop.com/blog/catalogue/search-${tituloLimpio}/" target="_blank" rel="noopener noreferrer" style="background: rgba(255, 153, 0, 0.1); border: 1px solid rgba(255, 153, 0, 0.3); color: #ff9900; padding: 4px 12px; border-radius: 6px; text-decoration: none; font-size: 0.8rem; font-weight: bold; display: flex; align-items: center; gap: 5px; transition: 0.2s; white-space: nowrap;" onmouseover="this.style.background='rgba(255, 153, 0, 0.2)'" onmouseout="this.style.background='rgba(255, 153, 0, 0.1)'"><i class="fas fa-fire"></i> AllKeyShop</a>
                <a href="https://www.cdkeys.com/es_es/catalogsearch/result/?q=${tituloLimpio}" target="_blank" rel="noopener noreferrer" style="background: rgba(0, 153, 255, 0.1); border: 1px solid rgba(0, 153, 255, 0.3); color: #0099ff; padding: 4px 12px; border-radius: 6px; text-decoration: none; font-size: 0.8rem; font-weight: bold; display: flex; align-items: center; gap: 5px; transition: 0.2s; white-space: nowrap;" onmouseover="this.style.background='rgba(0, 153, 255, 0.2)'" onmouseout="this.style.background='rgba(0, 153, 255, 0.1)'"><i class="fas fa-key"></i> CDKeys</a>
            </div>
        `;
    }

    document.getElementById('detail-description').innerHTML = '<i class="fas fa-circle-notch fa-spin" style="color:var(--primary);"></i> Estableciendo conexión cifrada...';
    document.getElementById('detail-dev').textContent = 'Escaneando...';
    document.getElementById('detail-pub').textContent = 'Escaneando...';
    document.getElementById('detail-genres').textContent = 'Escaneando...';
    document.getElementById('detail-modes').textContent = 'Escaneando...';

    modalJuego.classList.add('show');
    document.body.classList.add('no-scroll');
    document.documentElement.classList.add('no-scroll');

    llamarDetallesJuego(data.idJuego, data.titulo);
};

// Función para cerrar (Elimina el recuerdo y restaura la URL)
function cerrarModalJuego() {
    if (!modalJuego.classList.contains('show')) return;
    modalJuego.classList.remove('show');
    document.body.classList.remove('no-scroll');
    document.documentElement.classList.remove('no-scroll');

    localStorage.removeItem('modalJuegoAbierto');
    history.pushState({ vista: 'games' }, '', '/juegos');
}

btnCerrarModalJuego?.addEventListener('click', cerrarModalJuego);
modalJuego?.addEventListener('click', (e) => { if (e.target === modalJuego) cerrarModalJuego(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarModalJuego(); });

async function llamarDetallesJuego(idJuego, titulo) {
    try {
        const respuesta = await fetch(`/api/igdb?query=${encodeURIComponent(titulo)}&lang=${currentLang}`);
        const datos = await respuesta.json();
        const juego = datos.find(j => j.id.toString() === idJuego.toString());

        if (!juego) {
            document.getElementById('detail-description').textContent = t('details_extra.no_details');
            return;
        }

        // Rellenar Descripción con un control de calidad
        const descElement = document.getElementById('detail-description');
        if (juego.summary) {
            descElement.textContent = juego.summary;
        } else {
            descElement.textContent = t('details_extra.no_description');
            descElement.style.fontStyle = "italic";
        }

        // Rellenar Desarrollador y Editor con seguridad
        const empresas = juego.involved_companies || [];
        const dev = empresas.find(e => e.developer)?.company.name || t('details_extra.unknown');
        const pub = empresas.find(e => e.publisher)?.company.name || t('details_extra.unknown');

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
            containerLinks.innerHTML = `<a href="${web.url}" target="_blank" style="color:var(--secondary); text-decoration:none;">${t('details_extra.official_site')}</a>`;
        } else {
            containerLinks.textContent = 'N/A';
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

// ==========================================================================
//   MODAL DE DETALLES PELÍCULAS/SERIES
// ==========================================================================
const modalMedia = document.getElementById('media-details-modal');
const btnCerrarMedia = document.getElementById('close-media-modal');
btnCerrarMedia.setAttribute('aria-label', 'Cerrar detalles');

// Escuchador genérico para ambas grillas
document.querySelectorAll('#movies-grid, #series-grid').forEach(grid => {
    grid.addEventListener('click', (e) => {
        const card = e.target.closest('.game-card');
        if (!card) return;

        // Extraer info de la tarjeta (asegúrate de que tus tarjetas TMDB tengan estos data attributes)
        const id = card.getAttribute('data-id');
        const tipo = card.getAttribute('data-type'); // 'movie' o 'tv'

        abrirModalMedia(id, tipo);
    });
});

async function abrirModalMedia(id, tipo, updateHistory = true) {
    if (!id) return;

    // Guardar el tipo en el modal para futuras referencias
    modalMedia.setAttribute('data-current-type', tipo);

    // 1. Resetear y preparar UI
    document.getElementById('media-detail-title').textContent = t('details_extra.connecting');
    document.getElementById('media-detail-description').textContent = t('details_extra.downloading');
    document.getElementById('media-detail-duration').textContent = "--";
    document.getElementById('media-detail-genres').textContent = "--";
    document.getElementById('media-detail-watch-date').textContent = "--";
    document.getElementById('media-detail-watch-status').textContent = t('details.not_watched');

    // Resetear nuevos campos
    document.getElementById('media-detail-original-title').textContent = "--";
    document.getElementById('media-detail-release-date').textContent = "--";
    document.getElementById('media-detail-status').textContent = "--";
    document.getElementById('media-detail-budget').textContent = "--";
    document.getElementById('media-detail-seasons-count').textContent = "--";
    document.getElementById('media-detail-episodes-count').textContent = "--";
    document.getElementById('media-detail-remaining-time').textContent = "--";

    const seasonsContainer = document.getElementById('media-detail-seasons');
    if (seasonsContainer) {
        seasonsContainer.innerHTML = '';
        seasonsContainer.style.display = 'none';
    }

    document.getElementById('providers-flatrate').innerHTML = '';
    document.getElementById('providers-rent').innerHTML = '';
    document.getElementById('providers-buy').innerHTML = '';
    document.getElementById('media-detail-trailer-img').src = '';
    document.getElementById('media-detail-rating-value').textContent = "0.0";
    document.getElementById('media-detail-rating-stars').innerHTML = '';
    document.getElementById('media-detail-rating-count').textContent = "-- valoraciones";

    // Reseteamos el panel de actores con un loader
    document.getElementById('media-detail-cast').innerHTML = '<div style="color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 20px; width: 100%;"><i class="fas fa-circle-notch fa-spin"></i> Cargando actores...</div>';

    // 2. Abrir Modal
    modalMedia.classList.add('show');
    document.body.classList.add('no-scroll');
    document.documentElement.classList.add('no-scroll');

    // ==========================================
    // APLICAR OCULTAMIENTOS SEGÚN EL TIPO
    // ==========================================
    if (tipo === 'tv') {
        // SERIES: Ocultamos lo que no toca
        const ratingCol = document.querySelector('.media-rating-col');
        if (ratingCol) ratingCol.style.display = 'none';

        // RETRANSMISIÓN: Ocupa el 100% del espacio (el div entero)
        const providerCols = document.querySelectorAll('.provider-col');
        const providersGrid = document.querySelector('.providers-3col-grid');
        if (providersGrid) {
            providersGrid.style.gridTemplateColumns = '1fr';
        }
        providerCols.forEach((col, index) => {
            col.style.display = ''; // Lo mostramos todos
            col.style.flex = '';
            col.style.maxWidth = '';
            if (index === 0) {
                // Retransmisión: ocupa todo
                col.style.gridColumn = '1 / -1';
            } else {
                // Alquiler y Compra: ocultos
                col.style.display = 'none';
            }
        });

        // Detalles Técnicos: ocultar ciertas filas para series
        // Ocultar presupuesto en series (no aplica)
        document.getElementById('row-budget').style.display = 'none';
        // Ocultar divider-1
        document.getElementById('divider-tech-1').style.display = 'none';

        // Mostrar temporadas y episodios
        document.getElementById('row-seasons').style.display = 'flex';
        document.getElementById('row-episodes').style.display = 'flex';

        // Ocultar watch-date y watch-status en series (se muestran en otro lado)
        document.getElementById('row-watch-date').style.display = 'none';
        document.getElementById('row-watch-status').style.display = 'none';

        // Mostrar tiempo restante
        document.getElementById('row-remaining-time').style.display = 'flex';

    } else {
        // PELÍCULAS: Mostrar todo (estado por defecto)
        const ratingCol = document.querySelector('.media-rating-col');
        if (ratingCol) ratingCol.style.display = 'flex';

        const providerCols = document.querySelectorAll('.provider-col');
        const providersGrid = document.querySelector('.providers-3col-grid');
        if (providersGrid) {
            providersGrid.style.gridTemplateColumns = '1fr 1fr 1fr';
        }
        providerCols.forEach((col) => {
            col.style.display = '';
            col.style.flex = '';
            col.style.maxWidth = '';
            col.style.gridColumn = '';
        });

        // Mostrar presupuesto para películas
        document.getElementById('row-budget').style.display = 'flex';
        document.getElementById('divider-tech-1').style.display = 'flex';

        // Ocultar temporadas y episodios en películas
        document.getElementById('row-seasons').style.display = 'none';
        document.getElementById('row-episodes').style.display = 'none';

        // Mostrar watch-date y watch-status en películas
        document.getElementById('row-watch-date').style.display = 'flex';
        document.getElementById('row-watch-status').style.display = 'flex';

        // Ocultar tiempo restante en películas
        document.getElementById('row-remaining-time').style.display = 'none';

        // Restaurar media-bottom-grid a 3 columnas
        const bottomGridContainer = document.querySelector('.media-bottom-grid');
        if (bottomGridContainer) {
            bottomGridContainer.style.gridTemplateColumns = '1fr 1fr 1fr';
        }
    }

    // 3. Llamada al servidor
    try {
        const respuesta = await fetch(`/api/tmdb?id=${id}&tipo=${tipo}&lang=${currentLang}`);
        const data = await respuesta.json();

        // ====================================================
        // MAGIA DE URL Y PERSISTENCIA (Para F5)
        // ====================================================
        const urlAmigable = data.titulo.replace(/[^a-zA-Z0-9 \-]/g, '').trim().replace(/\s+/g, '_');
        const rutaBase = tipo === 'movie' ? '/peliculas' : '/series';

        if (updateHistory) {
            history.pushState({ modal: `detalles_${tipo}` }, '', `${rutaBase}/${urlAmigable}`);
        }
        localStorage.setItem('modalMediaAbierto', JSON.stringify({ id, tipo, urlAmigable }));

        // ==========================================
        // RELLENAR DATOS PRINCIPALES
        // ==========================================
        document.getElementById('media-detail-title').textContent = data.titulo;
        document.getElementById('media-detail-cover-img').src = data.poster;
        document.getElementById('media-detail-hero-bg').style.backgroundImage = `url('${data.backdrop}')`;

        // ==========================================
        // CONSTRUIR SINOPSIS COMPLETA (TAGLINE + OVERVIEW)
        // ==========================================
        let sinopsisCompleta = '';

        // 1. Si hay tagline (frase promocional), la añadimos primero
        if (data.tagline && data.tagline.trim() !== '') {
            sinopsisCompleta += `"${data.tagline}"\n\n`;
        }

        // 2. Añadimos la descripción principal
        if (data.sinopsis && data.sinopsis.trim() !== '') {
            sinopsisCompleta += data.sinopsis;
        }

        // 3. Si la sinopsis sigue siendo muy corta (< 100 caracteres), intentamos buscar más
        if (sinopsisCompleta.length < 100) {
            // Intentamos obtener datos alternativos (si el backend los devuelve)
            if (data.sinopsis_alternativa && data.sinopsis_alternativa.trim() !== '') {
                sinopsisCompleta += '\n\n' + data.sinopsis_alternativa;
            }
        }

        // 4. Si sigue vacía, mensaje por defecto
        if (sinopsisCompleta.trim() === '') {
            sinopsisCompleta = 'No hay sinopsis disponible para este título en el Nexus.';
        }

        document.getElementById('media-detail-description').textContent = sinopsisCompleta;

        // ==========================================
        // CARGA DE DATOS TÉCNICOS (NUEVO FORMATO)
        // ==========================================
        // Título original
        document.getElementById('media-detail-original-title').textContent = data.original_title || data.titulo;

        // Fecha de lanzamiento
        document.getElementById('media-detail-release-date').textContent = data.fecha || t('common.not_available');

        // Estado (Mapeo de estados de TMDB)
        const estadoMap = {
            'Returning Series': t('details_extra.returning'),
            'Ended': t('details_extra.ended'),
            'Released': t('details_extra.released'),
            'Planned': t('details_extra.planned'),
            'In Production': t('details_extra.in_production'),
            'Post Production': t('details_extra.post_production')
        };
        document.getElementById('media-detail-status').textContent = estadoMap[data.status] || data.status || 'Desconocido';

        // Presupuesto (SOLO PARA PELÍCULAS)
        const budgetEl = document.getElementById('media-detail-budget');
        if (data.budget && data.budget > 0) {
            budgetEl.textContent = `$${data.budget.toLocaleString()}`;
            document.getElementById('row-budget').style.display = 'flex';
        } else {
            document.getElementById('row-budget').style.display = 'none';
        }

        // Géneros
        document.getElementById('media-detail-genres').textContent = data.generos || 'N/A';

        // ==========================================
        // BLOQUE 2: SERIES VS PELÍCULAS (DURACIÓN Y TEMPORADAS)
        // ==========================================
        if (tipo === 'tv') {
            // Mostrar temporadas y episodios
            document.getElementById('media-detail-seasons-count').textContent = `${data.temporadas || '--'} ${t('details.seasons')}`;
            document.getElementById('media-detail-episodes-count').textContent = `${data.episodios || '--'} ${t('details.episodes')}`;

            // Cálculo total tiempo serie: Episodios * Duración media (45min por defecto)
            const totalMins = (data.episodios || 0) * (data.duracion || 45);
            document.getElementById('media-detail-duration').textContent = `${t('details_extra.total')}: ${formatearTiempo(totalMins)}`;

            // ==========================================
            // TIEMPO RESTANTE (PARA SERIES)
            // ==========================================
            // Calculamos cuántos episodios ha visto el usuario de esta serie
            if (window.episodiosVistosActuales) {
                const totalEpisodios = data.episodios || 0;
                const vistos = window.episodiosVistosActuales.size || 0;
                const restantes = Math.max(0, totalEpisodios - vistos);

                // Tiempo restante en minutos (45min por episodio)
                const tiempoRestanteMin = restantes * (data.duracion || 45);
                document.getElementById('media-detail-remaining-time').textContent = formatearTiempo(tiempoRestanteMin);

                // Si no hay tiempo restante, mostrar "¡Completada!"
                if (restantes === 0 && totalEpisodios > 0) {
                    document.getElementById('media-detail-remaining-time').textContent = `✅ ${t('details_extra.completed')}`;
                }
            } else {
                document.getElementById('media-detail-remaining-time').textContent = '--';
            }

        } else {
            // PELÍCULAS
            document.getElementById('media-detail-duration').textContent = `${data.duracion || '--'} min`;
        }

        // 7. FUNCIÓN DINÁMICA PARA INYECTAR LAS PLATAFORMAS EN LAS 3 COLUMNAS
        function inyectarPlataformas(lista, contenedorId) {
            const contenedor = document.getElementById(contenedorId);
            contenedor.innerHTML = '';

            if (lista && lista.length > 0) {
                // Filtramos duplicados basándonos en el nombre de la plataforma
                const unicos = Array.from(new Map(lista.map(item => [item.name, item])).values());

                unicos.forEach(plat => {
                    // LIMPIEZA INTELIGENTE DE NOMBRES DE JUSTWATCH
                    let nombreCorto = plat.name
                        .replace(' Amazon Channel', '') // Quita la coletilla de los canales de Amazon
                        .replace(' (with Ads)', '')     // Quita lo de "con anuncios"
                        .replace(' Plus', '+')
                        .replace(' Video', '');

                    // Ajustes manuales comunes para que queden perfectos debajo del icono
                    if (nombreCorto === 'Amazon Prime') nombreCorto = 'Amazon';
                    if (nombreCorto === 'Apple TV+') nombreCorto = 'Apple TV';
                    if (nombreCorto === 'Google Play Movies') nombreCorto = 'Google';
                    if (nombreCorto === 'Microsoft Store') nombreCorto = 'Microsoft';
                    if (nombreCorto.includes('Movistar')) nombreCorto = 'Movistar';
                    if (nombreCorto === 'HBO Max') nombreCorto = 'Max'; // Actualización de marca

                    // Si aún así el nombre es larguísimo, lo cortamos por el primer espacio
                    if (nombreCorto.length > 10) {
                        nombreCorto = nombreCorto.split(' ')[0];
                        if (nombreCorto.length > 10) {
                            nombreCorto = nombreCorto.substring(0, 8) + '..';
                        }
                    }

                    contenedor.innerHTML += `
                        <div class="provider-item" title="${plat.name}" onclick="event.preventDefault()">
                            <img src="${plat.logo}" alt="${plat.name}" class="provider-logo" loading="lazy">
                            <span class="provider-price">${nombreCorto}</span>
                        </div>
                    `;
                });
            } else {
                contenedor.innerHTML = `<span class="no-providers">${t('common.not_available')}</span>`;
            }
        }

        inyectarPlataformas(data.suscripcion, 'providers-flatrate');
        inyectarPlataformas(data.alquiler, 'providers-rent');
        inyectarPlataformas(data.compra, 'providers-buy');

        // 8. Tráiler
        let urlTrailer = '';
        if (data.trailer_id) {
            urlTrailer = `https://www.youtube.com/watch?v=${data.trailer_id}`;
            document.getElementById('media-detail-trailer-duration').textContent = t('details_extra.official');
            document.getElementById('media-detail-trailer-img').src = `https://img.youtube.com/vi/${data.trailer_id}/mqdefault.jpg`;
        } else {
            const tituloLimpio = data.titulo.replace(/[^a-zA-Z0-9 ]/g, "").trim().replace(/\s+/g, '+');
            urlTrailer = `https://www.youtube.com/results?search_query=Trailer+${tituloLimpio}+español`;
            document.getElementById('media-detail-trailer-duration').textContent = t('details_extra.search');
            document.getElementById('media-detail-trailer-img').src = data.backdrop || data.poster;
        }
        document.getElementById('media-detail-trailer-btn').onclick = () => window.open(urlTrailer, '_blank');

        // 9. Valoración
        const notaNum = parseFloat(data.nota || 0);
        document.getElementById('media-detail-rating-value').textContent = notaNum.toFixed(1);

        const votosFormateados = data.votos ? data.votos.toLocaleString('es-ES') : '--';
        document.getElementById('media-detail-rating-count').textContent = `${votosFormateados} ${t('details_extra.ratings')}`;

        const notaSobre5 = notaNum / 2;
        let estrellasHtml = '';
        for (let i = 1; i <= 5; i++) {
            if (notaSobre5 >= i) {
                estrellasHtml += '<i class="fas fa-star"></i>';
            } else if (notaSobre5 >= i - 0.5) {
                estrellasHtml += '<i class="fas fa-star-half-alt"></i>';
            } else {
                estrellasHtml += '<i class="far fa-star"></i>';
            }
        }
        document.getElementById('media-detail-rating-stars').innerHTML = estrellasHtml;

        // 10. REPARTO (CARRUSEL DE ACTORES)
        const castContainer = document.getElementById('media-detail-cast');
        if (data.reparto && data.reparto.length > 0) {
            let castHtml = '';
            data.reparto.forEach(actor => {
                const fotoSrc = actor.foto ? actor.foto : 'https://placehold.co/105x158/1a1a24/6b6b7a?text=NO+FOTO';
                castHtml += `
                    <div class="cast-card">
                        <img src="${fotoSrc}" alt="${actor.nombre}" class="cast-img" loading="lazy">
                        <div class="cast-info">
                            <span class="cast-name" title="${actor.nombre}">${actor.nombre}</span>
                            <span class="cast-character" title="${actor.personaje}">${actor.personaje}</span>
                        </div>
                    </div>
                `;
            });
            castContainer.innerHTML = castHtml;
        } else {
            castContainer.innerHTML = `<div style="color: var(--text-muted); padding: 20px; font-size: 0.85rem; width: 100%; text-align: center;">${t('details_extra.no_cast')}</div>`;
        }

        // 10.5 TEMPORADAS Y EPISODIOS (SOLO PARA SERIES)
        if (seasonsContainer) {
            if (tipo === 'tv' && data.temporadas_info && data.temporadas_info.length > 0) {
                seasonsContainer.style.display = 'block';
                let seasonsHtml = '<div class="seasons-accordion">';

                data.temporadas_info.forEach(temp => {
                    const isEspecial = temp.season_number === 0;
                    const title = isEspecial ? 'Especiales' : `Temporada ${temp.season_number}`;

                    seasonsHtml += `
                        <div class="season-item">
                            <div class="season-header" data-season="${temp.season_number}">
                                <div class="season-header-info">
                                    <h4 class="season-title">${title}</h4>
                                    <span class="episode-count">${temp.episode_count} episodios</span>
                                </div>
                                <div class="season-actions" style="display: flex; align-items: center; gap: 15px;">
                                    <button class="btn-watch-season" data-season="${temp.season_number}" data-episodes="${temp.episode_count}" style="background: transparent; border: 2px solid var(--text-muted); border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; color: var(--text-muted); font-size: 0.95rem; cursor: pointer; transition: 0.2s;" title="Marcar temporada completa">
                                        <i class="fas fa-eye-slash"></i>
                                    </button>
                                    <i class="fas fa-chevron-down chevron-icon"></i>
                                </div>
                            </div>
                            <div class="season-content" id="season-content-${temp.season_number}"></div>
                        </div>
                    `;
                });
                seasonsHtml += '</div>';
                seasonsContainer.innerHTML = `<h3 class="detail-section-title">${t('details_extra.all_episodes')}</h3>` + seasonsHtml;

                // Lógica del clic para abrir/cerrar y cargar episodios (Lazy Load)
                const headers = seasonsContainer.querySelectorAll('.season-header');
                headers.forEach(header => {
                    header.addEventListener('click', async function () {
                        const seasonItem = this.parentElement;
                        const seasonNumber = this.getAttribute('data-season');
                        const contentDiv = document.getElementById(`season-content-${seasonNumber}`);
                        const isActive = seasonItem.classList.contains('active');

                        document.querySelectorAll('.season-item').forEach(item => {
                            item.classList.remove('active');
                            const content = item.querySelector('.season-content');
                            content.style.maxHeight = null;
                        });

                        if (!isActive) {
                            seasonItem.classList.add('active');

                            if (!contentDiv.hasAttribute('data-loaded')) {
                                contentDiv.style.maxHeight = "100px";

                                try {
                                    const res = await fetch(`/api/tmdb?id=${id}&tipo=tv_season&season=${seasonNumber}`);
                                    const seasonData = await res.json();

                                    let episodesHtml = '<div class="episodes-list">';
                                    seasonData.episodes.forEach(ep => {
                                        const epImg = ep.still_path ? `https://image.tmdb.org/t/p/w300${ep.still_path}` : 'https://placehold.co/300x170/1a1a24/6b6b7a?text=NO+FOTO';
                                        const fecha = ep.air_date ? new Date(ep.air_date).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' }) : 'TBA';
                                        const nota = ep.vote_average ? ep.vote_average.toFixed(1) : '0.0';

                                        const isWatched = window.episodiosVistosActuales.has(`${seasonNumber}_${ep.episode_number}`);
                                        const colorBtn = isWatched ? 'var(--primary)' : 'var(--text-muted)';
                                        const iconClass = isWatched ? 'fas fa-eye' : 'fas fa-eye-slash';

                                        episodesHtml += `
                                            <div class="episode-card glass-panel" style="position: relative; padding-right: 50px;">
                                                <div class="ep-img-container">
                                                    <img src="${epImg}" alt="Ep ${ep.episode_number}" loading="lazy">
                                                    <span class="ep-number">E${ep.episode_number}</span>
                                                </div>
                                                <div class="ep-info">
                                                    <h5 class="ep-title">${ep.name}</h5>
                                                    <div class="ep-meta">
                                                        <span><i class="fas fa-calendar-alt"></i> ${fecha}</span>
                                                        <span><i class="fas fa-star" style="color: gold;"></i> ${nota}</span>
                                                    </div>
                                                    <p class="ep-overview">${ep.overview || t('details_extra.no_episode_description')}</p>
                                                </div>
                                                
                                                <button class="btn-watch-episode" data-season="${seasonNumber}" data-episode="${ep.episode_number}" style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); background: transparent; border: 2px solid ${colorBtn}; border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; color: ${colorBtn}; font-size: 0.95rem; cursor: pointer; transition: 0.2s;" onmouseover="this.style.transform='translateY(-50%) scale(1.1)'" onmouseout="this.style.transform='translateY(-50%) scale(1)'">
                                                    <i class="${iconClass}"></i>
                                                </button>
                                            </div>
                                        `;
                                    });
                                    episodesHtml += '</div>';
                                    contentDiv.innerHTML = episodesHtml;
                                    contentDiv.setAttribute('data-loaded', 'true');

                                    contentDiv.style.maxHeight = contentDiv.scrollHeight + "px";
                                } catch (e) {
                                    console.error(e);
                                    contentDiv.innerHTML = '<div style="color: var(--error); padding: 15px; text-align: center;">Error de conexión con el servidor.</div>';
                                }
                            } else {
                                contentDiv.style.maxHeight = contentDiv.scrollHeight + "px";
                            }

                            setTimeout(() => {
                                if (seasonItem.classList.contains('active')) {
                                    contentDiv.style.maxHeight = "none";
                                }
                            }, 300);
                        }
                    });
                });

            } else {
                seasonsContainer.style.display = 'none';
                seasonsContainer.innerHTML = '';
            }
        }

        // PREPARAR DATOS DE LA SERIE EN MEMORIA
        window.serieInfoActual = { id: id, temporadas: data.temporadas_info || [] };
        window.episodiosVistosActuales = new Set();

        // Sincronizar con la watchlist global si ya hay datos cargados
        if (window.sincronizarWatchlistGlobal) {
            window.sincronizarWatchlistGlobal();
        }

        // Actualizar barra de progreso
        actualizarBarraProgresoSeries();

        // 11. OBTENER ESTADO PERSONAL DEL USUARIO (Mi Nota y Visto)
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
            if (tipo === 'tv') {
                const { data: epVistos } = await supabase
                    .from('user_media')
                    .select('media_id')
                    .eq('user_id', session.user.id)
                    .eq('tipo', 'tv_episode')
                    .like('media_id', `${id}_T%`);

                if (epVistos) {
                    epVistos.forEach(row => {
                        const partes = row.media_id.split('_');
                        if (partes.length >= 3) {
                            const t = partes[1].replace('T', '');
                            const e = partes[2].replace('E', '');
                            window.episodiosVistosActuales.add(`${t}_${e}`);
                        }
                    });

                    setTimeout(() => {
                        if (window.refrescarUIEpisodiosYTemporadas) {
                            window.refrescarUIEpisodiosYTemporadas();
                        }
                        // Actualizar tiempo restante después de cargar episodios vistos
                        if (tipo === 'tv' && data) {
                            const totalEpisodios = data.episodios || 0;
                            const vistos = window.episodiosVistosActuales.size || 0;
                            const restantes = Math.max(0, totalEpisodios - vistos);
                            const tiempoRestanteMin = restantes * (data.duracion || 45);
                            const remainingEl = document.getElementById('media-detail-remaining-time');
                            if (remainingEl) {
                                if (restantes === 0 && totalEpisodios > 0) {
                                    remainingEl.textContent = '✅ ¡Completada!';
                                } else {
                                    remainingEl.textContent = formatearTiempo(tiempoRestanteMin);
                                }
                            }
                        }
                    }, 300);

                    setTimeout(() => {
                        actualizarBarraProgresoSeries();
                    }, 100);
                }
            }

            const { data: userMedia } = await supabase
                .from('user_media')
                .select('*')
                .eq('user_id', session.user.id)
                .eq('media_id', id.toString())
                .eq('tipo', tipo)
                .maybeSingle();

            actualizarUIMediaPersonal(userMedia);
        } else {
            actualizarUIMediaPersonal(null);
        }

    } catch (err) {
        console.error(err);
        document.getElementById('media-detail-description').textContent = t('details_extra.error_loading');
        castContainer.innerHTML = `<div style="color: var(--error); padding: 20px; font-size: 0.85rem; text-align: center;">${t('details_extra.error_cast')}</div>`;
    }
}

// Cierre del modal y limpieza
function cerrarModalMedia() {
    const container = document.getElementById('series-progress-container');
    if (container) container.style.display = 'none';

    if (!modalMedia.classList.contains('show')) return;
    modalMedia.classList.remove('show');
    document.body.classList.remove('no-scroll');
    document.documentElement.classList.remove('no-scroll');

    mostrarBotonFavorito(false);

    // ACTUALIZACIÓN VISUAL INMEDIATA EN LA TARJETA
    try {
        const memoInfoStr = localStorage.getItem('modalMediaAbierto');
        if (memoInfoStr && window.estadoMediaActual) {
            const memoInfo = JSON.parse(memoInfoStr);
            const card = document.querySelector(`.game-card[data-id="${memoInfo.id}"][data-type="${memoInfo.tipo}"]`);

            if (card) {
                // Buscamos el botón de la esquina inferior derecha, sea cual sea su estado
                let badgeBtn = card.querySelector('.btn-card-watched-status, .btn-watch-indicator');

                if (badgeBtn) {
                    if (window.estadoMediaActual.visto) {
                        const veces = window.estadoMediaActual.veces_vista || 1;
                        const badgeExtra = veces > 1 ? `<span style="position: absolute; top: -6px; right: -6px; background: var(--primary); font-size: 0.6rem; padding: 2px 5px; border-radius: 10px; font-weight: bold; border: 1px solid var(--bg-card); color: white;">${veces > 20 ? '+20' : 'x' + veces}</span>` : '';

                        // Lo convertimos en botón VERDE de visto
                        badgeBtn.className = 'btn-card-watched-status watched';
                        badgeBtn.setAttribute('data-veces', veces);
                        badgeBtn.setAttribute('data-db-id', window.estadoMediaActual.id || '');
                        badgeBtn.title = 'Vista. Clic para opciones';
                        badgeBtn.style.cssText = "position: relative; flex: 1; background: var(--primary-soft); border: 1px solid var(--primary); color: var(--primary); height: 38px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s;";
                        badgeBtn.setAttribute('onclick', 'abrirMenuTarjeta(event, this)');
                        badgeBtn.onmouseover = function () { this.style.background = 'var(--primary)'; this.style.color = 'white'; };
                        badgeBtn.onmouseout = function () { this.style.background = 'var(--primary-soft)'; this.style.color = 'var(--primary)'; };

                        badgeBtn.innerHTML = `<i class="fas fa-eye" style="font-size: 0.9rem;"></i>${badgeExtra}`;
                    } else {
                        // Lo convertimos en botón GRIS de no visto y le devolvemos la función rápida
                        badgeBtn.className = 'btn-watch-indicator not-watched';
                        badgeBtn.setAttribute('data-veces', '0');
                        badgeBtn.setAttribute('data-db-id', '');
                        badgeBtn.title = 'Marcar como vista';
                        badgeBtn.style.cssText = "position: relative; flex: 1; background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-muted); height: 38px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s;";
                        badgeBtn.setAttribute('onclick', `marcarVistaRapida(event, this, ${memoInfo.id}, '${memoInfo.tipo}')`);
                        badgeBtn.onmouseover = function () { this.style.color = 'var(--neon-white)'; this.style.borderColor = 'var(--text-muted)'; };
                        badgeBtn.onmouseout = function () { this.style.color = 'var(--text-muted)'; this.style.borderColor = 'var(--border-color)'; };

                        badgeBtn.innerHTML = `<i class="fas fa-eye-slash" style="font-size: 0.9rem;"></i>`;
                    }
                }
            }
        }
    } catch (e) { console.error("Error sincronizando tarjeta:", e); }

    localStorage.removeItem('modalMediaAbierto');
    const vista = vistaActualGlobal === 'series' ? '/series' : '/peliculas';
    history.pushState({ vista: vistaActualGlobal }, '', vista);

    // LIMPIAR ESTILOS AL CERRAR (para que no se queden pegados)
    const ratingCol = document.querySelector('.media-rating-col');
    if (ratingCol) ratingCol.style.display = 'flex';

    const providerCols = document.querySelectorAll('.provider-col');
    providerCols.forEach((col) => {
        col.style.display = '';
        col.style.flex = '';
        col.style.maxWidth = '';
        col.style.gridColumn = '';
    });
    const providersGrid = document.querySelector('.providers-3col-grid');
    if (providersGrid) {
        providersGrid.style.gridTemplateColumns = '1fr 1fr 1fr';
    }

    const techDivider = document.querySelector('.tech-divider');
    const watchDate = document.getElementById('media-detail-watch-date')?.closest('.tech-item');
    const watchStatus = document.getElementById('media-detail-watch-status')?.closest('.tech-item');
    if (techDivider) techDivider.style.display = '';
    if (watchDate) watchDate.style.display = '';
    if (watchStatus) watchStatus.style.display = '';

    const episodesBlock = document.querySelector('.media-episodes-block');
    if (episodesBlock) episodesBlock.remove();

    const bottomGridContainer = document.querySelector('.media-bottom-grid');
    if (bottomGridContainer) {
        bottomGridContainer.style.gridTemplateColumns = '';
    }
    const trailerCol = document.querySelector('.media-trailer-col');
    const castCol = document.querySelector('.media-cast-col');
    if (trailerCol) trailerCol.style.gridColumn = '';
    if (castCol) castCol.style.gridColumn = '';
}

btnCerrarMedia?.addEventListener('click', cerrarModalMedia);
modalMedia?.addEventListener('click', (e) => { if (e.target === modalMedia) cerrarModalMedia(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarModalMedia(); });

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

        // Comprobar que los elementos existen antes de usarlos
        const statMonths = document.querySelector('.stat-unit.months');
        if (statMonths) statMonths.textContent = t('profile.months');

        const statDays = document.querySelector('.stat-unit.days');
        if (statDays) statDays.textContent = t('profile.days');

        const statHours = document.querySelector('.stat-unit.hours');
        if (statHours) statHours.textContent = t('profile.hours');

        const recTitle = document.querySelector('#recommendations-section h3');
        if (recTitle) recTitle.textContent = t('profile.recommended');

        const statsHeader = document.querySelector('.stats-header h3');
        if (statsHeader) statsHeader.textContent = t('profile.global_stats');

        // Si no me pasan usuario por la URL (entrar desde el menú normal), asumo que quiero ver MI perfil
        const usuarioABuscar = usernameTarget || miPropioUsername;

        if (!usuarioABuscar) {
            const profileUsername = document.querySelector('.profile-username');
            if (profileUsername) profileUsername.textContent = "Inicia sesión para ver tu perfil";
            return;
        }

        // Buscamos en Supabase
        const { data: perfilTarget, error } = await supabase
            .from('perfiles_publicos')
            .select('*')
            .eq('username', usuarioABuscar)
            .single();

        if (error || !perfilTarget) {
            const profileUsername = document.querySelector('.profile-username');
            if (profileUsername) profileUsername.textContent = "Usuario no encontrado en el Nexus";
            return;
        }

        // Pintamos el Nombre
        const profileUsername = document.querySelector('.profile-username');
        if (profileUsername) profileUsername.textContent = perfilTarget.username;

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
            } else if (avatarDB.startsWith('http')) {
                avatarElement.insertAdjacentHTML('beforeend', `<img src="${avatarDB}" alt="Avatar" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`);
            } else {
                avatarElement.insertAdjacentHTML('beforeend', `<img src="https://raw.githubusercontent.com/DonPlastico/WEB-Multiusos/main/img/Avatars/${avatarDB}.webp" alt="Avatar" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`);
            }
        }

        // Pintar Banner
        const bannerElement = document.querySelector('.profile-banner');
        if (bannerElement) {
            if (bannerDB === 'default' || bannerDB === 'custom') {
                bannerElement.style.backgroundImage = 'none';
                bannerElement.style.backgroundSize = '';
                bannerElement.style.backgroundPosition = '';
            } else if (bannerDB.startsWith('http')) {
                bannerElement.style.backgroundImage = `url('${bannerDB}')`;
                bannerElement.style.backgroundSize = 'cover';
                bannerElement.style.backgroundPosition = 'center';
            } else {
                bannerElement.style.backgroundImage = `url('https://raw.githubusercontent.com/DonPlastico/WEB-Multiusos/main/img/Banners/${bannerDB}.webp')`;
                bannerElement.style.backgroundSize = 'cover';
                bannerElement.style.backgroundPosition = 'center';
            }
        }

        // ============================================
        // CARGAR CONTADORES DE SEGUIDORES/SIGUIENDO
        // ============================================
        try {
            const targetId = perfilTarget.auth_id;

            const { count: siguiendoCount } = await supabase
                .from('amistades')
                .select('*', { count: 'exact', head: true })
                .eq('solicitante_id', targetId);

            const { count: seguidoresCount } = await supabase
                .from('amistades')
                .select('*', { count: 'exact', head: true })
                .eq('receptor_id', targetId);

            const statNums = document.querySelectorAll('.profile-stats .stat-num');
            if (statNums.length >= 2) {
                statNums[0].textContent = siguiendoCount || 0;
                statNums[1].textContent = seguidoresCount || 0;
            }

            // ============================================
            // SISTEMA MATEMÁTICO DE TIEMPO (CACHÉ INTELIGENTE SWR)
            // ============================================
            const cacheKey = `nexus_stats_${targetId}`;
            const statsGuardadas = localStorage.getItem(cacheKey);

            const pintarEstadisticas = (totalEp, tiempoSer, totalPel, tiempoPel) => {
                const elEpisodes = document.getElementById('stat-series-episodes');
                if (elEpisodes) elEpisodes.textContent = totalEp.toLocaleString('es-ES');

                const elMonthsSer = document.getElementById('stat-series-months');
                if (elMonthsSer) elMonthsSer.textContent = tiempoSer.meses;

                const elDaysSer = document.getElementById('stat-series-days');
                if (elDaysSer) elDaysSer.textContent = tiempoSer.dias;

                const elHoursSer = document.getElementById('stat-series-hours');
                if (elHoursSer) elHoursSer.textContent = tiempoSer.horas;

                const elMoviesCount = document.getElementById('stat-movies-count');
                if (elMoviesCount) elMoviesCount.textContent = totalPel.toLocaleString('es-ES');

                const elMonthsPel = document.getElementById('stat-movies-months');
                if (elMonthsPel) elMonthsPel.textContent = tiempoPel.meses;

                const elDaysPel = document.getElementById('stat-movies-days');
                if (elDaysPel) elDaysPel.textContent = tiempoPel.dias;

                const elHoursPel = document.getElementById('stat-movies-hours');
                if (elHoursPel) elHoursPel.textContent = tiempoPel.horas;
            };

            if (statsGuardadas) {
                const stats = JSON.parse(statsGuardadas);
                pintarEstadisticas(stats.totalEpisodios, stats.tiempoSeries, stats.totalPelis, stats.tiempoPelis);
            } else {
                const elEpisodes = document.getElementById('stat-series-episodes');
                if (elEpisodes) elEpisodes.textContent = "...";

                const elMoviesCount = document.getElementById('stat-movies-count');
                if (elMoviesCount) elMoviesCount.textContent = "...";
            }

            setTimeout(async () => {
                let mediaVisto = [];
                let keepFetching = true;
                let currentOffset = 0;
                const fetchLimit = 1000;

                while (keepFetching) {
                    const { data, error } = await supabase
                        .from('user_media')
                        .select('tipo, veces_vista')
                        .eq('user_id', targetId)
                        .range(currentOffset, currentOffset + fetchLimit - 1);

                    if (error) break;

                    if (data && data.length > 0) {
                        mediaVisto.push(...data);
                        currentOffset += fetchLimit;
                        if (data.length < fetchLimit) keepFetching = false;
                    } else {
                        keepFetching = false;
                    }
                }

                let totalPelis = 0;
                let totalEpisodios = 0;

                mediaVisto.forEach(item => {
                    const cantidad = item.veces_vista || 1;
                    if (item.tipo === 'movie') totalPelis += cantidad;
                    if (item.tipo === 'tv_episode') totalEpisodios += cantidad;
                });

                const minTotalesPelis = totalPelis * 120;
                const minTotalesSeries = totalEpisodios * 45;

                const calcularTiempoFormato = (mins) => {
                    const meses = Math.floor(mins / 43200);
                    let resto = mins % 43200;
                    const dias = Math.floor(resto / 1440);
                    resto = resto % 1440;
                    const horas = Math.floor(resto / 60);
                    return { meses, dias, horas };
                };

                const tiempoPelis = calcularTiempoFormato(minTotalesPelis);
                const tiempoSeries = calcularTiempoFormato(minTotalesSeries);

                const nuevasStats = {
                    totalEpisodios: totalEpisodios,
                    tiempoSeries: tiempoSeries,
                    totalPelis: totalPelis,
                    tiempoPelis: tiempoPelis
                };

                const nuevasStatsString = JSON.stringify(nuevasStats);
                if (statsGuardadas !== nuevasStatsString) {
                    localStorage.setItem(cacheKey, nuevasStatsString);
                    pintarEstadisticas(totalEpisodios, tiempoSeries, totalPelis, tiempoPelis);
                }
            }, 50);

        } catch (err) {
            console.error("Error al extraer telemetría de amistades o medios:", err);
        }

        // CONTROL DE SEGURIDAD (Ocultar edición si no es mi perfil)
        const overlayBanner = document.querySelector('.edit-overlay');
        const overlayAvatar = document.querySelector('.edit-overlay-avatar');

        const triggerBanner = document.getElementById('banner-edit-trigger');
        const triggerAvatar = document.getElementById('avatar-edit-trigger');
        const btnAddFriend = document.getElementById('btn-add-friend');

        if (miPropioUsername === usuarioABuscar) {
            if (overlayBanner) overlayBanner.style.display = 'flex';
            if (overlayAvatar) overlayAvatar.style.display = 'flex';
            if (triggerBanner) triggerBanner.style.pointerEvents = 'auto';
            if (triggerAvatar) triggerAvatar.style.pointerEvents = 'auto';

            const profileBanner = document.querySelector('.profile-banner');
            if (profileBanner) profileBanner.style.cursor = 'pointer';

            const profileAvatar = document.querySelector('.profile-avatar');
            if (profileAvatar) profileAvatar.style.cursor = 'pointer';

            if (btnAddFriend) btnAddFriend.style.display = 'flex';
        } else {
            if (overlayBanner) overlayBanner.style.display = 'none';
            if (overlayAvatar) overlayAvatar.style.display = 'none';
            if (triggerBanner) triggerBanner.style.pointerEvents = 'none';
            if (triggerAvatar) triggerAvatar.style.pointerEvents = 'none';

            const profileBanner = document.querySelector('.profile-banner');
            if (profileBanner) profileBanner.style.cursor = 'default';

            const profileAvatar = document.querySelector('.profile-avatar');
            if (profileAvatar) profileAvatar.style.cursor = 'default';

            if (btnAddFriend) btnAddFriend.style.display = 'none';
        }

        // === CARGAR WATCHLIST DE SERIES PENDIENTES ===
        await cargarWatchlistTVTime(perfilTarget.auth_id, miPropioUsername === usuarioABuscar);

        if (miPropioUsername === usuarioABuscar && window.sincronizarWatchlistGlobal) {
            window.sincronizarWatchlistGlobal();
        }

        // === CARGAR RECOMENDACIONES DINÁMICAS ===
        if (miPropioUsername === usuarioABuscar) {
            await cargarRecomendaciones(perfilTarget.auth_id);
        } else {
            const recSection = document.getElementById('recommendations-section');
            if (recSection) recSection.style.display = 'none';
        }

    } catch (err) {
        console.error("Error al cargar perfil dinámico:", err);
    }
}

// ==========================================================================
//   RECOMENDACIONES DINÁMICAS (BASADAS EN ÚLTIMOS 7 VISIONADOS)
// ==========================================================================

async function cargarRecomendaciones(userId) {
    const container = document.getElementById('recommendations-list');
    const loading = document.getElementById('rec-loading');
    const empty = document.getElementById('rec-empty');
    const emptyMsg = document.getElementById('rec-empty-message');

    if (!container) {
        console.warn('⚠️ No se encontró el contenedor de recomendaciones');
        return;
    }

    // Mostrar loading
    if (loading) loading.style.display = 'flex';
    if (empty) empty.style.display = 'none';
    if (emptyMsg) emptyMsg.style.display = 'none';
    container.innerHTML = '';

    // Forzar gap
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '12px';

    try {
        // 1. OBTENER TODOS LOS VISIONADOS
        const { data: todosVistos, error } = await supabase
            .from('user_media')
            .select('media_id, tipo, fecha_vista, veces_vista')
            .eq('user_id', userId)
            .eq('visto', true)
            .in('tipo', ['movie', 'tv'])
            .order('fecha_vista', { ascending: false });

        if (error) throw error;

        if (!todosVistos || todosVistos.length === 0) {
            if (loading) loading.style.display = 'none';
            if (empty) {
                empty.style.display = 'flex';
                const p = empty.querySelector('p');
                if (p) p.textContent = 'Marca al menos una película o serie como vista para recibir recomendaciones.';
            }
            if (emptyMsg) emptyMsg.style.display = 'none';
            return;
        }

        // 2. SEPARAR: Películas y Series
        const peliculasVistas = todosVistos.filter(item => item.tipo === 'movie');
        const seriesConEpisodios = todosVistos.filter(item => item.tipo === 'tv');

        // 3. OBTENER EPISODIOS VISTOS
        const { data: episodiosVistos } = await supabase
            .from('user_media')
            .select('media_id')
            .eq('user_id', userId)
            .eq('tipo', 'tv_episode')
            .eq('visto', true);

        const episodiosSet = new Set(episodiosVistos?.map(e => e.media_id) || []);

        // 4. PELÍCULAS: Últimas 5
        const peliculasConFecha = peliculasVistas.map(p => ({
            media_id: p.media_id,
            tipo: 'movie',
            fecha_vista: p.fecha_vista
        }));

        peliculasConFecha.sort((a, b) => new Date(b.fecha_vista) - new Date(a.fecha_vista));
        const ultimasPeliculas = peliculasConFecha.slice(0, 5);

        let recuentoRecomendaciones = 0;

        // 5. PROCESAR PELÍCULAS (con timeout para evitar bloqueos)
        if (ultimasPeliculas.length > 0) {
            if (loading) loading.style.display = 'none';
            if (emptyMsg) {
                emptyMsg.style.display = 'inline-flex';
                emptyMsg.innerHTML = `<i class="fas fa-sparkles" style="margin-right: 4px;"></i> Cargando recomendaciones...`;
            }

            for (const peli of ultimasPeliculas) {
                try {
                    // Timeout de 5 segundos para evitar bloqueos
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 5000);

                    const res = await fetch(`/api/tmdb?id=${peli.media_id}&tipo=movie&lang=${currentLang}`, {
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);

                    if (!res.ok) {
                        console.warn(`⚠️ Error en TMDB para película ${peli.media_id}: ${res.status}`);
                        continue;
                    }
                    const data = await res.json();

                    let generosTexto = data.generos || '';
                    if (generosTexto === 'N/A' || generosTexto === '' || !generosTexto) {
                        console.warn(`⚠️ Película ${peli.media_id} sin géneros`);
                        continue;
                    }

                    const generosList = generosTexto.split(',').map(g => g.trim()).filter(g => g && g !== 'N/A');
                    if (generosList.length === 0) continue;

                    const generoPrincipal = generosList[0];
                    try {
                        const controllerRec = new AbortController();
                        const timeoutRec = setTimeout(() => controllerRec.abort(), 5000);

                        const resRec = await fetch(`/api/tmdb?tipo=movie&genero=${encodeURIComponent(generoPrincipal)}&limit=2&lang=${currentLang}`, {
                            signal: controllerRec.signal
                        });
                        clearTimeout(timeoutRec);

                        if (resRec.ok) {
                            const recs = await resRec.json();
                            recs.forEach(item => {
                                const idStr = item.id.toString();
                                if (idStr === peli.media_id) return;
                                const existing = container.querySelector(`[data-id="${idStr}"][data-tipo="movie"]`);
                                if (existing) return;

                                const card = crearTarjetaRecomendacion({
                                    ...item,
                                    tipo: 'movie',
                                    generoCoincidencia: generoPrincipal,
                                    puntuacion: 90 - (Math.random() * 10)
                                });
                                container.appendChild(card);
                                recuentoRecomendaciones++;
                            });
                        } else {
                            console.warn(`⚠️ Error en recomendaciones para ${generoPrincipal}: ${resRec.status}`);
                        }
                    } catch (e) {
                        console.warn('⏱️ Timeout en recomendación de película:', generoPrincipal);
                    }

                } catch (e) {
                    console.warn('❌ Error con película', peli.media_id, e);
                }
            }

            if (emptyMsg) {
                emptyMsg.innerHTML = `<i class="fas fa-sparkles" style="margin-right: 4px;"></i> Basado en tus películas vistas (cargando series...)`;
            }
        } else {
            if (loading) loading.style.display = 'none';
        }

        // 6. SERIES COMPLETADAS (con timeout)
        const idsSeriesUnicas = [...new Set(seriesConEpisodios.map(s => s.media_id))];

        // Si no hay series, mostrar mensaje y salir
        if (idsSeriesUnicas.length === 0) {
            if (loading) loading.style.display = 'none';
            if (container.children.length === 0) {
                if (empty) {
                    empty.style.display = 'flex';
                    const p = empty.querySelector('p');
                    if (p) p.textContent = 'No se encontraron recomendaciones. Sigue marcando contenido como visto.';
                }
                if (emptyMsg) emptyMsg.style.display = 'none';
            }
            return;
        }

        for (const serieId of idsSeriesUnicas) {
            try {

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);

                // Usar tipo=tv para obtener temporadas_info
                const res = await fetch(`/api/tmdb?id=${serieId}&tipo=tv&lang=${currentLang}`, {
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (!res.ok) {
                    console.warn(`⚠️ Error en TMDB para serie ${serieId}: ${res.status}`);
                    continue;
                }
                const data = await res.json();

                // VERIFICAR QUE EXISTE temporadas_info
                if (!data.temporadas_info || !Array.isArray(data.temporadas_info)) {
                    console.warn(`⚠️ Serie ${serieId} no tiene temporadas_info`);
                    continue;
                }

                const temporadasReales = data.temporadas_info.filter(s => s.season_number > 0);
                const totalEpisodios = temporadasReales.reduce((acc, s) => acc + s.episode_count, 0);

                if (totalEpisodios === 0) {
                    console.warn(`⚠️ Serie ${serieId} sin episodios`);
                    continue;
                }

                let vistosSerie = 0;
                for (const temp of temporadasReales) {
                    for (let ep = 1; ep <= temp.episode_count; ep++) {
                        const mediaId = `${serieId}_T${temp.season_number}_E${ep}`;
                        if (episodiosSet.has(mediaId)) vistosSerie++;
                    }
                }

                // SI ESTÁ COMPLETADA (100%)
                if (vistosSerie >= totalEpisodios && totalEpisodios > 0) {
                    let generosTexto = data.generos || '';

                    const titulo = data.titulo || '';
                    const sinopsis = data.sinopsis || '';
                    const esKdrama = titulo.includes('K-Drama') ||
                        titulo.includes('Corea') ||
                        titulo.includes('Korean') ||
                        sinopsis.includes('coreano') ||
                        sinopsis.includes('K-drama');

                    if (esKdrama) {
                        generosTexto = 'Romance, Drama, Comedia';
                    }

                    if (generosTexto === 'N/A' || generosTexto === '' || !generosTexto) {
                        console.warn(`⚠️ Serie ${serieId} sin géneros`);
                        continue;
                    }

                    const generosList = generosTexto.split(',').map(g => g.trim()).filter(g => g && g !== 'N/A');
                    if (generosList.length === 0) continue;

                    const generoPrincipal = generosList[0];
                    // 1 película
                    try {
                        const controllerRec = new AbortController();
                        const timeoutRec = setTimeout(() => controllerRec.abort(), 5000);

                        const resMovie = await fetch(`/api/tmdb?tipo=movie&genero=${encodeURIComponent(generoPrincipal)}&limit=1&lang=${currentLang}`, {
                            signal: controllerRec.signal
                        });
                        clearTimeout(timeoutRec);

                        if (resMovie.ok) {
                            const movies = await resMovie.json();
                            movies.forEach(item => {
                                const idStr = item.id.toString();
                                if (idStr === serieId) return;
                                const existing = container.querySelector(`[data-id="${idStr}"][data-tipo="movie"]`);
                                if (existing) return;

                                const card = crearTarjetaRecomendacion({
                                    ...item,
                                    tipo: 'movie',
                                    generoCoincidencia: generoPrincipal,
                                    puntuacion: 88 - (Math.random() * 10)
                                });
                                container.appendChild(card);
                                recuentoRecomendaciones++;
                            });
                        }
                    } catch (e) {
                        console.warn(`⏱️ Timeout en recomendación de película para serie ${serieId}`);
                    }

                    // 1 serie
                    try {
                        const controllerRec = new AbortController();
                        const timeoutRec = setTimeout(() => controllerRec.abort(), 5000);

                        const resTv = await fetch(`/api/tmdb?tipo=tv&genero=${encodeURIComponent(generoPrincipal)}&limit=1&lang=${currentLang}`, {
                            signal: controllerRec.signal
                        });
                        clearTimeout(timeoutRec);

                        if (resTv.ok) {
                            const series = await resTv.json();
                            series.forEach(item => {
                                const idStr = item.id.toString();
                                if (idStr === serieId) return;
                                const existing = container.querySelector(`[data-id="${idStr}"][data-tipo="tv"]`);
                                if (existing) return;

                                const card = crearTarjetaRecomendacion({
                                    ...item,
                                    tipo: 'tv',
                                    generoCoincidencia: generoPrincipal,
                                    puntuacion: 85 - (Math.random() * 10)
                                });
                                container.appendChild(card);
                                recuentoRecomendaciones++;
                            });
                        }
                    } catch (e) {
                        console.warn(`⏱️ Timeout en recomendación de serie para ${serieId}`);
                    }

                    if (emptyMsg) {
                        emptyMsg.innerHTML = `<i class="fas fa-sparkles" style="margin-right: 4px;"></i> ${recuentoRecomendaciones} recomendaciones basadas en ${generoPrincipal}`;
                    }
                }

            } catch (e) {
                console.warn('❌ Error verificando serie', serieId, e);
            }
        }

        // 7. FINAL: Ocultar loading y mostrar estado final
        if (loading) loading.style.display = 'none';

        if (container.children.length === 0) {
            if (empty) {
                empty.style.display = 'flex';
                const p = empty.querySelector('p');
                if (p) p.textContent = 'No se encontraron recomendaciones. Sigue marcando contenido como visto.';
            }
            if (emptyMsg) emptyMsg.style.display = 'none';
        } else {
            if (emptyMsg) {
                const count = container.children.length;
                emptyMsg.innerHTML = `<i class="fas fa-sparkles" style="margin-right: 4px;"></i> ${count} recomendaciones basadas en tus últimos visionados`;
            }
            if (empty) empty.style.display = 'none';
        }

    } catch (error) {
        console.error('❌ Error cargando recomendaciones:', error);
        if (loading) loading.style.display = 'none';
        if (empty) {
            empty.style.display = 'flex';
            const p = empty.querySelector('p');
            if (p) p.textContent = 'Error cargando recomendaciones: ' + error.message;
        }
    }
}

// ==========================================================================
//   FUNCIÓN AUXILIAR: Crear tarjeta de recomendación
// ==========================================================================

function crearTarjetaRecomendacion(item) {
    const poster = item.poster || '';
    const titulo = item.titulo || t('common.untitled');
    const generoMatch = item.generoCoincidencia || 'recomendado';
    const puntuacion = Math.round(item.puntuacion || 85);
    const tipoLabel = item.tipo === 'movie' ? '🎬 PELÍCULA' : '📺 SERIE';
    const esPelicula = item.tipo === 'movie';

    const card = document.createElement('div');
    card.className = 'watchlist-item';
    card.style.cursor = 'pointer';
    card.dataset.id = item.id;
    card.dataset.tipo = item.tipo;

    card.innerHTML = `
        <div class="watchlist-item-bg" style="background-image: url('${poster}')"></div>
        <div class="watchlist-item-content">
            <div class="watchlist-thumb">
                <img src="${poster}" alt="${titulo}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'watchlist-thumb-placeholder\\'><i class=\\'fas ${esPelicula ? 'fa-film' : 'fa-tv'}\\'></i></div>'">
            </div>
            <div class="watchlist-info">
                <span class="watchlist-show-name">
                    ${puntuacion}% COINCIDENCIA <i class="fas fa-star" style="color: gold; margin-left: 4px;"></i>
                    <span style="font-size: 0.6rem; font-weight: 400; color: var(--text-muted); margin-left: 8px;">${tipoLabel}</span>
                </span>
                <div class="watchlist-ep-title">
                    <span class="watchlist-ep-code">${titulo}</span>
                </div>
                <div class="watchlist-ep-name">Porque te gusta ${generoMatch}</div>
            </div>
            <button class="watchlist-check-btn" title="Ver Detalles">
                <i class="fa-solid fa-plus"></i>
            </button>
        </div>
    `;

    // Evento para abrir el modal
    card.addEventListener('click', (e) => {
        if (e.target.closest('.watchlist-check-btn')) return;
        abrirModalMedia(item.id, item.tipo);
    });

    const btnDetail = card.querySelector('.watchlist-check-btn');
    if (btnDetail) {
        btnDetail.addEventListener('click', (e) => {
            e.stopPropagation();
            abrirModalMedia(item.id, item.tipo);
        });
    }

    return card;
}

// ==========================================================================
//   PANEL DE ADMINISTRACIÓN (NEXUS)
// ==========================================================================
let adminPanelIniciado = false;
let miEmailGlobalAdmin = null;

async function iniciarPanelAdmin() {
    if (adminPanelIniciado) return; // Solo lo arrancamos la primera vez
    adminPanelIniciado = true;

    addAdminLog(t('admin_extra.init'), "system");

    // Obtenemos nuestro usuario para evitar quitarnos el admin a nosotros mismos
    const { data: { session } } = await supabase.auth.getSession();
    miEmailGlobalAdmin = session?.user?.email;

    addAdminLog(t('admin_extra.validated'), "success");

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

// TERMINAL DE REGISTRO DE EVENTOS
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

// GESTIÓN DE BASE DE DATOS (USUARIOS Y ROLES)
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

        addAdminLog(t('admin_extra.table_updated', { count: usuariosFiltrados.length }), "success");

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

// ACCIONES RÁPIDAS (Botones Globales)
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
btnCloseAnnounce.setAttribute('aria-label', 'Cerrar anuncio');
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

// Cyber Select
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

// Enviar Alerta
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

    // 2. DETECTAR SI ES PC O MÓVIL
    const isMobile = window.innerWidth <= 768;

    // 3. SELECCIONAR EL CONTENEDOR CORRECTO
    const containerId = isMobile ? 'toast-container-mobile' : 'toast-container';
    const container = document.getElementById(containerId);

    // Si el contenedor no existe, lo creamos (fallback)
    if (!container) {
        console.warn('⚠️ Contenedor de toasts no encontrado, creando uno...');
        const newContainer = document.createElement('div');
        newContainer.id = containerId;
        newContainer.className = `toast-container ${isMobile ? 'toast-mobile' : 'toast-desktop'}`;
        document.body.appendChild(newContainer);
        // Reintentar con el nuevo contenedor
        return window.showToast(tipo, titulo, descripcion);
    }

    const templateId = tipo === 'success' ? 'toast-success-template' : 'toast-error-template';
    const template = document.getElementById(templateId);

    if (!template) {
        console.error('❌ Template de toast no encontrado:', templateId);
        return;
    }

    // 4. Clonamos la plantilla oculta del HTML
    const clone = template.content.cloneNode(true);
    const wrapper = clone.querySelector('.toast-wrapper');
    const titleEl = clone.querySelector('.toast-title');
    const descEl = clone.querySelector('.toast-desc');
    const closeBtn = clone.querySelector('.toast-close');

    // 5. Inyectamos nuestros textos
    titleEl.textContent = titulo;
    descEl.textContent = descripcion;

    // 6. Funcionalidad de cerrar manual
    closeBtn.addEventListener('click', () => {
        wrapper.classList.add('toast-leave');
        setTimeout(() => wrapper.remove(), 250);
    });

    // 7. Auto-destrucción a los 5 segundos
    setTimeout(() => {
        if (wrapper.parentElement) {
            wrapper.classList.add('toast-leave');
            setTimeout(() => wrapper.remove(), 250);
        }
    }, 5000);

    // 8. Lanzamos el Toast a la pantalla
    container.appendChild(clone);

    // 9. SI ESTAMOS EN PC: Ajustar posición según el chatbox
    if (!isMobile) {
        actualizarPosicionToastsPC();
    }
};

// ==========================================================================
//   FUNCIÓN PARA ACTUALIZAR POSICIÓN DE TOASTS EN PC (según chatbox)
// ==========================================================================
function actualizarPosicionToastsPC() {
    const chatbox = document.getElementById('nexus-chatbox');
    const toastContainer = document.getElementById('toast-container');

    if (!chatbox || !toastContainer) return;

    const isChatboxExpanded = !chatbox.classList.contains('collapsed');
    const chatboxHeight = chatbox.offsetHeight || 480; // Fallback a 480px

    // Ajustar la posición bottom según el estado del chatbox
    if (isChatboxExpanded) {
        toastContainer.style.bottom = `calc(20px + ${chatboxHeight + 10}px)`;
    } else {
        toastContainer.style.bottom = `calc(20px + 185px)`;
    }
}

// ==========================================================================
//   ESCUCHAR CAMBIOS EN EL CHATBOX PARA ACTUALIZAR TOASTS
// ==========================================================================
// Observar cambios en la clase del chatbox
const chatboxObserver = new MutationObserver(() => {
    const chatbox = document.getElementById('nexus-chatbox');
    if (chatbox && window.innerWidth > 768) {
        actualizarPosicionToastsPC();
    }
});

// Iniciar observer cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const chatbox = document.getElementById('nexus-chatbox');
    if (chatbox) {
        chatboxObserver.observe(chatbox, {
            attributes: true,
            attributeFilter: ['class']
        });
        // Posición inicial
        setTimeout(actualizarPosicionToastsPC, 200);
    }
});

// También actualizar al redimensionar la ventana
window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        actualizarPosicionToastsPC();
    }
});

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

    areaNotifs.innerHTML = `<div style="text-align:center; padding: 40px;"><i class="fas fa-circle-notch fa-spin" style="font-size: 2rem; color: var(--primary);"></i><p style="margin-top:10px; color:var(--text-muted);">${t('chat_extra.synchronizing')}</p></div>`;

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
                    ${t('notifications.no_followers')}
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
                : `<img src="https://raw.githubusercontent.com/DonPlastico/WEB-Multiusos/main/img/Avatars/${avatarDB}.webp" alt="Avatar" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-user-astronaut\\' style=\\'color: var(--primary);\\'></i>'">`;

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
btnCloseSocial.setAttribute('aria-label', 'Cerrar lista social');
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
                : `<img src="https://raw.githubusercontent.com/DonPlastico/WEB-Multiusos/main/img/Avatars/${avatarDB}.webp" alt="Avatar" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-user-astronaut\\' style=\\'color: var(--primary);\\'></i>'">`;

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

// ==========================================================================
//   SISTEMA DE VISIONADO Y NOTA PERSONAL
// ==========================================================================

window.estadoMediaActual = null; // Guardará en RAM el estado del modal abierto

// 1. DIBUJAR INTERFAZ: Esta función pinta las estrellas, el ojo y el badge según los datos
window.actualizarUIMediaPersonal = async function (data) {
    window.estadoMediaActual = data || { visto: false, veces_vista: 0, fecha_vista: null, nota_personal: null };

    const personalValue = document.getElementById('media-detail-personal-value');
    const personalStars = document.getElementById('media-detail-personal-stars');
    const personalText = document.getElementById('media-detail-personal-text');
    const watchDate = document.getElementById('media-detail-watch-date');

    const watchStatus = document.getElementById('media-detail-watch-status');
    const iconStatusText = document.getElementById('icon-watch-status-text');
    const iconWatchStatus = document.getElementById('icon-watch-status');
    const btnWatchToggle = document.getElementById('btn-watch-toggle');

    if (window.estadoMediaActual.visto) {
        watchDate.textContent = window.estadoMediaActual.fecha_vista || '--';

        let badgeText = '';
        if (window.estadoMediaActual.veces_vista > 1) {
            let num = window.estadoMediaActual.veces_vista;
            badgeText = num > 20 ? '+20' : `x${num}`;
        }

        const badgeElement = document.getElementById('watch-count-badge');
        if (badgeElement) {
            if (window.estadoMediaActual.veces_vista > 1) {
                badgeElement.textContent = badgeText;
                badgeElement.style.display = 'block';
            } else {
                badgeElement.style.display = 'none';
            }
        }

        let badgeStatic = window.estadoMediaActual.veces_vista > 1 ? ` <span class="watch-count-badge">${badgeText}</span>` : '';
        watchStatus.innerHTML = `${t('details_extra.watched')} ${badgeStatic}`;
        if (iconStatusText) {
            iconStatusText.className = 'fas fa-eye';
            iconStatusText.style.color = 'var(--primary)';
        }

        if (iconWatchStatus) {
            iconWatchStatus.className = 'fas fa-eye';
            iconWatchStatus.style.color = 'var(--primary)';
        }
        if (btnWatchToggle) {
            btnWatchToggle.classList.add('watched');
        }

        if (window.estadoMediaActual.nota_personal !== null && window.estadoMediaActual.nota_personal !== undefined) {
            personalText.textContent = t('details_extra.your_rating');
        } else {
            personalText.textContent = t('details_extra.click_to_rate');
        }

    } else {
        watchDate.textContent = '--';

        const badgeElement = document.getElementById('watch-count-badge');
        if (badgeElement) {
            badgeElement.style.display = 'none';
        }

        watchStatus.textContent = t('details.not_watched');
        if (iconStatusText) {
            iconStatusText.className = 'fas fa-eye-slash';
            iconStatusText.style.color = 'var(--text-muted)';
        }

        if (iconWatchStatus) {
            iconWatchStatus.className = 'fas fa-eye-slash';
            iconWatchStatus.style.color = 'var(--text-muted)';
        }
        if (btnWatchToggle) {
            btnWatchToggle.classList.remove('watched');
        }

        personalText.textContent = t('details_extra.click_to_rate');
    }

    resetearEstrellasPersonal();

    const memoInfo = JSON.parse(localStorage.getItem('modalMediaAbierto') || '{}');
    const tipo = memoInfo.tipo;

    // SOLO mostrar el botón de favoritos SI:
    // 1. El usuario ha marcado el contenido como visto (window.estadoMediaActual.visto === true)
    // 2. Y hay sesión iniciada (userId existe)
    const userId = window._nexus_user_id || localStorage.getItem('nexus_user_id');

    if (window.estadoMediaActual?.visto === true && userId) {
        const titulo = document.getElementById('media-detail-title')?.textContent || memoInfo.titulo || t('common.untitled');
        const poster = document.getElementById('media-detail-cover-img')?.src || '';

        try {
            await actualizarBotonFavorito(memoInfo.id, tipo, titulo, poster);
            mostrarBotonFavorito(true);
        } catch (e) {
            console.debug('Error al actualizar favoritos:', e);
            mostrarBotonFavorito(false);
        }
    } else {
        mostrarBotonFavorito(false);
    }
};

// 2. SINCRONIZAR CON BASE DE DATOS
async function guardarInteraccionMedia(updates) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        showToast('error', 'Acceso denegado', 'Inicia sesión para guardar tu progreso.');
        return;
    }

    const memoInfo = JSON.parse(localStorage.getItem('modalMediaAbierto') || '{}');
    if (!memoInfo.id || !memoInfo.tipo) return;

    // Fusionamos los datos actuales con los nuevos
    window.estadoMediaActual = { ...window.estadoMediaActual, ...updates };
    actualizarUIMediaPersonal(window.estadoMediaActual); // Actualiza la UI instantáneamente (sensación de rapidez)

    try {
        // Buscamos si ya existe el registro
        const { data: exist } = await supabase
            .from('user_media')
            .select('id')
            .eq('user_id', session.user.id)
            .eq('media_id', memoInfo.id.toString())
            .eq('tipo', memoInfo.tipo)
            .maybeSingle();

        if (exist) {
            await supabase.from('user_media').update({
                visto: window.estadoMediaActual.visto,
                veces_vista: window.estadoMediaActual.veces_vista,
                fecha_vista: window.estadoMediaActual.fecha_vista,
                nota_personal: window.estadoMediaActual.nota_personal
            }).eq('id', exist.id);
        } else {
            await supabase.from('user_media').insert({
                user_id: session.user.id,
                media_id: memoInfo.id.toString(),
                tipo: memoInfo.tipo,
                visto: window.estadoMediaActual.visto,
                veces_vista: window.estadoMediaActual.veces_vista,
                fecha_vista: window.estadoMediaActual.fecha_vista,
                nota_personal: window.estadoMediaActual.nota_personal
            });
        }
        showToast('success', 'Guardado', 'Sincronizado con el Nexus correctamente.');
    } catch (e) {
        console.error(e);
        showToast('error', 'Error', 'Fallo al sincronizar con la base de datos.');
    }
}

// 3. EVENTOS (Clics en Ojo y Valoración) - CON LOS NUEVOS IDs
const btnToggleWatched = document.getElementById('btn-watch-toggle');
const contextMenuWatched = document.getElementById('watch-context-menu');

// CLIC PRINCIPAL (Izquierdo en PC o Toque en Móvil)
btnToggleWatched?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!window.estadoMediaActual) return;

    if (window.estadoMediaActual.visto) {
        // Si YA está vista, el toque abre el menú directamente
        contextMenuWatched.style.display = 'block';
        contextMenuWatched.classList.toggle('show');
    } else {
        const fechaHoy = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
        guardarInteraccionMedia({ visto: true, veces_vista: 1, fecha_vista: fechaHoy });

        // Si es serie, marca todos los episodios de golpe
        const memoInfo = JSON.parse(localStorage.getItem('modalMediaAbierto') || '{}');
        if (memoInfo.tipo === 'tv' && window.gestionarBloqueEpisodios) {
            window.gestionarBloqueEpisodios('marcar', null);
        }
    }
});

// Mantenemos el CLIC DERECHO por instinto para los usuarios de PC
btnToggleWatched?.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.estadoMediaActual || !window.estadoMediaActual.visto) return;
    contextMenuWatched.classList.toggle('show');
});

// Clic fuera cierra el menú derecho
document.addEventListener('click', (e) => {
    if (!e.target.closest('#btn-watch-toggle') && !e.target.closest('#watch-context-menu')) {
        contextMenuWatched?.classList.remove('show');
    }
});

// Botón "Vista de nuevo" (Suma x2, x3...)
document.getElementById('btn-context-rewatch')?.addEventListener('click', () => {
    contextMenuWatched.classList.remove('show');
    if (!window.estadoMediaActual) return;
    let veces = (window.estadoMediaActual.veces_vista || 1) + 1;
    guardarInteraccionMedia({ veces_vista: veces });
});

// Botón "Cambiar a NO VISTA" (Resetea todo)
document.getElementById('btn-context-unwatch')?.addEventListener('click', () => {
    contextMenuWatched.classList.remove('show');
    guardarInteraccionMedia({ visto: false, veces_vista: 0, fecha_vista: null, nota_personal: null });

    // Si es serie, desmarca todos los episodios de golpe
    const memoInfo = JSON.parse(localStorage.getItem('modalMediaAbierto') || '{}');
    if (memoInfo.tipo === 'tv' && window.gestionarBloqueEpisodios) {
        window.gestionarBloqueEpisodios('desmarcar', null);
    }
});

// ==========================================================================
//   ESTRELLAS INTERACTIVAS (HOVER Y CLICK PARA VALORAR) - 5 ESTRELLAS
// ==========================================================================

// Función para actualizar las estrellas según la nota (0-10)
function actualizarEstrellasPersonal(nota) {
    const stars = document.querySelectorAll('#media-detail-personal-stars i');
    const notaSobre5 = nota / 2; // 0-10 -> 0-5

    stars.forEach((star, index) => {
        const starValue = index + 1; // 1, 2, 3, 4, 5
        if (notaSobre5 >= starValue) {
            star.className = 'fas fa-star';
        } else if (notaSobre5 >= starValue - 0.5) {
            star.className = 'fas fa-star-half-alt';
        } else {
            star.className = 'far fa-star';
        }
    });
}

// Función para resetear las estrellas al estado guardado
function resetearEstrellasPersonal() {
    const stars = document.querySelectorAll('#media-detail-personal-stars i');
    const starsContainer = document.getElementById('media-detail-personal-stars');
    const personalText = document.getElementById('media-detail-personal-text');
    const notaActual = window.estadoMediaActual?.nota_personal || null;

    if (notaActual !== null && notaActual !== undefined) {
        actualizarEstrellasPersonal(notaActual);
        starsContainer.classList.add('voted');
        personalText.textContent = 'Tu nota personal';
    } else {
        stars.forEach(star => star.className = 'far fa-star');
        starsContainer.classList.remove('voted');
        personalText.textContent = 'Haz clic para puntuar';
    }
}

// EVENTO: Hover sobre las estrellas (se iluminan con medias estrellas)
document.addEventListener('mouseover', (e) => {
    const star = e.target.closest('#media-detail-personal-stars i');
    if (!star) return;

    const starsContainer = document.getElementById('media-detail-personal-stars');
    if (starsContainer.classList.contains('voted')) return;

    // Obtener posición del mouse dentro de la estrella
    const rect = star.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const isHalf = mouseX < rect.width / 2;

    const starIndex = Array.from(starsContainer.querySelectorAll('i')).indexOf(star);
    const stars = starsContainer.querySelectorAll('i');

    stars.forEach((s, index) => {
        s.className = 'far fa-star';
        s.style.color = '';

        if (index < starIndex) {
            s.className = 'fas fa-star';
            s.style.color = 'gold';
        } else if (index === starIndex) {
            if (isHalf) {
                s.className = 'fas fa-star-half-alt';
                s.style.color = 'gold';
            } else {
                s.className = 'fas fa-star';
                s.style.color = 'gold';
            }
        }
    });

    // Mostrar nota temporal
    let nota = (starIndex) * 2; // Estrellas completas antes
    if (isHalf) {
        nota += 1; // +1 por la media
    } else {
        nota += 2; // +2 por la estrella completa
    }
    document.getElementById('media-detail-personal-text').textContent = `${nota.toFixed(1)} / 10`;
});

// EVENTO: Salir del hover (resetear)
document.addEventListener('mouseout', (e) => {
    const starsContainer = document.getElementById('media-detail-personal-stars');
    if (!e.target.closest('#media-detail-personal-stars') && !e.target.closest('#media-detail-personal-text')) {
        resetearEstrellasPersonal();
    }
});

// EVENTO: Click en estrella (guardar nota)
document.addEventListener('click', (e) => {
    const star = e.target.closest('#media-detail-personal-stars i');
    if (!star) return;

    // Solo verificamos que la tarjeta esté cargada, sin importar si está vista o no
    if (!window.estadoMediaActual) return;

    // Calcular nota basada en hover
    const starsContainer = document.getElementById('media-detail-personal-stars');
    const starIndex = Array.from(starsContainer.querySelectorAll('i')).indexOf(star);

    // Verificar si la estrella está a medias (por el hover)
    const rect = star.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const isHalf = mouseX < rect.width / 2;

    let nota = (starIndex) * 2; // Estrellas completas antes
    if (isHalf) {
        nota += 1; // +1 por la media
    } else {
        nota += 2; // +2 por la estrella completa
    }

    // Limitar a 10
    nota = Math.min(nota, 10);

    guardarInteraccionMedia({ nota_personal: nota });
});

// ==========================================================================
//   SISTEMA DE VISIONADO AVANZADO (EPISODIOS, TEMPORADAS Y SERIES)
// ==========================================================================

// 1. DIBUJAR LOS BOTONES (Sincroniza la UI con la RAM)
window.refrescarUIEpisodiosYTemporadas = function () {
    if (!window.serieInfoActual) return;

    // Refrescar Temporadas
    document.querySelectorAll('.btn-watch-season').forEach(btn => {
        const s = parseInt(btn.getAttribute('data-season'));
        const totalEp = parseInt(btn.getAttribute('data-episodes'));

        let vistosDeEstaTemp = 0;
        for (let i = 1; i <= totalEp; i++) {
            if (window.episodiosVistosActuales.has(`${s}_${i}`)) vistosDeEstaTemp++;
        }

        if (vistosDeEstaTemp === totalEp && totalEp > 0) {
            btn.style.color = 'var(--primary)';
            btn.style.borderColor = 'var(--primary)';
            btn.innerHTML = '<i class="fas fa-eye"></i>';
        } else {
            btn.style.color = 'var(--text-muted)';
            btn.style.borderColor = 'var(--text-muted)';
            btn.innerHTML = '<i class="fas fa-eye-slash"></i>';
        }
    });

    // Refrescar Episodios cargados
    document.querySelectorAll('.btn-watch-episode').forEach(btn => {
        const s = parseInt(btn.getAttribute('data-season'));
        const e = parseInt(btn.getAttribute('data-episode'));

        if (window.episodiosVistosActuales.has(`${s}_${e}`)) {
            btn.style.color = 'var(--primary)';
            btn.style.borderColor = 'var(--primary)';
            btn.innerHTML = '<i class="fas fa-eye"></i>';
        } else {
            btn.style.color = 'var(--text-muted)';
            btn.style.borderColor = 'var(--text-muted)';
            btn.innerHTML = '<i class="fas fa-eye-slash"></i>';
        }
    });

    actualizarBarraProgresoSeries();
};

// 2. FUNCIÓN MAESTRA DE INYECCIÓN (Sirve para 1 Temporada o TODA la serie)
window.gestionarBloqueEpisodios = async function (modo, seasonTarget = null) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const miId = session.user.id;
    const serieId = window.serieInfoActual.id;
    const hoy = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

    let nuevosVistos = [];
    let aBorrarKeys = [];

    window.serieInfoActual.temporadas.forEach(temp => {
        const s = temp.season_number;
        if (s === 0) return; // Saltamos especiales

        // Si mandamos un target (ej: season 2), ignoramos las demás
        if (seasonTarget !== null && s !== seasonTarget) return;

        for (let epNum = 1; epNum <= temp.episode_count; epNum++) {
            const epKey = `${s}_${epNum}`;
            const mediaId = `${serieId}_T${s}_E${epNum}`;

            if (modo === 'marcar') {
                if (!window.episodiosVistosActuales.has(epKey)) {
                    nuevosVistos.push({
                        user_id: miId, media_id: mediaId, tipo: 'tv_episode', visto: true, veces_vista: 1, fecha_vista: hoy
                    });
                    window.episodiosVistosActuales.add(epKey);
                }
            } else {
                if (window.episodiosVistosActuales.has(epKey)) {
                    aBorrarKeys.push(mediaId);
                    window.episodiosVistosActuales.delete(epKey);
                }
            }
        }
    });

    // Mandar a Supabase
    if (modo === 'marcar' && nuevosVistos.length > 0) {
        await supabase.from('user_media').insert(nuevosVistos);
    } else if (modo === 'desmarcar' && aBorrarKeys.length > 0) {
        // Cortamos la orden de borrado masivo en lotes de 50 para no colapsar el límite de longitud de URL de la API de Supabase.
        for (let i = 0; i < aBorrarKeys.length; i += 50) {
            const bloqueIds = aBorrarKeys.slice(i, i + 50);
            const { error } = await supabase.from('user_media')
                .delete()
                .eq('user_id', miId)
                .eq('tipo', 'tv_episode')
                .in('media_id', bloqueIds);

            // Control de colisiones de permisos
            if (error) {
                console.error("❌ SUPABASE RECHAZA EL BORRADO:", error);
                showToast('error', 'Error BD', 'Supabase bloqueó el borrado. Revisa las políticas RLS.');
            }
        }
    }

    window.refrescarUIEpisodiosYTemporadas();

    // --- Sincronizar Watchlist al instante ---
    if (window.sincronizarWatchlistGlobal) window.sincronizarWatchlistGlobal();

    actualizarBarraProgresoSeries();

    // Actualizar el estado de favoritos (puede cambiar si la serie se completó)
    if (window.estadoMediaActual) {
        actualizarUIMediaPersonal(window.estadoMediaActual);
    }
};

// 3. LISTENERS GLOBALES (Clics de UI)
document.addEventListener('click', async (e) => {

    // A. CLIC EN BOTÓN DE TEMPORADA
    const btnSeason = e.target.closest('.btn-watch-season');
    if (btnSeason) {
        e.stopPropagation(); // Evitamos que el acordeón se abra/cierre

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { showToast('error', 'Acceso denegado', 'Inicia sesión.'); return; }

        const season = parseInt(btnSeason.getAttribute('data-season'));
        const totalEp = parseInt(btnSeason.getAttribute('data-episodes'));

        // Comprobamos si la temporada ya estaba completa
        let vistos = 0;
        for (let i = 1; i <= totalEp; i++) {
            if (window.episodiosVistosActuales.has(`${season}_${i}`)) vistos++;
        }

        btnSeason.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        if (vistos === totalEp) {
            await window.gestionarBloqueEpisodios('desmarcar', season);
            showToast('warning', 'Desmarcada', `Temporada ${season} no vista.`);
        } else {
            await window.gestionarBloqueEpisodios('marcar', season);
            showToast('success', 'Completada', `Temporada ${season} marcada.`);
        }
        return;
    }

    // B. CLIC EN EPISODIO SUELTO
    const btnEp = e.target.closest('.btn-watch-episode');
    if (btnEp) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { showToast('error', 'Acceso denegado', 'Inicia sesión.'); return; }

        const season = parseInt(btnEp.getAttribute('data-season'));
        const episode = parseInt(btnEp.getAttribute('data-episode'));
        const isWatched = window.episodiosVistosActuales.has(`${season}_${episode}`);

        btnEp.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        if (isWatched) {
            // Desmarcar solo ESTE episodio
            const mediaId = `${window.serieInfoActual.id}_T${season}_E${episode}`;
            await supabase.from('user_media').delete().eq('user_id', session.user.id).eq('media_id', mediaId).eq('tipo', 'tv_episode');
            window.episodiosVistosActuales.delete(`${season}_${episode}`);
            window.refrescarUIEpisodiosYTemporadas();

            // Sincronizar
            if (window.sincronizarWatchlistGlobal) window.sincronizarWatchlistGlobal();

            actualizarBarraProgresoSeries();
        } else {
            // Marcar este y TODOS LOS ANTERIORES (Magia cascada)
            const miId = session.user.id;
            const hoy = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
            let nuevosVistos = [];

            window.serieInfoActual.temporadas.forEach(temp => {
                const s = temp.season_number;
                if (s === 0 || s > season) return;

                const maxEp = (s === season) ? episode : temp.episode_count;
                for (let epNum = 1; epNum <= maxEp; epNum++) {
                    if (!window.episodiosVistosActuales.has(`${s}_${epNum}`)) {
                        nuevosVistos.push({
                            user_id: miId, media_id: `${window.serieInfoActual.id}_T${s}_E${epNum}`, tipo: 'tv_episode', visto: true, veces_vista: 1, fecha_vista: hoy
                        });
                        window.episodiosVistosActuales.add(`${s}_${epNum}`);
                    }
                }
            });

            if (nuevosVistos.length > 0) {
                await supabase.from('user_media').insert(nuevosVistos);
            }
            window.refrescarUIEpisodiosYTemporadas();
            showToast('success', 'Progreso guardado', `Visto hasta T${season} - E${episode}`);

            // Sincronizar
            if (window.sincronizarWatchlistGlobal) window.sincronizarWatchlistGlobal();

            actualizarBarraProgresoSeries();
        }
    }
});

// ==========================================================================
//   MENÚ CONTEXTUAL FLOTANTE PARA LAS TARJETAS (PELÍCULAS/SERIES)
// ==========================================================================

// Fabricamos el menú HTML dinámico
const cardMenu = document.createElement('div');
cardMenu.className = 'theme-menu user-menu-panel';
cardMenu.id = 'card-watch-menu';
cardMenu.style.cssText = 'position: absolute; display: none; z-index: 9999; min-width: 180px; width: max-content; max-width: 250px; white-space: nowrap; box-shadow: 0px 8px 20px rgba(0,0,0,0.5);';
cardMenu.innerHTML = `
    <button class="theme-option" id="btn-card-rewatch">
        <i class="fas fa-redo"></i><span>Vista de nuevo</span>
    </button>
    <div class="dropdown-divider"></div>
    <button class="theme-option" id="btn-card-unwatch">
        <i class="fas fa-eye-slash" style="color: var(--error);"></i>
        <span style="color: var(--error);">Cambiar a NO VISTA</span>
    </button>
`;
document.body.appendChild(cardMenu);

let targetCardData = null; // Guardará a qué tarjeta hemos clicado

window.abrirMenuTarjeta = function (e, btn) {
    e.stopPropagation(); // Evita que al hacer clic se abra el modal gigante de la peli

    targetCardData = {
        id: btn.getAttribute('data-id'),
        tipo: btn.getAttribute('data-tipo'),
        dbId: btn.getAttribute('data-db-id'), // Su ID en tu tabla user_media
        veces: parseInt(btn.getAttribute('data-veces')),
        btnElement: btn
    };

    // Posicionamiento inteligente del menú junto al botón
    const rect = btn.getBoundingClientRect();
    cardMenu.style.top = `${rect.bottom + window.scrollY + 8}px`;

    const menuWidth = 180;
    if (rect.right + menuWidth > window.innerWidth) {
        cardMenu.style.left = `${rect.right - menuWidth + window.scrollX}px`; // No salirse por la derecha
    } else {
        cardMenu.style.left = `${rect.left + window.scrollX - 40}px`; // Centrado
    }

    cardMenu.classList.add('show');
    cardMenu.style.display = 'block';
};

// Si hacemos click fuera, ocultamos el menú
document.addEventListener('click', (e) => {
    if (!cardMenu.contains(e.target) && !e.target.closest('.btn-card-watched-status')) {
        cardMenu.classList.remove('show');
        setTimeout(() => { if (!cardMenu.classList.contains('show')) cardMenu.style.display = 'none'; }, 200);
    }
});

// === ACCIÓN 1: Ver de Nuevo (x2, x3...) ===
document.getElementById('btn-card-rewatch')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!targetCardData) return;

    cardMenu.classList.remove('show');
    setTimeout(() => cardMenu.style.display = 'none', 200);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const nuevaVez = targetCardData.veces + 1;
    targetCardData.btnElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    // BLINDAJE: Si el botón es recién inyectado (no tiene dbId), lo busca por tu ID
    let query = supabase.from('user_media').update({ veces_vista: nuevaVez });
    if (targetCardData.dbId) {
        query = query.eq('id', targetCardData.dbId);
    } else {
        query = query.eq('user_id', session.user.id).eq('media_id', targetCardData.id).eq('tipo', targetCardData.tipo);
    }

    const { error } = await query;

    if (!error) {
        targetCardData.btnElement.setAttribute('data-veces', nuevaVez);
        const badgeExtra = nuevaVez > 1 ? `<span style="position: absolute; top: -8px; right: -8px; background: var(--primary); font-size: 0.6rem; padding: 2px 5px; border-radius: 10px; font-weight: bold; border: 1px solid var(--bg-card); color: white;">${nuevaVez > 20 ? '+20' : 'x' + nuevaVez}</span>` : '';
        targetCardData.btnElement.innerHTML = `<i class="fas fa-eye" style="font-size: 0.9rem;"></i>${badgeExtra}`;
        showToast('success', 'Actualizado', 'Añadido un nuevo visionado.');
    } else {
        showToast('error', 'Error BD', 'No se pudo guardar.');
        targetCardData.btnElement.innerHTML = `<i class="fas fa-eye" style="font-size: 0.9rem;"></i>`;
    }
});

// === ACCIÓN 2: Desmarcar Todo ===
document.getElementById('btn-card-unwatch')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!targetCardData) return;

    cardMenu.classList.remove('show');
    setTimeout(() => cardMenu.style.display = 'none', 200);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    targetCardData.btnElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    // BLINDAJE: Lo mismo para el borrado
    let query = supabase.from('user_media').delete();
    if (targetCardData.dbId) {
        query = query.eq('id', targetCardData.dbId);
    } else {
        query = query.eq('user_id', session.user.id).eq('media_id', targetCardData.id).eq('tipo', targetCardData.tipo);
    }

    const { error } = await query;

    if (!error) {
        if (targetCardData.tipo === 'tv') {
            await supabase.from('user_media')
                .delete()
                .eq('user_id', session.user.id)
                .eq('tipo', 'tv_episode')
                .like('media_id', `${targetCardData.id}_T%`);

            // Sincronizar
            if (window.sincronizarWatchlistGlobal) window.sincronizarWatchlistGlobal();
        }

        // NO lo borramos, lo devolvemos a estado gris (no visto) y le reasignamos la función 
        targetCardData.btnElement.className = 'btn-watch-indicator not-watched';
        targetCardData.btnElement.setAttribute('data-veces', '0');
        targetCardData.btnElement.setAttribute('data-db-id', '');
        targetCardData.btnElement.title = 'Marcar como vista';
        targetCardData.btnElement.style.cssText = "position: relative; flex: 1; background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-muted); height: 38px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s;";
        targetCardData.btnElement.setAttribute('onclick', `marcarVistaRapida(event, this, ${targetCardData.id}, '${targetCardData.tipo}')`);
        targetCardData.btnElement.onmouseover = function () { this.style.color = 'var(--neon-white)'; this.style.borderColor = 'var(--text-muted)'; };
        targetCardData.btnElement.onmouseout = function () { this.style.color = 'var(--text-muted)'; this.style.borderColor = 'var(--border-color)'; };
        targetCardData.btnElement.innerHTML = `<i class="fas fa-eye-slash" style="font-size: 0.9rem;"></i>`;

        showToast('success', 'Eliminado', 'Se ha marcado como NO vista.');
    } else {
        showToast('error', 'Error BD', 'No se pudo eliminar de la base de datos.');
        targetCardData.btnElement.innerHTML = `<i class="fas fa-eye" style="font-size: 0.9rem;"></i>`;
    }
});

// ==========================================================================
//   FORMATEAR TIEMPO EN DÍAS/HORAS/MINUTOS
// ==========================================================================
function formatearTiempo(minutos) {
    if (!minutos || minutos === 0) return "--";

    const dias = Math.floor(minutos / 1440);
    const horas = Math.floor((minutos % 1440) / 60);
    const mins = minutos % 60;

    let texto = "";
    if (dias > 0) texto += `${dias}d `;
    if (horas > 0) texto += `${horas}h `;
    if (mins > 0) texto += `${mins}m`;

    return texto.trim() || "--";
}

// ==========================================================================
//   BARRA DE PROGRESO DE EPISODIOS (MODAL SERIES)
// ==========================================================================

function actualizarBarraProgresoSeries() {
    // Solo ejecutar si estamos en una serie
    const tipo = modalMedia.getAttribute('data-current-type');
    if (tipo !== 'tv') {
        const container = document.getElementById('series-progress-container');
        if (container) container.style.display = 'none';
        return;
    }

    // Obtener elementos de la UI
    const container = document.getElementById('series-progress-container');
    const bar = document.getElementById('series-progress-bar');
    const countEl = document.getElementById('series-progress-count');
    const totalEl = document.getElementById('series-progress-total');
    const percentEl = document.getElementById('series-progress-percent');
    const statusEl = document.getElementById('series-progress-status');

    if (!container || !bar) return;

    // Calcular total de episodios de la serie
    let totalEpisodios = 0;
    if (window.serieInfoActual && window.serieInfoActual.temporadas) {
        window.serieInfoActual.temporadas.forEach(temp => {
            if (temp.season_number > 0) { // Saltamos especiales (season 0)
                totalEpisodios += temp.episode_count;
            }
        });
    }

    // Si no hay datos o es 0, ocultar la barra
    if (totalEpisodios === 0) {
        container.style.display = 'none';
        return;
    }

    // Contar episodios vistos
    let vistos = 0;
    if (window.episodiosVistosActuales) {
        vistos = window.episodiosVistosActuales.size || 0;
    }

    // Calcular porcentaje
    const porcentaje = Math.min(100, (vistos / totalEpisodios) * 100);
    const porcentajeRedondeado = Math.round(porcentaje);

    // Actualizar textos
    if (countEl) countEl.textContent = vistos;
    if (totalEl) totalEl.textContent = totalEpisodios;
    if (percentEl) percentEl.textContent = porcentajeRedondeado;

    // Actualizar barra (con animación suave)
    bar.style.width = `${porcentaje}%`;

    // Actualizar color de la barra según el color del usuario
    const color = localStorage.getItem('dp_user_color') || '#6366f1';
    bar.style.background = color;

    // Mostrar el contenedor
    container.style.display = 'block';

    // Actualizar estado y etiqueta
    if (statusEl) {
        if (vistos >= totalEpisodios && totalEpisodios > 0) {
            statusEl.textContent = t('series.completed');
            statusEl.className = 'completed';
            bar.classList.add('completed');
        } else {
            statusEl.textContent = t('series.in_progress');
            statusEl.className = 'in-progress';
            bar.classList.remove('completed');
        }
    }
}

// ==========================================================================
//   MARCAR COMO VISTA DESDE LA TARJETA (SOLO PELÍCULAS)
// ==========================================================================
window.marcarVistaRapida = async function (e, btn, mediaId, tipo) {
    e.stopPropagation(); // Evita que se abra el modal gigante

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        showToast('error', 'Acceso denegado', 'Inicia sesión para guardar tu progreso.');
        return;
    }

    // Animación de carga en el botón
    btn.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size: 0.9rem;"></i>';

    const hoy = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

    const { data, error } = await supabase.from('user_media').insert({
        user_id: session.user.id,
        media_id: mediaId.toString(),
        tipo: tipo,
        visto: true,
        veces_vista: 1,
        fecha_vista: hoy
    }).select().single();

    if (!error && data) {
        // Magia: Lo transformamos en el botón verde de "Ya visto" al instante
        btn.className = 'btn-card-watched-status watched';
        btn.setAttribute('data-veces', '1');
        btn.setAttribute('data-db-id', data.id);
        btn.title = 'Vista. Clic para opciones';
        btn.style.cssText = "position: relative; flex: 1; background: var(--primary-soft); border: 1px solid var(--primary); color: var(--primary); height: 38px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s;";
        btn.setAttribute('onclick', 'abrirMenuTarjeta(event, this)');
        btn.onmouseover = function () { this.style.background = 'var(--primary)'; this.style.color = 'white'; };
        btn.onmouseout = function () { this.style.background = 'var(--primary-soft)'; this.style.color = 'var(--primary)'; };

        btn.innerHTML = `<i class="fas fa-eye" style="font-size: 0.9rem;"></i>`;
        showToast('success', t('toast.saved'), t('toast.movie_marked'));
    } else {
        showToast('error', t('toast.error'), t('toast.movie_error'));
        btn.innerHTML = `<i class="fas fa-eye-slash" style="font-size: 0.9rem;"></i>`;
    }
};

// ==========================================================================
//   EDITAR PERFIL - LÓGICA COMPLETA
// ==========================================================================

// Variables globales para el perfil
let perfilDataActual = {};
let timeoutOcultarCorreo = null;
let vistaAnteriorAlEditar = 'profile';

// === FUNCIÓN: Cargar datos del perfil en el formulario ===
async function cargarDatosPerfil() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        showToast('error', 'Acceso denegado', 'Debes iniciar sesión.');
        return;
    }

    try {
        const { data: perfil, error } = await supabase
            .from('usuarios')
            .select('*')
            .eq('email', session.user.email)
            .single();

        if (error) throw error;

        perfilDataActual = perfil || {};

        // Rellenar campos del formulario
        const emailDisplay = document.getElementById('edit-email-display');
        if (emailDisplay) emailDisplay.textContent = session.user.email;

        const usernameInput = document.getElementById('edit-username');
        if (usernameInput) usernameInput.value = perfil?.username || '';

        const firstnameInput = document.getElementById('edit-firstname');
        if (firstnameInput) firstnameInput.value = perfil?.nombre || '';

        const lastnameInput = document.getElementById('edit-lastname');
        if (lastnameInput) lastnameInput.value = perfil?.apellidos || '';

        const descriptionInput = document.getElementById('edit-description');
        if (descriptionInput) descriptionInput.value = perfil?.descripcion || '';

        // Asignar sexo correctamente
        const genderSelect = document.getElementById('edit-gender');
        if (genderSelect) {
            const sexo = perfil?.sexo || '--';
            genderSelect.value = sexo;

            // ACTUALIZAR EL LABEL DEL SELECTOR PERSONALIZADO
            const genderLabel = document.getElementById('gender-select-label');
            const genderInput = document.getElementById('edit-gender');
            if (genderLabel && genderInput) {
                // Buscar la opción que coincide con el valor
                const options = document.querySelectorAll('#gender-select-dropdown .cyber-select-option');
                options.forEach(opt => {
                    if (opt.dataset.value === sexo) {
                        genderLabel.textContent = opt.textContent.trim();
                        opt.classList.add('selected');
                    } else {
                        opt.classList.remove('selected');
                    }
                });
                genderInput.value = sexo;
            }
        }

        // Correo borroso
        const emailContainer = document.getElementById('edit-email-container');
        if (emailContainer) {
            emailContainer.classList.add('blurred');
        }

        // Actualizar contador
        actualizarContadorCaracteres();

        // Panel de información
        const infoUsername = document.getElementById('edit-profile-username-display');
        const infoJoined = document.getElementById('edit-profile-joined-display');
        const infoColorText = document.getElementById('edit-profile-color-text');
        const infoColorDot = document.getElementById('edit-profile-color-dot');

        if (infoUsername) infoUsername.textContent = perfil?.username || '--';

        if (infoJoined && perfil?.created_at) {
            const fecha = new Date(perfil.created_at);
            infoJoined.textContent = t('edit_extra.member_since') + ' ' + fecha.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } else if (infoJoined) {
            infoJoined.textContent = '--';
        }

        const color = perfil?.color_destacado || '#6366f1';
        if (infoColorText) infoColorText.textContent = color;
        if (infoColorDot) infoColorDot.style.background = color;

    } catch (error) {
        console.error('Error cargando perfil:', error);
        showToast('error', 'Error', 'No se pudieron cargar los datos del perfil.');
    }
}

// === FUNCIÓN: Actualizar contador de caracteres ===
function actualizarContadorCaracteres() {
    const descInput = document.getElementById('edit-description');
    const counter = document.getElementById('edit-char-counter');
    if (descInput && counter) {
        const current = descInput.value.length;
        counter.textContent = `${current}/1500`;
        if (current > 1500) {
            counter.style.color = 'var(--error)';
        } else {
            counter.style.color = 'var(--text-muted)';
        }
    }
}

// === FUNCIÓN: Actualizar vista previa del color ===
function actualizarVistaPreviaColor(color) {
    const preview = document.getElementById('edit-color-preview');
    if (preview) {
        preview.style.backgroundColor = color;
        preview.style.borderColor = color;
    }
}

// === FUNCIÓN: Manejar el correo borroso ===
function toggleCorreoVisibility() {
    const container = document.getElementById('edit-email-container');
    if (!container) return;

    const isBlurred = container.classList.contains('blurred');

    if (isBlurred) {
        // Revelar correo (QUITAR blur)
        container.classList.remove('blurred');

        // Limpiar timeout anterior
        if (timeoutOcultarCorreo) {
            clearTimeout(timeoutOcultarCorreo);
        }

        // Programar ocultamiento automático en 5 minutos
        timeoutOcultarCorreo = setTimeout(() => {
            container.classList.add('blurred');
        }, 5 * 60 * 1000); // 5 minutos
    } else {
        // Ocultar manualmente (AÑADIR blur)
        container.classList.add('blurred');
        if (timeoutOcultarCorreo) {
            clearTimeout(timeoutOcultarCorreo);
            timeoutOcultarCorreo = null;
        }
    }
}

async function guardarCambiosPerfil(e) {
    if (e) e.preventDefault();

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        showToast('error', 'Acceso denegado', 'Debes iniciar sesión.');
        return;
    }

    const username = document.getElementById('edit-username').value.trim();
    const nombre = document.getElementById('edit-firstname').value.trim();
    const apellidos = document.getElementById('edit-lastname').value.trim();
    const descripcion = document.getElementById('edit-description').value.trim();
    const sexo = document.getElementById('edit-gender').value;
    const colorPicker = document.getElementById('edit-color-picker');
    const colorHex = colorPicker ? colorPicker.value : '#6366f1';

    if (!username || username.length < 3) {
        showToast('error', 'Error', 'El nombre de usuario debe tener al menos 3 caracteres.');
        return;
    }

    if (descripcion && descripcion.length > 1500) {
        showToast('error', 'Error', 'La descripción no puede exceder los 1500 caracteres.');
        return;
    }

    const btnGuardar = document.getElementById('btn-save-profile');
    const textoOriginal = btnGuardar.innerHTML;
    btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> GUARDANDO...';
    btnGuardar.disabled = true;

    try {
        // 1. ACTUALIZAR TABLA USUARIOS
        const { data: updateData, error: errorUpdate } = await supabase
            .from('usuarios')
            .update({
                username: username,
                nombre: nombre,
                apellidos: apellidos,
                descripcion: descripcion,
                sexo: sexo,
                color_destacado: colorHex,
                updated_at: new Date().toISOString()
            })
            .eq('email', session.user.email)
            .select();

        if (errorUpdate) throw errorUpdate;

        // 2. ACTUALIZAR DIRECTAMENTE LA VISTA perfiles_publicos. Si la vista tiene WITH CHECK OPTION, esto funcionará
        const { error: errorView } = await supabase
            .from('perfiles_publicos')
            .update({
                username: username,
                nombre: nombre,
                apellidos: apellidos,
                descripcion: descripcion,
                sexo: sexo,
                color_destacado: colorHex
            })
            .eq('auth_id', session.user.id);

        if (errorView) {
            console.warn('⚠️ No se pudo actualizar perfiles_publicos directamente:', errorView);
            // Si falla, intentamos con RPC
            await supabase.rpc('refresh_perfil_publico', { user_id: session.user.id });
        }

        // 3. ACTUALIZAR LA SESIÓN DE SUPABASE (para que el cambio sea inmediato)
        await supabase.auth.updateUser({
            data: {
                username: username,
                nombre: nombre,
                apellidos: apellidos,
                descripcion: descripcion,
                sexo: sexo,
                color_destacado: colorHex
            }
        });

        // Guardar en localStorage
        localStorage.setItem('dp_user_color', colorHex);
        localStorage.removeItem('dp_user_color_temp');

        // Actualizar UI
        const dropdownUsername = document.getElementById('dropdown-username');
        if (dropdownUsername) dropdownUsername.textContent = username;

        const mainProfileUsername = document.getElementById('main-profile-username');
        if (mainProfileUsername) mainProfileUsername.textContent = username;

        // FORZAR RECARGA DE PERFIL PÚBLICO
        await cargarPerfilPublico(username);

        showToast('success', '¡Guardado!', `Usuario actualizado a: ${username}`);

        btnGuardar.innerHTML = textoOriginal;
        btnGuardar.disabled = false;

        // Volver al perfil
        setTimeout(() => {
            cambiarVista('profile', true, username);
        }, 1500);

    } catch (error) {
        console.error('❌ Error guardando perfil:', error);
        showToast('error', 'Error', 'No se pudieron guardar los cambios: ' + error.message);
        btnGuardar.innerHTML = textoOriginal;
        btnGuardar.disabled = false;
    }
}

function limpiarVistaEditarPerfil() {
    // Ocultar correo automáticamente
    const emailContainer = document.getElementById('edit-email-container');
    if (emailContainer) {
        emailContainer.classList.add('blurred');
    }

    // Limpiar timeout
    if (timeoutOcultarCorreo) {
        clearTimeout(timeoutOcultarCorreo);
        timeoutOcultarCorreo = null;
    }

    // RESTAURAR EL COLOR GUARDADO DEL USUARIO
    const colorGuardado = localStorage.getItem('dp_user_color') || '#6366f1';
    aplicarColorDinamico(colorGuardado);

    // Limpiar el color temporal
    localStorage.removeItem('dp_user_color_temp');
}

// === INICIALIZACIÓN DE LISTENERS ===
function inicializarEditProfile() {
    // Cargar datos del perfil (rellena los inputs)
    cargarDatosPerfil();

    document.querySelector('.edit-profile-description').textContent = t('edit_extra.description');
    document.querySelector('.edit-personal-title').textContent = t('edit.personal_data');

    // Guardar la vista anterior
    if (vistaActualGlobal !== 'edit-profile') {
        vistaAnteriorAlEditar = vistaActualGlobal;
        localStorage.setItem('vista_anterior_editar', vistaAnteriorAlEditar);
    }

    // Cargar el color GUARDADO (no el temporal)
    const colorGuardado = localStorage.getItem('dp_user_color') || '#6366f1';
    const colorPicker = document.getElementById('edit-color-picker');
    if (colorPicker) {
        colorPicker.value = colorGuardado;
        // Aplicar en pantalla pero SIN guardar
        aplicarColorDinamicoLocal(colorGuardado);
    }

    // Click en el correo para revelar/ocultar
    const emailContainer = document.getElementById('edit-email-container');
    if (emailContainer) {
        emailContainer.removeEventListener('click', toggleCorreoVisibility);
        emailContainer.addEventListener('click', toggleCorreoVisibility);
    }

    // Botón guardar
    const btnGuardar = document.getElementById('btn-save-profile');
    if (btnGuardar) {
        btnGuardar.removeEventListener('click', guardarCambiosPerfil);
        btnGuardar.addEventListener('click', guardarCambiosPerfil);
    }

    // Contador de caracteres en tiempo real
    const descInput = document.getElementById('edit-description');
    if (descInput) {
        descInput.removeEventListener('input', actualizarContadorCaracteres);
        descInput.addEventListener('input', actualizarContadorCaracteres);
    }

    // Botones de colores predefinidos
    document.querySelectorAll('.color-preset-btn').forEach(btn => {
        btn.removeEventListener('click', handleColorPresetClick);
        btn.addEventListener('click', handleColorPresetClick);
    });

    // ===== Selector de Sexo =====
    const genderTrigger = document.getElementById('gender-select-trigger');
    const genderDropdown = document.getElementById('gender-select-dropdown');
    const genderLabel = document.getElementById('gender-select-label');
    const genderInput = document.getElementById('edit-gender');
    const genderWrapper = document.getElementById('gender-select-wrapper');

    if (genderTrigger && genderDropdown) {
        // Abrir/cerrar el dropdown
        genderTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            genderWrapper.classList.toggle('open');
        });

        // Seleccionar opción
        genderDropdown.querySelectorAll('.cyber-select-option').forEach(opt => {
            opt.addEventListener('click', () => {
                const value = opt.dataset.value;
                const label = opt.textContent.trim();

                // Actualizar label y input oculto
                genderLabel.textContent = label;
                genderInput.value = value;

                // Marcar como seleccionado
                genderDropdown.querySelectorAll('.cyber-select-option').forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');

                // Cerrar dropdown
                genderWrapper.classList.remove('open');
            });
        });

        // Cerrar al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (!genderWrapper.contains(e.target)) {
                genderWrapper.classList.remove('open');
            }
        });
    }
}

function handleColorChange(e) {
    const color = e.target.value;
    // SOLO APLICAR EN PANTALLA, NUNCA GUARDAR
    aplicarColorDinamicoLocal(color);
}

// Aplica el color SOLO en pantalla (sin guardar)
function aplicarColorDinamicoLocal(colorHex) {
    if (!colorHex) return;

    // Guardar en localStorage temporal (para que se mantenga mientras editas)
    localStorage.setItem('dp_user_color_temp', colorHex);

    // Aplicar color en toda la web (igual que antes)
    document.documentElement.style.setProperty('--primary', colorHex);

    const colorSecundario = '#2dd4bf';
    document.documentElement.style.setProperty('--gradient-primary', `linear-gradient(135deg, ${colorHex}, ${colorSecundario})`);

    const rgb = hexToRgb(colorHex);
    if (rgb) {
        document.documentElement.style.setProperty('--primary-soft', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`);
        document.documentElement.style.setProperty('--neon-glow', `0 0 12px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4), 0 0 8px rgba(45, 212, 191, 0.2)`);

        // Actualizar sombras de botones
        document.querySelectorAll('.auth-btn.primary, #btn-save-profile, #btn-admin-announce').forEach(btn => {
            if (btn) btn.style.boxShadow = `0 4px 20px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`;
        });
    }

    // Actualizar el color picker y preview
    const colorPicker = document.getElementById('edit-color-picker');
    const colorPreview = document.getElementById('edit-color-preview');
    const hexDisplay = document.getElementById('edit-color-hex-display');
    const colorDot = document.getElementById('edit-profile-color-dot');
    const colorText = document.getElementById('edit-profile-color-text');

    if (colorPicker) colorPicker.value = colorHex;
    if (colorPreview) {
        colorPreview.style.backgroundColor = colorHex;
        colorPreview.style.borderColor = colorHex;
    }
    if (hexDisplay) hexDisplay.textContent = colorHex;
    if (colorDot) colorDot.style.background = colorHex;
    if (colorText) colorText.textContent = colorHex;

    // Actualizar scrollbar
    const style = document.getElementById('dynamic-scrollbar-style') || document.createElement('style');
    style.id = 'dynamic-scrollbar-style';
    style.textContent = `*::-webkit-scrollbar-thumb { background: ${colorHex} !important; }`;
    document.head.appendChild(style);
}

function handleColorPresetClick(e) {
    const color = e.target.dataset.color;
    if (!color) return;
    // SOLO APLICAR EN PANTALLA (sin guardar)
    aplicarColorDinamicoLocal(color);
}

// ==========================================================================
//   VOLVER AL PERFIL DESDE EDITAR
// ==========================================================================

document.getElementById('btn-back-to-profile')?.addEventListener('click', () => {
    // Obtener el username actual del perfil
    const usernameDisplay = document.getElementById('main-profile-username');
    const username = usernameDisplay?.textContent || null;

    // Si no hay username, ir a profile sin parámetro
    if (username && username !== 'Usuario') {
        cambiarVista('profile', true, username);
    } else {
        cambiarVista('profile', true);
    }
});

function aplicarColorDinamico(colorHex) {
    if (!colorHex) return;

    // Guardar en localStorage permanente
    localStorage.setItem('dp_user_color', colorHex);
    colorUsuarioActual = colorHex;

    // Aplicar color en toda la web (mismo código que aplicarColorDinamicoLocal)
    document.documentElement.style.setProperty('--primary', colorHex);

    const colorSecundario = '#2dd4bf';
    document.documentElement.style.setProperty('--gradient-primary', `linear-gradient(135deg, ${colorHex}, ${colorSecundario})`);

    const rgb = hexToRgb(colorHex);
    if (rgb) {
        document.documentElement.style.setProperty('--primary-soft', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`);
        document.documentElement.style.setProperty('--neon-glow', `0 0 12px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4), 0 0 8px rgba(45, 212, 191, 0.2)`);

        document.querySelectorAll('.auth-btn.primary, #btn-save-profile, #btn-admin-announce').forEach(btn => {
            if (btn) btn.style.boxShadow = `0 4px 20px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`;
        });
    }

    const colorPicker = document.getElementById('edit-color-picker');
    const colorPreview = document.getElementById('edit-color-preview');
    const hexDisplay = document.getElementById('edit-color-hex-display');
    const colorDot = document.getElementById('edit-profile-color-dot');
    const colorText = document.getElementById('edit-profile-color-text');

    if (colorPicker) colorPicker.value = colorHex;
    if (colorPreview) {
        colorPreview.style.backgroundColor = colorHex;
        colorPreview.style.borderColor = colorHex;
    }
    if (hexDisplay) hexDisplay.textContent = colorHex;
    if (colorDot) colorDot.style.background = colorHex;
    if (colorText) colorText.textContent = colorHex;

    const userIcon = document.querySelector('#user-profile i, #user-profile img');
    if (userIcon && userIcon.tagName === 'I') userIcon.style.color = colorHex;

    const editHeader = document.querySelector('.edit-profile-admin-header');
    if (editHeader) editHeader.style.borderTopColor = colorHex;

    document.querySelectorAll('.announce-panel, .add-friend-panel, .social-list-panel').forEach(el => {
        el.style.borderTopColor = colorHex;
    });

    const statusDot = document.querySelector('.edit-profile-admin-dot');
    if (statusDot) {
        statusDot.style.background = colorHex;
        statusDot.style.boxShadow = `0 0 10px ${colorHex}`;
    }

    const statusBox = document.querySelector('.edit-profile-admin-status');
    if (statusBox && rgb) {
        statusBox.style.borderColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`;
        statusBox.style.background = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.05)`;
    }

    const style = document.getElementById('dynamic-scrollbar-style') || document.createElement('style');
    style.id = 'dynamic-scrollbar-style';
    style.textContent = `*::-webkit-scrollbar-thumb { background: ${colorHex} !important; }`;
    document.head.appendChild(style);

    // Actualizar color de la barra de progreso si está visible
    const bar = document.getElementById('series-progress-bar');
    if (bar) {
        bar.style.background = colorHex;
    }
}

// === Convertir HEX a RGB ===
function hexToRgb(hex) {
    // Eliminar # si existe
    hex = hex.replace('#', '');

    // Si es de 3 dígitos, convertirlo a 6
    if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('');
    }

    const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

// ==========================================================================
//   CARGAR COLOR GUARDADO AL INICIAR
// ==========================================================================

// Cargar color desde localStorage (rápido) o desde Supabase (cuando se autentique)
async function cargarColorInicial() {
    // 1. Intentar cargar desde localStorage permanente
    const localColor = localStorage.getItem('dp_user_color');
    if (localColor) {
        aplicarColorDinamico(localColor);
    }

    // 2. Verificar sesión y cargar desde Supabase (sobrescribe si hay diferencia)
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        try {
            const { data: perfil } = await supabase
                .from('usuarios')
                .select('color_destacado')
                .eq('email', session.user.email)
                .single();

            if (perfil?.color_destacado) {
                const color = perfil.color_destacado;
                // Si el color en Supabase es diferente, aplicar el de Supabase
                if (color !== localStorage.getItem('dp_user_color')) {
                    aplicarColorDinamico(color);
                }
            }
        } catch (error) {
            console.error('Error cargando color desde Supabase:', error);
        }
    }

    // Si hay un color temporal (por edición sin guardar), lo limpiamos
    localStorage.removeItem('dp_user_color_temp');
}

// Ejecutar al cargar la página
cargarColorInicial();

// ==========================================================================
//   PERSISTENCIA DE BÚSQUEDA E HISTORIAL
// ==========================================================================

// === FUNCIÓN: Guardar búsqueda en el historial ===
function guardarEnHistorial(tipo, query) {
    if (!query || query.trim() === '') return;

    const key = `search_history_${tipo}`; // search_history_games, search_history_movies, search_history_tv
    let historial = JSON.parse(localStorage.getItem(key)) || [];

    // Eliminar duplicados (si ya existe, lo movemos al principio)
    historial = historial.filter(item => item.toLowerCase() !== query.toLowerCase());

    // Añadir al principio (más reciente)
    historial.unshift(query.trim());

    // Limitar a 20 búsquedas
    if (historial.length > 20) {
        historial = historial.slice(0, 20);
    }

    localStorage.setItem(key, JSON.stringify(historial));
}

// === FUNCIÓN: Cargar historial de búsqueda ===
function cargarHistorial(tipo) {
    const key = `search_history_${tipo}`;
    const historial = JSON.parse(localStorage.getItem(key)) || [];
    return historial;
}

// === FUNCIÓN: Eliminar una búsqueda del historial ===
function eliminarDelHistorial(tipo, query) {
    const key = `search_history_${tipo}`;
    let historial = JSON.parse(localStorage.getItem(key)) || [];
    historial = historial.filter(item => item.toLowerCase() !== query.toLowerCase());
    localStorage.setItem(key, JSON.stringify(historial));
    mostrarHistorial(tipo); // Refrescar la UI
}

// === FUNCIÓN: Mostrar historial en el input ===
function mostrarHistorial(tipo) {
    const historial = cargarHistorial(tipo);
    const inputId = tipo === 'games' ? 'search-juegos' :
        tipo === 'movies' ? 'search-movies' : 'search-series';
    const input = document.getElementById(inputId);
    if (!input) return;

    let container = document.getElementById(`history-container-${tipo}`);
    if (!container) {
        container = document.createElement('div');
        container.id = `history-container-${tipo}`;
        container.className = 'search-history-dropdown';

        // Eliminamos las manipulaciones en línea del z-index para que respete style.css
        container.style.position = 'absolute';

        const searchBox = input.closest('.search-box');
        if (searchBox) {
            searchBox.style.position = 'relative';
            searchBox.style.overflow = 'visible';
            searchBox.appendChild(container);
        } else {
            input.parentNode.style.position = 'relative';
            input.parentNode.style.overflow = 'visible';
            input.parentNode.appendChild(container);
        }
    }

    if (historial.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    container.innerHTML = `
        <div class="search-history-header">
            <span>${t('search_extra.recent')}</span>
            <button class="search-history-clear-all" onclick="limpiarHistorialCompleto('${tipo}')">
                <i class="fas fa-trash-alt"></i>
                <span>${t('search_extra.clear_all')}</span>
            </button>
        </div>
        ${historial.map(item => `
            <div class="search-history-item" onclick="aplicarBusquedaDesdeHistorial('${tipo}', '${item.replace(/'/g, "\\'")}')">
                <span><i class="fas fa-clock"></i> ${item}</span>
                <button class="search-history-delete" onclick="event.stopPropagation(); eliminarDelHistorial('${tipo}', '${item.replace(/'/g, "\\'")}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('')}
    `;
}

// === FUNCIÓN: Aplicar búsqueda desde el historial ===
window.aplicarBusquedaDesdeHistorial = function (tipo, query) {
    const inputId = tipo === 'games' ? 'search-juegos' :
        tipo === 'movies' ? 'search-movies' : 'search-series';
    const input = document.getElementById(inputId);
    if (input) {
        input.value = query;
        // Disparar la búsqueda
        if (tipo === 'games') {
            cargarJuegosIGDB(query);
        } else if (tipo === 'movies') {
            cargarTMDB('movie', query);
        } else if (tipo === 'tv') {
            cargarTMDB('tv', query);
        }
    }
    // Ocultar el historial
    const container = document.getElementById(`history-container-${tipo}`);
    if (container) container.style.display = 'none';
};

// === FUNCIÓN: Limpiar todo el historial ===
window.limpiarHistorialCompleto = function (tipo) {
    const key = `search_history_${tipo}`;
    localStorage.setItem(key, JSON.stringify([]));
    mostrarHistorial(tipo);
};

// === FUNCIÓN: Mostrar/ocultar historial al hacer focus en el input ===
function configurarHistorialInput(inputId, tipo) {
    const input = document.getElementById(inputId);
    if (!input) return;

    // Desactivar autocompletado nativo
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('autocorrect', 'off');
    input.setAttribute('autocapitalize', 'off');
    input.setAttribute('spellcheck', 'false');

    // Mostrar historial al hacer focus
    input.addEventListener('focus', () => {
        mostrarHistorial(tipo);
    });

    // Ocultar historial al hacer clic fuera
    document.addEventListener('click', (e) => {
        const container = document.getElementById(`history-container-${tipo}`);
        if (container && !input.parentNode.contains(e.target)) {
            container.style.display = 'none';
        }
    });

    // Guardar en historial al hacer submit (Enter o clic en botón)
    const btnId = tipo === 'games' ? 'btn-buscar-juegos' :
        tipo === 'movies' ? 'btn-buscar-movies' : 'btn-buscar-series';
    const btn = document.getElementById(btnId);

    const guardarYBuscar = () => {
        const query = input.value.trim();
        if (query) {
            guardarEnHistorial(tipo, query);
            setTimeout(() => mostrarHistorial(tipo), 100);
        }
    };

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            guardarYBuscar();
        }
    });

    if (btn) {
        btn.addEventListener('click', guardarYBuscar);
    }
}

// === FUNCIÓN: Cargar búsqueda guardada al hacer F5 ===
function cargarBusquedaGuardada(tipo) {
    const key = `last_search_${tipo}`;
    const busqueda = localStorage.getItem(key);
    if (busqueda) {
        const inputId = tipo === 'games' ? 'search-juegos' :
            tipo === 'movies' ? 'search-movies' : 'search-series';
        const input = document.getElementById(inputId);
        if (input) {
            input.value = busqueda;
            // Disparar la búsqueda automáticamente
            if (tipo === 'games') {
                cargarJuegosIGDB(busqueda);
            } else if (tipo === 'movies') {
                cargarTMDB('movie', busqueda);
            } else if (tipo === 'tv') {
                cargarTMDB('tv', busqueda);
            }
        }
    }
}

// === CONFIGURAR HISTORIAL PARA CADA TIPO ===
configurarHistorialInput('search-juegos', 'games');
configurarHistorialInput('search-movies', 'movies');
configurarHistorialInput('search-series', 'tv');

// === CARGAR BÚSQUEDAS GUARDADAS AL INICIAR ===
setTimeout(() => {
    cargarBusquedaGuardada('games');
    cargarBusquedaGuardada('movies');
    cargarBusquedaGuardada('tv');
}, 500);

// ==========================================================================
//   WATCHLIST TVTIME — Episodios pendientes de series en progreso (CON CACHÉ)
// ==========================================================================

window.sincronizarWatchlistGlobal = async function () {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const userId = session.user.id;

    // 1. Destruimos la caché en RAM para forzar una lectura fresca
    sessionStorage.removeItem(`watchlist_tv_${userId}`);

    // 2. Comprobamos si el usuario está viendo su propio perfil de fondo
    const seccionWatchlist = document.getElementById('watchlist-section');
    const viewPerfil = document.getElementById('profile');

    if (seccionWatchlist && viewPerfil && viewPerfil.classList.contains('active')) {
        const nombrePerfilVisto = document.getElementById('main-profile-username')?.textContent;
        const miNombre = session.user.user_metadata?.username || session.user.email.split('@')[0];

        // Si es tu propio perfil, recargamos la lista visualmente en segundo plano
        if (nombrePerfilVisto === miNombre) {
            const lista = document.getElementById('watchlist-list');
            if (lista) {
                lista.innerHTML = `
                    <div class="watchlist-loading" style="padding: 20px;">
                        <i class="fas fa-circle-notch fa-spin" style="color: var(--primary);"></i>
                    </div>
                `;
            }
            await cargarWatchlistTVTime(userId, true);
        }
    }
};

async function cargarWatchlistTVTime(userId, esMiPerfil) {
    const seccion = document.getElementById('watchlist-section');
    const lista = document.getElementById('watchlist-list');
    if (!seccion || !lista) return;

    // Ocultar/seccionar si no hay datos aún
    seccion.style.display = 'block';

    const cacheKey = `watchlist_tv_${userId}`;
    const cachedData = sessionStorage.getItem(cacheKey);
    let seriesEnProgreso = [];

    // 1. COMPROBAR CACHÉ
    if (cachedData) {
        seriesEnProgreso = JSON.parse(cachedData);
        seriesEnProgreso.forEach(s => s.epVistos = new Set(s.epVistos));
    } else {
        // 2. SIN CACHÉ: Traer TODOS los episodios de tv marcados por este usuario
        let todosLosEp = [];
        let keepFetching = true;
        let offset = 0;
        const LIMIT = 1000;

        while (keepFetching) {
            const { data, error } = await supabase
                .from('user_media')
                .select('media_id, visto, fecha_vista')
                .eq('user_id', userId)
                .eq('tipo', 'tv_episode')
                .eq('visto', true)
                .range(offset, offset + LIMIT - 1);

            if (error || !data || data.length === 0) { keepFetching = false; break; }
            todosLosEp.push(...data);
            offset += LIMIT;
            if (data.length < LIMIT) keepFetching = false;
        }

        if (todosLosEp.length === 0) {
            seccion.style.display = 'none';
            return;
        }

        const seriesMap = new Map();
        todosLosEp.forEach(item => {
            const partes = item.media_id.split('_');
            if (partes.length < 3) return;
            const tmdbId = partes[0];
            const codEp = `${partes[1]}_${partes[2]}`;
            if (!seriesMap.has(tmdbId)) seriesMap.set(tmdbId, { epVistos: new Set(), ultimaFecha: '' });
            const entry = seriesMap.get(tmdbId);
            entry.epVistos.add(codEp);
            if (item.fecha_vista && item.fecha_vista > entry.ultimaFecha) {
                entry.ultimaFecha = item.fecha_vista;
            }
        });

        // 3. Peticiones masivas a TMDB
        const entries = [...seriesMap.entries()];
        const CHUNK = 5;

        for (let i = 0; i < entries.length; i += CHUNK) {
            const chunk = entries.slice(i, i + CHUNK);
            await Promise.all(chunk.map(async ([tmdbId, { epVistos, ultimaFecha }]) => {
                try {
                    // Usar tmdbId en lugar de peli.media_id
                    const res = await fetch(`/api/tmdb?id=${tmdbId}&tipo=tv&lang=${currentLang}`);
                    if (!res.ok) return;
                    const data = await res.json();

                    const temporadasReales = (data.temporadas_info || []).filter(s => s.season_number > 0);
                    const totalEpsSerie = temporadasReales.reduce((acc, s) => acc + s.episode_count, 0);
                    const epVistosReales = [...epVistos].filter(cod => !cod.startsWith('T0_'));

                    if (epVistosReales.length >= totalEpsSerie && totalEpsSerie > 0) return;

                    let siguienteEp = null;
                    let totalPendientes = 0;

                    for (const temp of temporadasReales) {
                        for (let e = 1; e <= temp.episode_count; e++) {
                            const cod = `T${temp.season_number}_E${e}`;
                            if (!epVistos.has(cod)) {
                                totalPendientes++;
                                if (!siguienteEp) {
                                    siguienteEp = { temporada: temp.season_number, episodio: e, totalTemp: temp.episode_count };
                                }
                            }
                        }
                    }

                    if (!siguienteEp) return;

                    let epNombre = '';
                    let epPoster = '';

                    try {
                        const resEp = await fetch(`/api/tmdb?id=${tmdbId}&tipo=tv_season&season=${siguienteEp.temporada}`);
                        if (resEp.ok) {
                            const epData = await resEp.json();
                            const epInfo = epData.episodes?.find(e => e.episode_number === siguienteEp.episodio);
                            epNombre = epInfo?.name || '';
                            epPoster = epInfo?.still_path ? `https://image.tmdb.org/t/p/w300${epInfo.still_path}` : '';
                        }
                    } catch (_) { }

                    seriesEnProgreso.push({
                        tmdbId,
                        nombre: data.titulo || data.title || '',
                        poster: data.poster ? data.poster : '',
                        temporada: siguienteEp.temporada,
                        episodio: siguienteEp.episodio,
                        epNombre,
                        epPoster,
                        pendientes: totalPendientes - 1,
                        ultimaFecha,
                        epVistos
                    });

                } catch (_) { }
            }));
        }

        // 4. Ordenamos y GUARDAMOS EN CACHÉ
        seriesEnProgreso.sort((a, b) => {
            if (b.ultimaFecha && a.ultimaFecha) return b.ultimaFecha.localeCompare(a.ultimaFecha);
            if (b.ultimaFecha) return 1;
            if (a.ultimaFecha) return -1;
            return 0;
        });

        // Convertimos el Set a Array temporalmente para poder guardarlo como string JSON
        const cachePayload = seriesEnProgreso.map(s => ({ ...s, epVistos: [...s.epVistos] }));
        sessionStorage.setItem(cacheKey, JSON.stringify(cachePayload));
    }

    if (seriesEnProgreso.length === 0) {
        seccion.style.display = 'none';
        return;
    }

    // 5. Sincronizar window.episodiosVistosActuales con los datos de la watchlist
    if (esMiPerfil) {
        if (!window.episodiosVistosActuales) {
            window.episodiosVistosActuales = new Set();
        }
        seriesEnProgreso.forEach(serie => {
            serie.epVistos.forEach(ep => {
                window.episodiosVistosActuales.add(ep);
            });
        });
    }

    // 6. Pintamos el HTML
    seccion.style.display = 'block';
    lista.innerHTML = '';

    seriesEnProgreso.forEach((serie) => {
        const extra = serie.pendientes > 0 ? `<span class="watchlist-ep-extra">+${serie.pendientes}</span>` : '';
        const imgParaFondo = serie.epPoster || serie.poster || '';

        const thumbHtml = serie.epPoster
            ? `<img src="${serie.epPoster}" alt="${serie.epNombre}" loading="lazy">`
            : (serie.poster ? `<img src="${serie.poster}" alt="${serie.nombre}" loading="lazy">` : `<div class="watchlist-thumb-placeholder"><i class="fas fa-tv"></i></div>`);

        const item = document.createElement('div');
        item.className = 'watchlist-item';
        item.dataset.tmdbId = serie.tmdbId;

        item.innerHTML = `
            ${imgParaFondo ? `<div class="watchlist-item-bg" style="background-image: url('${imgParaFondo}')"></div>` : ''}
            <div class="watchlist-item-content">
                <div class="watchlist-thumb">${thumbHtml}</div>
                <div class="watchlist-info">
                    <span class="watchlist-show-name">
                        ${serie.nombre} <i class="fas fa-chevron-right"></i>
                    </span>
                    <div class="watchlist-ep-title">
                        <span class="watchlist-ep-code">T${String(serie.temporada).padStart(2, '0')} | E${String(serie.episodio).padStart(2, '0')} ${extra}</span>
                    </div>
                    <div class="watchlist-ep-name">${serie.epNombre}</div>
                </div>
                <button class="watchlist-check-btn" title="Marcar episodio como visto"
                    data-tmdb="${serie.tmdbId}"
                    data-season="${serie.temporada}"
                    data-episode="${serie.episodio}"
                    data-user="${userId}">
                    <i class="fas fa-check"></i>
                </button>
            </div>
        `;

        item.querySelector('.watchlist-show-name').addEventListener('click', (e) => {
            e.stopPropagation();
            abrirModalMedia(parseInt(serie.tmdbId), 'tv', true);
        });

        item.querySelector('.watchlist-check-btn').addEventListener('click', async (e) => {
            e.stopPropagation();
            const btn = e.currentTarget;
            btn.disabled = true;
            btn.style.opacity = '0.5';
            const mediaId = `${serie.tmdbId}_T${serie.temporada}_E${serie.episodio}`;

            try {
                const { error: upsertError } = await supabase.from('user_media').upsert({
                    user_id: userId, media_id: mediaId, tipo: 'tv_episode', visto: true, veces_vista: 1, fecha_vista: new Date().toISOString().split('T')[0]
                }, { onConflict: 'user_id,media_id' });

                if (upsertError) throw new Error(upsertError.message);
                serie.epVistos.add(`T${serie.temporada}_E${serie.episodio}`);

                if (esMiPerfil && window.episodiosVistosActuales) {
                    window.episodiosVistosActuales.add(`T${serie.temporada}_E${serie.episodio}`);
                }

                const resTV = await fetch(`/api/tmdb?id=${serie.tmdbId}&tipo=tv&lang=${currentLang}`);
                const dataTV = await resTV.json();
                const temporadasReales = (dataTV.temporadas_info || []).filter(s => s.season_number > 0);
                const totalEpsSerie = temporadasReales.reduce((acc, s) => acc + s.episode_count, 0);
                const epVistosReales = [...serie.epVistos].filter(c => !c.startsWith('T0_'));

                if (epVistosReales.length >= totalEpsSerie && totalEpsSerie > 0) {
                    const itemEl = btn.closest('.watchlist-item');
                    itemEl.style.opacity = '0';
                    itemEl.style.transition = 'opacity 0.3s ease';
                    setTimeout(() => {
                        itemEl.remove();
                        if (lista.querySelectorAll('.watchlist-item').length === 0) seccion.style.display = 'none';
                    }, 300);
                    const idx = seriesEnProgreso.findIndex(s => s.tmdbId === serie.tmdbId);
                    if (idx > -1) seriesEnProgreso.splice(idx, 1);
                    sessionStorage.setItem(cacheKey, JSON.stringify(seriesEnProgreso.map(s => ({ ...s, epVistos: [...s.epVistos] }))));
                    return;
                }

                let siguienteEp = null;
                let totalPendientes = 0;
                for (const temp of temporadasReales) {
                    for (let ep = 1; ep <= temp.episode_count; ep++) {
                        const cod = `T${temp.season_number}_E${ep}`;
                        if (!serie.epVistos.has(cod)) {
                            totalPendientes++;
                            if (!siguienteEp) siguienteEp = { temporada: temp.season_number, episodio: ep };
                        }
                    }
                }

                if (!siguienteEp) {
                    btn.closest('.watchlist-item').remove();
                    return;
                }

                let nuevoNombre = '';
                let nuevoPoster = '';
                try {
                    const resEp = await fetch(`/api/tmdb?id=${serie.tmdbId}&tipo=tv_season&season=${siguienteEp.temporada}`);
                    if (resEp.ok) {
                        const epData = await resEp.json();
                        const epInfo = epData.episodes?.find(e => e.episode_number === siguienteEp.episodio);
                        nuevoNombre = epInfo?.name || '';
                        nuevoPoster = epInfo?.still_path ? `https://image.tmdb.org/t/p/w300${epInfo.still_path}` : '';
                    }
                } catch (_) { }

                serie.temporada = siguienteEp.temporada;
                serie.episodio = siguienteEp.episodio;
                serie.epNombre = nuevoNombre;
                serie.pendientes = totalPendientes - 1;
                serie.ultimaFecha = new Date().toISOString().split('T')[0];

                const itemEl = btn.closest('.watchlist-item');
                const extra = serie.pendientes > 0 ? `<span class="watchlist-ep-extra">+${serie.pendientes}</span>` : '';
                const nuevoFondo = nuevoPoster || serie.poster || '';
                const thumbHtml = nuevoPoster
                    ? `<img src="${nuevoPoster}" alt="${nuevoNombre}" loading="lazy">`
                    : (serie.poster ? `<img src="${serie.poster}" alt="${serie.nombre}" loading="lazy">` : `<div class="watchlist-thumb-placeholder"><i class="fas fa-tv"></i></div>`);

                const bgEl = itemEl.querySelector('.watchlist-item-bg');
                if (bgEl && nuevoFondo) bgEl.style.backgroundImage = `url('${nuevoFondo}')`;
                itemEl.querySelector('.watchlist-thumb').innerHTML = thumbHtml;
                itemEl.querySelector('.watchlist-ep-code').innerHTML = `T${String(serie.temporada).padStart(2, '0')} | E${String(serie.episodio).padStart(2, '0')} ${extra}`;
                itemEl.querySelector('.watchlist-ep-name').textContent = nuevoNombre;

                lista.prepend(itemEl);
                itemEl.style.transition = 'background 0.3s ease';
                itemEl.style.background = 'rgba(16, 185, 129, 0.1)';
                setTimeout(() => { itemEl.style.background = 'var(--bg-card)'; }, 800);

                btn.disabled = false;
                btn.style.opacity = '1';
                sessionStorage.setItem(cacheKey, JSON.stringify(seriesEnProgreso.map(s => ({ ...s, epVistos: [...s.epVistos] }))));

            } catch (err) {
                console.error('Error marcando episodio:', err);
                btn.disabled = false;
                btn.style.opacity = '1';
            }
        });

        lista.appendChild(item);
    });

    // Lógica de vista Grid/List con LocalStorage
    const btnToggle = document.getElementById('btn-watchlist-toggle-grid');
    if (btnToggle) {
        const iconToggle = btnToggle.querySelector('i');
        const vistaPreferida = localStorage.getItem('watchlist_pref_vista') || 'grid';

        if (vistaPreferida === 'grid') {
            lista.classList.add('watchlist-grid-mode');
            iconToggle.className = 'fas fa-list';
        } else {
            lista.classList.remove('watchlist-grid-mode');
            iconToggle.className = 'fas fa-th-large';
        }

        btnToggle.onclick = () => {
            const esModoGrid = lista.classList.toggle('watchlist-grid-mode');
            if (esModoGrid) {
                iconToggle.className = 'fas fa-list';
                localStorage.setItem('watchlist_pref_vista', 'grid');
            } else {
                iconToggle.className = 'fas fa-th-large';
                localStorage.setItem('watchlist_pref_vista', 'lista');
            }
        };
    }
}

// ==========================================================================
//   SUBIDA Y RECORTE DE AVATAR CUSTOM
// ==========================================================================

let cropperAvatar = null;
let cropperBanner = null;

const avatarInput = document.getElementById('avatar-upload-input');
const bannerInput = document.getElementById('banner-upload-input');
const cropModal = document.getElementById('crop-modal');
const imageToCrop = document.getElementById('image-to-crop');
const btnCloseCrop = document.getElementById('btn-close-crop');
btnCloseCrop.setAttribute('aria-label', 'Cerrar editor de recorte');

// OBTENER EL BOTÓN DE FORMA SEGURA (con verificación)
let btnSaveCrop = document.getElementById('btn-save-crop');

function setModalTitle(text) {
    const titleEl = document.getElementById('crop-modal-title');
    if (titleEl) {
        titleEl.textContent = text;
    } else {
        const fallbackTitle = document.querySelector('#crop-modal .modal-header h2');
        if (fallbackTitle) fallbackTitle.textContent = text;
    }
}

// FUNCIÓN PARA RECREAR EL BOTÓN DE FORMA SEGURA
function recrearBoton(html) {
    // Buscar el botón actual
    let btn = document.getElementById('btn-save-crop');
    if (!btn) {
        // Si no existe, crearlo
        const container = document.querySelector('#crop-modal .modal-body > div:last-child');
        if (container) {
            btn = document.createElement('button');
            btn.id = 'btn-save-crop';
            btn.className = 'auth-btn primary full-width';
            btn.style.cssText = 'padding: 10px 20px; font-size: 0.85rem; letter-spacing: 1.5px; border-radius: 8px;';
            container.appendChild(btn);
        } else {
            console.error('❌ No se encontró el contenedor del botón');
            return null;
        }
    }
    btn.innerHTML = html;
    return btn;
}

// 1. Abrir explorador de archivos para AVATAR
const btnTriggerUpload = document.querySelector('.avatar-custom-btn');
if (btnTriggerUpload) {
    btnTriggerUpload.addEventListener('click', (e) => {
        e.preventDefault();
        avatarInput.click();
    });
}

// 2. Abrir explorador de archivos para BANNER
const btnTriggerBanner = document.querySelector('.custom-card-item.special-custom[onclick*="banner"]');
if (btnTriggerBanner) {
    btnTriggerBanner.addEventListener('click', (e) => {
        e.preventDefault();
        bannerInput.click();
    });
}

// 3. AVATAR: Al seleccionar archivo
avatarInput.addEventListener('change', function (e) {
    const files = e.target.files;
    if (files && files.length > 0) {
        const file = files[0];
        const reader = new FileReader();

        reader.onload = function (event) {
            imageToCrop.src = event.target.result;
            setModalTitle("RECORTAR AVATAR");

            // RECREAR EL BOTÓN EN LUGAR DE CLONAR
            const btn = recrearBoton('<i class="fas fa-cloud-upload-alt" style="margin-right:8px;"></i> SUBIR AVATAR');
            if (!btn) return;
            btnSaveCrop = btn;

            cropModal.classList.add('show');
            cropModal.classList.add('crop-avatar');

            // Destruir croppers anteriores
            if (cropperAvatar) cropperAvatar.destroy();
            if (cropperBanner) { cropperBanner.destroy(); cropperBanner = null; }

            // Crear cropper para avatar
            cropperAvatar = new Cropper(imageToCrop, {
                aspectRatio: 1,
                viewMode: 1,
                dragMode: 'move',
                autoCropArea: 0.9,
                restore: false,
                guides: true,
                center: true,
                highlight: false,
                cropBoxMovable: true,
                cropBoxResizable: true,
                toggleDragModeOnDblclick: false,
            });

            // Asignar evento
            btn.onclick = guardarAvatarCustom;
        };
        reader.readAsDataURL(file);
    }
    avatarInput.value = '';
});

// 4. BANNER: Al seleccionar archivo
bannerInput.addEventListener('change', function (e) {
    const files = e.target.files;
    if (files && files.length > 0) {
        const file = files[0];
        const reader = new FileReader();

        reader.onload = function (event) {
            imageToCrop.src = event.target.result;
            setModalTitle("RECORTAR PORTADA");

            // RECREAR EL BOTÓN EN LUGAR DE CLONAR
            const btn = recrearBoton('<i class="fas fa-cloud-upload-alt" style="margin-right:8px;"></i> SUBIR PORTADA');
            if (!btn) return;
            btnSaveCrop = btn;

            cropModal.classList.add('show');
            cropModal.classList.remove('crop-avatar');

            // Destruir croppers anteriores
            if (cropperBanner) cropperBanner.destroy();
            if (cropperAvatar) { cropperAvatar.destroy(); cropperAvatar = null; }

            // Crear cropper para banner
            cropperBanner = new Cropper(imageToCrop, {
                aspectRatio: 16 / 9,
                viewMode: 1,
                dragMode: 'move',
                autoCropArea: 0.9,
                restore: false,
                guides: true,
                center: true,
                highlight: false,
                cropBoxMovable: true,
                cropBoxResizable: true,
                toggleDragModeOnDblclick: false,
            });

            // Asignar evento
            btn.onclick = guardarBannerCustom;
        };
        reader.readAsDataURL(file);
    }
    bannerInput.value = '';
});

// 5. Cerrar Modal
if (btnCloseCrop) {
    btnCloseCrop.addEventListener('click', () => {
        cropModal.classList.remove('show');
        cropModal.classList.remove('crop-avatar');
        if (cropperAvatar) { cropperAvatar.destroy(); cropperAvatar = null; }
        if (cropperBanner) { cropperBanner.destroy(); cropperBanner = null; }
    });
}

// Cerrar al hacer clic fuera
cropModal.addEventListener('click', function (e) {
    if (e.target === cropModal) {
        cropModal.classList.remove('show');
        cropModal.classList.remove('crop-avatar');
        if (cropperAvatar) { cropperAvatar.destroy(); cropperAvatar = null; }
        if (cropperBanner) { cropperBanner.destroy(); cropperBanner = null; }
    }
});

// 6. Guardar AVATAR
async function guardarAvatarCustom() {
    if (!cropperAvatar) return;

    const btn = document.getElementById('btn-save-crop');
    if (!btn) return;

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right:8px;"></i> SUBIENDO...';

    cropperAvatar.getCroppedCanvas({
        width: 500,
        height: 500,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
    }).toBlob(async (blob) => {
        try {
            const uniqueHash = Date.now().toString(36) + Math.random().toString(36).substring(2);
            const fileName = `custom_avatar_${uniqueHash}.png`;

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                alert('Debes iniciar sesión para subir un avatar.');
                throw new Error("No hay usuario autenticado");
            }

            const { error } = await supabase.storage
                .from('avatares')
                .upload(`${user.id}/${fileName}`, blob, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('avatares')
                .getPublicUrl(`${user.id}/${fileName}`);

            const { error: dbError } = await supabase
                .from('usuarios')
                .update({ avatar: publicUrl })
                .eq('email', user.email);

            if (dbError) throw dbError;

            // Actualizar UI
            const profileAvatarDiv = document.querySelector('.profile-avatar');
            if (profileAvatarDiv) {
                const overlay = profileAvatarDiv.querySelector('.edit-overlay-avatar');
                profileAvatarDiv.innerHTML = '';
                if (overlay) profileAvatarDiv.appendChild(overlay);
                profileAvatarDiv.insertAdjacentHTML('beforeend', `<img src="${publicUrl}" alt="URL" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`);
            }

            const navAvatar = document.getElementById('user-profile');
            if (navAvatar) {
                navAvatar.innerHTML = `<img src="${publicUrl}" alt="URL" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
            }

            cropModal.classList.remove('show');
            if (cropperAvatar) {
                cropperAvatar.destroy();
                cropperAvatar = null;
            }

            showToast('success', 'Avatar Actualizado', 'Tu avatar luce genial.');

        } catch (error) {
            console.error('Error subiendo avatar:', error);
            alert('Error al subir el avatar: ' + (error.message || error));
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-cloud-upload-alt" style="margin-right:8px;"></i> SUBIR AVATAR';
        }
    }, 'image/png', 1.0);
}

// 7. Guardar BANNER
async function guardarBannerCustom() {
    if (!cropperBanner) return;

    const btn = document.getElementById('btn-save-crop');
    if (!btn) return;

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right:8px;"></i> SUBIENDO BANNER...';

    cropperBanner.getCroppedCanvas({ width: 1200, height: 675 }).toBlob(async (blob) => {
        try {
            const uniqueHash = Date.now().toString(36) + Math.random().toString(36).substring(2);
            const fileName = `custom_banner_${uniqueHash}.png`;
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                alert('Debes iniciar sesión para subir un banner.');
                throw new Error("No hay usuario autenticado");
            }

            const { error } = await supabase.storage
                .from('banners')
                .upload(`${user.id}/${fileName}`, blob, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('banners')
                .getPublicUrl(`${user.id}/${fileName}`);

            const { error: dbError } = await supabase
                .from('usuarios')
                .update({ banner: publicUrl })
                .eq('email', user.email);

            if (dbError) throw dbError;

            // Actualizar UI
            const bannerEl = document.querySelector('.profile-banner');
            if (bannerEl) {
                bannerEl.style.backgroundImage = `url('${publicUrl}')`;
                bannerEl.style.backgroundSize = 'cover';
                bannerEl.style.backgroundPosition = 'center';
            }

            cropModal.classList.remove('show');
            if (cropperBanner) {
                cropperBanner.destroy();
                cropperBanner = null;
            }

            showToast('success', 'Banner Actualizado', 'Tu portada luce genial.');
        } catch (error) {
            console.error('ERROR DETALLADO:', error);
            alert('Error subiendo banner: ' + (error.message || error));
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-cloud-upload-alt" style="margin-right:8px;"></i> SUBIR BANNER';
        }
    }, 'image/png', 1.0);
}

// ==========================================================================
//   BOTONES DEL HERO
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Botones del hero
    const btnGames = document.getElementById('btn-hero-games');
    if (btnGames) {
        btnGames.addEventListener('click', (e) => {
            e.preventDefault();
            cambiarVista('games');
        });
    }

    const btnMovies = document.getElementById('btn-hero-movies');
    if (btnMovies) {
        btnMovies.addEventListener('click', (e) => {
            e.preventDefault();
            cambiarVista('movies');
        });
    }

    const btnSeries = document.getElementById('btn-hero-series');
    if (btnSeries) {
        btnSeries.addEventListener('click', (e) => {
            e.preventDefault();
            cambiarVista('series');
        });
    }

    // ===== BOTÓN VOLVER AL LOGIN (waiting-confirmation) =====
    const btnWaitingLogin = document.getElementById('btn-waiting-login');
    if (btnWaitingLogin) {
        btnWaitingLogin.addEventListener('click', (e) => {
            e.preventDefault();
            cambiarVista('login');
        });
    }
});

/// ==========================================================================
//   SISTEMA DE FAVORITOS (VERSIÓN ASYNC)
// ==========================================================================

async function getUserId() {
    try {
        // Primero intentamos desde el cache rápido
        if (window._nexus_user_id) return window._nexus_user_id;

        const cached = localStorage.getItem('nexus_user_id');
        if (cached) {
            window._nexus_user_id = cached;
            return cached;
        }

        // Si no hay cache, preguntamos a Supabase
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
            window._nexus_user_id = session.user.id;
            localStorage.setItem('nexus_user_id', session.user.id);
            return session.user.id;
        }
        return null;
    } catch (e) {
        console.warn('Error obteniendo userId:', e);
        return null;
    }
}

async function getFavoritos() {
    try {
        const userId = await getUserId();
        if (!userId) return [];

        const key = `${FAVORITOS_KEY}_${userId}`;
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.warn('Error obteniendo favoritos:', e);
        return [];
    }
}

async function setFavoritos(lista) {
    try {
        const userId = await getUserId();
        if (!userId) return;

        const key = `${FAVORITOS_KEY}_${userId}`;
        localStorage.setItem(key, JSON.stringify(lista));
    } catch (e) {
        console.warn('Error guardando favoritos:', e);
    }
}

async function esFavorito(mediaId, tipo) {
    const favoritos = await getFavoritos();
    return favoritos.some(f => f.id === mediaId.toString() && f.tipo === tipo);
}

async function añadirFavorito(mediaId, tipo, titulo, poster) {
    const favoritos = await getFavoritos();

    if (favoritos.some(f => f.id === mediaId.toString() && f.tipo === tipo)) {
        return false;
    }

    favoritos.push({
        id: mediaId.toString(),
        tipo: tipo,
        titulo: titulo,
        poster: poster,
        fecha: new Date().toISOString()
    });

    await setFavoritos(favoritos);
    return true;
}

async function quitarFavorito(mediaId, tipo) {
    let favoritos = await getFavoritos();
    favoritos = favoritos.filter(f => !(f.id === mediaId.toString() && f.tipo === tipo));
    await setFavoritos(favoritos);
    return true;
}

async function toggleFavorito(mediaId, tipo, titulo, poster) {
    if (await esFavorito(mediaId, tipo)) {
        await quitarFavorito(mediaId, tipo);
        return false;
    } else {
        await añadirFavorito(mediaId, tipo, titulo, poster);
        return true;
    }
}

// Actualizar el botón de favoritos
async function actualizarBotonFavorito(mediaId, tipo, titulo, poster) {
    const btn = document.getElementById('btn-add-to-favorites');
    const container = document.getElementById('favorite-button-container');

    if (!btn || !container) return;

    const isFav = await esFavorito(mediaId, tipo);

    // Remover clase anterior
    btn.classList.remove('is-favorite');

    if (isFav) {
        // Forzar reflow para reiniciar animación
        void btn.offsetWidth;
        btn.classList.add('is-favorite');
        btn.title = 'Quitar de favoritos';
        btn.setAttribute('aria-label', 'Quitar de favoritos');
    } else {
        btn.title = 'Añadir a favoritos';
        btn.setAttribute('aria-label', 'Añadir a favoritos');
    }

    // Guardar estado actual
    mediaFavoritoActual = {
        id: mediaId,
        tipo: tipo,
        titulo: titulo,
        poster: poster,
        esFavorito: isFav
    };
}

// Mostrar/ocultar el botón de favoritos
function mostrarBotonFavorito(mostrar) {
    const container = document.getElementById('favorite-button-container');
    if (container) {
        if (mostrar) {
            container.style.display = 'block';
            // Pequeña animación de entrada
            container.style.opacity = '0';
            container.style.transform = 'scale(0.8)';
            requestAnimationFrame(() => {
                container.style.transition = 'opacity 0.3s ease, transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                container.style.opacity = '1';
                container.style.transform = 'scale(1)';
            });
        } else {
            container.style.opacity = '0';
            container.style.transform = 'scale(0.8)';
            setTimeout(() => {
                container.style.display = 'none';
            }, 300);
        }
    }
}

// Evento para el botón de favoritos
document.getElementById('btn-add-to-favorites')?.addEventListener('click', async function (e) {
    e.stopPropagation(); // Evita que se abra el modal
    if (!mediaFavoritoActual) return;

    const { id, tipo, titulo, poster, esFavorito } = mediaFavoritoActual;

    // Deshabilitar botón temporalmente para evitar spam
    this.style.pointerEvents = 'none';
    this.style.opacity = '0.6';

    if (esFavorito) {
        await quitarFavorito(id, tipo);
        showToast('info', 'Favorito eliminado', `"${titulo}" ya no está en tus favoritos.`);
    } else {
        await añadirFavorito(id, tipo, titulo, poster);
        showToast('success', '¡Añadido a favoritos!', `"${titulo}" ahora es uno de tus favoritos. ❤️`);
    }

    await actualizarBotonFavorito(id, tipo, titulo, poster);

    // Re-habilitar botón
    this.style.pointerEvents = 'auto';
    this.style.opacity = '1';
});

// ==========================================================================
// FORZAR RECARGA DE RECOMENDACIONES (para usar desde consola)
// ==========================================================================

window.recargarRecomendaciones = async function () {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        showToast('error', 'Acceso denegado', 'Inicia sesión para ver recomendaciones.');
        return;
    }
    const userId = session.user.id;
    await cargarRecomendaciones(userId);
    showToast('success', 'Recomendaciones', 'Lista actualizada con tus últimos visionados.');
};

// ==========================================================================
//   TENDENCIAS EN PELÍCULAS (USANDO trend-card)
// ==========================================================================

let trendMoviesPeriod = 'day'; // 'day', 'week'
let trendMoviesCargando = false;
let trendMoviesOffset = 0;

// Función para cargar tendencias de películas
async function cargarTendenciasPeliculas(period = 'day', resetear = true) {
    await translationsReadyPromise;
    if (trendMoviesCargando) return;
    trendMoviesCargando = true;

    const container = document.getElementById('trend-movies');
    if (!container) {
        trendMoviesCargando = false;
        return;
    }

    // 1. INTERCEPTOR DE CACHÉ: Si ya descargamos esto antes, lo pintamos al instante
    if (resetear && cacheTendenciasPelis[period]) {
        trendMoviesOffset = 0;
        container.innerHTML = '';

        // Cogemos las películas directamente de la memoria RAM
        const peliculasGuardadas = cacheTendenciasPelis[period].slice(0, 20);

        peliculasGuardadas.forEach((pelicula, index) => {
            const card = crearTarjetaTrendPelicula(pelicula, index + 1);
            container.appendChild(card);
        });

        trendMoviesPeriod = period;
        setTimeout(() => { container.scrollLeft = 0; }, 50);

        trendMoviesCargando = false;
        return; // ¡CORTAMOS AQUÍ! Nos saltamos el "fetch" de internet.
    }

    // SI NO HAY CACHÉ, CONTINÚA LA CARGA NORMAL
    if (resetear) {
        trendMoviesOffset = 0;
        // Mostrar loading
        container.innerHTML = `
            <div class="trends-loading">
                <i class="fas fa-circle-notch fa-spin"></i>
                <span>${t('trends_extra.movies_loading')}</span>
            </div>
        `;
    }

    try {
        const url = `/api/tmdb?tipo=movie&trending=true&period=${period}&limit=20&lang=${currentLang}&_=${Date.now()}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        if (!data || data.length === 0) {
            container.innerHTML = `
            <div class="trends-empty">
                <i class="fas fa-film"></i>
                <span>${t('trends_extra.movies_empty')}</span>
            </div>
        `;
            trendMoviesCargando = false;
            return;
        }

        // 2. GUARDAMOS EN CACHÉ PARA EL FUTURO
        if (resetear) {
            cacheTendenciasPelis[period] = data;
        }

        // Renderizar con trend-card (mismo estilo que juegos)
        container.innerHTML = '';
        const peliculas = data.slice(0, 20);
        peliculas.forEach((pelicula, index) => {
            const card = crearTarjetaTrendPelicula(pelicula, index + 1);
            container.appendChild(card);
        });

        trendMoviesPeriod = period;

        // FORZAR SCROLL AL PRINCIPIO
        setTimeout(() => { container.scrollLeft = 0; }, 100);

    } catch (error) {
        console.error('Error cargando tendencias de películas:', error);
        container.innerHTML = `
            <div class="trends-empty">
                <i class="fas fa-exclamation-triangle" style="color: var(--error);"></i>
                <span>${t('trends_extra.movies_error')}</span>
                <button onclick="cargarTendenciasPeliculas('${period}', true)" 
                        style="margin-top: 10px; background: var(--primary); border: none; color: white; padding: 8px 20px; border-radius: 8px; cursor: pointer; font-family: var(--font-cyber);">
                    <i class="fas fa-redo"></i> ${t('common.retry')}
                </button>
            </div>
        `;
    }
    trendMoviesCargando = false;
}

// Función para crear tarjeta de tendencia de película (usa trend-card)
function crearTarjetaTrendPelicula(pelicula, posicion) {
    const card = document.createElement('div');
    card.className = 'trend-card';
    card.dataset.id = pelicula.id;
    card.dataset.tipo = 'movie';
    card.style.cursor = 'pointer';

    const posterUrl = pelicula.poster || 'https://placehold.co/180x270/14141c/6366f1?text=SIN+POSTER';
    const titulo = pelicula.titulo || t('common.untitled');
    const fecha = pelicula.fecha ? new Date(pelicula.fecha).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    }) : t('trends_extra.coming_soon');

    const rating = pelicula.nota || '0.0';

    card.innerHTML = `
        <div class="game-cover-container">
            <div class="trend-position">#${posicion}</div>
            <img src="${posterUrl}" alt="${titulo}" loading="lazy" 
                 onerror="this.parentElement.innerHTML='<div class=\\'no-cover\\' style=\\'width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--bg-elevated);\\'><i class=\\'fas fa-film\\' style=\\'font-size:3rem;color:var(--text-muted);\\'></i></div>'">
        </div>
        <div class="game-info">
            <h3 class="game-title">${titulo}</h3>
            <div class="game-release-info">
                <span class="date">${fecha}</span>
                <span class="dot">•</span>
                <span style="color:gold;font-size:0.7rem;">⭐ ${rating}</span>
            </div>
        </div>
    `;

    card.addEventListener('click', () => {
        abrirModalMedia(pelicula.id, 'movie');
    });

    return card;
}

// Función para inicializar los tabs de tendencias de películas
function initTrendMoviesTabs() {
    const container = document.getElementById('trend-movies');
    const tabs = document.querySelectorAll('#movies .trend-tab');

    // Eliminar event listeners antiguos clonando y reemplazando
    tabs.forEach(tab => {
        const newTab = tab.cloneNode(true);
        tab.parentNode.replaceChild(newTab, tab);
    });

    // Obtener los nuevos tabs
    const newTabs = document.querySelectorAll('#movies .trend-tab');

    newTabs.forEach(tab => {
        tab.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();

            // Solo afecta a los tabs de películas
            newTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            const period = this.dataset.period;

            if (container) {
                container.style.opacity = '0.5';
                container.style.transition = 'opacity 0.2s';
            }

            cargarTendenciasPeliculas(period, true);

            setTimeout(() => {
                if (container) {
                    container.style.opacity = '1';
                    container.scrollLeft = 0;
                }
            }, 300);
        });
    });
}

// Función para cargar tendencias de películas al inicio
function cargarTendenciasPeliculasInicial() {
    setTimeout(() => {
        cargarTendenciasPeliculas('day', true);
        initTrendMoviesTabs();
        const container = document.getElementById('trend-movies');
        if (container) {
            setTimeout(() => { container.scrollLeft = 0; }, 100);
        }
    }, 600);
}

// ==========================================================================
//   MODIFICAR cambiarVista PARA CARGAR TENDENCIAS DE PELÍCULAS
// ==========================================================================

// Guardar la función original
const originalCambiarVista2 = cambiarVista;

// Sobrescribir para incluir tendencias de películas
cambiarVista = async function (target, guardarEnHistorial = true, usernameUrl = null) {
    // Llamar a la función original
    await originalCambiarVista2(target, guardarEnHistorial, usernameUrl);

    // Si es la vista de películas, cargar tendencias de películas
    if (target === 'movies') {
        const container = document.getElementById('trend-movies');
        // Solo cargar si no hay contenido o está vacío
        if (container && container.children.length === 0) {
            cargarTendenciasPeliculas('day', true);
        }
    }

    // Si es la vista de series, cargar tendencias de series
    if (target === 'series') {
        const containerSeries = document.getElementById('trend-series');
        if (containerSeries && containerSeries.children.length === 0) {
            cargarTendenciasSeries('day', true);
        }
    }
};

// Variables de memoria y control para Series
let trendSeriesCargando = false;
let cacheTendenciasSeries = {}; // Memoria RAM (Caché)
let trendSeriesPeriod = 'day';

// Función para cargar tendencias de Series (Idéntica a Películas pero apuntando a TV)
async function cargarTendenciasSeries(period = 'day', resetear = true) {
    await translationsReadyPromise;
    if (trendSeriesCargando) return;
    trendSeriesCargando = true;

    const container = document.getElementById('trend-series');
    if (!container) {
        trendSeriesCargando = false;
        return;
    }

    // 1. INTERCEPTOR DE CACHÉ: Memoria instantánea
    if (resetear && cacheTendenciasSeries[period]) {
        container.innerHTML = '';

        const seriesGuardadas = cacheTendenciasSeries[period].slice(0, 20);

        seriesGuardadas.forEach((serie, index) => {
            // Usamos la función de creación de tarjetas (debes tener una o usar la misma adaptada)
            const card = crearTarjetaTrendSerie(serie, index + 1);
            container.appendChild(card);
        });

        trendSeriesPeriod = period;
        setTimeout(() => { container.scrollLeft = 0; }, 50);

        trendSeriesCargando = false;
        return; // Cortamos conexión a internet
    }

    if (resetear) {
        container.innerHTML = `
            <div class="trends-loading">
                <i class="fas fa-circle-notch fa-spin"></i>
                <span>${t('trends_extra.series_loading')}</span>
            </div>
        `;
    }

    try {
        // Asegúrate de enviar tipo=tv para que el backend de TMDB sepa que son series
        const url = `/api/tmdb?tipo=tv&trending=true&period=${period}&limit=20&lang=${currentLang}&_=${Date.now()}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        if (!data || data.length === 0) {
            container.innerHTML = `
                <div class="trends-empty">
                    <i class="fas fa-tv"></i>
                    <span>${t('trends_extra.series_empty')}</span>
                </div>
            `;
            trendSeriesCargando = false;
            return;
        }

        // 2. GUARDAMOS EN CACHÉ
        if (resetear) {
            cacheTendenciasSeries[period] = data;
        }

        container.innerHTML = '';
        const series = data.slice(0, 20);
        series.forEach((serie, index) => {
            // Pintamos
            const card = crearTarjetaTrendSerie(serie, index + 1);
            container.appendChild(card);
        });

        trendSeriesPeriod = period;

        setTimeout(() => { container.scrollLeft = 0; }, 100);

    } catch (error) {
        console.error('Error cargando tendencias de series:', error);
        container.innerHTML = `
            <div class="trends-empty">
                <i class="fas fa-exclamation-triangle" style="color: var(--error);"></i>
                <span>${t('trends_extra.series_error')}</span>
                <button onclick="cargarTendenciasSeries('${period}', true)"
                        style="margin-top: 10px; background: var(--primary); border: none; color: white; padding: 8px 20px; border-radius: 8px; cursor: pointer; font-family: var(--font-cyber);">
                    <i class="fas fa-redo"></i> ${t('common.retry')}
                </button>
            </div>
        `;
    }
    trendSeriesCargando = false;
}

// Función para crear tarjeta de tendencia de película (usa trend-card)
function crearTarjetaTrendSerie(serie, posicion) {
    const card = document.createElement('div');
    card.className = 'trend-card';
    card.dataset.id = serie.id;
    card.dataset.tipo = 'tv';
    card.style.cursor = 'pointer';

    const posterUrl = serie.poster || 'https://placehold.co/180x270/14141c/6366f1?text=SIN+POSTER';
    const titulo = serie.titulo || t('common.untitled');
    const fecha = serie.fecha ? new Date(serie.fecha).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    }) : t('trends_extra.coming_soon');

    const rating = serie.nota || '0.0';

    card.innerHTML = `
        <div class="game-cover-container">
            <div class="trend-position">#${posicion}</div>
            <img src="${posterUrl}" alt="${titulo}" loading="lazy" 
                 onerror="this.parentElement.innerHTML='<div class=\\'no-cover\\' style=\\'width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--bg-elevated);\\'><i class=\\'fas fa-tv\\' style=\\'font-size:3rem;color:var(--text-muted);\\'></i></div>'">
        </div>
        <div class="game-info">
            <h3 class="game-title">${titulo}</h3>
            <div class="game-release-info">
                <span class="date">${fecha}</span>
                <span class="dot">•</span>
                <span style="color:gold;font-size:0.7rem;">⭐ ${rating}</span>
            </div>
        </div>
    `;

    card.addEventListener('click', () => {
        abrirModalMedia(serie.id, 'tv');
    });

    return card;
}

// Cargar tendencias de series al inicio
function cargarTendenciasSeriesInicial() {
    setTimeout(() => {
        cargarTendenciasSeries('day', true);
        const container = document.getElementById('trend-series');
        if (container) {
            setTimeout(() => { container.scrollLeft = 0; }, 100);
        }
    }, 700); // 100ms después de las pelis para no saturar la red de golpe
}

// ==========================================================================
//   ÚLTIMOS TRÁILERS (CARRUSEL MIXTO: 5 JUEGOS + 5 PELIS + 5 SERIES = 15 TOTAL)
// ==========================================================================

async function cargarUltimosTrailers() {
    await translationsReadyPromise;
    const container = document.getElementById('latest-trailers');
    if (!container) return;

    // Mostrar loading
    container.innerHTML = `
        <div class="trends-loading">
            <i class="fas fa-circle-notch fa-spin"></i>
            <span>${t('trends_extra.trailers_loading')}</span>
        </div>
    `;

    try {
        const urlJuegos = `/api/igdb?offset=0&limit=5&sort=rating.desc&lang=${currentLang}`;
        const urlPelis = `/api/tmdb?tipo=movie&trending=true&period=week&limit=5&lang=${currentLang}&_=${Date.now()}`;
        const urlSeries = `/api/tmdb?tipo=tv&trending=true&period=week&limit=5&lang=${currentLang}&_=${Date.now()}`;

        // 3. Disparamos las 3 peticiones en paralelo
        const [resJuegos, resPelis, resSeries] = await Promise.all([
            fetch(urlJuegos).catch(() => ({ ok: false })),
            fetch(urlPelis).catch(() => ({ ok: false })),
            fetch(urlSeries).catch(() => ({ ok: false }))
        ]);

        // 4. Convertir a JSON (si falló, array vacío)
        const dataJuegos = resJuegos.ok ? await resJuegos.json() : [];
        const dataPelis = resPelis.ok ? await resPelis.json() : [];
        const dataSeries = resSeries.ok ? await resSeries.json() : [];

        // Asegurar que sean arrays y tener exactamente 5 de cada uno
        const juegos = Array.isArray(dataJuegos) ? dataJuegos.slice(0, 5) : [];
        const pelis = Array.isArray(dataPelis) ? dataPelis.slice(0, 5) : [];
        const series = Array.isArray(dataSeries) ? dataSeries.slice(0, 5) : [];

        // Rellenar con placeholders si faltan items
        while (juegos.length < 5) {
            juegos.push({ id: `placeholder_game_${juegos.length}`, name: 'Próximo juego', cover: { url: '' }, first_release_date: null, placeholder: true });
        }
        while (pelis.length < 5) {
            pelis.push({ id: `placeholder_movie_${pelis.length}`, titulo: 'Próxima película', poster: '', fecha: null, placeholder: true });
        }
        while (series.length < 5) {
            series.push({ id: `placeholder_series_${series.length}`, titulo: 'Próxima serie', poster: '', fecha: null, placeholder: true });
        }

        // 5. Intercalar: juego1, peli1, serie1, juego2, peli2, serie2...
        const mezclados = [];
        for (let i = 0; i < 5; i++) {
            if (juegos[i]) mezclados.push({ tipo: 'game', data: juegos[i] });
            if (pelis[i]) mezclados.push({ tipo: 'movie', data: pelis[i] });
            if (series[i]) mezclados.push({ tipo: 'tv', data: series[i] });
        }

        container.innerHTML = '';

        // 6. Pintar cada item usando la NUEVA función de tráiler
        mezclados.forEach((item, index) => {
            let card;

            if (item.data.placeholder) {
                card = crearTarjetaPlaceholderTrailer(item.tipo);
            } else {
                // Usar la función específica para tráilers
                card = crearTarjetaTrendTrailer(item.data, item.tipo, index + 1);
            }

            if (card) {
                container.appendChild(card);
            }
        });

        // Forzar scroll al inicio
        setTimeout(() => { container.scrollLeft = 0; }, 100);

    } catch (error) {
        console.error("Error cargando los últimos tráilers:", error);
        container.innerHTML = `
            <div class="trends-empty">
                <i class="fas fa-exclamation-triangle" style="color: var(--error);"></i>
                <span>${t('trends_extra.trailers_error')}</span>
                <button onclick="cargarUltimosTrailers()" 
                        style="margin-top: 10px; background: var(--primary); border: none; color: white; padding: 8px 20px; border-radius: 8px; cursor: pointer; font-family: var(--font-cyber);">
                    <i class="fas fa-redo"></i> ${t('common.retry')}
                </button>
            </div>
        `;
    }
}

// Función para crear tarjeta placeholder (cuando no hay datos suficientes)
function crearTarjetaPlaceholderTrailer(tipo) {
    const card = document.createElement('div');
    card.className = 'trend-card trailer-card';
    card.style.opacity = '0.5';
    card.style.cursor = 'default';

    const icono = tipo === 'game' ? 'fa-gamepad' : tipo === 'movie' ? 'fa-film' : 'fa-tv';
    const texto = tipo === 'game' ? 'Próximo juego' : tipo === 'movie' ? 'Próxima película' : 'Próxima serie';

    card.innerHTML = `
        <div class="game-cover-container" style="background: var(--bg-elevated); display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 10px;">
            <div class="trend-position" style="background: var(--bg-secondary); border-color: var(--text-muted); color: var(--text-muted);">
                <i class="fas fa-play" style="margin-left: 2px;"></i>
            </div>
            <i class="fas ${icono}" style="font-size: 3rem; color: var(--text-muted); opacity: 0.3;"></i>
            <span style="font-size: 0.7rem; color: var(--text-muted);">${texto}</span>
        </div>
        <div class="game-info">
            <h3 class="game-title" style="color: var(--text-muted); font-size: 0.8rem; text-align: center;">t('trends_extra.coming_soon')</h3>
            <button class="auth-btn secondary" style="width: 100%; padding: 6px 12px; font-size: 0.7rem; letter-spacing: 1px; border-radius: 6px; margin-top: 8px; opacity: 0.3; cursor: not-allowed;" disabled>
                <i class="fab fa-youtube"></i> t('trends_extra.no_trailer')
            </button>
        </div>
    `;

    return card;
}

// ==========================================================================
//   TARJETA PARA ÚLTIMOS TRÁILERS (SIN PRECIO, SIN RATING, CON BOTÓN YT)
// ==========================================================================

function crearTarjetaTrendTrailer(item, tipo, posicion) {
    const card = document.createElement('div');
    card.className = 'trend-card trailer-card';
    card.dataset.id = item.id;
    card.dataset.tipo = tipo;
    card.style.cursor = 'default'; // No es clickeable como modal

    // Obtener datos según el tipo
    let titulo = '';
    let posterUrl = '';
    let fecha = t('trends_extra.coming_soon');
    let rating = '';
    let trailerId = null;
    let urlYoutube = '';

    if (tipo === 'game') {
        titulo = item.name || t('common.untitled');
        posterUrl = item.cover && item.cover.url
            ? item.cover.url.replace('t_thumb', 't_cover_big').replace('//', 'https://')
            : 'https://placehold.co/180x270/14141c/6366f1?text=SIN+POSTER';
        fecha = item.first_release_date
            ? new Date(item.first_release_date * 1000).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })
            : t('trends_extra.coming_soon');
        // Para juegos, buscamos un trailer en websites o usamos búsqueda genérica
        urlYoutube = `https://www.youtube.com/results?search_query=${encodeURIComponent(titulo + ' trailer oficial')}`;
    } else {
        // Película o Serie (TMDB)
        titulo = item.titulo || t('common.untitled');
        posterUrl = item.poster || 'https://placehold.co/180x270/14141c/6366f1?text=SIN+POSTER';
        fecha = item.fecha
            ? new Date(item.fecha).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })
            : t('trends_extra.coming_soon');
        // Para TMDB, usar trailer_id si existe
        trailerId = item.trailer_id || null;
        urlYoutube = trailerId
            ? `https://www.youtube.com/watch?v=${trailerId}`
            : `https://www.youtube.com/results?search_query=${encodeURIComponent(titulo + ' trailer oficial')}`;
    }

    // Construir HTML de la tarjeta (sin precio, sin rating)
    card.innerHTML = `
        <div class="game-cover-container" style="position: relative;">
            <div class="trend-position" style="background: var(--primary); color: #fff; border-color: var(--primary);">
                <i class="fas fa-play" style="margin-left: 2px;"></i>
            </div>
            <img src="${posterUrl}" alt="${titulo}" loading="lazy" 
                 onerror="this.parentElement.innerHTML='<div class=\\'no-cover\\' style=\\'width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--bg-elevated);\\'><i class=\\'fas ${tipo === 'game' ? 'fa-gamepad' : tipo === 'movie' ? 'fa-film' : 'fa-tv'}\\' style=\\'font-size:3rem;color:var(--text-muted);\\'></i></div>'">
        </div>
        <div class="game-info" style="display: flex; flex-direction: column; flex-grow: 1;">
            <h3 class="game-title" style="font-size: 0.85rem; font-weight: 700; margin-bottom: 2px; color: var(--neon-white); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${titulo}
            </h3>
            <div class="game-release-info" style="display: flex; align-items: center; gap: 8px; font-size: 0.7rem; color: var(--text-muted); margin-bottom: 8px;">
                <span class="date">${fecha}</span>
            </div>
            <!-- BOTÓN VER TRÁILER -->
            <button class="auth-btn primary btn-trailer-card" 
                    data-url="${urlYoutube}"
                    style="width: 100%; padding: 6px 12px; font-size: 0.7rem; letter-spacing: 1px; border-radius: 6px; margin-top: auto; background: #FF0000; box-shadow: 0 4px 15px rgba(255, 0, 0, 0.3);">
                <i class="fab fa-youtube" style="margin-right: 6px;"></i> Ver tráiler
            </button>
        </div>
    `;

    // Evento: Click en el botón abre YouTube
    const btnTrailer = card.querySelector('.btn-trailer-card');
    if (btnTrailer) {
        btnTrailer.addEventListener('click', (e) => {
            e.stopPropagation(); // Evita que se propague
            const url = btnTrailer.dataset.url;
            if (url) {
                window.open(url, '_blank');
            }
        });
    }

    // Evento: Click en la imagen también abre YouTube
    const coverContainer = card.querySelector('.game-cover-container');
    if (coverContainer) {
        coverContainer.style.cursor = 'pointer';
        coverContainer.addEventListener('click', () => {
            window.open(urlYoutube, '_blank');
        });
    }

    return card;
}

// ==========================================================================
//   SISTEMA DE LISTAS SOCIALES (MIS LISTAS) - FUNCIONES
// ==========================================================================

// punto de entrada: se llama cada vez que se entra en la vista
async function inicializarMisListas() {

    // Asegurar que listasCache existe
    if (typeof listasCache === 'undefined') {
        console.error('❌ listasCache no está definido, creándolo...');
        window.listasCache = { mias: null, compartidas: null, siguiendo: null };
        listasCache = window.listasCache;
    }

    if (!listasEventosListos) {
        bindEventosListasUI();
        listasEventosListos = true;
    }

    // FORZAR LIMPIEZA DE CACHÉ
    listasCache.mias = null;
    listasCache.compartidas = null;
    listasCache.siguiendo = null;

    await cargarListas(listasTabActual);
}

// enlaza las pestañas (mias/compartidas/siguiendo) y los filtros de tipo
function bindEventosListasUI() {
    document.querySelectorAll('.lists-main-tabs .watchlist-tab').forEach(tab => {
        tab.addEventListener('click', async () => {
            const nuevaTab = tab.getAttribute('data-lists-tab');
            if (nuevaTab === listasTabActual) return;

            document.querySelectorAll('.lists-main-tabs .watchlist-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            listasTabActual = nuevaTab;
            await cargarListas(listasTabActual);
        });
    });

    document.querySelectorAll('.lists-type-filters .trend-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            const nuevoFiltro = btn.getAttribute('data-lists-filter');
            if (nuevoFiltro === listasFiltroActual) return;

            document.querySelectorAll('.lists-type-filters .trend-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            listasFiltroActual = nuevoFiltro;
            pintarListasFiltradas();
        });
    });

    // boton de crear lista
    document.getElementById('btn-crear-lista')?.addEventListener('click', () => {
        mediaActualParaLista = null;
        openCreateListModal();
    });
}

// trae de supabase la pestaña pedida (con cache) y pinta
async function cargarListas(tab) {
    const grid = document.getElementById('lists-grid');
    const empty = document.getElementById('lists-empty');
    if (!grid) {
        console.error('❌ grid no encontrado');
        return;
    }

    grid.style.display = 'grid';
    if (empty) empty.style.display = 'none';
    grid.innerHTML = `<div class="watchlist-loading"><i class="fas fa-circle-notch fa-spin"></i></div>`;

    // FORZAR RECARGA SIEMPRE EN LA PESTAÑA "mias"
    if (tab === 'mias') {
        listasCache.mias = null;
    }

    if (listasCache[tab] !== null) {
        pintarListasFiltradas();
        return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        console.error('❌ No hay sesión');
        grid.innerHTML = '';
        if (empty) empty.style.display = 'block';
        return;
    }

    const userId = session.user.id;

    try {
        if (tab === 'mias') {

            const { data, error } = await supabase
                .from('listas_maestra')
                .select('id, titulo, descripcion, is_public, tag_tipo, owner_id, miembros:listas_miembros(count), items:listas_items(count)')
                .eq('owner_id', userId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('❌ Error en la consulta:', error);
                throw error;
            }

            listasCache.mias = (data || []).map(l => ({ ...l, rolUsuario: 'owner' }));

        } else {
            const { data, error } = await supabase
                .from('listas_miembros')
                .select('rol, lista:listas_maestra!inner(id, titulo, descripcion, is_public, tag_tipo, owner_id, miembros:listas_miembros(count), items:listas_items(count))')
                .eq('user_id', userId)
                .eq('estado', 'accepted');

            if (error) {
                console.error('❌ Error en la consulta:', error);
                throw error;
            }

            const propias = (data || [])
                .filter(m => m.lista.owner_id !== userId)
                .map(m => ({ ...m.lista, rolUsuario: m.rol }));

            listasCache.compartidas = propias;
            listasCache.siguiendo = [];
        }
    } catch (err) {
        console.error('❌ Error cargando listas:', err);
        grid.innerHTML = '';
        showToast('error', 'Error', 'No se pudieron cargar las listas.');
        return;
    }

    pintarListasFiltradas();
}

// aplica el filtro de tipo sobre la cache de la pestaña activa y pinta las cards
function pintarListasFiltradas() {

    const grid = document.getElementById('lists-grid');
    const empty = document.getElementById('lists-empty');
    if (!grid) {
        console.error('❌ grid no encontrado');
        return;
    }

    const listas = listasCache[listasTabActual] || [];

    const filtradas = listas.filter(l => {
        if (listasFiltroActual === 'all') return true;
        return l.tag_tipo === listasFiltroActual || l.tag_tipo === 'mixta';
    });

    // CONSERVAR LA CLASE DE VISTA
    const esModoLista = grid.classList.contains('list-view-active');
    grid.innerHTML = '';
    if (esModoLista) grid.classList.add('list-view-active');

    if (filtradas.length === 0) {
        grid.style.display = 'none';
        if (empty) {
            empty.style.display = 'block';
            const emptyMsg = empty.querySelector('p');
            if (emptyMsg) {
                const mensajes = {
                    'mias': 'Aún no tienes listas en esta sección. Crea tu primera lista para empezar a organizar tu contenido.',
                    'compartidas': 'No tienes listas compartidas contigo. Espera a que alguien te invite o comparte tus listas con otros.',
                    'siguiendo': 'Aún no sigues ninguna lista pública. Explora listas de otros usuarios y sigue las que te interesen.'
                };
                emptyMsg.textContent = mensajes[listasTabActual] || 'No hay listas en esta sección.';
            }
        }
        return;
    }

    grid.style.display = 'grid';
    if (empty) empty.style.display = 'none';

    filtradas.forEach(lista => {
        const card = crearListCard(lista);
        grid.appendChild(card);
    });
}

// clona el template y arma una card de lista
function crearListCard(lista) {
    const template = document.getElementById('list-card-template');
    const clone = template.content.cloneNode(true);

    const cardEl = clone.querySelector('.list-card');
    cardEl.dataset.listId = lista.id;

    clone.querySelector('.list-card-title').textContent = lista.titulo;
    clone.querySelector('.list-card-desc').textContent = lista.descripcion || 'Sin descripción.';

    const icono = ICONO_TIPO[lista.tag_tipo] || 'fa-layer-group';
    clone.querySelector('.list-card-tag-tipo i').className = `fas ${icono}`;

    clone.querySelector('.list-card-members-count').textContent = lista.miembros?.[0]?.count ?? 0;
    clone.querySelector('.list-card-items-count').textContent = lista.items?.[0]?.count ?? 0;

    // botones segun el rol del usuario en esta lista
    const esOwner = lista.rolUsuario === 'owner';
    const btnEdit = clone.querySelector('.list-action-edit');
    const btnMembers = clone.querySelector('.list-action-members');
    const btnDelete = clone.querySelector('.list-action-delete');
    const btnLeave = clone.querySelector('.list-action-leave');

    if (esOwner) {
        btnEdit.style.display = 'flex';
        btnMembers.style.display = 'flex';
        btnDelete.style.display = 'flex';
    } else if (lista.rolUsuario === 'moderator') {
        btnEdit.style.display = 'flex';
        btnMembers.style.display = 'flex';
        btnLeave.style.display = 'flex';
    } else {
        btnLeave.style.display = 'flex';
    }

    // por ahora solo evitamos que el click en los botones abra la lista (placeholder)
    clone.querySelectorAll('.list-card-actions button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            showToast('success', 'Próximamente', 'Esta acción se conecta en el siguiente paso.');
        });
    });

    return clone.firstElementChild;
}

// ==========================================================================
//   MODAL: CREAR NUEVA LISTA
// ==========================================================================

const modalCreateList = document.getElementById('create-list-modal');
const btnCloseCreateList = document.getElementById('close-create-list-modal');
const formCreateList = document.getElementById('form-create-list');
const inputCreateListTitle = document.getElementById('create-list-title');
const inputCreateListDesc = document.getElementById('create-list-desc');
const counterCreateListDesc = document.getElementById('create-list-char-counter');
const togglePrivacidadLista = document.getElementById('create-list-privacy-toggle');
const hintPrivacidadLista = document.getElementById('create-list-privacy-hint');
const inputBuscarMiembro = document.getElementById('create-list-search-user');
const gridResultadosMiembro = document.getElementById('create-list-search-results');
const listaMiembrosInvitados = document.getElementById('create-list-members-list');
const contadorSlots = document.getElementById('create-list-slots-counter');
const btnConfirmarCreateList = document.getElementById('btn-confirm-create-list');

const MAX_SLOTS_LISTA = 10; // de momento fijo, ampliable con rangos/packs en el futuro
let miembrosInvitadosLista = []; // [{ auth_id, username, avatar }]

// 1. Abrir / cerrar el modal
function openCreateListModal() {
    formCreateList?.reset();
    miembrosInvitadosLista = [];

    // --- NUEVA LÓGICA DE DETECCIÓN ---
    const exclusivityRow = document.getElementById('exclusivity-check-wrapper');
    const selectorRow = document.getElementById('list-type-selector-wrapper');
    const typeRow = document.getElementById('list-mode-container');

    if (mediaActualParaLista) {
        // Venimos de un botón "+" en una tarjeta: Modo Exclusividad
        if (exclusivityRow) exclusivityRow.style.display = 'flex';
        if (selectorRow) selectorRow.style.display = 'none';

        // Ponemos el nombre del tipo en el hint
        const typeName = document.getElementById('exclusivity-type-name');
        if (typeName) typeName.textContent = mediaActualParaLista.tipo === 'tv' ? 'Series' : mediaActualParaLista.tipo.toUpperCase();

        // Toggle activado por defecto
        document.getElementById('create-list-exclusive-toggle').checked = true;
    } else {
        // Venimos de "Mis Listas": Modo Selector Mixto
        if (exclusivityRow) exclusivityRow.style.display = 'none';
        if (selectorRow) selectorRow.style.display = 'block';

        // Reset del select a "mixta"
        const select = document.getElementById('create-list-type-select');
        if (select) select.value = 'mixta';
    }

    if (togglePrivacidadLista) togglePrivacidadLista.checked = true;
    actualizarHintPrivacidad();
    actualizarContadorDescripcion();
    pintarMiembrosInvitados();

    if (gridResultadosMiembro) {
        gridResultadosMiembro.style.display = 'none';
        gridResultadosMiembro.innerHTML = '';
    }

    modalCreateList?.classList.add('show');
    document.body.classList.add('no-scroll');
    document.documentElement.classList.add('no-scroll');
}

function closeCreateListModal() {
    modalCreateList?.classList.remove('show');
    document.body.classList.remove('no-scroll');
    document.documentElement.classList.remove('no-scroll');
}

btnCloseCreateList?.addEventListener('click', closeCreateListModal);
modalCreateList?.addEventListener('click', (e) => {
    if (e.target === modalCreateList) closeCreateListModal();
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalCreateList?.classList.contains('show')) closeCreateListModal();
});

// 2. Contador de caracteres de la descripción (2500 max)
function actualizarContadorDescripcion() {
    if (!inputCreateListDesc || !counterCreateListDesc) return;
    const actual = inputCreateListDesc.value.length;
    counterCreateListDesc.textContent = `${actual}/2500`;
    counterCreateListDesc.classList.toggle('error', actual > 2500);
}
inputCreateListDesc?.addEventListener('input', actualizarContadorDescripcion);

// 3. Toggle de privacidad: solo cambia el texto de ayuda, el valor real se lee al guardar
function actualizarHintPrivacidad() {
    if (!hintPrivacidadLista || !togglePrivacidadLista) return;
    hintPrivacidadLista.textContent = togglePrivacidadLista.checked
        ? 'Pública: cualquiera puede verla desde tu perfil o el de cualquier integrante.'
        : 'Privada: solo tú y los integrantes que invites podréis verla.';
}
togglePrivacidadLista?.addEventListener('change', actualizarHintPrivacidad);

// 4. Buscador de usuarios para invitar (solo dispara con 3+ letras)
let tempBuscarMiembro;
inputBuscarMiembro?.addEventListener('input', () => {
    clearTimeout(tempBuscarMiembro);
    const query = inputBuscarMiembro.value.trim();

    if (query.length < 3) {
        if (gridResultadosMiembro) {
            gridResultadosMiembro.style.display = 'none';
            gridResultadosMiembro.innerHTML = '';
        }
        return;
    }

    tempBuscarMiembro = setTimeout(() => buscarUsuariosParaLista(query), 400);
});

async function buscarUsuariosParaLista(query) {
    if (!gridResultadosMiembro) return;

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const miId = session.user.id;

        const { data: coincidencias, error } = await supabase
            .from('perfiles_publicos')
            .select('auth_id, username, avatar')
            .ilike('username', `%${query}%`)
            .neq('auth_id', miId)
            .limit(15);

        if (error) throw error;

        // quitamos a los que ya están invitados
        const idsInvitados = miembrosInvitadosLista.map(m => m.auth_id);
        const resultados = (coincidencias || []).filter(u => !idsInvitados.includes(u.auth_id));

        gridResultadosMiembro.innerHTML = '';

        if (resultados.length === 0) {
            gridResultadosMiembro.style.display = 'none';
            return;
        }

        gridResultadosMiembro.style.display = 'flex';

        resultados.forEach(user => {
            const avatarDB = user.avatar ? user.avatar.replace(/'/g, "") : 'default';
            const avatarHtml = (avatarDB === 'default' || avatarDB === 'custom')
                ? '<i class="fas fa-user-astronaut" style="color: var(--primary);"></i>'
                : `<img src="https://raw.githubusercontent.com/DonPlastico/WEB-Multiusos/main/img/Avatars/${avatarDB}.webp" alt="${user.username}" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-user-astronaut\\' style=\\'color: var(--primary);\\'></i>'">`;

            const userCard = document.createElement('div');
            userCard.className = 'friend-user-card';
            userCard.innerHTML = `
                <div class="friend-card-avatar">${avatarHtml}</div>
                <div class="friend-card-info">
                    <h4 class="friend-card-username">${user.username}</h4>
                </div>
                <button type="button" class="btn-send-request" title="Invitar a la lista">
                    <i class="fas fa-plus"></i>
                </button>
            `;
            userCard.querySelector('.btn-send-request').addEventListener('click', () => {
                invitarMiembroALista(user);
            });
            gridResultadosMiembro.appendChild(userCard);
        });

    } catch (err) {
        console.error('Error buscando usuarios para la lista:', err);
        showToast('error', 'Error', 'No se pudo buscar usuarios.');
    }
}

// 5. Añadir / quitar miembros de la lista (en memoria, hasta el submit)
function invitarMiembroALista(user) {
    // +1 porque el dueño también ocupa un slot
    if (miembrosInvitadosLista.length + 1 >= MAX_SLOTS_LISTA) {
        showToast('error', 'Límite alcanzado', `Solo puedes invitar hasta ${MAX_SLOTS_LISTA - 1} usuarios por lista.`);
        return;
    }

    miembrosInvitadosLista.push(user);
    pintarMiembrosInvitados();

    // lo quitamos de los resultados visibles para no duplicar
    inputBuscarMiembro.value = '';
    gridResultadosMiembro.style.display = 'none';
    gridResultadosMiembro.innerHTML = '';
}

function quitarMiembroDeLista(authId) {
    miembrosInvitadosLista = miembrosInvitadosLista.filter(m => m.auth_id !== authId);
    pintarMiembrosInvitados();
}

function pintarMiembrosInvitados() {
    if (!listaMiembrosInvitados) return;
    listaMiembrosInvitados.innerHTML = '';

    miembrosInvitadosLista.forEach(user => {
        const template = document.getElementById('list-member-chip-template');
        const clone = template.content.cloneNode(true);
        const chip = clone.querySelector('.list-member-chip');

        chip.dataset.userId = user.auth_id;

        const avatarDB = user.avatar ? user.avatar.replace(/'/g, "") : 'default';
        const avatarWrap = clone.querySelector('.list-member-chip-avatar');
        if (avatarDB !== 'default' && avatarDB !== 'custom') {
            avatarWrap.innerHTML = `<img src="https://raw.githubusercontent.com/DonPlastico/WEB-Multiusos/main/img/Avatars/${avatarDB}.webp" alt="${user.username}" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-user-astronaut\\'></i>'">`;
        }

        clone.querySelector('.list-member-chip-name').textContent = user.username;
        clone.querySelector('.list-member-chip-remove').addEventListener('click', () => {
            quitarMiembroDeLista(user.auth_id);
        });

        listaMiembrosInvitados.appendChild(clone);
    });

    if (contadorSlots) {
        contadorSlots.textContent = `${miembrosInvitadosLista.length + 1}/${MAX_SLOTS_LISTA} Slots`;
    }
}

// 6. Submit: crea la lista, mete al dueño como owner implícito y a los invitados como pendientes
formCreateList?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const titulo = inputCreateListTitle.value.trim();
    const descripcion = inputCreateListDesc.value.trim();

    if (!titulo) {
        showToast('error', 'Falta el título', 'Tienes que ponerle un nombre a la lista.');
        return;
    }
    if (descripcion.length > 2500) {
        showToast('error', 'Descripción muy larga', 'Máximo 2500 caracteres.');
        return;
    }

    const btnConfirmarCreateList = document.getElementById('btn-confirm-create-list');
    btnConfirmarCreateList.disabled = true;
    btnConfirmarCreateList.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> CREANDO...';

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const miId = session.user.id;

        // LÓGICA INTELIGENTE DE TIPO DE LISTA
        const toggleExclusive = document.getElementById('create-list-exclusive-toggle');
        const selectType = document.getElementById('create-list-type-select');

        let tagTipo;
        // Si hay un item en memoria, es creación rápida -> usamos exclusividad
        if (mediaActualParaLista) {
            tagTipo = toggleExclusive.checked ? mediaActualParaLista.tipo : 'mixta';
        } else {
            // Si venimos de "Mis Listas" (selector), usamos el valor del select
            tagTipo = selectType.value;
        }

        const { data: nuevaLista, error: errorLista } = await supabase
            .from('listas_maestra')
            .insert({
                titulo,
                descripcion: descripcion || null,
                owner_id: miId,
                is_public: togglePrivacidadLista.checked,
                tag_tipo: tagTipo // Aquí ya guardas 'game', 'movie', 'tv' o 'mixta'
            })
            .select()
            .single();

        if (errorLista) throw errorLista;

        // Invitaciones pendientes para cada miembro seleccionado
        if (miembrosInvitadosLista.length > 0) {
            const filasMiembros = miembrosInvitadosLista.map(user => ({
                lista_id: nuevaLista.id,
                user_id: user.auth_id,
                rol: 'viewer',
                estado: 'pending'
            }));

            const { error: errorMiembros } = await supabase.from('listas_miembros').insert(filasMiembros);
            if (errorMiembros) throw errorMiembros;

            // TODO: cuando montemos el chatbox de alertas (#chatbox-notifs-scroll) de verdad,
            // aquí lanzamos una notificación a cada invitado para que acepte/rechace.
        }

        showToast('success', 'Lista creada', `"${titulo}" se ha creado correctamente.`);
        closeCreateListModal();

        // refrescamos la cache de "mias" para que aparezca al instante
        listasCache.mias = null;
        if (listasTabActual === 'mias') {
            await cargarListas('mias');
        }

        // tambien invalidamos la cache del mini-modal "+" para que la lista nueva aparezca ahi
        listasEditablesCache = null;

    } catch (err) {
        console.error('Error creando la lista:', err);
        showToast('error', 'Error', 'No se pudo crear la lista. Inténtalo de nuevo.');
    } finally {
        btnConfirmarCreateList.disabled = false;
        btnConfirmarCreateList.innerHTML = '<i class="fas fa-check"></i> CREAR LISTA';
    }
});

// Función genérica de Toggle Grid/List
function configurarToggleGrid(btnId, targetGridId, storageKey, claseToggle = 'watchlist-list-mode') {
    const btn = document.getElementById(btnId);
    const grid = document.getElementById(targetGridId);
    if (!btn || !grid) return;

    const icon = btn.querySelector('i');

    // Estado inicial desde localStorage
    const modo = localStorage.getItem(storageKey) || 'grid';
    if (modo === 'list') {
        grid.classList.add(claseToggle);
        icon.className = 'fas fa-th-large';
    }

    btn.addEventListener('click', () => {
        const esGrid = grid.classList.toggle(claseToggle);
        // Si tiene la clase, es modo LISTA, si no, GRID
        if (esGrid) {
            icon.className = 'fas fa-th-large';
            localStorage.setItem(storageKey, 'list');
        } else {
            icon.className = 'fas fa-list';
            localStorage.setItem(storageKey, 'grid');
        }
    });
}

// Inicializa ambos:
configurarToggleGrid('btn-watchlist-toggle-grid', 'watchlist-list', 'pref_view_watchlist');
configurarToggleGrid('btn-lists-toggle-view', 'lists-grid', 'pref_view_lists', 'list-view-active');

document.addEventListener('DOMContentLoaded', function () {
    // Inicializamos las funciones de carga de datos
    cargarTendenciasInicial();
    cargarTendenciasPeliculasInicial();
    cargarTendenciasSeriesInicial();

    // INICIAMOS LOS TRÁILERS
    setTimeout(() => {
        cargarUltimosTrailers();
    }, 1000);

    // Activamos el vigilante de pestañas unificado para TODAS las secciones
    setTimeout(() => {
        initTrendTabs();
    }, 800);
});