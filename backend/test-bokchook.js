const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const testEmail = 'bokchook@gmail.com';
const testPassword = 'TestPassword123!';

async function testAuth() {
  console.log('🔐 Testing Auth with bokchook@gmail.com...\n');
  
  // 1. TRY LOGIN (kalo user udah ada)
  console.log('1️⃣ Trying LOGIN first...');
  let { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword
  });
  
  if (loginError) {
    console.log('⚠️  Login failed:', loginError.message);
    console.log('\n2️⃣ Trying SIGNUP instead...');
    
    // 2. SIGNUP kalo belom ada
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword
    });
    
    if (signupError) {
      console.error('❌ Signup Error:', signupError.message);
      return;
    }
    
    console.log('✅ Signup Success!');
    console.log('   User ID:', signupData.user?.id);
    
    if (signupData.session) {
      loginData = signupData;
    } else {
      console.log('⚠️  Check email bokchook@gmail.com untuk confirm');
      return;
    }
  } else {
    console.log('✅ Login Success!');
  }
  
  const token = loginData.session?.access_token;
  console.log('\n📝 User Info:');
  console.log('   ID:', loginData.user?.id);
  console.log('   Email:', loginData.user?.email);
  console.log('   Token:', token?.substring(0, 50) + '...\n');
  
  // 3. TEST BACKEND API
  console.log('3️⃣ Testing Backend API...');
  const fetch = (await import('node-fetch')).default;
  
  const response = await fetch('http://localhost:5000/api/products', {
    headers: {
      'Authorization': 'Bearer ' + token
    }
  });
  
  const result = await response.json();
  
  if (response.ok) {
    console.log('✅ Backend API Success!');
    console.log('   Status:', response.status);
    console.log('   Response:', JSON.stringify(result, null, 2));
  } else {
    console.log('❌ Backend API Error!');
    console.log('   Status:', response.status);
    console.log('   Error:', result);
  }
  
  console.log('\n\n🎯 FULL TOKEN:');
  console.log(token);
  console.log('\n📋 PowerShell Test Command:');
  console.log(' = "' + token + '"');
  console.log('Invoke-WebRequest -Uri "http://localhost:5000/api/products" -Headers @{"Authorization"="Bearer "}');
}

testAuth().catch(console.error);
