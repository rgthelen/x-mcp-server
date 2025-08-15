import { getXClient } from '../client/x-client';

export async function getTimeline(params: {
  userId?: string;
  count?: number;
}) {
  const client = getXClient();
  
  console.error(`[Tool] Fetching timeline (${params.count || 10} tweets)`);
  
  const tweets = await client.getTimeline(params.userId, params.count || 10);
  
  return {
    content: [{
      type: "text",
      text: JSON.stringify(tweets, null, 2)
    }]
  };
}

export async function getHomeFeed(params: {
  count?: number;
}) {
  const client = getXClient();
  
  console.error(`[Tool] Fetching home feed (${params.count || 10} tweets)`);
  
  const tweets = await client.getHomeFeed(params.count || 10);
  
  return {
    content: [{
      type: "text",
      text: JSON.stringify(tweets, null, 2)
    }]
  };
}

