// ============================================================
//   API STREAMING - ENLACES DIRECTOS A LAS PLATAFORMAS
// ============================================================
// Devuelve, para un titulo de TMDB, el enlace directo a su ficha
// (y al play si existe) en cada plataforma de streaming de España.
//
// Fuente de datos: Streaming Availability API (Movie of the Night).
// Para no gastar cuota, los resultados se guardan en Supabase
// (tabla streaming_cache) y solo se vuelve a consultar la API
// cuando el dato tiene mas de CACHE_DIAS dias.
//
// Uso desde el front:
//   /api/streaming?id=597&tipo=movie
//   /api/streaming?id=1396&tipo=tv
//
// Variables de entorno necesarias en Vercel:
//   STREAMING_API_KEY        -> clave de developers.movieofthenight.com
//   SUPABASE_URL             -> URL de tu proyecto Supabase
//   SUPABASE_SERVICE_KEY     -> service_role key (NUNCA en el front)

import { createClient } from '@supabase/supabase-js';

const PAIS = 'es';
const CACHE_DIAS = 7;          // Cuantos dias consideramos "fresco" un dato
const CACHE_DIAS_VACIO = 2;    // Si no habia resultados, reintentamos antes
const API_BASE = 'https://api.movieofthenight.com/v4';

export default async function handler(req, res) {
    const { id, tipo } = req.query;

    // ---------- Validacion de parametros ----------
    if (!id || !/^\d+$/.test(String(id))) {
        return res.status(400).json({ error: 'Falta el parametro id (numerico)' });
    }
    if (tipo !== 'movie' && tipo !== 'tv') {
        return res.status(400).json({ error: "El parametro tipo debe ser 'movie' o 'tv'" });
    }

    const API_KEY = process.env.STREAMING_API_KEY;
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

    if (!API_KEY) {
        return res.status(500).json({ error: 'Falta STREAMING_API_KEY en el servidor' });
    }

    // Supabase es opcional: si no esta configurado, funciona igual pero sin cache
    const supabase = (SUPABASE_URL && SUPABASE_SERVICE_KEY)
        ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
        : null;

    const tmdbKey = `${tipo}/${id}`; // Mismo formato que usa la API: movie/597, tv/1396

    try {
        // ---------- 1. Mirar la cache ----------
        let filaCache = null;
        if (supabase) {
            const { data, error } = await supabase
                .from('streaming_cache')
                .select('datos, actualizado_en')
                .eq('tmdb_key', tmdbKey)
                .eq('pais', PAIS)
                .maybeSingle();

            if (error) console.error('[streaming] Error leyendo cache:', error.message);
            else filaCache = data;
        }

        if (filaCache) {
            const edadDias = (Date.now() - new Date(filaCache.actualizado_en).getTime()) / 86400000;
            const vacio = !filaCache.datos?.opciones?.length;
            const limite = vacio ? CACHE_DIAS_VACIO : CACHE_DIAS;

            if (edadDias < limite) {
                res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
                return res.status(200).json({ ...filaCache.datos, desde_cache: true });
            }
        }

        // ---------- 2. Pedir a la API ----------
        const url = `${API_BASE}/shows/${tmdbKey}?country=${PAIS}&series_granularity=show&output_language=es`;
        const respuesta = await fetch(url, { headers: { 'X-API-Key': API_KEY } });

        // Titulo que la API no conoce: lo guardamos vacio para no volver a preguntar en cada visita
        if (respuesta.status === 404) {
            const vacioResultado = { tmdb_key: tmdbKey, opciones: [] };
            await guardarCache(supabase, tmdbKey, vacioResultado);
            res.setHeader('Cache-Control', 's-maxage=3600');
            return res.status(200).json({ ...vacioResultado, desde_cache: false });
        }

        // Cuota agotada u otro error: si teniamos cache vieja la damos igualmente (mejor eso que nada)
        if (!respuesta.ok) {
            console.error(`[streaming] La API respondio ${respuesta.status}`);
            if (filaCache) {
                return res.status(200).json({ ...filaCache.datos, desde_cache: true, obsoleta: true });
            }
            return res.status(respuesta.status === 429 ? 429 : 502).json({
                error: respuesta.status === 429
                    ? 'Cuota de la API de streaming agotada'
                    : 'Error consultando la API de streaming',
                opciones: []
            });
        }

        const show = await respuesta.json();
        const crudas = show?.streamingOptions?.[PAIS] || [];

        // ---------- 3. Normalizar ----------
        // Solo guardamos lo que el front necesita (ocupa poco y es estable)
        const opciones = crudas.map(o => ({
            servicio_id: o.service?.id || null,
            servicio_nombre: o.service?.name || null,
            tipo: o.type,                       // subscription | rent | buy | free | addon
            link: o.link || null,               // Ficha del titulo
            video_link: o.videoLink || null,    // Reproduccion directa (si existe)
            precio: o.price?.formatted || null, // Solo en rent/buy
            calidad: o.quality || null,
            addon: o.addon?.name || null
        })).filter(o => o.link || o.video_link);

        const resultado = { tmdb_key: tmdbKey, opciones };

        // ---------- 4. Guardar en cache ----------
        await guardarCache(supabase, tmdbKey, resultado);

        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
        return res.status(200).json({ ...resultado, desde_cache: false });

    } catch (e) {
        console.error('[streaming] Error inesperado:', e);
        return res.status(500).json({ error: 'Error interno', opciones: [] });
    }
}

// Guarda (o actualiza) el resultado en Supabase. Si falla, no rompe nada.
async function guardarCache(supabase, tmdbKey, datos) {
    if (!supabase) return;
    const { error } = await supabase
        .from('streaming_cache')
        .upsert(
            { tmdb_key: tmdbKey, pais: PAIS, datos, actualizado_en: new Date().toISOString() },
            { onConflict: 'tmdb_key,pais' }
        );
    if (error) console.error('[streaming] Error guardando cache:', error.message);
}