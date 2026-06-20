// /api/telegram/verify-code.js
import { supabase } from '../../supabase.js';

export default async function handler(req, res) {
    // Solo aceptamos POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId, code } = req.body;

    if (!userId || !code) {
        return res.status(400).json({ error: 'Faltan datos: userId o code' });
    }

    try {
        // Buscar el código en Supabase (que no esté expirado)
        const { data: verifData, error: verifError } = await supabase
            .from('verificaciones')
            .select('*')
            .eq('user_id', userId)
            .eq('code', code)
            .gt('expires_at', new Date().toISOString()) // No expirado
            .order('created_at', { ascending: false })
            .limit(1);

        if (verifError || !verifData || verifData.length === 0) {
            return res.status(400).json({
                verified: false,
                error: 'Código incorrecto o expirado'
            });
        }

        // Código correcto
        const phone = verifData[0].phone;

        // Actualizar el usuario con el teléfono verificado
        const { error: updateError } = await supabase
            .from('usuarios')
            .update({
                telefono: phone,
                telefono_verificado: true
            })
            .eq('id', userId);

        if (updateError) {
            console.error('Error actualizando usuario:', updateError);
            return res.status(500).json({ error: 'Error al guardar el teléfono' });
        }

        // Eliminar los códigos usados (limpieza)
        await supabase
            .from('verificaciones')
            .delete()
            .eq('user_id', userId);

        return res.status(200).json({
            verified: true,
            phone: phone
        });

    } catch (error) {
        console.error('Error en verify-code:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
}