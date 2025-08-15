#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { initializeXClient } from "./client/x-client.js";
import * as tools from "./tools/index.js";

// Load environment variables from .env file if it exists
try {
  const fs = require('fs');
  const path = require('path');
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach((line: string) => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
} catch {
  // Silently ignore if .env doesn't exist
}

class XServer {
  private server: Server;

  constructor() {
    console.error("[Setup] Initializing X (Twitter) MCP Server...");

    // Initialize the X client
    this.initializeXClient();

    this.server = new Server(
      {
        name: "x-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();

    // Error handling
    this.server.onerror = (error) => console.error("[Server Error]", error);
    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private initializeXClient() {
    // Support both OAuth 2.0 (preferred) and legacy token names
    const accessToken = process.env.X_OAUTH2_ACCESS_TOKEN || process.env.X_ACCESS_TOKEN || process.env.X_BEARER_TOKEN;
    const refreshToken = process.env.X_OAUTH2_REFRESH_TOKEN;
    const clientId = process.env.X_CLIENT_ID;
    const clientSecret = process.env.X_CLIENT_SECRET;

    if (!accessToken) {
      console.error(
        "[Error] Missing required X credentials. Please set X_OAUTH2_ACCESS_TOKEN environment variable."
      );
      console.error(
        "[Info] To get an OAuth 2.0 User Access Token:"
      );
      console.error(
        "  1. Go to https://developer.twitter.com/en/portal/dashboard"
      );
      console.error(
        "  2. Create an app with OAuth 2.0 enabled"
      );
      console.error(
        "  3. Run: X_CLIENT_ID=your_id node setup-oauth2.js"
      );
      console.error(
        "[Info] Learn more: https://docs.x.com/x-api/authentication/oauth-2-0"
      );
      process.exit(1);
    }

    try {
      initializeXClient({
        accessToken,
        refreshToken,
        clientId,
        clientSecret
      });
      console.error("[Setup] X client initialized with OAuth 2.0");
      
      if (refreshToken) {
        console.error("[Setup] Auto-refresh enabled - tokens will refresh automatically");
      } else {
        console.error("[Setup] No refresh token - manual re-auth needed after 2 hours");
      }
      
      console.error("[Setup] Full read/write access enabled");
    } catch (error) {
      console.error("[Setup] Failed to initialize X client:", error);
      process.exit(1);
    }
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "test_x_connection",
          description: "Test the X (Twitter) MCP Server connection",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "get_profile",
          description: "Get your X profile information",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "get_user",
          description: "Get information about an X user",
          inputSchema: {
            type: "object",
            properties: {
              username: {
                type: "string",
                description: "Username (with or without @) or user ID",
              },
            },
            required: ["username"],
          },
        },
        {
          name: "create_tweet",
          description: "Create a new tweet",
          inputSchema: {
            type: "object",
            properties: {
              text: {
                type: "string",
                description: "The text content of the tweet (max 280 characters)",
              },
              replyToId: {
                type: "string",
                description: "Optional tweet ID to reply to",
              },
            },
            required: ["text"],
          },
        },
        {
          name: "reply_to_tweet",
          description: "Reply to an existing tweet",
          inputSchema: {
            type: "object",
            properties: {
              tweetId: {
                type: "string",
                description: "The ID of the tweet to reply to",
              },
              text: {
                type: "string",
                description: "The reply text",
              },
            },
            required: ["tweetId", "text"],
          },
        },
        {
          name: "delete_tweet",
          description: "Delete a tweet",
          inputSchema: {
            type: "object",
            properties: {
              tweetId: {
                type: "string",
                description: "The ID of the tweet to delete",
              },
            },
            required: ["tweetId"],
          },
        },
        {
          name: "get_tweet",
          description: "Get details of a specific tweet",
          inputSchema: {
            type: "object",
            properties: {
              tweetId: {
                type: "string",
                description: "The ID of the tweet to retrieve",
              },
            },
            required: ["tweetId"],
          },
        },
        {
          name: "quote_tweet",
          description: "Quote tweet with commentary",
          inputSchema: {
            type: "object",
            properties: {
              text: {
                type: "string",
                description: "Your commentary on the quoted tweet",
              },
              quotedTweetUrl: {
                type: "string",
                description: "The URL of the tweet to quote",
              },
            },
            required: ["text", "quotedTweetUrl"],
          },
        },
        {
          name: "get_timeline",
          description: "Get a user's timeline (their tweets)",
          inputSchema: {
            type: "object",
            properties: {
              userId: {
                type: "string",
                description: "User ID (optional, defaults to authenticated user)",
              },
              count: {
                type: "integer",
                description: "Number of tweets to retrieve",
                default: 10,
                minimum: 1,
                maximum: 100,
              },
            },
          },
        },
        {
          name: "get_home_feed",
          description: "Get your home timeline feed",
          inputSchema: {
            type: "object",
            properties: {
              count: {
                type: "integer",
                description: "Number of tweets to retrieve",
                default: 10,
                minimum: 1,
                maximum: 100,
              },
            },
          },
        },
        {
          name: "search_tweets",
          description: "Search for tweets using X query syntax",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Search query. Examples: 'cat OR dog', 'from:elonmusk tesla', '#AI -is:retweet', '(from:user1 OR from:user2) keyword'",
              },
              maxResults: {
                type: "integer",
                description: "Number of tweets to retrieve",
                default: 10,
                minimum: 1,
                maximum: 100,
              },
            },
            required: ["query"],
          },
        },
        {
          name: "search_advanced",
          description: "Advanced tweet search with structured parameters",
          inputSchema: {
            type: "object",
            properties: {
              keywords: {
                type: "string",
                description: "Keywords that must all be present (space-separated)",
              },
              phrase: {
                type: "string",
                description: "Exact phrase to search for",
              },
              any: {
                type: "string",
                description: "Any of these words (comma-separated, OR logic)",
              },
              none: {
                type: "string",
                description: "None of these words (comma-separated, will be excluded)",
              },
              hashtags: {
                type: "string",
                description: "Hashtags to search for (comma-separated, without #)",
              },
              from: {
                type: "string",
                description: "From these users (comma-separated usernames, OR logic)",
              },
              to: {
                type: "string",
                description: "Replies to these users (comma-separated usernames)",
              },
              mentions: {
                type: "string",
                description: "Mentions of these users (comma-separated usernames)",
              },
              lang: {
                type: "string",
                description: "Language code (e.g., 'en', 'es', 'fr')",
              },
              hasLinks: {
                type: "boolean",
                description: "Only tweets with links",
              },
              hasMedia: {
                type: "boolean",
                description: "Only tweets with media",
              },
              hasImages: {
                type: "boolean",
                description: "Only tweets with images",
              },
              hasVideos: {
                type: "boolean",
                description: "Only tweets with videos",
              },
              isRetweet: {
                type: "boolean",
                description: "Include retweets (true) or exclude them (false)",
              },
              isReply: {
                type: "boolean",
                description: "Only replies (true) or exclude replies (false)",
              },
              isQuote: {
                type: "boolean",
                description: "Only quote tweets (true) or exclude them (false)",
              },
              isVerified: {
                type: "boolean",
                description: "Only from verified accounts (true) or exclude them (false)",
              },
              since: {
                type: "string",
                description: "Tweets since this date (YYYY-MM-DD)",
              },
              until: {
                type: "string",
                description: "Tweets until this date (YYYY-MM-DD)",
              },
              list: {
                type: "string",
                description: "List ID to search tweets from list members",
              },
              context: {
                type: "string",
                description: "Context/topic IDs (comma-separated)",
              },
              maxResults: {
                type: "integer",
                description: "Number of tweets to retrieve",
                default: 10,
                minimum: 1,
                maximum: 100,
              },
            },
          },
        },
        {
          name: "get_list_tweets",
          description: "Get tweets from members of a specific list",
          inputSchema: {
            type: "object",
            properties: {
              listId: {
                type: "string",
                description: "The ID of the list",
              },
              maxResults: {
                type: "integer",
                description: "Number of tweets to retrieve",
                default: 10,
                minimum: 1,
                maximum: 100,
              },
            },
            required: ["listId"],
          },
        },
        {
          name: "get_user_lists",
          description: "Get lists owned by a user",
          inputSchema: {
            type: "object",
            properties: {
              userId: {
                type: "string",
                description: "User ID (optional, defaults to authenticated user)",
              },
            },
          },
        },
        {
          name: "like_tweet",
          description: "Like a tweet",
          inputSchema: {
            type: "object",
            properties: {
              tweetId: {
                type: "string",
                description: "The ID of the tweet to like",
              },
            },
            required: ["tweetId"],
          },
        },
        {
          name: "unlike_tweet",
          description: "Unlike a tweet",
          inputSchema: {
            type: "object",
            properties: {
              tweetId: {
                type: "string",
                description: "The ID of the tweet to unlike",
              },
            },
            required: ["tweetId"],
          },
        },
        {
          name: "retweet",
          description: "Retweet a tweet",
          inputSchema: {
            type: "object",
            properties: {
              tweetId: {
                type: "string",
                description: "The ID of the tweet to retweet",
              },
            },
            required: ["tweetId"],
          },
        },
        {
          name: "unretweet",
          description: "Remove a retweet",
          inputSchema: {
            type: "object",
            properties: {
              tweetId: {
                type: "string",
                description: "The ID of the tweet to unretweet",
              },
            },
            required: ["tweetId"],
          },
        },
      ],
    }));

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const toolName = request.params.name;
        const toolParams = request.params.arguments || {};

        console.error(`[Request] Tool call: ${toolName}`, toolParams);

        switch (toolName) {
          case "test_x_connection":
            return await tools.testXConnection();

          case "get_profile":
            return await tools.getProfile();

          case "get_user":
            return await tools.getUser(
              toolParams as { username: string }
            );

          case "create_tweet":
            return await tools.createTweet(
              toolParams as { text: string; replyToId?: string }
            );

          case "reply_to_tweet":
            return await tools.replyToTweet(
              toolParams as { tweetId: string; text: string }
            );

          case "delete_tweet":
            return await tools.deleteTweet(
              toolParams as { tweetId: string }
            );

          case "get_tweet":
            return await tools.getTweet(
              toolParams as { tweetId: string }
            );

          case "quote_tweet":
            return await tools.quoteTweet(
              toolParams as { text: string; quotedTweetUrl: string }
            );

          case "get_timeline":
            return await tools.getTimeline(
              toolParams as { userId?: string; count?: number }
            );

          case "get_home_feed":
            return await tools.getHomeFeed(
              toolParams as { count?: number }
            );

          case "search_tweets":
            return await tools.searchTweets(
              toolParams as { query: string; maxResults?: number }
            );
          
          case "search_advanced":
            return await tools.searchAdvanced(
              toolParams as any
            );
          
          case "get_list_tweets":
            return await tools.getListTweets(
              toolParams as { listId: string; maxResults?: number }
            );
          
          case "get_user_lists":
            return await tools.getUserLists(
              toolParams as { userId?: string }
            );

          case "like_tweet":
            return await tools.likeTweet(
              toolParams as { tweetId: string }
            );

          case "unlike_tweet":
            return await tools.unlikeTweet(
              toolParams as { tweetId: string }
            );

          case "retweet":
            return await tools.retweet(
              toolParams as { tweetId: string }
            );

          case "unretweet":
            return await tools.unretweet(
              toolParams as { tweetId: string }
            );

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Tool with name ${toolName} not found`
            );
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error(`[Error] Tool execution failed: ${error.message}`);
          throw new McpError(
            ErrorCode.InternalError,
            `Tool execution failed: ${error.message}`
          );
        }
        throw error;
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("[Server] X MCP Server is running");
  }
}

// Run the server
const server = new XServer();
server.run().catch(console.error);