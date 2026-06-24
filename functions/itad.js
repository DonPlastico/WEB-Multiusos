exports.handler = async function (event, context) {
    const query = event.queryStringParameters || {};
    const { title } = query;

    if (!title) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Falta el título' })
        };
    }

    const API_KEY = process.env.ITAD_API_KEY;
    if (!API_KEY) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Falta ITAD_API_KEY' })
        };
    }

    try {
        const searchRes = await fetch(
            `https://api.isthereanydeal.com/games/search/v1?title=${encodeURIComponent(title)}&limit=1&key=${API_KEY}`
        );
        const searchData = await searchRes.json();

        if (!searchData?.length) {
            return {
                statusCode: 200,
                body: JSON.stringify({ precio: null })
            };
        }

        const gameId = searchData[0].id;

        const preciosRes = await fetch(
            `https://api.isthereanydeal.com/games/prices/v3?country=ES&key=${API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify([gameId])
            }
        );
        const preciosData = await preciosRes.json();

        if (!preciosData?.[0]?.deals?.length) {
            return {
                statusCode: 200,
                body: JSON.stringify({ precio: null })
            };
        }

        const deals = preciosData[0].deals.sort((a, b) => a.price.amount - b.price.amount);
        const mejor = deals[0];

        return {
            statusCode: 200,
            body: JSON.stringify({
                precio: mejor.price.amount,
                moneda: mejor.price.currency,
                tienda: mejor.shop.name,
                voucher: mejor.voucher || null,
                url: mejor.url,
                todos: deals.slice(0, 5)
            })
        };

    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Error interno', mensaje: err.message })
        };
    }
};