const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

supabase.auth.signUp({
  email: 'testuser@gmail.com',
  password: 'test123456'
}).then(({ data, error }) => {
  if (error) {
    console.error('❌ Error:', error.message);
  } else {
    console.log('✅ Token:');
    console.log(data.session?.access_token);
    console.log('\n📋 Test command:');
    console.log('$token = "' + data.session?.access_token + '"');
  }
});
