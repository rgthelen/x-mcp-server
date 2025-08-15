import { getXClient } from '../client/x-client';

export async function searchTweets(params: {
  query: string;
  maxResults?: number;
}) {
  const client = getXClient();
  
  console.error(`[Tool] Searching tweets with query: ${params.query}`);
  
  const tweets = await client.searchTweets(params.query, params.maxResults || 10);
  
  return {
    content: [{
      type: "text",
      text: JSON.stringify(tweets, null, 2)
    }]
  };
}

export async function searchAdvanced(params: {
  keywords?: string;
  phrase?: string;
  any?: string;
  none?: string;
  hashtags?: string;
  from?: string;
  to?: string;
  mentions?: string;
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
  context?: string;
  maxResults?: number;
}) {
  const client = getXClient();
  
  console.error(`[Tool] Advanced search with params:`, params);
  
  // Convert string parameters to arrays where needed
  const options = {
    keywords: params.keywords?.split(' ').filter(Boolean),
    phrase: params.phrase,
    any: params.any?.split(',').map(s => s.trim()).filter(Boolean),
    none: params.none?.split(',').map(s => s.trim()).filter(Boolean),
    hashtags: params.hashtags?.split(',').map(s => s.trim()).filter(Boolean),
    from: params.from?.split(',').map(s => s.trim()).filter(Boolean),
    to: params.to?.split(',').map(s => s.trim()).filter(Boolean),
    mentions: params.mentions?.split(',').map(s => s.trim()).filter(Boolean),
    lang: params.lang,
    hasLinks: params.hasLinks,
    hasMedia: params.hasMedia,
    hasImages: params.hasImages,
    hasVideos: params.hasVideos,
    isRetweet: params.isRetweet,
    isReply: params.isReply,
    isQuote: params.isQuote,
    isVerified: params.isVerified,
    minLikes: params.minLikes,
    minRetweets: params.minRetweets,
    minReplies: params.minReplies,
    since: params.since,
    until: params.until,
    list: params.list,
    context: params.context?.split(',').map(s => s.trim()).filter(Boolean),
    maxResults: params.maxResults
  };
  
  const tweets = await client.searchAdvanced(options);
  
  return {
    content: [{
      type: "text",
      text: JSON.stringify(tweets, null, 2)
    }]
  };
}

export async function getListTweets(params: {
  listId: string;
  maxResults?: number;
}) {
  const client = getXClient();
  
  console.error(`[Tool] Getting tweets from list: ${params.listId}`);
  
  const tweets = await client.getListTweets(params.listId, params.maxResults || 10);
  
  return {
    content: [{
      type: "text",
      text: JSON.stringify(tweets, null, 2)
    }]
  };
}

export async function getUserLists(params: {
  userId?: string;
}) {
  const client = getXClient();
  
  console.error(`[Tool] Getting lists for user: ${params.userId || 'self'}`);
  
  const lists = await client.getUserLists(params.userId);
  
  return {
    content: [{
      type: "text",
      text: JSON.stringify(lists, null, 2)
    }]
  };
}