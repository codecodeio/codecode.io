import { BskyAgent, RichText } from "@atproto/api";
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
}

interface OgMetadata {
  title: string;
  description: string;
  image: string;
}

// Fetch Open Graph metadata from a URL
async function fetchOgMetadata(url: string): Promise<OgMetadata> {
  const response = await fetch(url);
  const html = await response.text();

  const getMetaContent = (property: string): string => {
    // Find all meta tags, then check for matching property
    const metaTags = html.match(/<meta[^>]*>/gi) || [];
    for (const tag of metaTags) {
      // Check if this tag has the right property (quoted or unquoted)
      const propMatch = tag.match(
        new RegExp(`property=(?:["']${property}["']|${property}(?=[\\s>]))`, "i")
      );
      if (!propMatch) continue;
      // Extract content value (quoted or unquoted)
      const contentMatch =
        tag.match(/content="([^"]*)"/i) ||
        tag.match(/content='([^']*)'/i) ||
        tag.match(/content=([^\s>]+)/i);
      if (contentMatch) return contentMatch[1] ?? "";
    }
    return "";
  };

  // Resolve relative image URLs to absolute
  const rawImage = getMetaContent("og:image");
  const origin = new URL(url).origin;
  const image = rawImage && !rawImage.startsWith("http") ? `${origin}${rawImage}` : rawImage;

  return {
    title: getMetaContent("og:title"),
    description: getMetaContent("og:description"),
    image,
  };
}

// Download an image and upload it as a blob to Bluesky
async function uploadThumbnail(
  imageUrl: string,
  agent: BskyAgent
) {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return undefined;

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const { data } = await agent.uploadBlob(uint8Array, { encoding: contentType });
    return data.blob;
  } catch (error) {
    console.error("Failed to upload thumbnail:", error);
    return undefined;
  }
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
  agent: BskyAgent,
  embed?: { $type: string; [key: string]: unknown }
): Promise<{ uri: string; cid: string }> {
  const rt = new RichText({ text });
  await rt.detectFacets(agent); // Detects links and mentions

  const result = await agent.post({
    text: rt.text,
    facets: rt.facets,
    embed,
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

    // Check if post was published today or yesterday (UTC) to handle timezone offsets
    const postDate = new Date(latestPost.pubDate);
    const now = new Date();
    const postDateStr = postDate.toISOString().split("T")[0];
    const todayStr = now.toISOString().split("T")[0];
    const yesterdayStr = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    if (postDateStr !== todayStr && postDateStr !== yesterdayStr) {
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

    // Fetch OG metadata and build embed
    const og = await fetchOgMetadata(latestPost.link);
    const external: Record<string, unknown> = {
      uri: latestPost.link,
      title: og.title || latestPost.title,
      description: og.description || latestPost.description,
    };

    if (og.image) {
      const thumb = await uploadThumbnail(og.image, agent);
      if (thumb) {
        external.thumb = thumb;
      }
    }

    const embed = {
      $type: "app.bsky.embed.external",
      external,
    };

    // Post with just the title — the link card provides the URL
    const postText = latestPost.title;
    const result = await postToBluesky(postText, agent, embed);

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
