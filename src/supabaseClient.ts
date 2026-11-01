import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log("Test URL Supabase :", url ? "OK (Chargée)" : "ERREUR (Undefined)");
console.log("Test Clé Supabase :", anonKey ? "OK (Chargée)" : "ERREUR (Undefined)");

export const supabase = createClient(url, anonKey);