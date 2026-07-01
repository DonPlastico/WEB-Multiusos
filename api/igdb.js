export default async function handler(req, res) {
    const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
    const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
    const ITAD_API_KEY = process.env.ITAD_API_KEY;

    if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
        console.error('🔴 Faltan credenciales de Twitch');
        return res.status(500).json({ error: 'Configuración incompleta' });
    }

    const { query } = req;
    const busqueda = query.query || '';
    const offset = parseInt(query.offset) || 0;
    const limit = parseInt(query.limit) || 50;
    const sortField = query.sort || '';
    const platforms = query.platforms || '';
    const genres = query.genres || '';
    const dateMin = query.dateMin || '';
    const dateMax = query.dateMax || '';
    const modes = query.modes || '';
    const lang = query.lang || 'es';

    const langMap = { 'es': 169, 'en': 1, 'fr': 3, 'it': 4, 'de': 2, 'zh': 28, 'ja': 9, 'ko': 11 };
    const igdbLang = langMap[lang] || 169;

    try {
        // OBTENER TOKEN DE TWITCH
        const tokenRes = await fetch(
            `https://id.twitch.tv/oauth2/token?client_id=${TWITCH_CLIENT_ID}&client_secret=${TWITCH_CLIENT_SECRET}&grant_type=client_credentials`,
            { method: 'POST' }
        );

        if (!tokenRes.ok) return res.status(500).json({ error: 'Error obteniendo token' });
        const tokenData = await tokenRes.json();
        if (!tokenData.access_token) return res.status(500).json({ error: 'Fallo al procesar access_token' });

        const access_token = tokenData.access_token;

        // Limpiamos la caché de Vercel dejándola en 5 segundos temporalmente
        res.setHeader('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=5');

        // CONSTRUIR QUERY APICALYPSE
        let whereClauses = [];

        // 1. FILTROS BASE (Asegurar que sea juego real y tenga imagen)
        whereClauses.push('category = (0,8,9,10)');
        whereClauses.push('cover != null');

        // 2. FILTROS DEL USUARIO
        if (platforms) whereClauses.push(`platforms = (${platforms})`);
        if (genres) whereClauses.push(`genres = (${genres})`);
        if (modes) whereClauses.push(`game_modes = (${modes})`);

        if (dateMin) {
            const minTimestamp = Math.floor(new Date(parseInt(dateMin) * 1000).getTime() / 1000);
            whereClauses.push(`first_release_date >= ${minTimestamp}`);
        }
        if (dateMax) {
            const maxTimestamp = Math.floor(new Date(parseInt(dateMax) * 1000).getTime() / 1000);
            whereClauses.push(`first_release_date <= ${maxTimestamp}`);
        }

        // 3. COMPORTAMIENTO POR DEFECTO (Home de la web)
        const esFiltroVacio = !busqueda && !platforms && !genres && !modes && !dateMin && !dateMax && !sortField.includes('rating');

        if (esFiltroVacio) {
            whereClauses.push('total_rating >= 80');
            whereClauses.push('total_rating_count > 10'); // Evita juegos muy desconocidos
        }

        const whereQuery = `where ${whereClauses.join(' & ')};`;

        let sortQuery = 'sort first_release_date desc;';
        if (sortField === 'rating.desc') sortQuery = 'sort rating desc;';
        else if (sortField === 'rating.asc') sortQuery = 'sort rating asc;';
        else if (sortField === 'popularity.desc') sortQuery = 'sort popularity desc;';
        else if (sortField === 'first_release_date.desc') sortQuery = 'sort first_release_date desc;';
        else if (sortField === 'first_release_date.asc') sortQuery = 'sort first_release_date asc;';

        const bodyQuery = busqueda
            ? `fields name, cover.url, first_release_date, platforms.name, total_rating, rating, category, summary, involved_companies.company.name, involved_companies.developer, involved_companies.publisher, genres.name, game_modes.name, websites.url; search "${busqueda}"; ${whereQuery} limit ${limit}; offset ${offset};`
            : `fields name, cover.url, first_release_date, platforms.name, total_rating, rating, category, summary, involved_companies.company.name, involved_companies.developer, involved_companies.publisher, genres.name, game_modes.name, websites.url; ${sortQuery} ${whereQuery} limit ${limit}; offset ${offset};`;

        // CONSULTAR IGDB
        const igdbRes = await fetch('https://api.igdb.com/v4/games', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Client-ID': TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${access_token}`,
                'Language': igdbLang
            },
            body: bodyQuery
        });

        if (!igdbRes.ok) {
            const errorText = await igdbRes.text();
            console.error('🔴 Error IGDB:', igdbRes.status, errorText);
            return res.status(500).json({ error: 'Error IGDB', details: errorText });
        }

        const dataRaw = await igdbRes.json();

        // FILTRAR MODOS DE JUEGO
        const juegosIGDB = dataRaw.filter(j => {
            if (!modes) return true;
            if (!j.game_modes) return false;
            const modoSeleccionadoArray = modes.split(',');
            return j.game_modes.some(m => modoSeleccionadoArray.includes(m.id.toString()));
        });

        if (juegosIGDB.length === 0) return res.status(200).json([]);

        // CONSULTAR ITAD (Simplificado)
        const promesasITAD = juegosIGDB.map(async (juego) => {
            if (!ITAD_API_KEY) return null;
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 2000);
                const searchRes = await fetch(
                    `https://api.isthereanydeal.com/games/search/v1?title=${encodeURIComponent(juego.name)}&limit=1&key=${ITAD_API_KEY}`,
                    { signal: controller.signal }
                );
                clearTimeout(timeoutId);
                if (!searchRes.ok) return null;
                const searchData = await searchRes.json();
                return (searchData && searchData.length > 0) ? { igdbId: juego.id, itadId: searchData[0].id } : null;
            } catch { return null; }
        });

        const resultadosITAD = (await Promise.all(promesasITAD)).filter(r => r !== null);
        const itadIds = resultadosITAD.map(r => r.itadId);

        let mapaPrecios = {};
        if (itadIds.length > 0 && ITAD_API_KEY) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 4000);
                const preciosRes = await fetch(
                    `https://api.isthereanydeal.com/games/prices/v3?country=ES&key=${ITAD_API_KEY}`,
                    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(itadIds), signal: controller.signal }
                );
                clearTimeout(timeoutId);
                if (preciosRes.ok) {
                    const preciosData = await preciosRes.json();
                    preciosData.forEach(item => { mapaPrecios[item.id] = item.deals; });
                }
            } catch (e) { console.warn('⚠️ Error ITAD:', e.message); }
        }

        const jsonFinal = juegosIGDB.map(juego => {
            const matchITAD = resultadosITAD.find(r => r.igdbId === juego.id);
            let infoPrecio = { precio: null, stores: 'none', url: '' };
            if (matchITAD && mapaPrecios[matchITAD.itadId]?.length > 0) {
                const deals = mapaPrecios[matchITAD.itadId].sort((a, b) => a.price.amount - b.price.amount);
                const mejor = deals[0];
                infoPrecio = { precio: mejor.price.amount, voucher: mejor.voucher || null, stores: deals.map(d => d.shop.name.toLowerCase()).join(','), url: mejor.url || '' };
            }
            return { ...juego, itad: infoPrecio };
        });

        res.status(200).json(jsonFinal);
    } catch (error) {
        console.error('🔴 Error handler:', error);
        res.status(500).json({ error: 'Fallo crítico', message: error.message });
    }
}