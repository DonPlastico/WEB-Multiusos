// ============================================================
//   API IGDB - JUEGOS (CON PRECIOS DE ITAD Y CACHÉ DE TOKEN)
// ============================================================

export default async function handler(req, res) {
    // Desactivar caché para Vercel
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Variables de entorno
    const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
    const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
    const ITAD_API_KEY = process.env.ITAD_API_KEY;

    if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
        console.error('🔴 Faltan credenciales de Twitch');
        return res.status(500).json({
            error: 'Configuración del servidor incompleta',
            details: 'Faltan TWITCH_CLIENT_ID o TWITCH_CLIENT_SECRET'
        });
    }

    const { query } = req;
    const busqueda = query.query || '';
    const buscarPorId = query.id || '';
    const offset = parseInt(query.offset) || 0;
    const limit = Math.min(parseInt(query.limit) || 50, 50);
    const sortField = query.sort || 'first_release_date.desc';
    const platforms = query.platforms || '';
    const genres = query.genres || '';
    const dateMin = query.dateMin || '';
    const dateMax = query.dateMax || '';
    const modes = query.modes || '';
    const lang = query.lang || 'es';
    const period = query.period || '';

    try {
        // =============================================
        // 1. OBTENER TOKEN DE TWITCH CON CACHÉ
        // =============================================
        let access_token;
        const tokenCache = global.twitchToken;

        if (tokenCache && tokenCache.expires_at > Date.now()) {
            access_token = tokenCache.access_token;
        } else {
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
        }

        // =============================================
        // 2. SI SE PASA 'id', BUSCAR POR ID
        // =============================================
        if (buscarPorId) {
            try {
                const igdbRes = await fetch('https://api.igdb.com/v4/games', {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Client-ID': TWITCH_CLIENT_ID,
                        'Authorization': `Bearer ${access_token}`,
                    },
                    body: `
                        fields name, cover.url, first_release_date, platforms.name, platforms.id,
                            total_rating, total_rating_count, rating, rating_count, category,
                            summary, involved_companies.company.name, involved_companies.developer,
                            involved_companies.publisher, genres.name, game_modes.name, websites.url,
                            screenshots.url, videos.video_id, videos.name;
                        where id = ${buscarPorId};
                        limit 1;
                    `
                });

                if (igdbRes.ok) {
                    const data = await igdbRes.json();
                    if (data && data.length > 0) {
                        const juego = data[0];
                        juego.itad = { precio: null, stores: 'none', url: '' };
                        return res.status(200).json({
                            juegos: [juego],
                            total: 1,
                            offset: 0,
                            limit: 1,
                            hasMore: false
                        });
                    }
                }
                return res.status(404).json({ juegos: [], total: 0 });
            } catch (e) {
                console.error('Error buscando por ID:', e);
                return res.status(500).json({ error: 'Error buscando por ID', details: e.message });
            }
        }

        // =============================================
        // 3. CONSTRUIR LA QUERY DE IGDB
        // =============================================
        let whereClauses = [];

        if (platforms) whereClauses.push(`platforms = (${platforms})`);
        if (genres) whereClauses.push(`genres = (${genres})`);
        if (modes) whereClauses.push(`game_modes = (${modes})`);

        if (period && !dateMin && !dateMax) {
            const ahora = new Date();
            let fechaInicio = new Date(ahora);

            switch (period) {
                case 'day': fechaInicio.setDate(ahora.getDate() - 1); break;
                case 'week': fechaInicio.setDate(ahora.getDate() - 7); break;
                case 'month': fechaInicio.setMonth(ahora.getMonth() - 1); break;
                case 'year': fechaInicio.setFullYear(ahora.getFullYear() - 1); break;
                default: fechaInicio.setDate(ahora.getDate() - 7);
            }

            fechaInicio.setHours(0, 0, 0, 0);
            ahora.setHours(23, 59, 59, 999);

            whereClauses.push(`first_release_date >= ${Math.floor(fechaInicio.getTime() / 1000)}`);
            whereClauses.push(`first_release_date <= ${Math.floor(ahora.getTime() / 1000)}`);
        }

        if (dateMin) {
            whereClauses.push(`first_release_date >= ${Math.floor(new Date(dateMin).getTime() / 1000)}`);
        }
        if (dateMax) {
            whereClauses.push(`first_release_date <= ${Math.floor(new Date(dateMax).getTime() / 1000)}`);
        }

        if (!busqueda && !dateMin && !dateMax && !period) {
            const hoy = Math.floor(Date.now() / 1000);
            whereClauses.push(`first_release_date != null`);
            whereClauses.push(`first_release_date <= ${hoy}`);
            whereClauses.push(`total_rating_count > 0`);
        }

        // Cuando ordenamos por popularidad (ej. "Lo Más Popular" con period=month/year),
        // filtramos igualmente juegos sin ninguna valoracion para no mezclar basura
        if (sortField === 'popularity.desc' && !whereClauses.some(w => w.includes('total_rating_count'))) {
            whereClauses.push(`total_rating_count > 0`);
        }

        const whereQuery = whereClauses.length > 0 ? `where ${whereClauses.join(' & ')};` : '';

        let sortQuery = 'sort first_release_date desc;';
        if (sortField === 'rating.desc') sortQuery = 'sort total_rating desc;';
        else if (sortField === 'rating.asc') sortQuery = 'sort total_rating asc;';
        // IGDB v4 no tiene el campo "popularity" en /games (esta en un endpoint aparte).
        // Usamos total_rating_count como proxy real de popularidad: cuanta mas gente
        // ha valorado el juego, mas popular es.
        else if (sortField === 'popularity.desc') sortQuery = 'sort total_rating_count desc;';
        else if (sortField === 'first_release_date.desc') sortQuery = 'sort first_release_date desc;';
        else if (sortField === 'first_release_date.asc') sortQuery = 'sort first_release_date asc;';

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
        // 4. EJECUTAR CONSULTA EN IGDB
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
        // 5. FILTRAR JUEGOS
        // =============================================
        const CATEGORIAS_BLOQUEADAS = [3];

        let juegosFiltrados = dataRaw.filter(juego => {
            const tieneNombre = juego.name && juego.name.length > 0;
            const tienePortada = juego.cover && juego.cover.url;
            return tieneNombre && tienePortada;
        });

        if (!busqueda) {
            juegosFiltrados = juegosFiltrados.filter(juego => {
                const categoria = juego.category ?? -1;
                return !CATEGORIAS_BLOQUEADAS.includes(categoria);
            });
        }

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
                const esBase = juego.category === 0;
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
        // 6. CONSULTAR ITAD (PRECIOS)
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

        const hasMore = dataRaw.length === limit;

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