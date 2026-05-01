export default async function handler(req, res) {
    const { title } = req.query;
    if (!title) return res.status(400).json({ error: 'Falta el título' });

    const CLIENT_ID = process.env.ITAD_CLIENT_ID;
    const CLIENT_SECRET = process.env.ITAD_CLIENT_SECRET;

    try {
        // PASO 1: conseguir token OAuth
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
        const tokenData = await tokenRes.json();
        const token = tokenData.access_token;

        if (!token) return res.status(500).json({ error: 'No se pudo obtener token ITAD' });

        // PASO 2: buscar el juego por título
        const searchRes = await fetch(
            `https://api.isthereanydeal.com/games/search/v1?title=${encodeURIComponent(title)}&limit=1`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        const searchData = await searchRes.json();
        if (!searchData?.length) return res.status(200).json({ precio: null });

        const gameId = searchData[0].id;

        // PASO 3: pedir precios en EUR para España
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

        if (!preciosData?.[0]?.deals?.length) return res.status(200).json({ precio: null });

        // Ordenamos por precio más bajo
        const deals = preciosData[0].deals.sort((a, b) => a.price.amount - b.price.amount);
        const mejor = deals[0];

        return res.status(200).json({
            precio: mejor.price.amount,
            moneda: mejor.price.currency,
            tienda: mejor.shop.name,
            voucher: mejor.voucher || null,
            url: mejor.url,
            todos: deals.slice(0, 5)       // pa el modal futuro
        });

    } catch (err) {
        console.error('Error ITAD:', err);
        return res.status(500).json({ error: 'Error interno' });
    }
}