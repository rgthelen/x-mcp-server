# Claude Desktop Setup for X (Twitter) MCP Server

This guide will help you connect the X MCP Server to Claude Desktop with OAuth 2.0 authentication.

## Prerequisites

1. Claude Desktop App installed
2. X MCP Server built and configured (see README.md)
3. X Developer account with OAuth 2.0 app

## Step 1: Set Up X Developer App

1. Go to [X Developer Portal](https://developer.twitter.com/en/portal/projects-and-apps)
2. Create a new app or select existing one
3. Configure OAuth 2.0:
   - **App permissions**: Read and write
   - **Type of App**: Web App, Automated App or Bot
   - **Callback URI**: `http://localhost:8080/callback`
   - **Website URL**: `http://localhost:8080`
4. Save your **Client ID** and **Client Secret**

## Step 2: Get OAuth 2.0 Tokens

Run the automated setup script:

```bash
cd /path/to/x-mcp-server
X_CLIENT_ID=your_client_id X_CLIENT_SECRET=your_client_secret node setup-oauth2.js
```

This will:
1. Open your browser for X authorization
2. Handle the OAuth 2.0 flow automatically
3. Save tokens to `.env` and update Claude config

## Step 3: Locate Claude Desktop Config

Find your Claude Desktop configuration file:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

## Step 4: Add MCP Server Configuration

Add this to your `claude_desktop_config.json` file:

```json
{
  "mcpServers": {
    "x": {
      "command": "node",
      "args": ["/absolute/path/to/x-mcp-server/build/index.js"],
      "cwd": "/absolute/path/to/x-mcp-server",
      "env": {
        "X_OAUTH2_ACCESS_TOKEN": "your_oauth2_access_token",
        "X_OAUTH2_REFRESH_TOKEN": "your_oauth2_refresh_token",
        "X_CLIENT_ID": "your_client_id",
        "X_CLIENT_SECRET": "your_client_secret"
      },
      "autoApprove": [
        "test_x_connection",
        "get_profile",
        "get_user",
        "get_tweet",
        "get_timeline",
        "get_home_feed",
        "search_tweets",
        "search_advanced",
        "create_tweet",
        "reply_to_tweet",
        "delete_tweet",
        "quote_tweet",
        "like_tweet",
        "unlike_tweet",
        "retweet",
        "unretweet",
        "get_list_tweets",
        "get_user_lists"
      ]
    }
  }
}
```

**Note**: If you used the setup script, this may already be configured automatically.

## Step 5: Manual Configuration (if needed)

If the setup script didn't work, manually update the config:

```json
{
  "mcpServers": {
    "x": {
      "command": "node",
      "args": ["/Users/yourusername/x-mcp-server/build/index.js"],
      "cwd": "/Users/yourusername/x-mcp-server",
      "env": {
        "X_OAUTH2_ACCESS_TOKEN": "R3VrWTJJbHRocGE5N0dyM1V5YWJRV1VsX0twLWVuOUhMSlU2RjRJRVBSbW5FOjE3NTUyMzI3MjkxMjg6MToxOmF0OjE",
        "X_OAUTH2_REFRESH_TOKEN": "cEdVblBudWlwR3lLeGE5Z2hWNTFhel83d2lMUHdWZDlUeWNnaGw0YmZZRlV0OjE3NTUyMzI3MjkxMjg6MToxOnJ0OjE"
      }
    }
  }
}
```

## Step 6: Restart Claude Desktop

1. Quit Claude Desktop completely
2. Restart the application
3. Open a new conversation

## Step 7: Test the Connection

Ask Claude:
```
"Test my X connection"
```

If successful, Claude will show your X profile information.

## Available Commands

### Basic Operations
- "Get my X profile"
- "Test my X connection"

### Tweet Management
- "Post a tweet about [topic]"
- "Reply to this tweet: [tweet_id]"
- "Delete my tweet: [tweet_id]"
- "Quote tweet this with my commentary: [tweet_url]"

### Search (Advanced Features)
- "Search for tweets about AI"
- "Find tweets from multiple users: user1, user2, user3"
- "Search for tweets with images about machine learning"
- "Find recent tweets from verified accounts about crypto"

### Advanced Search Examples
```
"Search for tweets with these parameters:
- From: elonmusk, sundarpichai
- Keywords: artificial intelligence
- Has: media
- Language: en
- Exclude: retweets"
```

### Timeline & Lists
- "Show me my recent tweets"
- "Get my home timeline"
- "Show me my Twitter lists"
- "Get tweets from my [list_name] list"

### Engagement
- "Like this tweet: [tweet_id]"
- "Retweet this: [tweet_id]"
- "Unlike this tweet: [tweet_id]"

## Token Management

The server automatically handles token refresh:

- **Auto-refresh**: Tokens refresh before expiration (2 hours)
- **Persistent storage**: New tokens saved to config files
- **Error recovery**: Automatic retry on token expiration

## Troubleshooting

### "MCP server failed to start"
- Check that the absolute paths are correct
- Ensure the project is built (`npm run build`)
- Verify your OAuth tokens are valid

### "Unauthorized" errors
- Run the OAuth setup script again
- Check that your X app has the correct permissions
- Ensure OAuth 2.0 is enabled in your X app settings

### "Rate limit" errors
- X has API rate limits
- Wait before making more requests
- Consider the limits for your app tier

## Security Notes

- Keep your OAuth tokens secure and never commit them to version control
- Tokens are automatically refreshed and updated
- Use environment variables or secure config files for production
- Follow X's API terms of service and developer policy
