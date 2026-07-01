export default async function handler(req, res) {
    const { query } = req;
    const busqueda = query.query || '';

    if (!busqueda) {
        return res.status(200).json([]);
    }

    try {
        // 1. Buscar en Steam Store
        const steamRes = await fetch(
            `https://store.steampowered.com/api/storesearch?term=${encodeURIComponent(busqueda)}&cc=ES&l=spanish`
        );

        if (!steamRes.ok) {
            throw new Error('Error en Steam API');
        }

        const steamData = await steamRes.json();

        // 2. Transformar resultados al formato que usa tu web
        const juegosSteam = steamData.items.map(item => ({
            id: `steam_${item.id}`,
            name: item.name,
            cover: {
                url: `https://steamcdn-a.akamaihd.net/apps/${item.id}/library_600x900_2x.jpg`
            },
            first_release_date: null,
            platforms: [{ name: 'PC' }],
            category: 0,
            // Marcar como juego de Steam
            itad: {
                precio: null,
                stores: 'steam',
                url: `https://store.steampowered.com/app/${item.id}/`
            },
            _source: 'steam'
        }));

        res.status(200).json(juegosSteam);

    } catch (error) {
        console.error('Error en Steam API:', error);
        res.status(500).json({ error: 'Error buscando en Steam' });
    }
}