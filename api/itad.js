export default async function handler(req, res) {
    const { title } = req.query;
    if (!title) return res.status(400).json({ error: 'Falta el título' });

    try {
        // CheapShark: buscar juego por título
        const searchRes = await fetch(
            `https://www.cheapshark.com/api/1.0/games?title=${encodeURIComponent(title)}&limit=1`
        );
        const searchData = await searchRes.json();

        if (!searchData?.length) {
            return res.status(200).json({ precio: null });
        }

        const cheapestPrice = parseFloat(searchData[0].cheapest);
        const gameId = searchData[0].gameID;

        return res.status(200).json({
            precio: cheapestPrice,
            moneda: 'USD',
            gameId: gameId
        });

    } catch (err) {
        return res.status(500).json({ error: 'Error interno', mensaje: err.message });
    }
}