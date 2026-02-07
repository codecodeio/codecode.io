import { BskyAgent, RichText } from "@atproto/api";
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

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

// Post to Bluesky
async function postToBluesky(
  text: string,
  agent: BskyAgent
): Promise<{ uri: string; cid: string }> {
  const rt = new RichText({ text });
  await rt.detectFacets(agent); // Detects links and mentions

  const result = await agent.post({
    text: rt.text,
    facets: rt.facets,
    createdAt: new Date().toISOString(),
  });

  return result;
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
async function recordPost(postUrl: string, postUri: string): Promise<void> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    return; // Skip recording if Supabase not configured
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
  );

  await supabase.from("social_posts").insert({
    post_url: postUrl,
    bluesky_posted_at: new Date().toISOString(),
    bluesky_post_uri: postUri,
  });
}

export const handler: Handler = async (event) => {
  // Only accept POST requests (from Netlify deploy notification)
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  // Verify Bluesky credentials are configured
  if (!process.env.BLUESKY_HANDLE || !process.env.BLUESKY_APP_PASSWORD) {
    console.error("Bluesky credentials not configured");
    return { statusCode: 500, body: "Bluesky credentials not configured" };
  }

  try {
    const siteUrl = process.env.URL || "https://codecode.io";
    const latestPost = await getLatestPost(siteUrl);

    if (!latestPost) {
      return { statusCode: 200, body: "No posts found in RSS" };
    }

    // Check if post is recent (within last 10 minutes)
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

    // Login to Bluesky
    const agent = new BskyAgent({ service: "https://bsky.social" });
    await agent.login({
      identifier: process.env.BLUESKY_HANDLE,
      password: process.env.BLUESKY_APP_PASSWORD,
    });

    // Compose and post
    const postText = `${latestPost.title}\n\n${latestPost.link}`;
    const result = await postToBluesky(postText, agent);

    // Record successful post to Supabase
    await recordPost(latestPost.link, result.uri);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, post: result }),
    };
  } catch (error) {
    console.error("Error:", error);
    return { statusCode: 500, body: String(error) };
  }
};
