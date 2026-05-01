export default async function handler(req, res) {
    const { title } = req.query;
    if (!title) return res.status(400).json({ error: 'Falta el título' });

    const API_KEY = process.env.ITAD_API_KEY;
    if (!API_KEY) return res.status(500).json({ error: 'Falta ITAD_API_KEY' });

    try {
        // PASO 1: buscar el juego por título
        const searchRes = await fetch(
            `https://api.isthereanydeal.com/games/search/v1?title=${encodeURIComponent(title)}&limit=1`,
            { headers: { 'Authorization': `Bearer ${API_KEY}` } }
        );
        const searchRaw = await searchRes.text();
        console.log('SEARCH STATUS:', searchRes.status);
        console.log('SEARCH RAW:', searchRaw);

        let searchData;
        try { searchData = JSON.parse(searchRaw); }
        catch { return res.status(500).json({ error: 'Search no JSON', raw: searchRaw }); }

        if (!searchData?.length) {
            return res.status(200).json({ precio: null, debug: 'juego no encontrado', status: searchRes.status, raw: searchRaw });
        }

        // PASO 2: pedir precios en EUR para España
        const gameId = searchData[0].id;
        
        const preciosRes = await fetch(
            `https://api.isthereanydeal.com/games/prices/v3?country=ES`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                },
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