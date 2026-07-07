import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://qhucqnkewjoihffhpatd.supabase.co', 'sb_publishable_9yRjjJS_tC8Hu-xQRT8esQ_QhO83tdn');
const res = await supabase.from('keys').select('*').limit(1);
console.log('keys select:', res);
const res2 = await supabase.from('users').select('*').limit(1);
console.log('users select:', res2);
