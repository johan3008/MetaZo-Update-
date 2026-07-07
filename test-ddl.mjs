import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://qhucqnkewjoihffhpatd.supabase.co', 'sb_secret_FOs1h4sAbWrcjmAnsNQWeA_0fZ3s59a');
async function run() {
  const { data, error } = await supabase.rpc('exec_sql', { sql: 'CREATE TABLE IF NOT EXISTS test (id text);' });
  console.log(data, error);
}
run();
