#!/usr/bin/env node

const http = require('http');
const crypto = require('crypto');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// OAuth 2.0 Configuration
const CLIENT_ID = process.env.X_CLIENT_ID || 'YOUR_CLIENT_ID';
const CLIENT_SECRET = process.env.X_CLIENT_SECRET || '';
const REDIRECT_URI = 'http://localhost:8080/callback';
const PORT = 8080;

// PKCE (Proof Key for Code Exchange) - Required for public clients
const codeVerifier = crypto.randomBytes(32).toString('base64url');
const codeChallenge = crypto
  .createHash('sha256')
  .update(codeVerifier)
  .digest('base64url');

const state = crypto.randomBytes(16).toString('hex');

console.log('===========================================');
console.log('X (Twitter) OAuth 2.0 Setup for MCP Server');
console.log('===========================================\n');

if (CLIENT_ID === 'YOUR_CLIENT_ID') {
  console.log('⚠️  Please set your X_CLIENT_ID first!\n');
  console.log('Steps to get your Client ID:');
  console.log('1. Go to https://developer.twitter.com/en/portal/projects-and-apps');
  console.log('2. Select your app (or create one)');
  console.log('3. Go to "User authentication settings"');
  console.log('4. Enable OAuth 2.0');
  console.log('5. Set these values:');
  console.log('   - Type of App: Web App, Automated App or Bot');
  console.log('   - Callback URI: http://localhost:8080/callback');
  console.log('   - Website URL: http://localhost:8080');
  console.log('6. Save and copy your Client ID');
  console.log('\nThen run: X_CLIENT_ID=your_client_id_here node setup-oauth2.js');
  process.exit(1);
}

// OAuth 2.0 scopes for X API
const SCOPES = [
  'tweet.read',
  'tweet.write',
  'users.read',
  'follows.read',
  'follows.write',
  'like.read',
  'like.write',
  'list.read',
  'list.write',
  'offline.access' // For refresh token
].join(' ');

// Build authorization URL
const authUrl = `https://twitter.com/i/oauth2/authorize?` + 
  `response_type=code&` +
  `client_id=${CLIENT_ID}&` +
  `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
  `scope=${encodeURIComponent(SCOPES)}&` +
  `state=${state}&` +
  `code_challenge=${codeChallenge}&` +
  `code_challenge_method=S256`;

console.log('📋 Configuration:');
console.log(`   Client ID: ${CLIENT_ID}`);
console.log(`   Redirect URI: ${REDIRECT_URI}`);
console.log(`   Scopes: ${SCOPES}\n`);

// Create local server to handle callback
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  
  if (url.pathname === '/callback') {
    const code = url.searchParams.get('code');
    const returnedState = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    
    if (error) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <body style="font-family: system-ui; padding: 40px; background: #1a1a1a; color: white;">
            <h1>❌ Authorization Failed</h1>
            <p>Error: ${error}</p>
            <p>${url.searchParams.get('error_description') || ''}</p>
          </body>
        </html>
      `);
      server.close();
      process.exit(1);
    }
    
    if (returnedState !== state) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <body style="font-family: system-ui; padding: 40px; background: #1a1a1a; color: white;">
            <h1>❌ Security Error</h1>
            <p>State mismatch. Possible CSRF attack.</p>
          </body>
        </html>
      `);
      server.close();
      process.exit(1);
    }
    
    if (code) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <body style="font-family: system-ui; padding: 40px; background: #1a1a1a; color: white;">
            <h1>✅ Authorization Successful!</h1>
            <p>Exchanging code for access token...</p>
            <p style="color: #888;">You can close this window.</p>
          </body>
        </html>
      `);
      
      console.log('\n✅ Authorization code received!');
      console.log('📝 Exchanging for access token...\n');
      
      // Exchange code for access token
      try {
        const axios = require('axios');
        
        // Create Basic Auth header with Client ID and Client Secret
        const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
        
        const tokenResponse = await axios.post('https://api.twitter.com/2/oauth2/token', 
          new URLSearchParams({
            code: code,
            grant_type: 'authorization_code',
            client_id: CLIENT_ID,
            redirect_uri: REDIRECT_URI,
            code_verifier: codeVerifier
          }), {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': `Basic ${credentials}`
            }
          }
        );
        
        const { access_token, refresh_token, expires_in, scope } = tokenResponse.data;
        
        console.log('🎉 Success! Access token obtained!\n');
        console.log('=== YOUR OAUTH 2.0 CREDENTIALS ===\n');
        console.log(`Access Token: ${access_token}\n`);
        console.log(`Refresh Token: ${refresh_token || 'Not provided'}\n`);
        console.log(`Expires In: ${expires_in} seconds\n`);
        console.log(`Scopes: ${scope}\n`);
        
        // Update the Claude Desktop config
        const configPath = '/Users/robthelen/Library/Application Support/Claude/claude_desktop_config.json';
        
        try {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          
          if (config.mcpServers && config.mcpServers.x) {
            config.mcpServers.x.env = {
              ...config.mcpServers.x.env,
              X_OAUTH2_ACCESS_TOKEN: access_token,
              X_OAUTH2_REFRESH_TOKEN: refresh_token || ''
            };
            
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            console.log('✅ Claude Desktop config updated!\n');
            console.log('🔄 Please restart Claude Desktop for changes to take effect.\n');
          }
        } catch (err) {
          console.log('⚠️  Could not update Claude Desktop config automatically.\n');
          console.log('Please add these to your Claude Desktop config manually:\n');
          console.log('In the "x" server env section:');
          console.log(`  "X_OAUTH2_ACCESS_TOKEN": "${access_token}"`);
          if (refresh_token) {
            console.log(`  "X_OAUTH2_REFRESH_TOKEN": "${refresh_token}"`);
          }
        }
        
        // Save to .env file as backup
        const envPath = path.join(__dirname, '.env');
        const envContent = `# X (Twitter) OAuth 2.0 Credentials
X_CLIENT_ID=${CLIENT_ID}
X_OAUTH2_ACCESS_TOKEN=${access_token}
${refresh_token ? `X_OAUTH2_REFRESH_TOKEN=${refresh_token}` : ''}
# Generated: ${new Date().toISOString()}
# Expires: ${new Date(Date.now() + expires_in * 1000).toISOString()}
`;
        
        fs.writeFileSync(envPath, envContent);
        console.log(`📄 Credentials saved to: ${envPath}\n`);
        
      } catch (error) {
        console.error('❌ Failed to exchange code for token:', error.response?.data || error.message);
        
        if (error.response?.data?.error === 'invalid_client') {
          console.log('\n⚠️  Invalid Client ID. Please check your Client ID is correct.');
          console.log('Note: Client Secret is NOT required for PKCE flow (public clients).');
        }
      }
      
      server.close();
      process.exit(0);
    }
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`🌐 Local server listening on http://localhost:${PORT}\n`);
  console.log('👉 Opening browser to authorize...\n');
  console.log('If browser doesn\'t open automatically, visit:');
  console.log(authUrl);
  console.log('\n⏳ Waiting for authorization...\n');
  
  // Try to open browser automatically
  const platform = process.platform;
  const command = platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${command} "${authUrl}"`);
});