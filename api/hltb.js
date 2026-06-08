export default async function handler(req, res) {
    const { title } = req.query;
    if (!title) return res.status(400).json({ error: 'Falta el título' });

    try {
        // Import dinámico en runtime porque el proyecto usa ESM
        const HLTB = await import('howlongtobeat');
        const hltbService = new HLTB.HowLongToBeatService();

        const results = await hltbService.search(title);

        if (!results || results.length === 0) {
            return res.status(404).json({ error: 'No encontrado' });
        }

        const game = results[0];

        res.status(200).json({
            main: game.gameplayMain ? `${game.gameplayMain} h` : '--',
            mainExtra: game.gameplayMainExtra ? `${game.gameplayMainExtra} h` : '--',
            completionist: game.gameplayCompletionist ? `${game.gameplayCompletionist} h` : '--',
            barMain: game.gameplayMain || 0,
            barExtra: game.gameplayMainExtra || 0,
            barComp: game.gameplayCompletionist || 0
        });
    } catch (error) {
        console.error("Error en HLTB:", error);
        res.status(500).json({ error: 'Error al consultar HowLongToBeat' });
    }
}