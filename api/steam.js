// ============================================================
//   API STEAM - FALLBACK PARA JUEGOS
// ============================================================

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
        // ============================================================
        // INTENTO 1: Si el query es un número, buscar por ID en Steam
        // ============================================================
        const esNumero = /^\d+$/.test(busqueda);
        let juegoData = null;

        if (esNumero) {
            try {
                // Intentar obtener el juego directamente por ID
                const appId = parseInt(busqueda);
                const appRes = await fetch(
                    `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=ES&l=spanish`
                );

                if (appRes.ok) {
                    const appData = await appRes.json();
                    const appInfo = appData[appId.toString()];

                    if (appInfo && appInfo.success) {
                        const data = appInfo.data;
                        // Transformar al formato IGDB
                        juegoData = {
                            id: `steam_${appId}`,
                            name: data.name || `Juego #${appId}`,
                            cover: {
                                url: `https://steamcdn-a.akamaihd.net/apps/${appId}/library_600x900_2x.jpg`
                            },
                            first_release_date: data.release_date?.date ?
                                Math.floor(new Date(data.release_date.date).getTime() / 1000) : null,
                            platforms: [{ name: 'PC' }],
                            category: 0,
                            itad: {
                                precio: null,
                                stores: 'steam',
                                url: `https://store.steampowered.com/app/${appId}/`
                            },
                            _source: 'steam'
                        };
                    }
                }
            } catch (e) {
                console.warn(`⚠️ [Steam] Error buscando por ID ${busqueda}:`, e);
            }
        }

        // ============================================================
        // INTENTO 2: Si no se encontró por ID, buscar por texto
        // ============================================================
        if (!juegoData) {
            const steamRes = await fetch(
                `https://store.steampowered.com/api/storesearch?term=${encodeURIComponent(busqueda)}&cc=ES&l=spanish`
            );

            if (steamRes.ok) {
                const steamData = await steamRes.json();
                if (steamData.items && steamData.items.length > 0) {
                    // Transformar al formato IGDB
                    const items = steamData.items.map(item => ({
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
                        _source: 'steam'
                    }));

                    return res.status(200).json({
                        juegos: items,
                        total: items.length,
                        offset: 0,
                        limit: 50,
                        hasMore: false
                    });
                }
            }
        }

        // ============================================================
        // Devolver lo que se encontró (o vacío)
        // ============================================================
        if (juegoData) {
            return res.status(200).json({
                juegos: [juegoData],
                total: 1,
                offset: 0,
                limit: 50,
                hasMore: false
            });
        }

        return res.status(200).json({
            juegos: [],
            total: 0,
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