// /api/telegram/webhook.js
import { supabase } from '../../supabase.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { body } = req;
    const { message } = body;

    if (!message || !message.text) {
        return res.status(200).json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = message.text;

    if (text === '/start') {
        try {
            const username = message.from.username;
            const firstName = message.from.first_name || '';
            const lastName = message.from.last_name || '';

            console.log(`🔍 Buscando usuario para chat_id: ${chatId}`);
            console.log(`👤 Datos de Telegram: username=${username}, name=${firstName} ${lastName}`);

            let userData = null;

            // 🔥 ESTRATEGIA 1: Buscar TODOS los usuarios que coincidan por username
            // y luego pedir al usuario que elija
            if (username) {
                const { data, error } = await supabase
                    .from('usuarios')
                    .select('id, email, username')
                    .eq('username', username);

                if (data && data.length > 0) {
                    userData = data[0];
                }
            }

            // 🔥 ESTRATEGIA 2: Si no, buscar por nombre y apellidos
            if (!userData && firstName && lastName) {
                const { data, error } = await supabase
                    .from('usuarios')
                    .select('id, email, username')
                    .eq('nombre', firstName)
                    .eq('apellidos', lastName)
                    .maybeSingle();

                if (data) {
                    userData = data;
                }
            }

            // 🔥 ESTRATEGIA 3: Si no, buscar por email que contenga el username
            if (!userData && username) {
                const { data, error } = await supabase
                    .from('usuarios')
                    .select('id, email, username')
                    .ilike('email', `%${username}%`)
                    .maybeSingle();

                if (data) {
                    userData = data;
                }
            }

            // 🔥 ESTRATEGIA 4: Si no, buscar por nombre (sin apellidos)
            if (!userData && firstName) {
                const { data, error } = await supabase
                    .from('usuarios')
                    .select('id, email, username')
                    .eq('nombre', firstName)
                    .maybeSingle();

                if (data) {
                    userData = data;
                }
            }

            // 🔥 ESTRATEGIA 5: Si no se encuentra, mostrar todos los usuarios
            // para que el usuario pueda elegir (esto es lo más fiable)
            if (!userData) {
                // Buscar todos los usuarios que coincidan parcialmente con el username de Telegram
                const { data: allUsers, error: allError } = await supabase
                    .from('usuarios')
                    .select('id, email, username')
                    .limit(10);

                if (allUsers && allUsers.length > 0) {
                    // Crear un mensaje con la lista de usuarios
                    let userList = allUsers.map((u, index) =>
                        `${index + 1}. ${u.username || u.email}`
                    ).join('\n');

                    const botToken = process.env.TELEGRAM_BOT_TOKEN;
                    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: chatId,
                            text: `❌ No pude encontrar tu usuario automáticamente.\n\nTu username de Telegram es: **${username}**\n\nUsuarios en el sistema:\n${userList}\n\nPor favor, escribe el número del usuario que eres.\n\nO ve a la web y cambia tu username a **${username}** para vincular automáticamente.`,
                            parse_mode: 'Markdown'
                        })
                    });
                    return res.status(200).json({ ok: true });
                }

                const botToken = process.env.TELEGRAM_BOT_TOKEN;
                await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: `❌ No hay usuarios en el sistema.\n\nRegístrate primero en la web y luego vuelve a intentarlo.`
                    })
                });
                return res.status(200).json({ ok: true });
            }

            // ✅ ACTUALIZAR EL CHAT_ID DEL USUARIO ENCONTRADO
            console.log(`✅ Usuario encontrado: ${userData.username || userData.email} (ID: ${userData.id})`);

            const { error: updateError } = await supabase
                .from('usuarios')
                .update({ telegram_chat_id: chatId.toString() })
                .eq('id', userData.id);

            if (updateError) {
                console.error('❌ Error actualizando usuario:', updateError);
                throw updateError;
            }

            console.log(`✅ Chat ID guardado correctamente para ${userData.username}`);

            // ✅ RESPONDER AL USUARIO
            const botToken = process.env.TELEGRAM_BOT_TOKEN;
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: `✅ **¡Cuenta vinculada con éxito!**\n\nUsuario: ${userData.username || userData.email}\nEmail: ${userData.email}\n\nAhora recibirás códigos de verificación aquí.\n\nVe a la web para solicitar tu código.`,
                    parse_mode: 'Markdown'
                })
            });

            return res.status(200).json({ ok: true });

        } catch (error) {
            console.error('❌ Error en webhook:', error);
            return res.status(200).json({ ok: true });
        }
    }

    return res.status(200).json({ ok: true });
}