/**
 * Test script to verify authentication timing fix
 * This simulates the page reload scenario
 */

import { auth } from './lib/firebase/config.js';
import socketClient from './lib/socket/index.js';

console.log('Testing authentication timing fix...\n');

async function testAuthTiming() {
  console.log('1. Initial auth state:', auth.currentUser ? 'Logged in' : 'Not logged in');
  
  // Test immediate connection (simulating page reload)
  console.log('\n2. Attempting socket connection immediately...');
  try {
    await socketClient.connect();
    console.log('✅ Socket connected successfully!');
    console.log('   Connected user:', auth.currentUser?.uid);
  } catch (error) {
    console.log('❌ Socket connection failed:', error.message);
  }
  
  // Cleanup
  socketClient.disconnect();
  
  // Test auth state listener
  console.log('\n3. Setting up auth state listener...');
  const unsubscribe = auth.onAuthStateChanged((user) => {
    console.log('   Auth state changed:', user ? `User ${user.uid}` : 'No user');
  });
  
  // Wait a bit then cleanup
  setTimeout(() => {
    unsubscribe();
    console.log('\n✅ Test completed');
    process.exit(0);
  }, 3000);
}

// Run test
testAuthTiming().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});