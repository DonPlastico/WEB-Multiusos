export default async function handler(req, res) {
    const { title } = req.query;
    if (!title) return res.status(400).json({ error: 'Falta el título' });

    const API_KEY = process.env.ITAD_API_KEY;
    if (!API_KEY) return res.status(500).json({ error: 'Falta ITAD_API_KEY' });

    try {
        // PASO 1: buscar el juego — API Key va como ?key= en la URL
        const searchRes = await fetch(
            `https://api.isthereanydeal.com/games/search/v1?title=${encodeURIComponent(title)}&limit=1&key=${API_KEY}`
        );
        const searchData = await searchRes.json();

        if (!searchData?.length) {
            return res.status(200).json({ precio: null });
        }

        const gameId = searchData[0].id;

        // PASO 2: precios — API Key también como ?key=
        const preciosRes = await fetch(
            `https://api.isthereanydeal.com/games/prices/v3?country=ES&key=${API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify([gameId])
            }
        );
        const preciosData = await preciosRes.json();

        if (!preciosData?.[0]?.deals?.length) {
            return res.status(200).json({ precio: null });
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
        return res.status(500).json({ error: 'Error interno', mensaje: err.message });
    }
}