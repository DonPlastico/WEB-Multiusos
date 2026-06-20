import { supabase } from '../../supabase.js';

export default async function handler(req, res) {
    // Solo aceptamos POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId, phone, code } = req.body;

    // Validar que lleguen todos los datos
    if (!userId || !phone || !code) {
        return res.status(400).json({ error: 'Faltan datos: userId, phone o code' });
    }

    try {
        // 1. Buscar el chat_id del usuario en Supabase
        const { data: userData, error: userError } = await supabase
            .from('usuarios')
            .select('telegram_chat_id')
            .eq('id', userId)
            .single();

        if (userError || !userData?.telegram_chat_id) {
            return res.status(400).json({
                error: 'Usuario no vinculado a Telegram. Envía /start a @DPSYS_Nexus_Bot'
            });
        }

        const chatId = userData.telegram_chat_id;

        // 2. Guardar el código en Supabase (expira en 5 min)
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutos
        const { error: insertError } = await supabase
            .from('verificaciones')
            .insert({
                user_id: userId,
                code: code,
                phone: phone,
                expires_at: expiresAt.toISOString()
            });

        if (insertError) {
            console.error('Error guardando código:', insertError);
            return res.status(500).json({ error: 'Error al guardar el código' });
        }

        // 3. Enviar mensaje por Telegram (GRATIS)
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: `🔐 **Código de verificación NEXUS**\n\nTu código es: \`${code}\`\n\n⏰ Este código expira en **5 minutos**.\n\n¿No solicitaste esto? Ignora este mensaje.`,
                parse_mode: 'Markdown'
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error enviando mensaje:', errorText);
            return res.status(500).json({ error: 'Error al enviar el mensaje' });
        }

        // Todo correcto
        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('Error en send-code:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
}