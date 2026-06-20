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
            let userError = null;

            // 🔥 ESTRATEGIA 1: Buscar por email (MÁS FIABLE)
            // Si el usuario tiene un email que coincide con su username de Telegram
            if (username) {
                // Buscar por email exacto
                const emailVariants = [
                    `${username}@gmail.com`,
                    `${username}@hotmail.com`,
                    `${username}@outlook.com`,
                    `${username}@yahoo.com`,
                ];

                for (const email of emailVariants) {
                    const { data, error } = await supabase
                        .from('usuarios')
                        .select('id, email, username')
                        .eq('email', email)
                        .maybeSingle();

                    if (data) {
                        userData = data;
                        break;
                    }
                }
            }

            // 🔥 ESTRATEGIA 2: Buscar por username (exacto)
            if (!userData && username) {
                const { data, error } = await supabase
                    .from('usuarios')
                    .select('id, email, username')
                    .eq('username', username)
                    .maybeSingle();

                if (data) {
                    userData = data;
                }
            }

            // 🔥 ESTRATEGIA 3: Buscar por nombre y apellidos
            if (!userData && firstName) {
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

            // 🔥 ESTRATEGIA 4: Buscar por email que contenga el username
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

            // 🔥 ESTRATEGIA 5: SI NO SE ENCUENTRA, CREAR USUARIO (OPCIONAL)
            if (!userData) {
                console.log(`🆕 Usuario no encontrado, creando nuevo con username: ${username}`);

                // Crear usuario en Supabase
                const { data: newUser, error: createError } = await supabase
                    .from('usuarios')
                    .insert([{
                        username: username || `${firstName}${lastName}`,
                        email: `${username || firstName}@telegram.user`,
                        nombre: firstName,
                        apellidos: lastName,
                        created_at: new Date().toISOString()
                    }])
                    .select()
                    .single();

                if (newUser) {
                    userData = newUser;
                    console.log(`✅ Usuario creado: ${userData.username}`);
                } else {
                    console.error('❌ Error creando usuario:', createError);
                }
            }

            // Si NO se encontró ni se creó ningún usuario, devolver error
            if (!userData) {
                const botToken = process.env.TELEGRAM_BOT_TOKEN;
                await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: `❌ No pude encontrar tu usuario en el sistema.\n\nTu username de Telegram es: **${username}**\n\nPor favor, asegúrate de que tu email en la web sea uno de estos:\n- ${username}@gmail.com\n- ${username}@hotmail.com\n- O que tu nombre de usuario en la web sea **${username}**`,
                        parse_mode: 'Markdown'
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
                    text: `✅ **¡Cuenta vinculada con éxito!**\n\nUsuario: ${userData.username || userData.email}\n\nAhora recibirás códigos de verificación aquí.\n\nVe a la web para solicitar tu código.`,
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