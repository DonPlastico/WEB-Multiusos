export default async function handler(req, res) {
    const TMDB_TOKEN = process.env.TMDB_TOKEN;
    const query = req.query;

    const tipo = query.tipo || 'movie';
    const id = query.id;
    const busqueda = query.query || '';
    const page = parseInt(query.page) || 1;
    const includeAdult = query.adult === 'true' ? 'true' : 'false';

    const baseUrl = 'https://api.themoviedb.org/3';
    const headers = {
        'Authorization': `Bearer ${TMDB_TOKEN}`,
        'Accept': 'application/json'
    };

    try {
        // Caché general para la mayoría de peticiones
        const esBusqueda = busqueda || query.genero || query.generos;
        const cacheTime = esBusqueda ? 1800 : 3600; // 30 min para búsquedas, 1h para detalles
        res.setHeader('Cache-Control', `public, s-maxage=${cacheTime}, stale-while-revalidate=86400`);

        // Temporadas
        if (tipo === 'tv_season' && id && query.season) {
            const seasonNum = query.season;
            const resSeason = await fetch(`${baseUrl}/tv/${id}/season/${seasonNum}?language=es-ES`, { headers });
            const seasonData = await resSeason.json();
            return res.status(200).json(seasonData);
        }

        // Detalles
        if (id) {
            const resDetalle = await fetch(`${baseUrl}/${tipo}/${id}?language=es-ES&include_video_language=es,en,null&append_to_response=watch/providers,videos,credits,keywords,translations`, { headers });
            const data = await resDetalle.json();

            let sinopsisExtendida = data.overview || '';

            if (data.keywords && data.keywords.keywords && data.keywords.keywords.length > 0) {
                const keywordsList = data.keywords.keywords.map(k => k.name).join(', ');
                sinopsisExtendida += `\n\nTemas: ${keywordsList}.`;
            }

            if (data.translations && data.translations.translations) {
                const spanishTranslation = data.translations.translations.find(t => t.iso_639_1 === 'es');
                if (spanishTranslation && spanishTranslation.data && spanishTranslation.data.overview) {
                    const spanishOverview = spanishTranslation.data.overview;
                    if (spanishOverview.length > sinopsisExtendida.length) {
                        sinopsisExtendida = spanishOverview;
                    }
                }
            }

            if (sinopsisExtendida.length < 150 && data.translations) {
                const englishTranslation = data.translations.translations.find(t => t.iso_639_1 === 'en');
                if (englishTranslation && englishTranslation.data && englishTranslation.data.overview) {
                    const englishOverview = englishTranslation.data.overview;
                    if (englishOverview.length > sinopsisExtendida.length) {
                        sinopsisExtendida = englishOverview;
                    }
                }
            }

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

            if (!sinopsisExtendida || sinopsisExtendida.trim() === '') {
                sinopsisExtendida = 'No hay sinopsis disponible para este título en el Nexus.';
            }

            const providersES = data['watch/providers']?.results?.ES;

            const formatProvider = (p) => ({
                name: p.provider_name,
                logo: p.logo_path ? `https://image.tmdb.org/t/p/w92${p.logo_path}` : 'https://placehold.co/92x92/14141c/6366f1?text=PLAY'
            });

            const suscripcion = providersES?.flatrate ? providersES.flatrate.map(formatProvider) : [];
            const alquiler = providersES?.rent ? providersES.rent.map(formatProvider) : [];
            const compra = providersES?.buy ? providersES.buy.map(formatProvider) : [];

            const videos = data.videos?.results || [];
            let trailer = videos.find(v => v.site === 'YouTube' && v.type === 'Trailer');
            if (!trailer) trailer = videos.find(v => v.site === 'YouTube');
            const trailerId = trailer ? trailer.key : null;

            const actoresBruto = data.credits?.cast || [];
            const repartoFormateado = actoresBruto.slice(0, 15).map(actor => {
                return {
                    nombre: actor.name,
                    personaje: actor.character,
                    foto: actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : null
                };
            });

            let temporadasInfo = [];
            if (tipo === 'tv' && data.seasons) {
                temporadasInfo = data.seasons
                    .filter(s => s.season_number > 0)
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

        // Géneros
        if (query.genero) {
            const genero = query.genero;
            const limit = parseInt(query.limit) || 6;

            const genreUrl = `${baseUrl}/genre/${tipo}/list?language=es`;
            const genreRes = await fetch(genreUrl, { headers });
            const genreData = await genreRes.json();

            let genreId = null;
            const generoLower = genero.toLowerCase().trim();

            for (const g of genreData.genres || []) {
                const nombreLower = g.name.toLowerCase().trim();
                if (nombreLower === generoLower ||
                    nombreLower.includes(generoLower) ||
                    generoLower.includes(nombreLower)) {
                    genreId = g.id;
                    break;
                }
            }

            if (!genreId) {
                return res.status(200).json([]);
            }

            const searchUrl = `${baseUrl}/discover/${tipo}?with_genres=${genreId}&sort_by=popularity.desc&vote_count.gte=100&language=es&page=1&include_adult=false`;

            const searchRes = await fetch(searchUrl, { headers });
            const searchData = await searchRes.json();

            if (!searchData.results || searchData.results.length === 0) {
                return res.status(200).json([]);
            }

            const results = searchData.results.slice(0, limit).map(item => {
                const isMovie = tipo === 'movie';
                const titulo = isMovie ? item.title : item.name;
                const fecha = isMovie ? item.release_date : item.first_air_date;
                const poster = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '';

                return {
                    id: item.id,
                    adult: item.adult || false,
                    titulo: titulo || 'Sin título',
                    poster: poster || 'https://via.placeholder.com/264x374?text=SIN+POSTER',
                    fecha: fecha || 'TBA',
                    nota: item.vote_average ? item.vote_average.toFixed(1) : '0.0',
                    duracion: null,
                    temporadas: null,
                    episodios: null,
                    plataformas: 'No disponible en streaming',
                    generoCoincidencia: genero
                };
            });

            return res.status(200).json(results);
        }

        // Lista de géneros
        if (query.generos) {
            const genreUrl = `${baseUrl}/genre/${tipo}/list?language=es`;
            const genreRes = await fetch(genreUrl, { headers });
            const genreData = await genreRes.json();

            return res.status(200).json(genreData);
        }

        // ==========================================
        // TENDENCIAS
        // ==========================================
        if (query.trending === 'true') {
            const period = query.period || 'day'; // 'day' o 'week'
            const limit = parseInt(query.limit) || 20;

            // Calcular fechas para el período
            const hoy = new Date();
            let fechaDesde = new Date(hoy);

            if (period === 'day') {
                fechaDesde.setDate(hoy.getDate() - 1);
            } else if (period === 'week') {
                fechaDesde.setDate(hoy.getDate() - 7);
            } else {
                fechaDesde.setDate(hoy.getDate() - 1); // default a day
            }

            const desdeStr = fechaDesde.toISOString().split('T')[0];
            const hastaStr = hoy.toISOString().split('T')[0];

            // Construir URL de discover con filtros de fecha y popularidad
            let discoverParams = `language=es-ES&page=1&include_adult=false&sort_by=popularity.desc&vote_count.gte=100`;
            discoverParams += `&primary_release_date.gte=${desdeStr}&primary_release_date.lte=${hastaStr}`;

            // Si hay filtro de género
            if (query.genre) {
                discoverParams += `&with_genres=${query.genre}`;
            }

            const trendingUrl = `${baseUrl}/discover/movie?${discoverParams}`;

            const trendingRes = await fetch(trendingUrl, { headers });
            const trendingData = await trendingRes.json();

            if (!trendingData.results || trendingData.results.length === 0) {
                return res.status(200).json([]);
            }

            // Obtener detalles adicionales para cada película (proveedores, etc.)
            const trendingPromesas = trendingData.results.slice(0, limit).map(async (item) => {
                try {
                    const detailRes = await fetch(`${baseUrl}/movie/${item.id}?append_to_response=watch/providers,release_dates&language=es-ES`, { headers });
                    return await detailRes.json();
                } catch (e) {
                    console.warn('⚠️ Error obteniendo detalles de trending:', item.id, e.message);
                    return null;
                }
            });

            const trendingDetalles = (await Promise.all(trendingPromesas)).filter(d => d !== null);

            const trendingFinal = trendingDetalles.map(data => {
                const providersES = data['watch/providers']?.results?.ES;
                const plataformas = [];
                if (providersES && providersES.flatrate) {
                    providersES.flatrate.forEach(p => plataformas.push(p.provider_name));
                }

                return {
                    id: data.id,
                    adult: data.adult || false,
                    titulo: data.title || 'Sin título',
                    poster: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : 'https://via.placeholder.com/264x374?text=SIN+POSTER',
                    fecha: data.release_date || null,
                    nota: data.vote_average ? data.vote_average.toFixed(1) : '0.0',
                    votos: data.vote_count || 0,
                    duracion: data.runtime || null,
                    plataformas: plataformas.length > 0 ? plataformas.join(', ') : 'No disponible en streaming',
                    generos: data.genres ? data.genres.map(g => g.name).join(', ') : 'N/A'
                };
            });

            // Ordenar por popularidad (ya viene ordenado, pero por si acaso)
            trendingFinal.sort((a, b) => (b.votos || 0) - (a.votos || 0));

            return res.status(200).json(trendingFinal);
        }

        // Listados
        const minVotes = parseInt(query.minVotes) || 0;
        const country = query.country || '';
        const genres = query.genres || '';
        const dateMin = query.dateMin || '';
        const dateMax = query.dateMax || '';

        let urlLista;
        if (busqueda) {
            urlLista = `${baseUrl}/search/${tipo}?query=${encodeURIComponent(busqueda)}&language=es-ES&page=${page}&include_adult=${includeAdult}${minVotes > 0 ? `&vote_count.gte=${minVotes}` : ''}`;
        } else {
            let discoverParams = `language=es-ES&page=${page}&include_adult=${includeAdult}&sort_by=popularity.desc&vote_count.gte=100`;

            if (minVotes > 0) {
                discoverParams += `&vote_count.gte=${minVotes}`;
            }

            if (country) {
                const countryCodes = country.split(',').map(c => c.trim().toUpperCase());
                if (countryCodes.length === 1) {
                    discoverParams += `&with_origin_country=${countryCodes[0]}`;
                } else {
                    const countryOr = countryCodes.join('|');
                    discoverParams += `&with_origin_country=${countryOr}`;
                }
            }

            if (genres) {
                const genreIds = genres.split(',').map(g => g.trim()).join(',');
                discoverParams += `&with_genres=${genreIds}`;
            }

            if (dateMin) {
                const paramName = tipo === 'movie' ? 'primary_release_date.gte' : 'first_air_date.gte';
                discoverParams += `&${paramName}=${dateMin}`;
            }
            if (dateMax) {
                const paramName = tipo === 'movie' ? 'primary_release_date.lte' : 'first_air_date.lte';
                discoverParams += `&${paramName}=${dateMax}`;
            }

            urlLista = `${baseUrl}/discover/${tipo}?${discoverParams}`;
        }

        const listRes = await fetch(urlLista, { headers });
        const listData = await listRes.json();

        if (!listData || !listData.results || listData.results.length === 0) {
            return res.status(200).json([]);
        }

        const promesasDetalles = listData.results.map(async (item) => {
            try {
                const detailRes = await fetch(`${baseUrl}/${tipo}/${item.id}?append_to_response=watch/providers,release_dates,content_ratings&language=es-ES`, { headers });
                return await detailRes.json();
            } catch (e) {
                console.warn('⚠️ Error obteniendo detalles de:', item.id, e.message);
                return null;
            }
        });

        const detallesRAW = (await Promise.all(promesasDetalles)).filter(d => d !== null);

        if (!detallesRAW || detallesRAW.length === 0) {
            return res.status(200).json([]);
        }

        const jsonFinal = detallesRAW.map(data => {
            const providersES = data['watch/providers']?.results?.ES;
            const plataformas = [];
            if (providersES && providersES.flatrate) {
                providersES.flatrate.forEach(p => plataformas.push(p.provider_name));
            }

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
                votos: data.vote_count || 0,
                duracion: tipo === 'movie' ? data.runtime : (data.episode_run_time?.[0] || 0),
                temporadas: tipo === 'tv' ? data.number_of_seasons : null,
                episodios: tipo === 'tv' ? data.number_of_episodes : null,
                plataformas: plataformas.length > 0 ? plataformas.join(', ') : 'No disponible en streaming',
                certification: releaseDates
            };
        });

        res.status(200).json(jsonFinal);

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Fallo al conectar con TMDB' });
    }
}