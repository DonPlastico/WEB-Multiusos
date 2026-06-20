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
            // ESTRATEGIA DE BÚSQUEDA MEJORADA
            const username = message.from.username;
            const firstName = message.from.first_name || '';
            const lastName = message.from.last_name || '';
            const fullName = `${firstName} ${lastName}`.trim();

            console.log(`🔍 Buscando usuario para chat_id: ${chatId}`);

            // 1. Buscar por username (prioridad 1)
            let { data: userData, error: userError } = await supabase
                .from('usuarios')
                .select('id, email, username')
                .eq('username', username);

            // 2. Si no, buscar por nombre completo
            if (!userData || userData.length === 0) {
                console.log(`👤 No encontrado por username, buscando por nombre: ${fullName}`);
                const { data: nameData, error: nameError } = await supabase
                    .from('usuarios')
                    .select('id, email, username')
                    .eq('nombre', firstName)
                    .eq('apellidos', lastName);

                if (nameData && nameData.length > 0) {
                    userData = nameData;
                }
            }

            // 3. Si no, buscar por email (usando el username de Telegram como email)
            if (!userData || userData.length === 0) {
                console.log(`📧 No encontrado por nombre, buscando por email: ${username}@`);
                const { data: emailData, error: emailError } = await supabase
                    .from('usuarios')
                    .select('id, email, username')
                    .ilike('email', `${username}%`);

                if (emailData && emailData.length > 0) {
                    userData = emailData;
                }
            }

            // 4. Si NO se encontró ningún usuario, creamos uno nuevo (opcional)
            if (!userData || userData.length === 0) {
                console.log(`🆕 Usuario no encontrado, creando nuevo con username: ${username}`);
                // Esto es opcional, solo si quieres que el bot cree usuarios automáticamente
                // const { data: newUser, error: createError } = await supabase
                //     .from('usuarios')
                //     .insert([{ username: username || fullName, email: `${username}@telegram.user` }])
                //     .select();
                // if (newUser) userData = newUser;

                // Si no quieres crear usuarios automáticamente, devolvemos un error amigable
                const botToken = process.env.TELEGRAM_BOT_TOKEN;
                await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: `❌ No pude encontrar tu usuario en el sistema.\n\nPor favor, inicia sesión en la web con el mismo nombre de usuario (${username || fullName}) y vuelve a intentarlo.`,
                    })
                });
                return res.status(200).json({ ok: true });
            }

            // 5. Actualizar el chat_id del primer usuario encontrado
            const userToUpdate = userData[0];
            console.log(`✅ Usuario encontrado: ${userToUpdate.username || userToUpdate.email} (ID: ${userToUpdate.id})`);

            const { error: updateError } = await supabase
                .from('usuarios')
                .update({ telegram_chat_id: chatId.toString() })
                .eq('id', userToUpdate.id);

            if (updateError) {
                console.error('❌ Error actualizando usuario:', updateError);
                throw updateError;
            }

            console.log(`✅ Chat ID guardado correctamente para ${userToUpdate.username}`);

            // 6. Responder al usuario
            const botToken = process.env.TELEGRAM_BOT_TOKEN;
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: `✅ **¡Cuenta vinculada con éxito!**\n\nUsuario: ${userToUpdate.username || userToUpdate.email}\n\nAhora recibirás códigos de verificación aquí.\n\nVe a la web para solicitar tu código.`,
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