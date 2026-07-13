import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://qhucqnkewjoihffhpatd.supabase.co', 'sb_publishable_9yRjjJS_tC8Hu-xQRT8esQ_QhO83tdn');

async function run() {
  const userId = '8b6e9a51-4eac-48c7-a425-8b9c9fcdff50';
  
  // Try to query current data
  const { data: before } = await supabase.from('users').select('*').eq('id', userId).single();
  console.log('User before upsert:', before);

  // Perform upsert mimicking setDoc(merge: true)
  const payload = {
    id: userId,
    licenseKey: 'TEST-KEY-1234',
    cancelledSubscription: false,
    updatedAt: new Date().toISOString()
  };

  console.log('Sending upsert payload:', payload);
  const { data, error } = await supabase.from('users').upsert(payload);
  console.log('Upsert result error:', error);
  console.log('Upsert result data:', data);

  // Query after upsert
  const { data: after } = await supabase.from('users').select('*').eq('id', userId).single();
  console.log('User after upsert:', after);
}

run();
