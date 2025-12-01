const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const testEmail = 'devtest' + Date.now() + '@gmail.com';
const testPassword = 'TestPass123!';

async function testAuth() {
  console.log('🔐 Testing Supabase Auth...\n');
  
  // 1. SIGNUP
  console.log('1️⃣ Testing SIGNUP...');
  const { data: signupData, error: signupError } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      data: {
        name: 'Test User'
      }
    }
  });
  
  if (signupError) {
    console.error('❌ Signup Error:', signupError.message);
    return;
  }
  
  console.log('✅ Signup Success!');
  console.log('   User ID:', signupData.user?.id);
  console.log('   Email:', signupData.user?.email);
  
  if (!signupData.session) {
    console.log('⚠️  No session - email confirmation required');
    console.log('   Check Supabase Dashboard to confirm email manually\n');
    
    // Coba login langsung (kalo email confirmation disabled)
    console.log('2️⃣ Testing LOGIN...');
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (loginError) {
      console.error('❌ Login Error:', loginError.message);
      console.log('\n💡 Fix:');
      console.log('   Go to Supabase Dashboard → Authentication → Email Templates');
      console.log('   Disable "Enable email confirmations"');
      return;
    }
    
    console.log('✅ Login Success!');
    console.log('   Access Token:', loginData.session?.access_token.substring(0, 50) + '...');
    testToken(loginData.session?.access_token);
    
  } else {
    console.log('✅ Got session immediately!');
    console.log('   Access Token:', signupData.session?.access_token.substring(0, 50) + '...\n');
    testToken(signupData.session?.access_token);
  }
}

async function testToken(token) {
  if (!token) {
    console.log('❌ No token to test');
    return;
  }
  
  console.log('\n3️⃣ Testing BACKEND API with token...');
  
  const fetch = (await import('node-fetch')).default;
  
  // Test protected endpoint
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
  
  console.log('\n📋 Use this token for testing:');
  console.log(' = "' + token + '"');
  console.log('Invoke-WebRequest -Uri "http://localhost:5000/api/products" -Headers @{"Authorization"="Bearer ' + token + '"}');
}

testAuth().catch(console.error);
