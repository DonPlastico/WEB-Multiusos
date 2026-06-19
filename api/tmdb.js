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
        // NUEVO: LAZY LOAD DE EPISODIOS (Para el Acordeón)
        // =========================================================
        if (tipo === 'tv_season' && id && req.query.season) {
            const seasonNum = req.query.season;
            // Pedimos a la API directamente los detalles de esta temporada en concreto
            const resSeason = await fetch(`${baseUrl}/tv/${id}/season/${seasonNum}?language=es-ES`, { headers });
            const seasonData = await resSeason.json();
            return res.status(200).json(seasonData);
        }

        // =========================================================
        // DETALLES DE UN SOLO ITEM
        // =========================================================
        if (id) {
            // AÑADIMOS "credits" a la petición para traernos a los actores
            const resDetalle = await fetch(`${baseUrl}/${tipo}/${id}?language=es-ES&include_video_language=es,en,null&append_to_response=watch/providers,videos,credits,keywords,translations`, { headers });
            const data = await resDetalle.json();

            // ==========================================
            // CONSTRUIR SINOPSIS EXTENDIDA
            // ==========================================
            let sinopsisExtendida = data.overview || '';

            // 1. Si hay keywords, las añadimos como contexto adicional
            if (data.keywords && data.keywords.keywords && data.keywords.keywords.length > 0) {
                const keywordsList = data.keywords.keywords.map(k => k.name).join(', ');
                sinopsisExtendida += `\n\nGéneros y temas: ${keywordsList}.`;
            }

            // 2. Buscar traducciones en español que puedan tener una sinopsis más larga
            if (data.translations && data.translations.translations) {
                const spanishTranslation = data.translations.translations.find(t => t.iso_639_1 === 'es');
                if (spanishTranslation && spanishTranslation.data && spanishTranslation.data.overview) {
                    const spanishOverview = spanishTranslation.data.overview;
                    if (spanishOverview.length > sinopsisExtendida.length) {
                        sinopsisExtendida = spanishOverview;
                    }
                }
            }

            // 3. Si la sinopsis sigue siendo corta (< 150 caracteres), intentamos usar traducciones en inglés
            if (sinopsisExtendida.length < 150 && data.translations) {
                const englishTranslation = data.translations.translations.find(t => t.iso_639_1 === 'en');
                if (englishTranslation && englishTranslation.data && englishTranslation.data.overview) {
                    const englishOverview = englishTranslation.data.overview;
                    if (englishOverview.length > sinopsisExtendida.length) {
                        sinopsisExtendida = englishOverview;
                    }
                }
            }

            // 4. Si aún así es muy corta, combinamos tagline + overview + keywords
            if (sinopsisExtendida.length < 100) {
                let combined = '';
                if (data.tagline) combined += `"${data.tagline}" `;
                if (data.overview) combined += data.overview;
                if (data.keywords && data.keywords.keywords) {
                    const keywordsList = data.keywords.keywords.map(k => k.name).join(', ');
                    combined += `\n\nTemas principales: ${keywordsList}.`;
                }
                sinopsisExtendida = combined;
            }

            // Fallback final
            if (!sinopsisExtendida || sinopsisExtendida.trim() === '') {
                sinopsisExtendida = 'No hay sinopsis disponible para este título en el Nexus.';
            }

            const providersES = data['watch/providers']?.results?.ES;

            const suscripcion = providersES?.flatrate ? providersES.flatrate.map(p => p.provider_name) : [];
            const alquiler = providersES?.rent ? providersES.rent.map(p => p.provider_name) : [];
            const compra = providersES?.buy ? providersES.buy.map(p => p.provider_name) : [];

            // BUSCAMOS EL TRÁILER (Priorizamos YouTube)
            const videos = data.videos?.results || [];
            let trailer = videos.find(v => v.site === 'YouTube' && v.type === 'Trailer');
            if (!trailer) trailer = videos.find(v => v.site === 'YouTube'); // Fallback a cualquier vídeo oficial
            const trailerId = trailer ? trailer.key : null;

            // EXTRAEMOS EL REPARTO (Cogeremos los 15 primeros actores para el carrusel)
            const actoresBruto = data.credits?.cast || [];
            const repartoFormateado = actoresBruto.slice(0, 15).map(actor => {
                return {
                    nombre: actor.name,
                    personaje: actor.character,
                    foto: actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : null
                };
            });

            // EXTRAEMOS INFORMACIÓN BÁSICA DE LAS TEMPORADAS (Solo si es una serie)
            let temporadasInfo = [];
            if (tipo === 'tv' && data.seasons) {
                temporadasInfo = data.seasons
                    .filter(s => s.season_number > 0) // <-- Ignoramos la temporada 0 (Especiales)
                    .map(s => {
                        return {
                            season_number: s.season_number,
                            episode_count: s.episode_count,
                            name: s.name
                        };
                    });
            }

            return res.status(200).json({
                id: data.id,
                adult: data.adult,
                titulo: tipo === 'movie' ? data.title : data.name,
                original_title: tipo === 'movie' ? data.original_title : data.original_name,
                tagline: data.tagline || '',
                sinopsis: sinopsisExtendida,
                status: data.status,
                budget: tipo === 'movie' ? data.budget : null,
                last_air_date: tipo === 'tv' ? data.last_air_date : null,
                in_production: tipo === 'tv' ? data.in_production : null,
                episodios: tipo === 'tv' ? data.number_of_episodes : null,
                poster: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : 'https://via.placeholder.com/264x374?text=SIN+POSTER',
                backdrop: data.backdrop_path ? `https://image.tmdb.org/t/p/original${data.backdrop_path}` : '',
                fecha: tipo === 'movie' ? data.release_date : data.first_air_date,
                nota: data.vote_average ? data.vote_average.toFixed(1) : '0.0',
                votos: data.vote_count || 0,
                generos: data.genres ? data.genres.map(g => g.name).join(', ') : 'N/A',
                suscripcion: suscripcion,
                alquiler: alquiler,
                compra: compra,
                trailer_id: trailerId,
                reparto: repartoFormateado,
                temporadas: data.number_of_seasons,
                temporadas_info: temporadasInfo,
                duracion: tipo === 'movie' ? data.runtime : (data.episode_run_time?.[0] || 45)
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

            // OBTENER CERTIFICACIÓN POR EDAD 
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