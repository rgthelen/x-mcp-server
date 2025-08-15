import { getXClient } from '../client/x-client';

export async function createTweet(params: {
  text: string;
  replyToId?: string;
}) {
  const client = getXClient();
  
  console.error(`[Tool] Creating tweet${params.replyToId ? ' as reply to ' + params.replyToId : ''}`);
  
  const tweetId = await client.createTweet(params.text, params.replyToId);
  
  return {
    content: [{
      type: "text",
      text: `Successfully created tweet with ID: ${tweetId}`
    }]
  };
}

export async function deleteTweet(params: {
  tweetId: string;
}) {
  const client = getXClient();
  
  console.error(`[Tool] Deleting tweet: ${params.tweetId}`);
  
  await client.deleteTweet(params.tweetId);
  
  return {
    content: [{
      type: "text",
      text: `Successfully deleted tweet: ${params.tweetId}`
    }]
  };
}

export async function getTweet(params: {
  tweetId: string;
}) {
  const client = getXClient();
  
  console.error(`[Tool] Fetching tweet: ${params.tweetId}`);
  
  const tweet = await client.getTweet(params.tweetId);
  
  return {
    content: [{
      type: "text",
      text: JSON.stringify(tweet, null, 2)
    }]
  };
}

export async function quoteTweet(params: {
  text: string;
  quotedTweetUrl: string;
}) {
  const client = getXClient();
  
  console.error(`[Tool] Quote tweeting: ${params.quotedTweetUrl}`);
  
  const tweetId = await client.quoteTweet(params.text, params.quotedTweetUrl);
  
  return {
    content: [{
      type: "text",
      text: `Successfully created quote tweet with ID: ${tweetId}`
    }]
  };
}

export async function replyToTweet(params: {
  tweetId: string;
  text: string;
}) {
  const client = getXClient();
  
  console.error(`[Tool] Replying to tweet: ${params.tweetId}`);
  
  const replyId = await client.createTweet(params.text, params.tweetId);
  
  return {
    content: [{
      type: "text",
      text: `Successfully replied to tweet ${params.tweetId} with reply ID: ${replyId}`
    }]
  };
}