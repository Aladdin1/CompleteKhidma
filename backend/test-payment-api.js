// Test script for Payment Management API endpoints
// Run with: node test-payment-api.js

const API_BASE_URL = 'http://localhost:3000/api/v1';
const TEST_PHONE = '+201111111111';
const DEVICE_ID = '11111111-1111-1111-1111-111111111111';

async function requestOTP() {
  const res = await fetch(`${API_BASE_URL}/auth/otp/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: TEST_PHONE, locale: 'ar-EG' }),
  });
  if (!res.ok) throw new Error(`OTP request failed: ${res.status}`);
  return res.json();
}

async function getOTPFromDebug() {
  const url = `${API_BASE_URL}/debug/otp?phone=${encodeURIComponent(TEST_PHONE)}`;
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('   Debug OTP response:', data);
    throw new Error(data.error || `Debug OTP failed: ${res.status}`);
  }
  return data.otp;
}

async function verifyOTP(otp) {
  const res = await fetch(`${API_BASE_URL}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: TEST_PHONE, otp, device_id: DEVICE_ID }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Verify failed: ${res.status}`);
  }
  const data = await res.json();
  return data.access_token;
}

async function auth() {
  await requestOTP();
  await new Promise((r) => setTimeout(r, 800));
  const otp = await getOTPFromDebug();
  return verifyOTP(otp);
}

async function checkServer() {
  const res = await fetch('http://localhost:3000/health');
  const data = await res.json();
  return data.status === 'ok';
}

async function run() {
  console.log('🧪 Payment Management API tests\n');

  if (!(await checkServer())) {
    console.error('❌ Server not running. Start with: cd backend && npm start');
    process.exit(1);
  }
  console.log('✅ Server OK\n');

  let token;
  try {
    console.log('1️⃣ Auth (OTP request → debug OTP → verify)');
    token = await auth();
    console.log('   ✅ Token obtained\n');
  } catch (e) {
    console.error('   ❌ Auth failed:', e.message);
    process.exit(1);
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // GET payment methods
  console.log('2️⃣ GET /users/me/payment-methods');
  try {
    const res = await fetch(`${API_BASE_URL}/users/me/payment-methods`, { headers });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    console.log('   ✅', Array.isArray(data) ? `Count: ${data.length}` : data);
  } catch (e) {
    console.log('   ❌', e.message);
  }

  // POST payment method (card)
  console.log('\n3️⃣ POST /users/me/payment-methods (card)');
  try {
    const res = await fetch(`${API_BASE_URL}/users/me/payment-methods`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        type: 'card',
        number: '4111111111111111',
        expiry_month: 12,
        expiry_year: 2028,
        cvv: '123',
        holder_name: 'Test User',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    console.log('   ✅ Added:', data.id, data.card_last4);
  } catch (e) {
    console.log('   ❌', e.message);
  }

  // GET payment methods again
  console.log('\n4️⃣ GET /users/me/payment-methods (after add)');
  try {
    const res = await fetch(`${API_BASE_URL}/users/me/payment-methods`, { headers });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    console.log('   ✅ Count:', data.length);
  } catch (e) {
    console.log('   ❌', e.message);
  }

  // GET payment history
  console.log('\n5️⃣ GET /users/me/payments');
  try {
    const res = await fetch(`${API_BASE_URL}/users/me/payments`, { headers });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    console.log('   ✅', data.items ? `Items: ${data.items.length}, total: ${data.total}` : data);
  } catch (e) {
    console.log('   ❌', e.message);
  }

  // GET analytics
  console.log('\n6️⃣ GET /users/me/payments/analytics?period=month');
  try {
    const res = await fetch(`${API_BASE_URL}/users/me/payments/analytics?period=month`, { headers });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    console.log('   ✅', 'total_spending:', data.total_spending, 'total_tasks:', data.total_tasks);
  } catch (e) {
    console.log('   ❌', e.message);
  }

  console.log('\n✅ Tests done.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
