const axios = require('axios');
const OAuth = require('oauth-1.0a');
const crypto = require('crypto');

// Test credentials - replace with actual values
const config = {
  bearerToken: process.env.X_BEARER_TOKEN || 'YOUR_BEARER_TOKEN',
  apiKey: process.env.X_API_KEY || 'YOUR_API_KEY',
  apiSecret: process.env.X_API_SECRET || 'YOUR_API_SECRET',
  accessToken: process.env.X_ACCESS_TOKEN || 'YOUR_ACCESS_TOKEN',
  accessTokenSecret: process.env.X_ACCESS_TOKEN_SECRET || 'YOUR_ACCESS_TOKEN_SECRET'
};

// Test 1: Bearer Token Authentication (Read operations)
async function testBearerAuth() {
  console.log('\n=== Testing Bearer Token Authentication ===');
  try {
    const response = await axios.get('https://api.twitter.com/2/users/me', {
      headers: {
        'Authorization': `Bearer ${config.bearerToken}`
      }
    });
    console.log('✅ Bearer auth successful:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Bearer auth failed:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.error('   Invalid or expired Bearer token');
    }
    return false;
  }
}

// Test 2: OAuth 1.0a Authentication (Write operations)
async function testOAuth1a() {
  console.log('\n=== Testing OAuth 1.0a Authentication ===');
  
  const oauth = OAuth({
    consumer: {
      key: config.apiKey,
      secret: config.apiSecret
    },
    signature_method: 'HMAC-SHA1',
    hash_function(base_string, key) {
      return crypto
        .createHmac('sha1', key)
        .update(base_string)
        .digest('base64');
    }
  });

  const token = {
    key: config.accessToken,
    secret: config.accessTokenSecret
  };

  const url = 'https://api.twitter.com/2/tweets';
  const requestData = {
    url: url,
    method: 'POST',
    data: { text: 'Test tweet from MCP server - ' + new Date().toISOString() }
  };

  try {
    const authHeader = oauth.toHeader(oauth.authorize(requestData, token));
    
    console.log('OAuth Header:', authHeader);
    
    const response = await axios.post(url, requestData.data, {
      headers: {
        ...authHeader,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ OAuth 1.0a auth successful:', response.data);
    
    // Delete the test tweet
    if (response.data?.data?.id) {
      const deleteUrl = `https://api.twitter.com/2/tweets/${response.data.data.id}`;
      const deleteRequest = {
        url: deleteUrl,
        method: 'DELETE'
      };
      const deleteAuthHeader = oauth.toHeader(oauth.authorize(deleteRequest, token));
      
      await axios.delete(deleteUrl, {
        headers: deleteAuthHeader
      });
      console.log('   Test tweet deleted');
    }
    
    return true;
  } catch (error) {
    console.error('❌ OAuth 1.0a auth failed:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.error('   Check your API Key, API Secret, Access Token, and Access Token Secret');
    }
    if (error.response?.status === 403) {
      console.error('   Your app may not have write permissions. Check app settings on developer.twitter.com');
    }
    return false;
  }
}

// Test 3: Check API v2 access
async function testAPIv2Access() {
  console.log('\n=== Testing API v2 Access Level ===');
  try {
    const response = await axios.get('https://api.twitter.com/2/tweets/search/recent?query=from:twitter', {
      headers: {
        'Authorization': `Bearer ${config.bearerToken}`
      }
    });
    console.log('✅ API v2 access confirmed');
    return true;
  } catch (error) {
    if (error.response?.status === 403) {
      console.error('❌ Limited API access. You may need Elevated or Academic access for some features');
    } else {
      console.error('❌ API v2 access test failed:', error.response?.data || error.message);
    }
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('Testing X (Twitter) API Authentication');
  console.log('=======================================');
  console.log('Configuration:');
  console.log('  Bearer Token:', config.bearerToken.substring(0, 20) + '...');
  console.log('  API Key:', config.apiKey.substring(0, 10) + '...');
  console.log('  Access Token:', config.accessToken.substring(0, 20) + '...');
  
  const results = {
    bearer: await testBearerAuth(),
    oauth: await testOAuth1a(),
    apiv2: await testAPIv2Access()
  };
  
  console.log('\n=== Test Results Summary ===');
  console.log('Bearer Token Auth:', results.bearer ? '✅ PASS' : '❌ FAIL');
  console.log('OAuth 1.0a Auth:', results.oauth ? '✅ PASS' : '❌ FAIL');
  console.log('API v2 Access:', results.apiv2 ? '✅ PASS' : '❌ FAIL');
  
  if (!results.bearer && !results.oauth) {
    console.log('\n⚠️  Both authentication methods failed. Please check your credentials.');
  } else if (!results.oauth) {
    console.log('\n⚠️  OAuth 1.0a failed. You can read tweets but cannot create/delete them.');
  }
}

// Run the tests
runTests().catch(console.error);