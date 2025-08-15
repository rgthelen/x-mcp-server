# X (Twitter) OAuth 2.0 Setup for MCP Server

## Quick Setup Steps

### 1. Configure your X App

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/projects-and-apps)
2. Select your app (or create a new one)
3. Click on "User authentication settings"
4. Configure OAuth 2.0:
   - **Type of App**: Select "Web App, Automated App or Bot"
   - **App permissions**: Read and write
   - **Callback URI**: `http://localhost:8080/callback`
   - **Website URL**: `http://localhost:8080`
5. Save your settings
6. Copy your **Client ID** (you'll see it after saving)

### 2. Run the Setup Script

```bash
cd /Users/robthelen/x-mcp-server

# Run with your Client ID
X_CLIENT_ID=your_client_id_here node setup-oauth2.js
```

### 3. Authorize the App

1. The script will open your browser automatically
2. Log in to X/Twitter if needed
3. Review and authorize the permissions
4. You'll be redirected back to localhost
5. The script will automatically:
   - Exchange the code for an access token
   - Update your Claude Desktop config
   - Save credentials to `.env` file

### 4. Restart Claude Desktop

After setup completes, restart Claude Desktop for the new credentials to take effect.

## What Permissions Are Granted?

The MCP server requests these OAuth 2.0 scopes:
- `tweet.read` - Read tweets
- `tweet.write` - Create and delete tweets
- `users.read` - Read user profiles
- `follows.read` - Read follows
- `follows.write` - Follow/unfollow users
- `like.read` - Read likes
- `like.write` - Like/unlike tweets
- `list.read` - Read lists
- `list.write` - Manage lists
- `offline.access` - Get refresh token for long-term access

## Troubleshooting

### "Invalid Client" Error
- Make sure you copied the Client ID correctly
- Client Secret is NOT needed for PKCE flow

### "Callback URI mismatch" Error
- Ensure you added `http://localhost:8080/callback` exactly as shown
- No trailing slash, must be http (not https) for localhost

### Token Expires
OAuth 2.0 tokens expire after 2 hours. The refresh token can be used to get new access tokens without re-authorizing.

## Manual Configuration

If the automatic setup doesn't work, add these to your Claude Desktop config:

```json
{
  "mcpServers": {
    "x": {
      "command": "node",
      "args": ["/Users/robthelen/x-mcp-server/build/index.js"],
      "cwd": "/Users/robthelen/x-mcp-server",
      "env": {
        "X_OAUTH2_ACCESS_TOKEN": "your_access_token_here"
      }
    }
  }
}
```