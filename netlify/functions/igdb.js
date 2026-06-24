exports.handler = async (event, context) => {
    const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
    const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
    const ITAD_API_KEY = process.env.ITAD_API_KEY;

    const busqueda = event.queryStringParameters.query || '';
    const offset = parseInt(event.queryStringParameters.offset) || 0;
    const limit = parseInt(event.queryStringParameters.limit) || 50;
    const sortField = event.queryStringParameters.sort || '';
    const platforms = event.queryStringParameters.platforms || '';
    const genres = event.queryStringParameters.genres || '';
    const dateMin = event.queryStringParameters.dateMin || '';
    const dateMax = event.queryStringParameters.dateMax || '';
    const modes = event.queryStringParameters.modes || '';

    console.log('🔍 Tendencias - Parámetros:', { dateMin, dateMax, sortField, busqueda });

    try {
        const tokenRes = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${TWITCH_CLIENT_ID}&client_secret=${TWITCH_CLIENT_SECRET}&grant_type=client_credentials`, { method: 'POST' });
        const { access_token } = await tokenRes.json();

        // 1. CONSTRUIMOS EL FILTRO INTELIGENTE
        let whereClauses = [];
        if (platforms) whereClauses.push(`platforms = (${platforms})`);
        if (genres) whereClauses.push(`genres = (${genres})`);
        if (modes) whereClauses.push(`game_modes = (${modes})`);

        // === TRADUCTOR DE FECHAS A UNIX TIMESTAMP ===
        if (dateMin) {
            const minTimestamp = Math.floor(new Date(parseInt(dateMin) * 1000).getTime() / 1000);
            whereClauses.push(`first_release_date >= ${minTimestamp}`);
        }
        if (dateMax) {
            const maxTimestamp = Math.floor(new Date(parseInt(dateMax) * 1000).getTime() / 1000);
            whereClauses.push(`first_release_date <= ${maxTimestamp}`);
        }

        const tieneFechas = dateMin || dateMax;
        const esOrdenRating = sortField.includes('rating');

        if (!busqueda && whereClauses.length === 0 && !esOrdenRating && !tieneFechas) {
            whereClauses.push('total_rating > 80');
        }

        console.log('📋 Where clauses:', whereClauses);

        const whereQuery = whereClauses.length > 0 ? `where ${whereClauses.join(' & ')};` : '';

        // 2. CONSTRUIMOS LA QUERY FINAL
        let sortQuery = 'sort first_release_date desc;';
        if (sortField === 'rating.desc') {
            sortQuery = 'sort rating desc;';
        } else if (sortField === 'rating.asc') {
            sortQuery = 'sort rating asc;';
        } else if (sortField === 'popularity.desc') {
            sortQuery = 'sort popularity desc;';
        } else if (sortField === 'first_release_date.desc') {
            sortQuery = 'sort first_release_date desc;';
        } else if (sortField === 'first_release_date.asc') {
            sortQuery = 'sort first_release_date asc;';
        }

        const bodyQuery = busqueda
            ? `fields name, cover.url, first_release_date, platforms.name, total_rating, rating, category, summary, involved_companies.company.name, involved_companies.developer, involved_companies.publisher, genres.name, game_modes.name, websites.url; search "${busqueda}"; ${whereQuery} limit ${limit}; offset ${offset};`
            : `fields name, cover.url, first_release_date, platforms.name, total_rating, rating, category, summary, involved_companies.company.name, involved_companies.developer, involved_companies.publisher, genres.name, game_modes.name, websites.url; ${sortQuery} ${whereQuery} limit ${limit}; offset ${offset};`;

        const igdbRes = await fetch('https://api.igdb.com/v4/games', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Client-ID': TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${access_token}`,
                'Language': '169'
            },
            body: bodyQuery
        });

        if (!igdbRes.ok) throw new Error('Error IGDB');
        const dataRaw = await igdbRes.json();

        // 3. EL FILTRO SEGURO DE CATEGORÍAS LOCAL
        const juegosIGDB = dataRaw.filter(j => {
            const categoriaCorrecta = j.category === undefined || j.category === 0 || j.category === 8 || j.category === 9 || j.category === 10;
            let modoCorrecto = true;
            if (modes && j.game_modes) {
                const modoSeleccionadoArray = modes.split(',');
                modoCorrecto = j.game_modes.some(m => modoSeleccionadoArray.includes(m.id.toString()));
            } else if (modes) {
                modoCorrecto = false;
            }
            return categoriaCorrecta && modoCorrecto;
        });

        if (juegosIGDB.length === 0) {
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify([])
            };
        }

        // 4. Buscar las IDs de ITAD
        const promesasITAD = juegosIGDB.map(async (juego) => {
            try {
                const searchRes = await fetch(`https://api.isthereanydeal.com/games/search/v1?title=${encodeURIComponent(juego.name)}&limit=1&key=${ITAD_API_KEY}`);
                const searchData = await searchRes.json();
                if (searchData && searchData.length > 0) {
                    return { igdbId: juego.id, itadId: searchData[0].id };
                }
            } catch (e) { return null; }
            return null;
        });

        const resultadosITAD = (await Promise.all(promesasITAD)).filter(r => r !== null);
        const itadIds = resultadosITAD.map(r => r.itadId);

        // 5. Precios de ITAD
        let mapaPrecios = {};
        if (itadIds.length > 0) {
            const preciosRes = await fetch(`https://api.isthereanydeal.com/games/prices/v3?country=ES&key=${ITAD_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(itadIds)
            });
            const preciosData = await preciosRes.json();
            preciosData.forEach(item => { mapaPrecios[item.id] = item.deals; });
        }

        // 6. Fusión Final
        const jsonFinal = juegosIGDB.map(juego => {
            const matchITAD = resultadosITAD.find(r => r.igdbId === juego.id);
            let infoPrecio = { precio: null, stores: 'none', url: '' };

            if (matchITAD && mapaPrecios[matchITAD.itadId] && mapaPrecios[matchITAD.itadId].length > 0) {
                const deals = mapaPrecios[matchITAD.itadId].sort((a, b) => a.price.amount - b.price.amount);
                const mejor = deals[0];
                infoPrecio = {
                    precio: mejor.price.amount,
                    voucher: mejor.voucher || null,
                    stores: deals.map(d => d.shop.name.toLowerCase()).join(','),
                    url: mejor.url
                };
            }

            return { ...juego, itad: infoPrecio };
        });

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(jsonFinal)
        };

    } catch (error) {
        console.error('Error en IGDB:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ error: 'Fallo crítico en el servidor' })
        };
    }
};