// ============================================================
//   API STEAM - FALLBACK PARA JUEGOS
// ============================================================
// Endpoint de respaldo cuando IGDB no encuentra un juego.
// Busca en la tienda de Steam y devuelve los resultados
// en el mismo formato que IGDB.

export default async function handler(req, res) {
    const { query } = req;
    const busqueda = query.query || '';

    if (!busqueda) {
        return res.status(200).json({
            juegos: [],
            total: 0,
            offset: 0,
            limit: 50,
            hasMore: false
        });
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

        // 2. Transformar resultados al formato que usa tu web (igual que IGDB)
        const juegosSteam = steamData.items.map(item => ({
            id: `steam_${item.id}`,
            name: item.name,
            cover: {
                url: `https://steamcdn-a.akamaihd.net/apps/${item.id}/library_600x900_2x.jpg`
            },
            first_release_date: null,
            platforms: [{ name: 'PC' }],
            category: 0,
            itad: {
                precio: null,
                stores: 'steam',
                url: `https://store.steampowered.com/app/${item.id}/`
            },
            _source: 'steam' // Marcamos que viene de Steam (por si acaso)
        }));

        // DEVOLVER EN EL MISMO FORMATO QUE IGDB
        // Asi el frontend no tiene que hacer nada especial
        res.status(200).json({
            juegos: juegosSteam,
            total: juegosSteam.length,
            offset: 0,
            limit: 50,
            hasMore: false
        });

    } catch (error) {
        console.error('Error en Steam API:', error);
        res.status(500).json({
            juegos: [],
            total: 0,
            offset: 0,
            limit: 50,
            hasMore: false,
            error: 'Error buscando en Steam'
        });
    }
}