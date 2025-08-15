import { getXClient } from '../client/x-client';

export async function getProfile() {
  const client = getXClient();
  
  console.error(`[Tool] Fetching X profile`);
  
  const profile = await client.getProfile();
  
  return {
    content: [{
      type: "text",
      text: JSON.stringify(profile, null, 2)
    }]
  };
}

export async function getUser(params: {
  username: string;
}) {
  const client = getXClient();
  
  console.error(`[Tool] Fetching user: ${params.username}`);
  
  const user = await client.getUser(params.username);
  
  return {
    content: [{
      type: "text",
      text: JSON.stringify(user, null, 2)
    }]
  };
}

export async function testXConnection() {
  try {
    const client = getXClient();
    const profile = await client.getProfile();
    
    return {
      content: [{
        type: "text",
        text: `✅ X MCP Server Connected!\n\nAuthenticated as: @${profile.username} (${profile.name})\nFollowers: ${profile.public_metrics?.followers_count || 0}\nFollowing: ${profile.public_metrics?.following_count || 0}\nTweets: ${profile.public_metrics?.tweet_count || 0}`
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `❌ X connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    };
  }
}