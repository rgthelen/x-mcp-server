# X (Twitter) MCP Server

A Model Context Protocol (MCP) server for X (Twitter) integration with OAuth 2.0 support, automatic token refresh, and advanced search capabilities. Allows Claude to manage tweets, search content, and interact with the X platform.

## Features

- **Tweet Management**: Create, delete, reply to, and quote tweets
- **Advanced Search**: Complex search queries with multiple operators
- **User Operations**: Follow/unfollow, get user profiles
- **Timeline Access**: View your timeline and home feed
- **Engagement**: Like, unlike, retweet, unretweet
- **List Support**: Access and search within Twitter lists
- **OAuth 2.0**: Modern authentication with automatic token refresh
- **Search Operators**: Full support for X API v2 search syntax

## Prerequisites

- Node.js 18+
- X (Twitter) Developer Account
- OAuth 2.0 App credentials
- Claude Desktop App

## Installation

1. Clone this repository:
```bash
git clone https://github.com/rgthelen/x-mcp-server.git
cd x-mcp-server
```

2. Install dependencies:
```bash
npm install
```

3. Set up X Developer App:
   - Go to [X Developer Portal](https://developer.twitter.com/)
   - Create an app with OAuth 2.0 enabled
   - Set callback URI: `http://localhost:8080/callback`
   - Note your Client ID and Client Secret

4. Run OAuth 2.0 setup:
```bash
X_CLIENT_ID=your_client_id X_CLIENT_SECRET=your_client_secret node setup-oauth2.js
```

5. Build the project:
```bash
npm run build
```

## OAuth 2.0 Setup

The server includes an automated OAuth 2.0 setup script:

1. Run the setup script with your Client ID
2. It will open your browser for authorization
3. Authorize the app on X/Twitter
4. Tokens will be automatically saved and configured

## Configuration

See [CLAUDE.md](./CLAUDE.md) for detailed Claude Desktop setup instructions.

## Available Tools

### Basic Operations
- `test_x_connection` - Test the X API connection
- `get_profile` - Get your X profile
- `get_user` - Get any user's profile

### Tweet Management
- `create_tweet` - Create a new tweet
- `reply_to_tweet` - Reply to a tweet
- `delete_tweet` - Delete your tweet
- `quote_tweet` - Quote tweet with commentary
- `get_tweet` - Get details of a specific tweet

### Timeline & Feed
- `get_timeline` - Get user's tweets
- `get_home_feed` - Get your home timeline

### Search (Enhanced)
- `search_tweets` - Basic search with X query syntax
- `search_advanced` - Advanced search with structured parameters

### Engagement
- `like_tweet` / `unlike_tweet` - Like/unlike tweets
- `retweet` / `unretweet` - Retweet/unretweet

### Lists
- `get_user_lists` - Get your lists
- `get_list_tweets` - Get tweets from list members

## Advanced Search Examples

### Basic Search Syntax
```
"cat OR dog" - tweets with cat OR dog
"from:elonmusk tesla" - tweets from Elon about Tesla
"#AI -is:retweet" - AI hashtag, excluding retweets
"(from:user1 OR from:user2) keyword" - from multiple users
```

### Advanced Search Parameters
```json
{
  "from": "user1,user2,user3",
  "keywords": "artificial intelligence",
  "hasMedia": true,
  "lang": "en",
  "isRetweet": false
}
```

## Usage Examples

With Claude Desktop configured, you can ask Claude:

- "Post a tweet about my latest project"
- "Search for tweets about AI from multiple tech leaders"
- "Reply to this tweet with my thoughts"
- "Find tweets with images about machine learning"
- "Show me my recent timeline"
- "Search for tweets from my lists about crypto"

## Token Management

- **Automatic Refresh**: Tokens refresh automatically before expiration
- **Persistent Storage**: New tokens are saved to config files
- **Error Handling**: Automatic retry on token expiration

## License

MIT
