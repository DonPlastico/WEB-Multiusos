export default async function handler(req, res) {
    const TMDB_TOKEN = process.env.TMDB_TOKEN;

    const tipo = req.query.tipo || 'movie';
    const id = req.query.id; // Detectamos si se pide un detalle específico
    const busqueda = req.query.query || '';
    const page = parseInt(req.query.page) || 1;
    const includeAdult = req.query.adult === 'true' ? 'true' : 'false';

    const baseUrl = 'https://api.themoviedb.org/3';
    const headers = {
        'Authorization': `Bearer ${TMDB_TOKEN}`,
        'Accept': 'application/json'
    };

    try {
        // =========================================================
        // DETALLES DE UN SOLO ITEM
        // =========================================================
        if (id) {
            const resDetalle = await fetch(`${baseUrl}/${tipo}/${id}?language=es-ES&append_to_response=watch/providers`, { headers });
            const data = await resDetalle.json();

            const providersES = data['watch/providers']?.results?.ES;

            // Extraemos las plataformas como Array para poder iterarlas en el frontend (colores)
            const plataformasArray = providersES?.flatrate ? providersES.flatrate.map(p => p.provider_name) : [];
            const plataformas = plataformasArray.length > 0 ? plataformasArray.join(', ') : 'No disponible en streaming';

            return res.status(200).json({
                id: data.id,
                adult: data.adult,
                titulo: tipo === 'movie' ? data.title : data.name,
                sinopsis: data.overview || 'Sin descripción disponible.',
                poster: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : 'https://via.placeholder.com/264x374?text=SIN+POSTER',
                backdrop: data.backdrop_path ? `https://image.tmdb.org/t/p/original${data.backdrop_path}` : '',
                fecha: tipo === 'movie' ? data.release_date : data.first_air_date,
                nota: data.vote_average ? data.vote_average.toFixed(1) : '0.0',
                votos: data.vote_count || 0, // Número de valoraciones totales
                generos: data.genres ? data.genres.map(g => g.name).join(', ') : 'N/A', // Extraemos los géneros 
                plataformas: plataformas,
                plataformasArray: plataformasArray, // Array para los botones de colores en main.js
                temporadas: data.number_of_seasons,
                duracion: tipo === 'movie' ? data.runtime : (data.episode_run_time?.[0] || 0)
            });
        }

        // =========================================================
        // LISTADOS (Para las tarjetas iniciales y búsquedas)
        // =========================================================
        const urlLista = busqueda
            ? `${baseUrl}/search/${tipo}?query=${encodeURIComponent(busqueda)}&language=es-ES&page=${page}&include_adult=${includeAdult}`
            : `${baseUrl}/trending/${tipo}/week?language=es-ES&page=${page}&include_adult=${includeAdult}`;

        const listRes = await fetch(urlLista, { headers });
        const listData = await listRes.json();

        if (!listData.results || listData.results.length === 0) return res.status(200).json([]);

        const promesasDetalles = listData.results.map(async (item) => {
            try {
                // Añadimos content_ratings para las series y release_dates para las pelis
                const detailRes = await fetch(`${baseUrl}/${tipo}/${item.id}?append_to_response=watch/providers,release_dates,content_ratings&language=es-ES`, { headers });
                return await detailRes.json();
            } catch (e) { return null; }
        });

        const detallesRAW = (await Promise.all(promesasDetalles)).filter(d => d !== null);

        const jsonFinal = detallesRAW.map(data => {
            const providersES = data['watch/providers']?.results?.ES;
            const plataformas = [];
            if (providersES && providersES.flatrate) {
                providersES.flatrate.forEach(p => plataformas.push(p.provider_name));
            }

            // OBTENER CERTIFICACIÓN POR EDAD (Arreglado el error de sintaxis y soporte para series)
            let releaseDates = '';
            if (tipo === 'movie') {
                releaseDates = data.release_dates?.results?.find(r => r.iso_3166_1 === 'ES')?.release_dates?.[0]?.certification ||
                    data.release_dates?.results?.find(r => r.iso_3166_1 === 'US')?.release_dates?.[0]?.certification || '';
            } else {
                releaseDates = data.content_ratings?.results?.find(r => r.iso_3166_1 === 'ES')?.rating ||
                    data.content_ratings?.results?.find(r => r.iso_3166_1 === 'US')?.rating || '';
            }

            return {
                id: data.id,
                adult: data.adult,
                titulo: tipo === 'movie' ? data.title : data.name,
                poster: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : 'https://via.placeholder.com/264x374?text=SIN+POSTER',
                fecha: tipo === 'movie' ? data.release_date : data.first_air_date,
                nota: data.vote_average ? data.vote_average.toFixed(1) : '0.0',
                duracion: tipo === 'movie' ? data.runtime : (data.episode_run_time?.[0] || 0),
                temporadas: tipo === 'tv' ? data.number_of_seasons : null,
                episodios: tipo === 'tv' ? data.number_of_episodes : null,
                plataformas: plataformas.length > 0 ? plataformas.join(', ') : 'No disponible en streaming',
                certification: releaseDates
            };
        });

        res.status(200).json(jsonFinal);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Fallo al conectar con TMDB' });
    }
}