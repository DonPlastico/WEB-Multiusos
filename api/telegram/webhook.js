// /api/telegram/webhook.js
import { supabase } from '../../supabase.js';

export default async function handler(req, res) {
    // Solo aceptamos POST
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
            const username = message.from.username;
            const botToken = process.env.TELEGRAM_BOT_TOKEN;

            // 🔥 PRIMERO: Decirle al usuario su chat_id y qué hacer
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: `🔑 **Tu chat_id es:** \`${chatId}\`\n\n📌 **Para vincular tu cuenta, ejecuta este SQL en Supabase:**\n\n\`\`\`sql\nUPDATE usuarios \nSET telegram_chat_id = '${chatId}',\n    username = '${username || 'AndyGauoG'}'\nWHERE email = 'alexneitor5@gmail.com';\n\`\`\`\n\nLuego envía /start de nuevo.`,
                    parse_mode: 'Markdown'
                })
            });

            console.log(`📱 chat_id enviado al usuario: ${chatId}`);
            return res.status(200).json({ ok: true });

        } catch (error) {
            console.error('❌ Error:', error);
            return res.status(200).json({ ok: true });
        }
    }

    return res.status(200).json({ ok: true });
}