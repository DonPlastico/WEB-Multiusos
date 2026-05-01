export default async function handler(req, res) {
    const { title } = req.query;
    if (!title) return res.status(400).json({ error: 'Falta el título' });

    const CLIENT_ID = process.env.ITAD_CLIENT_ID;
    const CLIENT_SECRET = process.env.ITAD_CLIENT_SECRET;

    // DEBUG: comprobamos que las variables existen
    if (!CLIENT_ID || !CLIENT_SECRET) {
        return res.status(500).json({ error: 'Faltan variables de entorno', CLIENT_ID: !!CLIENT_ID, CLIENT_SECRET: !!CLIENT_SECRET });
    }

    try {
        // PASO 1: token
        const tokenRes = await fetch('https://oauth.isthereanydeal.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                scope: 'user:public'
            })
        });

        const tokenRaw = await tokenRes.text(); // texto plano pa ver q devuelve exacto
        console.log('TOKEN RESPONSE:', tokenRaw);

        let tokenData;
        try { tokenData = JSON.parse(tokenRaw); }
        catch { return res.status(500).json({ error: 'Token no es JSON', raw: tokenRaw }); }

        if (!tokenData.access_token) {
            return res.status(500).json({ error: 'Sin access_token', tokenData });
        }

        const token = tokenData.access_token;

        // PASO 2: buscar juego
        const searchRes = await fetch(
            `https://api.isthereanydeal.com/games/search/v1?title=${encodeURIComponent(title)}&limit=1`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        const searchRaw = await searchRes.text();
        console.log('SEARCH RESPONSE:', searchRaw);

        let searchData;
        try { searchData = JSON.parse(searchRaw); }
        catch { return res.status(500).json({ error: 'Search no es JSON', raw: searchRaw }); }

        if (!searchData?.length) return res.status(200).json({ precio: null, debug: 'juego no encontrado', searchData });

        const gameId = searchData[0].id;

        // PASO 3: precios
        const preciosRes = await fetch(
            `https://api.isthereanydeal.com/games/prices/v3?country=ES`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify([gameId])
            }
        );
        const preciosRaw = await preciosRes.text();
        console.log('PRECIOS RESPONSE:', preciosRaw);

        let preciosData;
        try { preciosData = JSON.parse(preciosRaw); }
        catch { return res.status(500).json({ error: 'Precios no es JSON', raw: preciosRaw }); }

        if (!preciosData?.[0]?.deals?.length) {
            return res.status(200).json({ precio: null, debug: 'sin deals', preciosData });
        }

        const deals = preciosData[0].deals.sort((a, b) => a.price.amount - b.price.amount);
        const mejor = deals[0];

        return res.status(200).json({
            precio: mejor.price.amount,
            moneda: mejor.price.currency,
            tienda: mejor.shop.name,
            voucher: mejor.voucher || null,
            url: mejor.url,
            todos: deals.slice(0, 5)
        });

    } catch (err) {
        console.error('CATCH ERROR:', err);
        return res.status(500).json({ error: 'Error interno', mensaje: err.message });
    }
}