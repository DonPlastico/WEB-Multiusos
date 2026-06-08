export default async function handler(req, res) {
    const { title } = req.query;
    if (!title) return res.status(400).json({ error: 'Falta el título' });

    try {
        // HLTB usa un formulario POST para buscar
        const response = await fetch('https://howlongtobeat.com/api/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0'
            },
            body: JSON.stringify({
                searchTerms: title.split(' '),
                searchPage: 1,
                size: 2,
                searchOptions: { games: { userId: 0, platform: "", sortCategory: "relevance", rangeCategory: "main", rangeTime: { min: 0, max: 0 }, gameplayFilter: "main", timeCategory: "main", timeType: "main", modifier: "any" } }
            })
        });

        const data = await response.json();
        if (!data.data || data.data.length === 0) return res.status(404).json({ error: 'No encontrado' });

        const game = data.data[0];

        res.status(200).json({
            main: game.gameplayMain ? `${game.gameplayMain} h` : '--',
            mainExtra: game.gameplayMainExtra ? `${game.gameplayMainExtra} h` : '--',
            completionist: game.gameplayCompletionist ? `${game.gameplayCompletionist} h` : '--',
            barMain: game.gameplayMain || 0,
            barExtra: game.gameplayMainExtra || 0,
            barComp: game.gameplayCompletionist || 0
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al consultar HowLongToBeat' });
    }
}