require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function test() {
  const { data, error } = await supabase.auth.signUp({ email: 'superadmin@example.com', password: 'password123!' });
  console.log('Result:', error ? error.message : 'Success');
}
test();
