// /api/telegram/webhook.js
import { supabase } from '../../supabase.js';

export default async function handler(req, res) {
    // Solo aceptamos peticiones POST (las que envía Telegram)
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { body } = req;
    const { message } = body;

    // Solo procesamos mensajes de texto
    if (!message || !message.text) {
        return res.status(200).json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = message.text;

    // Cuando el usuario escribe /start
    if (text === '/start') {
        try {
            // Buscar al usuario por email o username
            // (Adapta esto a cómo guardas los usuarios en tu tabla)
            const username = message.from.username;

            // 1. Intentar actualizar por username
            const { data: userData, error: userError } = await supabase
                .from('usuarios')
                .update({ telegram_chat_id: chatId.toString() })
                .eq('username', username);

            // 2. Si no funciona, intentar por email (si tienes)
            if (userError || !userData || userData.length === 0) {
                // Buscar por email (si el username es un email)
                const email = username ? `${username}@` : '';
                // O usa el primer nombre como fallback
                const firstName = message.from.first_name || '';

                // Si no encontramos, usamos el primer nombre como búsqueda
                const { error: updateError } = await supabase
                    .from('usuarios')
                    .update({ telegram_chat_id: chatId.toString() })
                    .eq('username', firstName);
            }

            // 3. Responder al usuario en Telegram
            const botToken = process.env.TELEGRAM_BOT_TOKEN;
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: '✅ ¡Tu cuenta está vinculada!\n\nAhora recibirás códigos de verificación aquí. Para empezar, ve a la web y solicita tu código.',
                })
            });

            return res.status(200).json({ ok: true });

        } catch (error) {
            console.error('Error en webhook:', error);
            return res.status(200).json({ ok: true });
        }
    }

    // Si no es /start, ignoramos el mensaje
    return res.status(200).json({ ok: true });
}