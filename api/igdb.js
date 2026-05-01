export default async function handler(req, res) {
    // Vercel leerá estas claves de forma segura desde sus ajustes
    const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
    const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

    try {
        // 1. Pedimos permiso a Twitch automáticamente
        const tokenResponse = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`, {
            method: 'POST'
        });
        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        // 2. Con el permiso concedido, le pedimos los juegos a IGDB
        const igdbResponse = await fetch('https://api.igdb.com/v4/games', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Client-ID': CLIENT_ID,
                'Authorization': `Bearer ${accessToken}`
            },
            // Pedimos: nombre, portada, fecha de salida, plataformas y nota. Ordenado por novedades.
            body: 'fields name, cover.url, first_release_date, platforms.name, total_rating; sort first_release_date desc; where total_rating > 80; limit 24;'
        });

        const data = await igdbResponse.json();
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Fallo al conectar con IGDB' });
    }
}