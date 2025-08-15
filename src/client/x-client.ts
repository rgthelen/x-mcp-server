import axios, { AxiosInstance, AxiosError } from 'axios';
import * as fs from 'fs';
import * as path from 'path';

export interface XTweet {
  id?: string;
  text: string;
  author_id?: string;
  created_at?: string;
  conversation_id?: string;
  in_reply_to_user_id?: string;
  referenced_tweets?: Array<{
    type: 'retweeted' | 'quoted' | 'replied_to';
    id: string;
  }>;
  attachments?: {
    media_keys?: string[];
    poll_ids?: string[];
  };
  public_metrics?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
  };
}

export interface XUser {
  id: string;
  name: string;
  username: string;
  description?: string;
  profile_image_url?: string;
  verified?: boolean;
  public_metrics?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
    listed_count: number;
  };
}

class XClient {
  private client: AxiosInstance;
  private accessToken: string;
  private refreshToken?: string;
  private clientId?: string;
  private clientSecret?: string;
  private userId?: string;
  private tokenExpiresAt?: Date;

  constructor(config: {
    accessToken: string;
    refreshToken?: string;
    clientId?: string;
    clientSecret?: string;
  }) {
    this.accessToken = config.accessToken;
    this.refreshToken = config.refreshToken;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    
    // Calculate token expiration (2 hours from now, minus 5 minutes buffer)
    this.tokenExpiresAt = new Date(Date.now() + (2 * 60 * 60 * 1000) - (5 * 60 * 1000));

    this.client = axios.create({
      baseURL: 'https://api.twitter.com/2',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add request interceptor to handle token refresh
    this.client.interceptors.request.use(
      async (config) => {
        // Check if token needs refresh
        if (this.shouldRefreshToken()) {
          await this.refreshAccessToken();
        }
        
        // Add current access token to request
        config.headers['Authorization'] = `Bearer ${this.accessToken}`;
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor to handle 401 errors
    this.client.interceptors.response.use(
      response => response,
      async (error: AxiosError) => {
        const originalRequest = error.config;
        
        // If we get a 401 and have a refresh token, try refreshing
        if (error.response?.status === 401 && this.refreshToken && originalRequest) {
          console.error('[X API] Token expired, attempting refresh...');
          
          try {
            await this.refreshAccessToken();
            // Retry the original request with new token
            originalRequest.headers['Authorization'] = `Bearer ${this.accessToken}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            console.error('[X API] Token refresh failed:', refreshError);
          }
        }
        
        console.error('[X API] Error:', error.response?.data || error.message);
        throw error;
      }
    );
  }

  private shouldRefreshToken(): boolean {
    if (!this.refreshToken || !this.tokenExpiresAt) {
      return false;
    }
    
    // Refresh if token expires in less than 5 minutes
    return new Date() >= this.tokenExpiresAt;
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken || !this.clientId) {
      throw new Error('Cannot refresh token: missing refresh token or client ID');
    }

    console.error('[X API] Refreshing access token...');
    
    try {
      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret || ''}`).toString('base64');
      
      const response = await axios.post('https://api.twitter.com/2/oauth2/token', 
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.refreshToken,
          client_id: this.clientId
        }), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${credentials}`
          }
        }
      );
      
      const { access_token, refresh_token, expires_in } = response.data;
      
      this.accessToken = access_token;
      if (refresh_token) {
        this.refreshToken = refresh_token;
      }
      
      // Update token expiration time
      this.tokenExpiresAt = new Date(Date.now() + (expires_in * 1000) - (5 * 60 * 1000));
      
      console.error('[X API] Token refreshed successfully');
      
      // Update the environment file with new tokens
      this.updateTokensInEnv(access_token, refresh_token);
      
      // Update Claude Desktop config if possible
      this.updateClaudeConfig(access_token, refresh_token);
      
    } catch (error: any) {
      console.error('[X API] Failed to refresh token:', error.response?.data || error.message);
      throw new Error('Token refresh failed');
    }
  }

  private updateTokensInEnv(accessToken: string, refreshToken?: string): void {
    try {
      const envPath = path.join(__dirname, '../../.env');
      if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, 'utf8');
        envContent = envContent.replace(/X_OAUTH2_ACCESS_TOKEN=.*/, `X_OAUTH2_ACCESS_TOKEN=${accessToken}`);
        if (refreshToken) {
          envContent = envContent.replace(/X_OAUTH2_REFRESH_TOKEN=.*/, `X_OAUTH2_REFRESH_TOKEN=${refreshToken}`);
        }
        fs.writeFileSync(envPath, envContent);
        console.error('[X API] Updated .env file with new tokens');
      }
    } catch (error) {
      console.error('[X API] Could not update .env file:', error);
    }
  }

  private updateClaudeConfig(accessToken: string, refreshToken?: string): void {
    try {
      const configPath = '/Users/robthelen/Library/Application Support/Claude/claude_desktop_config.json';
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      if (config.mcpServers?.x?.env) {
        config.mcpServers.x.env.X_OAUTH2_ACCESS_TOKEN = accessToken;
        if (refreshToken) {
          config.mcpServers.x.env.X_OAUTH2_REFRESH_TOKEN = refreshToken;
        }
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.error('[X API] Updated Claude Desktop config with new tokens');
      }
    } catch (error) {
      console.error('[X API] Could not update Claude config:', error);
    }
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      await this.getProfile();
      return true;
    } catch (error) {
      console.error('[X API] Connection test failed:', error);
      return false;
    }
  }

  // Get authenticated user's profile
  async getProfile(): Promise<XUser> {
    try {
      const response = await this.client.get('/users/me', {
        params: {
          'user.fields': 'id,name,username,description,profile_image_url,verified,public_metrics'
        }
      });
      
      const user = response.data.data;
      this.userId = user.id;
      return user;
    } catch (error: any) {
      console.error('[X API] Error getting profile:', error.response?.data || error.message);
      throw new Error('Failed to get X profile');
    }
  }

  // Get user by username or ID
  async getUser(username: string): Promise<XUser> {
    try {
      const endpoint = username.startsWith('@') 
        ? `/users/by/username/${username.substring(1)}`
        : `/users/${username}`;
      
      const response = await this.client.get(endpoint, {
        params: {
          'user.fields': 'id,name,username,description,profile_image_url,verified,public_metrics'
        }
      });
      
      return response.data.data;
    } catch (error: any) {
      console.error('[X API] Error getting user:', error.response?.data || error.message);
      throw new Error('Failed to get X user');
    }
  }

  // Create a tweet
  async createTweet(text: string, replyToId?: string): Promise<XTweet> {
    try {
      const tweetData: any = { text };
      
      if (replyToId) {
        tweetData.reply = {
          in_reply_to_tweet_id: replyToId
        };
      }
      
      const response = await this.client.post('/tweets', tweetData);
      return response.data.data;
    } catch (error: any) {
      console.error('[X API] Error creating tweet:', error.response?.data || error.message);
      throw new Error('Failed to create tweet');
    }
  }

  // Delete a tweet
  async deleteTweet(tweetId: string): Promise<void> {
    try {
      await this.client.delete(`/tweets/${tweetId}`);
    } catch (error: any) {
      console.error('[X API] Error deleting tweet:', error.response?.data || error.message);
      throw new Error('Failed to delete tweet');
    }
  }

  // Get a specific tweet
  async getTweet(tweetId: string): Promise<XTweet> {
    try {
      const response = await this.client.get(`/tweets/${tweetId}`, {
        params: {
          'tweet.fields': 'id,text,created_at,author_id,conversation_id,in_reply_to_user_id,referenced_tweets,attachments,public_metrics',
          'expansions': 'author_id,referenced_tweets.id'
        }
      });
      
      return response.data.data;
    } catch (error: any) {
      console.error('[X API] Error getting tweet:', error.response?.data || error.message);
      throw new Error('Failed to get tweet');
    }
  }

  // Get user's timeline
  async getTimeline(userId?: string, maxResults: number = 10): Promise<XTweet[]> {
    try {
      const targetUserId = userId || this.userId;
      if (!targetUserId) {
        const profile = await this.getProfile();
        this.userId = profile.id;
      }
      
      const response = await this.client.get(`/users/${targetUserId || this.userId}/tweets`, {
        params: {
          'max_results': maxResults,
          'tweet.fields': 'id,text,created_at,author_id,conversation_id,public_metrics',
          'exclude': 'retweets,replies'
        }
      });
      
      return response.data.data || [];
    } catch (error: any) {
      console.error('[X API] Error getting timeline:', error.response?.data || error.message);
      throw new Error('Failed to get timeline');
    }
  }

  // Get home timeline (feed)
  async getHomeFeed(maxResults: number = 10): Promise<XTweet[]> {
    try {
      if (!this.userId) {
        const profile = await this.getProfile();
        this.userId = profile.id;
      }
      
      // Note: Twitter API v2 requires reverse chronological timeline access
      // This endpoint might require additional permissions
      const response = await this.client.get(`/users/${this.userId}/timelines/reverse_chronological`, {
        params: {
          'max_results': maxResults,
          'tweet.fields': 'id,text,created_at,author_id,conversation_id,public_metrics'
        }
      });
      
      return response.data.data || [];
    } catch (error: any) {
      // Fallback to user's own timeline if home feed access is not available
      console.error('[X API] Home feed not available, falling back to user timeline');
      return this.getTimeline(this.userId, maxResults);
    }
  }

  // Search tweets with advanced query support
  async searchTweets(query: string, maxResults: number = 10): Promise<XTweet[]> {
    try {
      // Log the query for debugging
      console.error(`[X API] Searching with query: "${query}"`);
      console.error(`[X API] Query length: ${query.length} characters`);
      
      const response = await this.client.get('/tweets/search/recent', {
        params: {
          'query': query,
          'max_results': Math.min(maxResults, 100), // API max is 100
          'tweet.fields': 'id,text,created_at,author_id,conversation_id,public_metrics,entities,context_annotations',
          'expansions': 'author_id,referenced_tweets.id',
          'user.fields': 'name,username,verified'
        }
      });
      
      const tweets = response.data.data || [];
      console.error(`[X API] Found ${tweets.length} tweets`);
      return tweets;
    } catch (error: any) {
      console.error('[X API] Error searching tweets:', error.response?.data || error.message);
      if (error.response?.status === 400) {
        console.error('[X API] Invalid query syntax. Check your search operators.');
        console.error('[X API] Common issues: standalone lang:/has:/is: operators, query too long (512 char limit)');
      }
      throw new Error('Failed to search tweets: ' + (error.response?.data?.detail || error.message));
    }
  }

  // Advanced search with query builder helper
  async searchAdvanced(options: {
    keywords?: string[];
    phrase?: string;
    any?: string[];
    none?: string[];
    hashtags?: string[];
    from?: string[];
    to?: string[];
    mentions?: string[];
    lang?: string;
    hasLinks?: boolean;
    hasMedia?: boolean;
    hasImages?: boolean;
    hasVideos?: boolean;
    isRetweet?: boolean;
    isReply?: boolean;
    isQuote?: boolean;
    isVerified?: boolean;
    minLikes?: number;
    minRetweets?: number;
    minReplies?: number;
    since?: string;
    until?: string;
    list?: string;
    context?: string[];
    maxResults?: number;
  }): Promise<XTweet[]> {
    const queryParts: string[] = [];
    
    // Keywords (all must be present)
    if (options.keywords?.length) {
      queryParts.push(options.keywords.join(' '));
    }
    
    // Exact phrase
    if (options.phrase) {
      queryParts.push(`"${options.phrase}"`);
    }
    
    // Any of these words (OR)
    if (options.any?.length) {
      queryParts.push(`(${options.any.join(' OR ')})`);
    }
    
    // None of these words
    if (options.none?.length) {
      options.none.forEach(word => queryParts.push(`-${word}`));
    }
    
    // Hashtags
    if (options.hashtags?.length) {
      options.hashtags.forEach(tag => {
        queryParts.push(tag.startsWith('#') ? tag : `#${tag}`);
      });
    }
    
    // From users (OR)
    if (options.from?.length) {
      if (options.from.length === 1) {
        queryParts.push(`from:${options.from[0].replace('@', '')}`);
      } else {
        const fromQuery = options.from.map(user => `from:${user.replace('@', '')}`).join(' OR ');
        queryParts.push(`(${fromQuery})`);
      }
    }
    
    // To users
    if (options.to?.length) {
      options.to.forEach(user => queryParts.push(`to:${user.replace('@', '')}`));
    }
    
    // Mentions
    if (options.mentions?.length) {
      options.mentions.forEach(user => queryParts.push(`@${user.replace('@', '')}`));
    }
    
    // Language (must be combined with other operators)
    if (options.lang && queryParts.length > 0) {
      queryParts.push(`lang:${options.lang}`);
    }
    
    // Has operators (must be combined with other operators)
    if (queryParts.length > 0 || options.keywords || options.from) {
      if (options.hasLinks) queryParts.push('has:links');
      if (options.hasMedia) queryParts.push('has:media');
      if (options.hasImages) queryParts.push('has:images');
      if (options.hasVideos) queryParts.push('has:videos');
    }
    
    // Is operators (must be combined with other operators)
    if (queryParts.length > 0 || options.keywords || options.from) {
      if (options.isRetweet !== undefined) {
        queryParts.push(options.isRetweet ? 'is:retweet' : '-is:retweet');
      }
      if (options.isReply !== undefined) {
        queryParts.push(options.isReply ? 'is:reply' : '-is:reply');
      }
      if (options.isQuote !== undefined) {
        queryParts.push(options.isQuote ? 'is:quote' : '-is:quote');
      }
      if (options.isVerified !== undefined) {
        queryParts.push(options.isVerified ? 'is:verified' : '-is:verified');
      }
    }
    
    // Engagement metrics (Pro/Enterprise only)
    if (options.minLikes) queryParts.push(`min_faves:${options.minLikes}`);
    if (options.minRetweets) queryParts.push(`min_retweets:${options.minRetweets}`);
    if (options.minReplies) queryParts.push(`min_replies:${options.minReplies}`);
    
    // Time filters
    if (options.since) queryParts.push(`since:${options.since}`);
    if (options.until) queryParts.push(`until:${options.until}`);
    
    // List search
    if (options.list) {
      queryParts.push(`list:${options.list}`);
    }
    
    // Context annotations (topics)
    if (options.context?.length) {
      options.context.forEach(ctx => queryParts.push(`context:${ctx}`));
    }
    
    const query = queryParts.join(' ');
    
    if (!query) {
      throw new Error('Search query cannot be empty. Provide at least one search parameter.');
    }
    
    if (query.length > 512) {
      throw new Error(`Query too long (${query.length} chars). Maximum is 512 characters.`);
    }
    
    return this.searchTweets(query, options.maxResults || 10);
  }

  // Like a tweet
  async likeTweet(tweetId: string): Promise<void> {
    try {
      if (!this.userId) {
        const profile = await this.getProfile();
        this.userId = profile.id;
      }
      
      await this.client.post(`/users/${this.userId}/likes`, {
        tweet_id: tweetId
      });
    } catch (error: any) {
      console.error('[X API] Error liking tweet:', error.response?.data || error.message);
      throw new Error('Failed to like tweet');
    }
  }

  // Unlike a tweet
  async unlikeTweet(tweetId: string): Promise<void> {
    try {
      if (!this.userId) {
        const profile = await this.getProfile();
        this.userId = profile.id;
      }
      
      await this.client.delete(`/users/${this.userId}/likes/${tweetId}`);
    } catch (error: any) {
      console.error('[X API] Error unliking tweet:', error.response?.data || error.message);
      throw new Error('Failed to unlike tweet');
    }
  }

  // Retweet
  async retweet(tweetId: string): Promise<void> {
    try {
      if (!this.userId) {
        const profile = await this.getProfile();
        this.userId = profile.id;
      }
      
      await this.client.post(`/users/${this.userId}/retweets`, {
        tweet_id: tweetId
      });
    } catch (error: any) {
      console.error('[X API] Error retweeting:', error.response?.data || error.message);
      throw new Error('Failed to retweet');
    }
  }

  // Unretweet
  async unretweet(tweetId: string): Promise<void> {
    try {
      if (!this.userId) {
        const profile = await this.getProfile();
        this.userId = profile.id;
      }
      
      await this.client.delete(`/users/${this.userId}/retweets/${tweetId}`);
    } catch (error: any) {
      console.error('[X API] Error unretweeting:', error.response?.data || error.message);
      throw new Error('Failed to unretweet');
    }
  }

  // Quote tweet
  async quoteTweet(text: string, quotedTweetUrl: string): Promise<XTweet> {
    try {
      const tweetData = {
        text: `${text} ${quotedTweetUrl}`
      };
      
      const response = await this.client.post('/tweets', tweetData);
      return response.data.data;
    } catch (error: any) {
      console.error('[X API] Error creating quote tweet:', error.response?.data || error.message);
      throw new Error('Failed to create quote tweet');
    }
  }

  // Get list members' tweets
  async getListTweets(listId: string, maxResults: number = 10): Promise<XTweet[]> {
    try {
      const response = await this.client.get(`/lists/${listId}/tweets`, {
        params: {
          'max_results': Math.min(maxResults, 100),
          'tweet.fields': 'id,text,created_at,author_id,conversation_id,public_metrics',
          'expansions': 'author_id',
          'user.fields': 'name,username,verified'
        }
      });
      
      return response.data.data || [];
    } catch (error: any) {
      console.error('[X API] Error getting list tweets:', error.response?.data || error.message);
      throw new Error('Failed to get list tweets');
    }
  }

  // Get user's lists
  async getUserLists(userId?: string): Promise<any[]> {
    try {
      const targetUserId = userId || this.userId;
      if (!targetUserId) {
        const profile = await this.getProfile();
        this.userId = profile.id;
      }
      
      const response = await this.client.get(`/users/${targetUserId || this.userId}/owned_lists`, {
        params: {
          'max_results': 100,
          'list.fields': 'id,name,description,member_count,follower_count,created_at'
        }
      });
      
      return response.data.data || [];
    } catch (error: any) {
      console.error('[X API] Error getting user lists:', error.response?.data || error.message);
      throw new Error('Failed to get user lists');
    }
  }
}

// Singleton instance
let xClient: XClient | null = null;

export function initializeXClient(config: {
  accessToken: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
}) {
  xClient = new XClient(config);
  return xClient;
}

export function getXClient(): XClient {
  if (!xClient) {
    throw new Error('X client not initialized. Please check your configuration.');
  }
  return xClient;
}