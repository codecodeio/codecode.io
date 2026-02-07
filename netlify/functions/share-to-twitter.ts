import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import OAuth from "oauth-1.0a";

interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
}

// Parse RSS feed to get latest post
async function getLatestPost(siteUrl: string): Promise<RSSItem | null> {
  const response = await fetch(`${siteUrl}/rss.xml`);
  const xml = await response.text();

  // Simple XML parsing for RSS
  const itemMatch = xml.match(/<item>([\s\S]*?)<\/item>/);
  if (!itemMatch) return null;

  const item = itemMatch[1];
  const title =
    item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ||
    item.match(/<title>(.*?)<\/title>/)?.[1] ||
    "";
  const link = item.match(/<link>(.*?)<\/link>/)?.[1] || "";
  const description =
    item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1] ||
    item.match(/<description>(.*?)<\/description>/)?.[1] ||
    "";
  const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || "";

  return { title, link, description, pubDate };
}

// Post to Twitter using OAuth 1.0a
async function postToTwitter(text: string): Promise<Response> {
  const oauth = new OAuth({
    consumer: {
      key: process.env.TWITTER_API_KEY!,
      secret: process.env.TWITTER_API_SECRET!,
    },
    signature_method: "HMAC-SHA1",
    hash_function(baseString, key) {
      return crypto.createHmac("sha1", key).update(baseString).digest("base64");
    },
  });

  const token = {
    key: process.env.TWITTER_ACCESS_TOKEN!,
    secret: process.env.TWITTER_ACCESS_SECRET!,
  };

  const url = "https://api.twitter.com/2/tweets";
  const requestData = { url, method: "POST" as const };

  const authHeader = oauth.toHeader(oauth.authorize(requestData, token));

  return fetch(url, {
    method: "POST",
    headers: {
      Authorization: authHeader.Authorization,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });
}

// Check if post was already shared (Supabase deduplication)
async function wasAlreadyPosted(postUrl: string): Promise<boolean> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    return false; // Skip deduplication if Supabase not configured
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
  );

  const { data: existing } = await supabase
    .from("social_posts")
    .select("id")
    .eq("post_url", postUrl)
    .single();

  return !!existing;
}

// Record successful post to Supabase
async function recordPost(postUrl: string, tweetId: string): Promise<void> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    return; // Skip recording if Supabase not configured
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
  );

  await supabase.from("social_posts").insert({
    post_url: postUrl,
    twitter_posted_at: new Date().toISOString(),
    twitter_post_id: tweetId,
  });
}

export const handler: Handler = async (event) => {
  // Only accept POST requests (from Netlify deploy notification)
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  // Verify Twitter credentials are configured
  if (
    !process.env.TWITTER_API_KEY ||
    !process.env.TWITTER_API_SECRET ||
    !process.env.TWITTER_ACCESS_TOKEN ||
    !process.env.TWITTER_ACCESS_SECRET
  ) {
    console.error("Twitter credentials not configured");
    return { statusCode: 500, body: "Twitter credentials not configured" };
  }

  try {
    const siteUrl = process.env.URL || "https://codecode.io";
    const latestPost = await getLatestPost(siteUrl);

    if (!latestPost) {
      return { statusCode: 200, body: "No posts found in RSS" };
    }

    // Check if post is recent (within last 10 minutes)
    // TODO: Revert to 10 * 60 * 1000 after testing
    const postDate = new Date(latestPost.pubDate);
    const now = new Date();
    const tenMinutes = 10 * 60 * 1000;
    //const tenMinutes = 15 * 24 * 60 * 60 * 1000; // 15 days for testing

    if (now.getTime() - postDate.getTime() > tenMinutes) {
      return { statusCode: 200, body: "No new posts to share" };
    }

    // Check if already posted (Supabase deduplication)
    if (await wasAlreadyPosted(latestPost.link)) {
      return { statusCode: 200, body: "Already posted" };
    }

    // Compose tweet
    const tweet = `${latestPost.title}\n\n${latestPost.link}`;

    // Post to Twitter
    const response = await postToTwitter(tweet);
    const result = await response.json();

    if (!response.ok) {
      console.error("Twitter API error:", result);
      return { statusCode: 500, body: JSON.stringify(result) };
    }

    // Record successful post to Supabase
    if (result.data?.id) {
      await recordPost(latestPost.link, result.data.id);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, tweet: result }),
    };
  } catch (error) {
    console.error("Error:", error);
    return { statusCode: 500, body: String(error) };
  }
};
