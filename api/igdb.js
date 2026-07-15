// ============================================================
//   API IGDB - JUEGOS (CON PRECIOS DE ITAD Y CACHÉ DE TOKEN)
// ============================================================
// Este endpoint se encarga de buscar juegos en IGDB, filtrarlos,
// obtener sus precios desde IsThereAnyDeal (ITAD) y devolverlos
// en un formato uniforme para el frontend.

export default async function handler(req, res) {
    // Desactivar caché para Vercel (para que siempre tengamos datos frescos)
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Variables de entorno para las APIs externas
    const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
    const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
    const ITAD_API_KEY = process.env.ITAD_API_KEY;

    // Verificar credenciales - si faltan, no podemos hacer nada
    if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
        console.error('🔴 Faltan credenciales de Twitch');
        return res.status(500).json({
            error: 'Configuración del servidor incompleta',
            details: 'Faltan TWITCH_CLIENT_ID o TWITCH_CLIENT_SECRET'
        });
    }

    // Extraer todos los parametros de la query string
    const { query } = req;
    const busqueda = query.query || ''; // Texto de busqueda
    const offset = parseInt(query.offset) || 0; // Paginacion
    const limit = Math.min(parseInt(query.limit) || 50, 50); // Limite de resultados (max 50)
    const sortField = query.sort || 'first_release_date.desc'; // Orden
    const platforms = query.platforms || ''; // Filtro de plataformas
    const genres = query.genres || ''; // Filtro de generos
    const dateMin = query.dateMin || ''; // Filtro fecha desde
    const dateMax = query.dateMax || ''; // Filtro fecha hasta
    const modes = query.modes || ''; // Filtro modos de juego
    const lang = query.lang || 'es'; // Idioma

    // Mapeo de idiomas a codigos numericos de IGDB
    const langMap = {
        'es': 169, 'en': 1, 'fr': 3, 'it': 4, 'de': 2,
        'zh': 28, 'ja': 9, 'ko': 11
    };
    const igdbLang = langMap[lang] || 169;

    try {
        // =============================================
        // 1. OBTENER TOKEN DE TWITCH CON CACHÉ
        // =============================================
        // IGDB requiere un token de Twitch que caduca cada ~24h
        // Lo guardamos en memoria global para no pedirlo cada vez
        let access_token;
        const tokenCache = global.twitchToken;

        if (tokenCache && tokenCache.expires_at > Date.now()) {
            // Si el token es valido, lo reutilizamos
            access_token = tokenCache.access_token;
        } else {
            // Si ha caducado, pedimos uno nuevo
            const tokenRes = await fetch(
                `https://id.twitch.tv/oauth2/token?client_id=${TWITCH_CLIENT_ID}&client_secret=${TWITCH_CLIENT_SECRET}&grant_type=client_credentials`,
                { method: 'POST' }
            );

            if (!tokenRes.ok) {
                const errorText = await tokenRes.text();
                console.error('🔴 Error obteniendo token:', tokenRes.status, errorText);
                return res.status(500).json({ error: 'Error obteniendo token de Twitch' });
            }

            const tokenData = await tokenRes.json();
            if (!tokenData.access_token) {
                console.error('🔴 No se recibió access_token');
                return res.status(500).json({ error: 'No se pudo obtener access_token' });
            }

            // Guardamos el token en global con su fecha de expiracion (23h para ir seguros)
            global.twitchToken = {
                access_token: tokenData.access_token,
                expires_at: Date.now() + (23 * 60 * 60 * 1000)
            };
            access_token = tokenData.access_token;
        }

        // =============================================
        // 2. CONSTRUIR LA QUERY DE IGDB
        // =============================================
        // IGDB usa un lenguaje de consulta tipo SQL personalizado
        let whereClauses = [];

        // Filtros basicos (plataformas, generos, modos)
        if (platforms) whereClauses.push(`platforms = (${platforms})`);
        if (genres) whereClauses.push(`genres = (${genres})`);
        if (modes) whereClauses.push(`game_modes = (${modes})`);

        // Si se pasa 'period' en lugar de fechas, calcular automaticamente
        // Esto es para las pestañas de "tendencias" (dia, semana, mes, año)
        const period = query.period || '';

        if (period && !dateMin && !dateMax) {
            const ahora = new Date();
            let fechaInicio = new Date(ahora);

            switch (period) {
                case 'day':
                    fechaInicio.setDate(ahora.getDate() - 1);
                    break;
                case 'week':
                    fechaInicio.setDate(ahora.getDate() - 7);
                    break;
                case 'month':
                    fechaInicio.setMonth(ahora.getMonth() - 1);
                    break;
                case 'year':
                    fechaInicio.setFullYear(ahora.getFullYear() - 1);
                    break;
                default:
                    fechaInicio.setDate(ahora.getDate() - 7);
            }

            fechaInicio.setHours(0, 0, 0, 0);
            ahora.setHours(23, 59, 59, 999);

            const minTimestamp = Math.floor(fechaInicio.getTime() / 1000);
            const maxTimestamp = Math.floor(ahora.getTime() / 1000);

            whereClauses.push(`first_release_date >= ${minTimestamp}`);
            whereClauses.push(`first_release_date <= ${maxTimestamp}`);
        }

        // Filtros de fechas especificos (desde/hasta)
        if (dateMin) {
            const minTimestamp = Math.floor(new Date(dateMin).getTime() / 1000);
            whereClauses.push(`first_release_date >= ${minTimestamp}`);
        }
        if (dateMax) {
            const maxTimestamp = Math.floor(new Date(dateMax).getTime() / 1000);
            whereClauses.push(`first_release_date <= ${maxTimestamp}`);
        }

        // Siempre incluir fecha para evitar resultados infinitos
        // Si no hay busqueda ni filtros, mostramos juegos recientes con rating
        if (!busqueda && !dateMin && !dateMax && !period) {
            const hoy = Math.floor(Date.now() / 1000);
            whereClauses.push(`first_release_date != null`);
            whereClauses.push(`first_release_date <= ${hoy}`);
            // Filtro para juegos con rating > 0 (evita basura)
            whereClauses.push(`total_rating_count > 0`);
        }

        // Unimos todas las clausulas WHERE con "&" (AND en IGDB)
        const whereQuery = whereClauses.length > 0 ? `where ${whereClauses.join(' & ')};` : '';

        // Determinar el ordenamiento segun lo que pida el frontend
        let sortQuery = 'sort first_release_date desc;';
        if (sortField === 'rating.desc') sortQuery = 'sort total_rating desc;';
        else if (sortField === 'rating.asc') sortQuery = 'sort total_rating asc;';
        else if (sortField === 'popularity.desc') sortQuery = 'sort popularity desc;';
        else if (sortField === 'first_release_date.desc') sortQuery = 'sort first_release_date desc;';
        else if (sortField === 'first_release_date.asc') sortQuery = 'sort first_release_date asc;';

        // Construir el body de la consulta (con o sin busqueda)
        let bodyQuery;
        if (busqueda) {
            bodyQuery = `
                fields name, cover.url, first_release_date, platforms.name, platforms.id,
                    total_rating, total_rating_count, rating, rating_count, category,
                    summary, involved_companies.company.name, involved_companies.developer,
                    involved_companies.publisher, genres.name, game_modes.name, websites.url,
                    screenshots.url, videos.video_id, videos.name;
                search "${busqueda}";
                ${whereQuery}
                limit ${limit};
                offset ${offset};
            `;
        } else {
            bodyQuery = `
                fields name, cover.url, first_release_date, platforms.name, platforms.id,
                    total_rating, total_rating_count, rating, rating_count, category,
                    summary, involved_companies.company.name, involved_companies.developer,
                    involved_companies.publisher, genres.name, game_modes.name, websites.url,
                    screenshots.url, videos.video_id, videos.name;
                ${whereQuery}
                ${sortQuery}
                limit ${limit};
                offset ${offset};
            `;
        }

        // =============================================
        // 3. EJECUTAR CONSULTA EN IGDB
        // =============================================
        const igdbRes = await fetch('https://api.igdb.com/v4/games', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Client-ID': TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${access_token}`,
            },
            body: bodyQuery
        });

        if (!igdbRes.ok) {
            const errorText = await igdbRes.text();
            console.error('🔴 Error IGDB:', igdbRes.status, errorText);
            return res.status(500).json({ error: 'Error consultando IGDB', details: errorText });
        }

        const dataRaw = await igdbRes.json();

        // =============================================
        // 4. FILTRAR JUEGOS VÁLIDOS
        // =============================================

        // Categorias que queremos bloquear (3 = "addon" / DLC)
        const CATEGORIAS_BLOQUEADAS = [3];

        // Filtramos juegos sin nombre o sin portada
        let juegosFiltrados = dataRaw.filter(juego => {
            const tieneNombre = juego.name && juego.name.length > 0;
            const tienePortada = juego.cover && juego.cover.url;
            return tieneNombre && tienePortada;
        });

        // Si no es busqueda, tambien filtramos por categoria (excluimos DLCs)
        if (!busqueda) {
            juegosFiltrados = juegosFiltrados.filter(juego => {
                const categoria = juego.category ?? -1;
                return !CATEGORIAS_BLOQUEADAS.includes(categoria);
            });
        }

        // Desduplicación - a veces IGDB devuelve el mismo juego varias veces
        // con diferentes categorias (base game, edition, etc). Nos quedamos con la mejor.
        const vistos = new Map();
        juegosFiltrados.forEach(juego => {
            let nombreBase = juego.name;
            const separadores = [':', '—', '–', '-'];
            for (const sep of separadores) {
                const idx = nombreBase.indexOf(sep);
                if (idx > 0) {
                    nombreBase = nombreBase.substring(0, idx).trim();
                    break;
                }
            }
            const key = nombreBase.toLowerCase();
            if (vistos.has(key)) {
                const existente = vistos.get(key);
                const esBase = juego.category === 0; // 0 = base game
                const existenteEsBase = existente.category === 0;
                if (esBase && !existenteEsBase) {
                    vistos.set(key, juego);
                }
                return;
            }
            vistos.set(key, juego);
        });

        juegosFiltrados = Array.from(vistos.values());

        // =============================================
        // 5. CONSULTAR ITAD (PRECIOS)
        // =============================================
        // IsThereAnyDeal nos da los precios mas baratos de cada juego
        let mapaPrecios = {};

        if (ITAD_API_KEY) {
            try {
                // Primero buscamos el ID de cada juego en ITAD
                const promesasITAD = juegosFiltrados.map(async (juego) => {
                    try {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 3000);

                        const searchRes = await fetch(
                            `https://api.isthereanydeal.com/games/search/v1?title=${encodeURIComponent(juego.name)}&limit=1&key=${ITAD_API_KEY}`,
                            { signal: controller.signal }
                        );
                        clearTimeout(timeoutId);

                        if (!searchRes.ok) return null;
                        const searchData = await searchRes.json();
                        if (searchData && searchData.length > 0) {
                            return { igdbId: juego.id, itadId: searchData[0].id };
                        }
                    } catch (e) {
                        return null;
                    }
                    return null;
                });

                const resultadosITAD = (await Promise.all(promesasITAD)).filter(r => r !== null);
                const itadIds = resultadosITAD.map(r => r.itadId);

                // Luego pedimos los precios de todos los IDs encontrados
                if (itadIds.length > 0) {
                    try {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 5000);

                        const preciosRes = await fetch(
                            `https://api.isthereanydeal.com/games/prices/v3?country=ES&key=${ITAD_API_KEY}`,
                            {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(itadIds),
                                signal: controller.signal
                            }
                        );
                        clearTimeout(timeoutId);

                        if (preciosRes.ok) {
                            const preciosData = await preciosRes.json();
                            preciosData.forEach(item => {
                                mapaPrecios[item.id] = item.deals;
                            });
                        }
                    } catch (e) {
                        console.warn('⚠️ Error en ITAD prices:', e.message);
                    }
                }

                // Asignamos la informacion de precio a cada juego
                juegosFiltrados.forEach(juego => {
                    const matchITAD = resultadosITAD?.find(r => r.igdbId === juego.id);
                    let infoPrecio = { precio: null, stores: 'none', url: '' };

                    if (matchITAD && mapaPrecios[matchITAD.itadId] && mapaPrecios[matchITAD.itadId]?.length > 0) {
                        const deals = mapaPrecios[matchITAD.itadId].sort((a, b) => a.price.amount - b.price.amount);
                        const mejor = deals[0];
                        infoPrecio = {
                            precio: mejor.price.amount,
                            voucher: mejor.voucher || null,
                            stores: deals.map(d => d.shop.name.toLowerCase()).join(','),
                            url: mejor.url || ''
                        };
                    }
                    juego.itad = infoPrecio;
                });

            } catch (e) {
                console.warn('⚠️ Error en ITAD:', e.message);
            }
        } else {
            // Si no hay API key de ITAD, dejamos precio null
            juegosFiltrados.forEach(juego => {
                juego.itad = { precio: null, stores: 'none', url: '' };
            });
        }

        // hasMore se basa en si IGDB devolvió el límite completo
        const hasMore = dataRaw.length === limit;

        // Devolvemos los resultados en el formato que espera el frontend
        res.status(200).json({
            juegos: juegosFiltrados,
            total: dataRaw.length,
            offset: offset,
            limit: limit,
            hasMore: hasMore
        });

    } catch (error) {
        console.error('🔴 Error en IGDB handler:', error);
        res.status(500).json({
            error: 'Fallo crítico en el servidor',
            message: error.message
        });
    }
}