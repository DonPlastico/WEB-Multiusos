export default async function handler(req, res) {
    const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
    const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
    const ITAD_API_KEY = process.env.ITAD_API_KEY;

    // Verificar credenciales
    if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
        console.error('🔴 Faltan credenciales de Twitch');
        return res.status(500).json({
            error: 'Configuración del servidor incompleta',
            details: 'Faltan TWITCH_CLIENT_ID o TWITCH_CLIENT_SECRET'
        });
    }

    const { query } = req;
    const busqueda = query.query || '';
    const offset = parseInt(query.offset) || 0;
    const limit = Math.min(parseInt(query.limit) || 100, 200);
    const sortField = query.sort || 'first_release_date.desc';
    const platforms = query.platforms || '';
    const genres = query.genres || '';
    const dateMin = query.dateMin || '';
    const dateMax = query.dateMax || '';
    const modes = query.modes || '';
    const lang = query.lang || 'es';

    // Mapeo de idiomas para IGDB
    const langMap = {
        'es': 169, 'en': 1, 'fr': 3, 'it': 4, 'de': 2,
        'zh': 28, 'ja': 9, 'ko': 11
    };
    const igdbLang = langMap[lang] || 169;

    try {
        // =============================================
        // 1. OBTENER TOKEN DE TWITCH CON CACHÉ
        // =============================================
        let access_token;
        const tokenCache = global.twitchToken;

        if (tokenCache && tokenCache.expires_at > Date.now()) {
            access_token = tokenCache.access_token;
            console.log('✅ Token reutilizado de caché');
        } else {
            console.log('🔄 Obteniendo nuevo token de Twitch...');
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

            global.twitchToken = {
                access_token: tokenData.access_token,
                expires_at: Date.now() + (23 * 60 * 60 * 1000)
            };
            access_token = tokenData.access_token;
            console.log('✅ Nuevo token obtenido');
        }

        // =============================================
        // 2. CONSTRUIR LA QUERY
        // =============================================
        let whereClauses = [];

        // Filtros básicos
        if (platforms) whereClauses.push(`platforms = (${platforms})`);
        if (genres) whereClauses.push(`genres = (${genres})`);
        if (modes) whereClauses.push(`game_modes = (${modes})`);

        // Filtros de fecha
        if (dateMin) {
            const minTimestamp = Math.floor(new Date(dateMin).getTime() / 1000);
            whereClauses.push(`first_release_date >= ${minTimestamp}`);
        }
        if (dateMax) {
            const maxTimestamp = Math.floor(new Date(dateMax).getTime() / 1000);
            whereClauses.push(`first_release_date <= ${maxTimestamp}`);
        }

        // Si NO hay búsqueda y NO hay filtros de fecha, excluir juegos sin fecha
        // y juegos con fecha futura (no lanzados aún)
        if (!busqueda && !dateMin && !dateMax) {
            const hoy = Math.floor(Date.now() / 1000);
            whereClauses.push(`first_release_date != null`);
            whereClauses.push(`first_release_date <= ${hoy}`);
            // whereClauses.push('total_rating_count > 5');
        }

        // Si hay búsqueda, no filtramos por fecha (para que salgan juegos futuros)
        if (busqueda) {
            // Quitamos el filtro de fecha futura si existe
            const indexFecha = whereClauses.findIndex(c => c.includes('first_release_date <= '));
            if (indexFecha !== -1) {
                whereClauses.splice(indexFecha, 1);
            }
        }

        const whereQuery = whereClauses.length > 0 ? `where ${whereClauses.join(' & ')};` : '';

        // Orden por fecha de lanzamiento DESCENDENTE (más reciente primero)
        let sortQuery = 'sort first_release_date desc;';
        if (sortField === 'rating.desc') sortQuery = 'sort total_rating desc;';
        else if (sortField === 'rating.asc') sortQuery = 'sort total_rating asc;';
        else if (sortField === 'popularity.desc') sortQuery = 'sort popularity desc;';
        else if (sortField === 'first_release_date.desc') sortQuery = 'sort first_release_date desc;';
        else if (sortField === 'first_release_date.asc') sortQuery = 'sort first_release_date asc;';

        // Construir body de la consulta
        let bodyQuery;
        if (busqueda) {
            bodyQuery = `
                fields name, cover.url, first_release_date, platforms.name, platforms.id,
                    total_rating, total_rating_count, rating, rating_count, category,
                    summary, involved_companies.company.name, involved_companies.developer,
                    involved_companies.publisher, genres.name, game_modes.name, websites.url;
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
                    involved_companies.publisher, genres.name, game_modes.name, websites.url;
                ${whereQuery}
                ${sortQuery}
                limit ${limit};
                offset ${offset};
            `;
        }

        // =============================================
        // 3. CONSULTAR IGDB
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
        console.log(`📥 IGDB devolvió ${dataRaw.length} juegos`);

        // =============================================
        // 4. FILTRAR JUEGOS VÁLIDOS (VERSIÓN CORREGIDA)
        // =============================================

        // Solo bloqueamos categorías que son OBVIAMENTE basura
        const CATEGORIAS_BLOQUEADAS = [3]; // 3 = Bundle (Complete Edition, etc.)

        // Palabras clave para bloquear EDICIONES ESPECIALES (solo si están en el nombre)
        const KEYWORDS_BLOQUEADAS = [
            'complete edition', 'complete collection', 'game of the year', 'goty',
            'launch edition', 'regalla edition', 'special edition', 'collector\'s edition',
            'deluxe edition', 'ultimate edition', 'premium edition', 'gold edition',
            'platinum edition', 'diamond edition', 'limited edition', 'exclusive edition',
            'definitive edition', 'final edition', 'legendary edition', 'mythic edition',
            'bundle', 'collection', 'compilation', 'triple pack', 'double pack'
        ];

        // 1. Filtro básico: juegos con nombre y portada
        let juegosFiltrados = dataRaw.filter(juego => {
            const tieneNombre = juego.name && juego.name.length > 0;
            const tienePortada = juego.cover && juego.cover.url;
            return tieneNombre && tienePortada;
        });

        // 2. Si hay búsqueda activa, NO aplicamos filtros de categoría (para no romper búsquedas)
        if (!busqueda) {
            // Solo en carga inicial (tendencias), bloqueamos bundles (categoría 3)
            juegosFiltrados = juegosFiltrados.filter(juego => {
                const categoria = juego.category ?? -1;
                return !CATEGORIAS_BLOQUEADAS.includes(categoria);
            });
        }

        // 3. NUNCA bloqueamos por categoría si hay búsqueda (la gente busca DLCs, Remakes, etc.)
        // 4. NUNCA bloqueamos DLCs (categoría 1) porque son contenido válido

        // 5. Desduplicación: mantener SOLO la primera versión de cada juego
        const vistos = new Map(); // Usamos Map para guardar el mejor juego
        const juegosUnicos = [];

        juegosFiltrados.forEach(juego => {
            // Extraer nombre base (antes del primer ":" o "-")
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

            // Si ya tenemos un juego con este nombre base
            if (vistos.has(key)) {
                const existente = vistos.get(key);

                // PRIORIDAD: mantener el juego base (category 0) sobre ediciones especiales
                const esBase = juego.category === 0;
                const existenteEsBase = existente.category === 0;

                // Si el nuevo es base y el existente no, reemplazar
                if (esBase && !existenteEsBase) {
                    vistos.set(key, juego);
                }
                // Si ambos son base, mantener el que tenga portada (ambos ya tienen)
                return;
            }

            vistos.set(key, juego);
        });

        // Convertir Map a array
        juegosFiltrados = Array.from(vistos.values());

        console.log(`✅ Filtrados ${juegosFiltrados.length} juegos válidos (únicos)`);

        // =============================================
        // 5. CONSULTAR ITAD (PRECIOS)
        // =============================================
        let mapaPrecios = {};

        if (ITAD_API_KEY) {
            try {
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
            juegosFiltrados.forEach(juego => {
                juego.itad = { precio: null, stores: 'none', url: '' };
            });
        }

        res.status(200).json(juegosFiltrados);

    } catch (error) {
        console.error('🔴 Error en IGDB handler:', error);
        res.status(500).json({
            error: 'Fallo crítico en el servidor',
            message: error.message
        });
    }
}