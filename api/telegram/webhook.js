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
            const firstName = message.from.first_name || '';
            const lastName = message.from.last_name || '';

            console.log('🔍 ===== INICIO DE BÚSQUEDA =====');
            console.log(`📱 chat_id: ${chatId}`);
            console.log(`👤 username: ${username}`);
            console.log(`👤 nombre: ${firstName} ${lastName}`);

            // 🔥 PRIMERO: Verificar que podemos leer la tabla usuarios
            console.log('📡 Intentando leer tabla usuarios...');

            const { data: allUsers, error: allError, count } = await supabase
                .from('usuarios')
                .select('*', { count: 'exact' });

            console.log(`📊 Total de usuarios en la tabla: ${count || 0}`);

            if (allError) {
                console.error('❌ Error leyendo tabla usuarios:', allError);
                throw allError;
            }

            if (allUsers && allUsers.length > 0) {
                console.log('✅ Usuarios encontrados:');
                allUsers.forEach(u => {
                    console.log(`   - ID: ${u.id}, Username: ${u.username || 'NULL'}, Email: ${u.email || 'NULL'}`);
                });
            } else {
                console.log('❌ No hay usuarios en la tabla');
            }

            // 🔥 BUSCAR POR USERNAME EXACTO
            let userData = null;
            if (username) {
                console.log(`🔍 Buscando por username: "${username}"`);
                const { data, error } = await supabase
                    .from('usuarios')
                    .select('*')
                    .eq('username', username)
                    .maybeSingle();

                if (data) {
                    console.log(`✅ Encontrado por username: ${data.username}`);
                    userData = data;
                } else {
                    console.log(`❌ No encontrado por username: "${username}"`);
                }
            }

            // 🔥 SI NO, BUSCAR POR EMAIL
            if (!userData && username) {
                console.log(`🔍 Buscando por email que contenga: "${username}"`);
                const { data, error } = await supabase
                    .from('usuarios')
                    .select('*')
                    .ilike('email', `%${username}%`)
                    .maybeSingle();

                if (data) {
                    console.log(`✅ Encontrado por email: ${data.email}`);
                    userData = data;
                } else {
                    console.log(`❌ No encontrado por email que contenga: "${username}"`);
                }
            }

            // 🔥 SI NO, BUSCAR POR NOMBRE
            if (!userData && firstName) {
                console.log(`🔍 Buscando por nombre: "${firstName}"`);
                const { data, error } = await supabase
                    .from('usuarios')
                    .select('*')
                    .eq('nombre', firstName)
                    .maybeSingle();

                if (data) {
                    console.log(`✅ Encontrado por nombre: ${data.nombre}`);
                    userData = data;
                } else {
                    console.log(`❌ No encontrado por nombre: "${firstName}"`);
                }
            }

            // 🔥 SI NO SE ENCUENTRA, MOSTRAR TODOS LOS USUARIOS
            if (!userData) {
                console.log('❌ Usuario no encontrado, mostrando lista de todos los usuarios');

                const { data: allUsersList, error: listError } = await supabase
                    .from('usuarios')
                    .select('id, username, email')
                    .limit(20);

                if (listError) {
                    console.error('❌ Error obteniendo lista:', listError);
                }

                let userList = 'No hay usuarios en el sistema.';
                if (allUsersList && allUsersList.length > 0) {
                    userList = allUsersList.map((u, index) =>
                        `${index + 1}. **${u.username || 'Sin username'}** (${u.email || 'Sin email'})`
                    ).join('\n');
                }

                const botToken = process.env.TELEGRAM_BOT_TOKEN;
                await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: `❌ **No pude encontrar tu usuario automáticamente.**\n\nTu username de Telegram es: **${username || 'Sin username'}**\n\nUsuarios en el sistema:\n${userList}\n\n📌 **Solución rápida:**\n1. En la web, ve a **Editar Perfil**\n2. Cambia tu **Nombre de usuario** a: **${username || firstName}**\n3. Guarda cambios\n4. Vuelve a enviar /start`,
                        parse_mode: 'Markdown'
                    })
                });
                return res.status(200).json({ ok: true });
            }

            // ✅ ACTUALIZAR EL CHAT_ID
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

            console.log('🔍 ===== FIN DE BÚSQUEDA =====');
            return res.status(200).json({ ok: true });

        } catch (error) {
            console.error('❌ Error en webhook:', error);

            // Enviar error al usuario
            const botToken = process.env.TELEGRAM_BOT_TOKEN;
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: `❌ **Error interno:**\n\`${error.message || 'Error desconocido'}\`\n\nRevisa los logs de Vercel para más detalles.`,
                    parse_mode: 'Markdown'
                })
            });

            return res.status(200).json({ ok: true });
        }
    }

    return res.status(200).json({ ok: true });
}