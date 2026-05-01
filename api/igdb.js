export default async function handler(req, res) {
    const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
    const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
    const ITAD_API_KEY = process.env.ITAD_API_KEY;

    const busqueda = req.query.query || '';
    const offset = parseInt(req.query.offset) || 0;

    try {
        // 1. Conseguir token de Twitch
        const tokenRes = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${TWITCH_CLIENT_ID}&client_secret=${TWITCH_CLIENT_SECRET}&grant_type=client_credentials`, { method: 'POST' });
        const { access_token } = await tokenRes.json();

        // 2. Consulta 100% segura. NO usamos el "where category" que da error. 
        // Solo añadimos "category" a los fields para saber qué es cada cosa y pedimos 100 de golpe.
        const bodyQuery = busqueda
            ? `fields name, cover.url, first_release_date, platforms.name, total_rating, category; search "${busqueda}"; limit 100; offset ${offset};`
            : `fields name, cover.url, first_release_date, platforms.name, total_rating, category; sort first_release_date desc; where total_rating > 80; limit 100; offset ${offset};`;

        const igdbRes = await fetch('https://api.igdb.com/v4/games', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Client-ID': TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${access_token}`
            },
            body: bodyQuery
        });

        if (!igdbRes.ok) throw new Error('Error en IGDB');
        const dataRaw = await igdbRes.json();

        // ================================================================
        // 3. EL FILTRO MÁGICO EN JAVASCRIPT (¡Adiós DLCs y basura!)
        // 0 = Main Game, 8 = Remake, 9 = Remaster, 10 = Expanded Edition
        // ================================================================
        const categoriasValidas = [0, 8, 9, 10];

        // Filtramos el array a lo bruto en nuestro propio servidor
        const juegosIGDB = dataRaw.filter(juego => categoriasValidas.includes(juego.category));

        if (juegosIGDB.length === 0) return res.status(200).json([]);

        // 4. Buscar las IDs de ITAD de los juegos limpios (en paralelo)
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

        // 5. Buscar todos los precios de ITAD en UNA SOLA LLAMADA
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

        // 6. Fusionar los datos de IGDB con los de ITAD
        const jsonFinal = juegosIGDB.map(juego => {
            const matchITAD = resultadosITAD.find(r => r.igdbId === juego.id);
            let infoPrecio = { precio: null, stores: 'none' };

            if (matchITAD && mapaPrecios[matchITAD.itadId] && mapaPrecios[matchITAD.itadId].length > 0) {
                const deals = mapaPrecios[matchITAD.itadId].sort((a, b) => a.price.amount - b.price.amount);
                const mejor = deals[0];
                infoPrecio = {
                    precio: mejor.price.amount,
                    voucher: mejor.voucher || null,
                    stores: deals.map(d => d.shop.name.toLowerCase()).join(',')
                };
            }

            return { ...juego, itad: infoPrecio };
        });

        // 7. Enviar a la web el paquete perfecto
        res.status(200).json(jsonFinal);

    } catch (error) {
        res.status(500).json({ error: 'Fallo crítico en el servidor' });
    }
}