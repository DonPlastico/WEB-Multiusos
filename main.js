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
//   LOGICA DE JUEGOS (CHEAPSHARK API - SIN REGISTRO NI MIERDAS)
// ==========================================================================

// pillo los elementos de la web
const gridJuegos = document.getElementById('games-grid');
const btnBuscar = document.getElementById('btn-buscar-juegos');
const inputBuscar = document.getElementById('search-juegos');

// llamo a la api del cheapshark q me da los precios reales d las paginas de keys
function cargarJuegos(busqueda = '') {
    
    // aki le e metio el sortBy=Release pa k m los tire x fexa de salida dl reves (de aora a viejos)
    let url = `https://www.cheapshark.com/api/1.0/deals?sortBy=Release&onSale=1&pageSize=24`;
    
    // si el usuario a escrio argo, cambio a la url de buskeda
    if (busqueda !== '') {
        url = `https://www.cheapshark.com/api/1.0/games?title=${busqueda}&limit=24`;
    }

    // mensaje to guapo mientras carga
    gridJuegos.innerHTML = '<div style="width:100%; text-align:center; color:#00f3ff; font-size:1.2rem; text-shadow:0 0 10px rgba(0,243,255,0.5);">Conectando con la red de keyshops...</div>';

    fetch(url)
        .then(respuesta => {
            if (!respuesta.ok) throw new Error('a petao el tiburon tu');
            return respuesta.json();
        })
        .then(datos => {
            gridJuegos.innerHTML = '';

            // si busca algo q no existe
            if (datos.length === 0) {
                gridJuegos.innerHTML = '<div style="color:#ff4757; text-align:center; width:100%;">no ai juegos con ese nombre pisha...</div>';
                return;
            }

            // recorro lo q m a devuelto la api
            datos.forEach(juego => {
                // el json me devuelve cosas con nombres distintos si toy buscando o en portada
                const titulo = juego.title || juego.external;
                const imagen = juego.thumb || 'https://via.placeholder.com/400x350/1a1a1a/00f3ff?text=NO+IMAGE';

                // aki pillo el precio rebajao y el normal pa q se vea la oferta
                const precioActual = juego.salePrice || juego.cheapest || "0.00";

                // si tiene precio normal (viejo), se lo pongo tachao al lao
                const precioViejo = juego.normalPrice ? `<span style="text-decoration: line-through; color: #666; font-size: 0.9rem; margin-right: 10px;">${juego.normalPrice}€</span>` : '';

                // lo clavo en la web
                const tarjetaHTML = `
                    <div class="game-card">
                        <img src="${imagen}" alt="${titulo}" class="game-cover">
                        <div class="game-info">
                            <h3 class="game-title">${titulo}</h3>
                            
                            <div class="game-price-tag">
                                <div><i class="fas fa-tag"></i> Oferta actual</div>
                                <span>${precioViejo}${precioActual}€</span>
                            </div>
                        </div>
                    </div>
                `;
                gridJuegos.innerHTML += tarjetaHTML;
            });
        })
        .catch(error => {
            // porsiaka explota la api
            console.error("pos a dao un error reventando el fetch:", error);
            gridJuegos.innerHTML = '<div style="color:#ff4757; text-align:center; width:100%;">El ciberespacio esta jodido oy. No cargan los juegos.</div>';
        });
}

// disparo la funcion namas empezar
cargarJuegos();

// pa cuando le dan al boton d la lupa
btnBuscar.addEventListener('click', () => {
    cargarJuegos(inputBuscar.value);
});

// pa q funcione dandole al enter q si no es un coñazo
inputBuscar.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        cargarJuegos(inputBuscar.value);
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