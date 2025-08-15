const axios = require('axios');

// Test with the provided Bearer token as OAuth 2.0
async function testOAuth2() {
  const token = "AAAAAAAAAAAAAAAAAAAAAHpV3gEAAAAAy3l85Mz1PofEEHRRmX01V1temZM%3DPub2mDUfA5lx0WBsi112BsVFZK5NgQqbs2vMcwZCCLs8ZikH0U";
  
  console.log('Testing X API with provided token as OAuth 2.0...\n');
  
  // Test 1: Try to get user profile (requires OAuth 2.0 User Context)
  try {
    const response = await axios.get('https://api.twitter.com/2/users/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ OAuth 2.0 User Context working!');
    console.log('User:', response.data);
    return true;
  } catch (error) {
    console.log('❌ Not an OAuth 2.0 User Access Token');
    console.log('Error:', error.response?.data || error.message);
  }
  
  // Test 2: Try as App-only Bearer token
  try {
    const response = await axios.get('https://api.twitter.com/2/users/by/username/twitter', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ This is an App-only Bearer Token (read-only)');
    console.log('Can read public data but cannot post');
    return false;
  } catch (error) {
    console.log('❌ Token is not valid for API v2');
    console.log('Error:', error.response?.data || error.message);
  }
  
  return false;
}

// Test OAuth 1.0a with the provided credentials
async function testOAuth1a() {
  console.log('\nThe provided credentials appear to be OAuth 1.0a format:');
  console.log('- API Key (Consumer Key):', "MITaqpUABw9vesXQBiMCQpqCb");
  console.log('- API Secret (Consumer Secret):', "C0zoxRwmUC5GISJVkeGFxHTLXnQiAC8G6DXh6f8W7uBTSQ7KPR");
  console.log('- Access Token:', "31285669-rjp2qnT1jKt77SfvYG8oWkzYOSU9fLF8jc0U8dz4U");
  console.log('- Access Token Secret:', "5xgTmYra8jNxXY0tFJddjDu2uIUiDdstoKqrl55N2Dc1p");
  
  console.log('\n⚠️  X API v2 now requires OAuth 2.0 User Context for most operations');
  console.log('OAuth 1.0a is being deprecated.');
  
  console.log('\nTo get an OAuth 2.0 User Access Token:');
  console.log('1. Go to https://developer.twitter.com/en/portal/projects-and-apps');
  console.log('2. Select your app');
  console.log('3. Go to "User authentication settings"');
  console.log('4. Enable OAuth 2.0');
  console.log('5. Set up your redirect URI and scopes');
  console.log('6. Generate tokens through the OAuth 2.0 flow');
  console.log('\nAlternatively, for testing:');
  console.log('- Use the "OAuth 2.0 Playground" in the developer portal');
  console.log('- Or implement the PKCE flow for desktop apps');
}

async function main() {
  const isOAuth2 = await testOAuth2();
  
  if (!isOAuth2) {
    await testOAuth1a();
    
    console.log('\n=== SOLUTION ===');
    console.log('Since these are OAuth 1.0a credentials, we need to:');
    console.log('1. Keep using OAuth 1.0a for now (X still supports it)');
    console.log('2. Or generate new OAuth 2.0 tokens');
    console.log('\nWould you like me to revert to OAuth 1.0a support?');
  }
}

main().catch(console.error);