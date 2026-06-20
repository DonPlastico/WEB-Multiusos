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
            const username = message.from.username || 'AndyGauoG';
            const botToken = process.env.TELEGRAM_BOT_TOKEN;

            console.log(`📱 Procesando /start para chat_id: ${chatId}`);
            console.log(`👤 Username: ${username}`);

            // 🔥 PASO 1: Intentar actualizar el usuario en Supabase
            let userUpdated = false;
            let userEmail = '';
            try {
                // Buscar al usuario por username
                const { data: userData, error: findError } = await supabase
                    .from('usuarios')
                    .select('id, email, username')
                    .eq('username', username)
                    .maybeSingle();

                if (userData) {
                    userEmail = userData.email || '';
                    console.log(`✅ Usuario encontrado: ${userData.username} (ID: ${userData.id})`);

                    // Actualizar el chat_id
                    const { error: updateError } = await supabase
                        .from('usuarios')
                        .update({ telegram_chat_id: chatId.toString() })
                        .eq('id', userData.id);

                    if (!updateError) {
                        userUpdated = true;
                        console.log(`✅ Chat_id actualizado para ${userData.username}`);
                    } else {
                        console.error('❌ Error actualizando:', updateError);
                    }
                } else {
                    console.log(`❌ Usuario no encontrado con username: ${username}`);
                }
            } catch (dbError) {
                console.error('❌ Error de base de datos:', dbError);
            }

            // 🔥 PASO 2: Enviar mensaje de confirmación a Telegram (SIN MARKDOWN)
            let mensaje = '';
            if (userUpdated) {
                mensaje = `✅ ¡Cuenta vinculada con éxito!\n\nUsuario: ${username}\nChat ID: ${chatId}\n\nAhora recibirás códigos de verificación aquí.`;
            } else {
                mensaje = `⚠️ No se pudo vincular automáticamente.\n\nTu chat_id es: ${chatId}\n\n📌 Para vincular manualmente, ejecuta este SQL en Supabase:\n\nUPDATE usuarios \nSET telegram_chat_id = '${chatId}'\nWHERE username = '${username}' OR email = 'alexneitor5@gmail.com';\n\nLuego envía /start de nuevo.`;
            }

            console.log(`📤 Enviando mensaje a chat_id: ${chatId}`);
            console.log(`📝 Mensaje: ${mensaje.substring(0, 100)}...`);

            const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: mensaje
                    // ❌ NO USAR parse_mode: 'Markdown'
                })
            });

            const result = await response.json();
            console.log('📬 Respuesta de Telegram:', JSON.stringify(result));

            if (!response.ok) {
                console.error('❌ Error enviando mensaje:', result);
            } else {
                console.log('✅ Mensaje enviado correctamente');
            }

            return res.status(200).json({ ok: true });

        } catch (error) {
            console.error('❌ Error en webhook:', error);

            // Intentar enviar mensaje de error al usuario (SIN MARKDOWN)
            try {
                const botToken = process.env.TELEGRAM_BOT_TOKEN;
                if (botToken) {
                    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: chatId,
                            text: `❌ Error interno: ${error.message || 'Error desconocido'}\n\nRevisa los logs de Vercel.`
                        })
                    });
                }
            } catch (e) {
                console.error('❌ Error enviando mensaje de error:', e);
            }

            return res.status(200).json({ ok: true });
        }
    }

    return res.status(200).json({ ok: true });
}