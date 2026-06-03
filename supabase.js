// Importamos Supabase directamente desde un CDN web (así el navegador lo entiende sin necesidad de Vite)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Ponemos la URL y la clave ANON directamente aquí (¡Es 100% seguro y es como se hace en frontend!)
const supabaseUrl = 'https://faxdteqakxgakiwfaokm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZheGR0ZXFha3hnYWtpd2Zhb2ttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0OTE2MjYsImV4cCI6MjA5NjA2NzYyNn0.ss4ruFwCNDLhkiI2SAPgO1WHGsjGzpmzK0i9bzCLqEA';

// Exportamos la conexión para que main.js la pueda usar
export const supabase = createClient(supabaseUrl, supabaseAnonKey);