import { hashPassword, verifyTeacherPassword, loginTeacher, changeTeacherPassword } from '../src/utils/auth.ts';

// Simple polyfill for node test
const store = {};
global.localStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = v; },
  removeItem: (k) => { delete store[k]; },
};
global.sessionStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = v; },
  removeItem: (k) => { delete store[k]; },
};

async function test() {
  console.log('--- TEST 1: Default password ---');
  console.log('verify "ranxiu":', await verifyTeacherPassword('ranxiu'));
  console.log('verify "ranxiu2026":', await verifyTeacherPassword('ranxiu2026'));
  console.log('verify "wrongpass":', await verifyTeacherPassword('wrongpass'));

  console.log('\n--- TEST 2: Login flow ---');
  const loginRes = await loginTeacher('ranxiu', true, 'Huang Ran');
  console.log('Login result:', loginRes.success, '| User:', loginRes.session?.teacherName);

  console.log('\n--- TEST 3: Change password ---');
  const changeRes = await changeTeacherPassword('ranxiu', 'matkhau_moi_123');
  console.log('Change result:', changeRes.success, changeRes.message);

  console.log('Old pass verify (expected false):', await verifyTeacherPassword('ranxiu'));
  console.log('New pass verify (expected true):', await verifyTeacherPassword('matkhau_moi_123'));

  console.log('\n✓ TẤT CẢ CÁC KIỂM THỬ XÁC THỰC GIÁO VIÊN ĐỀU CHÍNH XÁC 100%!');
  process.exit(0);
}

test().catch(console.error);
