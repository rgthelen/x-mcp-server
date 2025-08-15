import { getXClient } from '../client/x-client';

export async function likeTweet(params: {
  tweetId: string;
}) {
  const client = getXClient();
  
  console.error(`[Tool] Liking tweet: ${params.tweetId}`);
  
  await client.likeTweet(params.tweetId);
  
  return {
    content: [{
      type: "text",
      text: `Successfully liked tweet: ${params.tweetId}`
    }]
  };
}

export async function unlikeTweet(params: {
  tweetId: string;
}) {
  const client = getXClient();
  
  console.error(`[Tool] Unliking tweet: ${params.tweetId}`);
  
  await client.unlikeTweet(params.tweetId);
  
  return {
    content: [{
      type: "text",
      text: `Successfully unliked tweet: ${params.tweetId}`
    }]
  };
}

export async function retweet(params: {
  tweetId: string;
}) {
  const client = getXClient();
  
  console.error(`[Tool] Retweeting: ${params.tweetId}`);
  
  await client.retweet(params.tweetId);
  
  return {
    content: [{
      type: "text",
      text: `Successfully retweeted: ${params.tweetId}`
    }]
  };
}

export async function unretweet(params: {
  tweetId: string;
}) {
  const client = getXClient();
  
  console.error(`[Tool] Unretweeting: ${params.tweetId}`);
  
  await client.unretweet(params.tweetId);
  
  return {
    content: [{
      type: "text",
      text: `Successfully unretweeted: ${params.tweetId}`
    }]
  };
}