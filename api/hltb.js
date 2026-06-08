export default async function handler(req, res) {
    const { title } = req.query;
    if (!title) return res.status(400).json({ error: 'Falta el título' });

    try {
        // Esta URL es pública y no requiere API Key para búsquedas simples
        const response = await fetch(`https://api.rawg.io/api/games?search=${encodeURIComponent(title)}&search_precise=true`);
        const data = await response.json();

        if (!data.results || data.results.length === 0) {
            return res.status(404).json({ error: 'No encontrado' });
        }

        const game = data.results[0];

        // RAWG nos da el "playtime" (tiempo medio en horas)
        const horas = game.playtime || 0;

        res.status(200).json({
            // Hacemos que coincida con tu formato para las barritas
            main: horas > 0 ? `${horas} h` : '--',
            mainExtra: '--',
            completionist: '--',
            barMain: horas,
            barExtra: 0,
            barComp: 0
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al consultar datos' });
    }
}