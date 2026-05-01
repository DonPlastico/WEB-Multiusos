export default async function handler(req, res) {
    const { title } = req.query;
    if (!title) return res.status(400).json({ error: 'Falta el título' });

    const CLIENT_ID     = process.env.ITAD_CLIENT_ID;
    const CLIENT_SECRET = process.env.ITAD_CLIENT_SECRET;

    if (!CLIENT_ID || !CLIENT_SECRET) {
        return res.status(500).json({ error: 'Faltan variables de entorno' });
    }

    try {
        // Token con Basic Auth (alternativa más compatible)
        const credenciales = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

        const tokenRes = await fetch('https://isthereanydeal.com/oauth/token/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${credenciales}`
            },
            body: new URLSearchParams({
                grant_type: 'client_credentials',
                scope: 'user:public'
            })
        });

        const tokenRaw = await tokenRes.text();
        console.log('TOKEN STATUS:', tokenRes.status);
        console.log('TOKEN RAW:', tokenRaw);

        let tokenData;
        try { tokenData = JSON.parse(tokenRaw); }
        catch { return res.status(500).json({ error: 'Token no es JSON', status: tokenRes.status, raw: tokenRaw }); }

        if (!tokenData.access_token) {
            return res.status(500).json({ error: 'Sin access_token', tokenData });
        }

        const token = tokenData.access_token;

        // Buscar juego
        const searchRes = await fetch(
            `https://api.isthereanydeal.com/games/search/v1?title=${encodeURIComponent(title)}&limit=1`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        const searchData = await searchRes.json();

        if (!searchData?.length) {
            return res.status(200).json({ precio: null, debug: 'juego no encontrado en ITAD' });
        }

        const gameId = searchData[0].id;

        // Precios
        const preciosRes = await fetch(
            `https://api.isthereanydeal.com/games/prices/v3?country=ES`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify([gameId])
            }
        );
        const preciosData = await preciosRes.json();

        if (!preciosData?.[0]?.deals?.length) {
            return res.status(200).json({ precio: null, debug: 'sin deals para este juego' });
        }

        const deals = preciosData[0].deals.sort((a, b) => a.price.amount - b.price.amount);
        const mejor = deals[0];

        return res.status(200).json({
            precio:  mejor.price.amount,
            moneda:  mejor.price.currency,
            tienda:  mejor.shop.name,
            voucher: mejor.voucher || null,
            url:     mejor.url,
            todos:   deals.slice(0, 5)
        });

    } catch (err) {
        return res.status(500).json({ error: 'Error interno', mensaje: err.message, stack: err.stack });
    }
}