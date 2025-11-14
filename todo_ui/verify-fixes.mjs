#!/usr/bin/env node

/**
 * Quick verification test for bug fixes
 * Tests: AUTH_SECRET error fix and SSR errors
 */

const BASE_URL = 'http://localhost:3001';

// Track results
const results = {
  authSecretError: false,
  ssrBailoutError: false,
  authSessionErrors: 0,
  successfulRequests: 0,
  failedRequests: 0,
};

async function testEndpoint(url, name) {
  try {
    const response = await fetch(url);
    const text = await response.text();

    console.log(`\n[${name}]`);
    console.log(`  Status: ${response.status}`);
    console.log(`  Response length: ${text.length} chars`);

    // Check for specific error patterns
    if (text.includes('MissingSecret') || text.includes('[auth][error]')) {
      results.authSecretError = true;
      console.log(`  ⚠️  AUTH_SECRET error detected!`);
    }

    if (text.includes('BAILOUT_TO_CLIENT_SIDE_RENDERING')) {
      results.ssrBailoutError = true;
      console.log(`  ⚠️  SSR BAILOUT error detected!`);
    }

    if (response.status === 500) {
      results.authSessionErrors++;
      results.failedRequests++;
      console.log(`  ❌ Server error!`);
    } else if (response.status >= 200 && response.status < 400) {
      results.successfulRequests++;
      console.log(`  ✅ Success`);
    } else {
      results.failedRequests++;
      console.log(`  ⚠️  Unexpected status`);
    }

    return { status: response.status, text };
  } catch (error) {
    console.log(`\n[${name}]`);
    console.log(`  ❌ Request failed: ${error.message}`);
    results.failedRequests++;
    return null;
  }
}

async function runTests() {
  console.log('=== Verification Test for Bug Fixes ===\n');
  console.log(`Base URL: ${BASE_URL}\n`);

  // Test critical endpoints
  const tests = [
    ['/api/auth/session', 'Auth Session API'],
    ['/', 'Home Page'],
    ['/signin', 'Signin Page'],
    ['/signup', 'Signup Page'],
    ['/dashboard', 'Dashboard (should redirect)'],
    ['/schedule', 'Schedule Page (should redirect)'],
  ];

  for (const [path, name] of tests) {
    await testEndpoint(BASE_URL + path, name);
    // Small delay to avoid overwhelming server
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Print summary
  console.log('\n\n=== SUMMARY ===');
  console.log(`Total requests: ${results.successfulRequests + results.failedRequests}`);
  console.log(`Successful: ${results.successfulRequests}`);
  console.log(`Failed: ${results.failedRequests}`);

  console.log('\n--- Critical Issues ---');
  console.log(`AUTH_SECRET error: ${results.authSecretError ? '❌ FOUND' : '✅ NOT FOUND'}`);
  console.log(`SSR BAILOUT error: ${results.ssrBailoutError ? '❌ FOUND' : '✅ NOT FOUND'}`);
  console.log(`Auth session 500 errors: ${results.authSessionErrors > 0 ? `❌ ${results.authSessionErrors}` : '✅ 0'}`);

  console.log('\n--- Assessment ---');
  if (!results.authSecretError && !results.ssrBailoutError && results.authSessionErrors === 0) {
    console.log('✅ All critical fixes verified!');
  } else {
    console.log('⚠️  Some issues still present');
  }
}

runTests().catch(console.error);
