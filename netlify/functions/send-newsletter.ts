import { render } from "@react-email/render";
import type { Handler } from "@netlify/functions";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { NewPostEmail } from "../../src/emails/NewPostEmail";

interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  image: string;
}

// Fetch Open Graph image from a URL as fallback when RSS has no image
async function fetchOgImage(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const metaTags = html.match(/<meta[^>]*>/gi) || [];
    for (const tag of metaTags) {
      const propMatch = tag.match(/property=(?:["']og:image["']|og:image(?=[\s>]))/i);
      if (!propMatch) continue;
      const contentMatch =
        tag.match(/content="([^"]*)"/i) ||
        tag.match(/content='([^']*)'/i) ||
        tag.match(/content=([^\s>]+)/i);
      if (contentMatch?.[1]) {
        const rawImage = contentMatch[1];
        const origin = new URL(url).origin;
        return rawImage.startsWith("http") ? rawImage : `${origin}${rawImage}`;
      }
    }
  } catch (error) {
    console.error("Failed to fetch OG image:", error);
  }
  return "";
}

// Parse RSS feed to get latest post
async function getLatestPost(siteUrl: string): Promise<RSSItem | null> {
  const response = await fetch(`${siteUrl}/rss.xml`);
  const xml = await response.text();

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
  const image = item.match(/<media:content[^>]*url="([^"]*)"/)?.[1] || "";

  // Strip HTML tags from description (RSS may contain markup)
  const plainDescription = description.replace(/<[^>]*>/g, "").trim();

  return { title, link, description: plainDescription, pubDate, image };
}

// Check if newsletter was already sent for this post (Supabase deduplication)
async function wasAlreadyNewslettered(postUrl: string): Promise<boolean> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    console.log("Supabase not configured — skipping deduplication check");
    return false;
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
  );

  const { data: existing } = await supabase
    .from("social_posts")
    .select("email_sent_at")
    .eq("post_url", postUrl)
    .not("email_sent_at", "is", null)
    .single();

  return !!existing;
}

// Record successful newsletter send to Supabase (upsert — social functions may have created the row)
async function recordNewsletterSend(postUrl: string): Promise<void> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    return;
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

  if (existing) {
    await supabase
      .from("social_posts")
      .update({ email_sent_at: new Date().toISOString() })
      .eq("post_url", postUrl);
  } else {
    await supabase.from("social_posts").insert({
      post_url: postUrl,
      email_sent_at: new Date().toISOString(),
    });
  }
}

// Send a test email to a single address (skips audience broadcast)
async function sendTestEmail(post: RSSItem, testEmail: string): Promise<string> {
  const resend = new Resend(process.env.RESEND_API_KEY!);

  const props = {
    title: post.title,
    link: post.link,
    description: post.description,
    image: post.image,
    imageAlt: post.title,
    unsubscribeUrl: "#",
  };

  const html = await render(NewPostEmail(props));
  const text = await render(NewPostEmail(props), { plainText: true });

  const { data, error } = await resend.emails.send({
    from: process.env.SEND_EMAIL_FROM!,
    to: testEmail,
    subject: `[TEST] ${post.title}`,
    html,
    text,
  });

  if (error || !data?.id) {
    throw new Error(`Failed to send test email: ${JSON.stringify(error)}`);
  }

  return data.id;
}

// Create and send newsletter broadcast via Resend
async function sendNewsletter(post: RSSItem): Promise<string> {
  const resend = new Resend(process.env.RESEND_API_KEY!);
  const audienceId = process.env.RESEND_AUDIENCE_ID!;

  const html = await render(
    NewPostEmail({
      title: post.title,
      link: post.link,
      description: post.description,
      image: post.image,
      imageAlt: post.title,
    })
  );

  const text = await render(
    NewPostEmail({
      title: post.title,
      link: post.link,
      description: post.description,
      image: post.image,
      imageAlt: post.title,
    }),
    { plainText: true }
  );

  // Step 1: Create the broadcast
  const { data: created, error: createError } = await resend.broadcasts.create({
    audienceId,
    from: process.env.SEND_EMAIL_FROM!,
    subject: post.title,
    html,
    text,
    name: `Newsletter: ${post.title}`,
  });

  if (createError || !created?.id) {
    throw new Error(`Failed to create broadcast: ${JSON.stringify(createError)}`);
  }

  console.log(`Broadcast created: ${created.id}`);

  // Step 2: Send the broadcast
  const { data: sent, error: sendError } = await resend.broadcasts.send(created.id);

  if (sendError || !sent?.id) {
    throw new Error(`Failed to send broadcast: ${JSON.stringify(sendError)}`);
  }

  return sent.id;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  if (
    !process.env.RESEND_API_KEY ||
    !process.env.RESEND_AUDIENCE_ID ||
    !process.env.SEND_EMAIL_FROM
  ) {
    console.error("Resend credentials not configured");
    return { statusCode: 500, body: "Resend credentials not configured" };
  }

  try {
    const siteUrl = process.env.URL || "https://codecode.io";
    const payload = event.body ? JSON.parse(event.body) : {};
    const testEmail: string | undefined = payload.test_email;

    const latestPost = await getLatestPost(siteUrl);

    if (!latestPost) {
      console.log("No posts found in RSS");
      return { statusCode: 200, body: "No posts found in RSS" };
    }

    console.log(`Latest post: "${latestPost.title}" (${latestPost.link})`);

    // Test mode: send to a single address, skip recency check and dedup
    if (testEmail) {
      if (!latestPost.image || !latestPost.image.startsWith("http")) {
        latestPost.image = await fetchOgImage(latestPost.link);
      }
      const emailId = await sendTestEmail(latestPost, testEmail);
      console.log(`Test email sent to ${testEmail}: ${emailId}`);
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, test: true, emailId }),
      };
    }

    // Check if post was published today or yesterday (UTC) to handle timezone offsets
    const postDate = new Date(latestPost.pubDate);
    const now = new Date();
    const postDateStr = postDate.toISOString().split("T")[0];
    const todayStr = now.toISOString().split("T")[0];
    const yesterdayStr = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    if (postDateStr !== todayStr && postDateStr !== yesterdayStr) {
      console.log(
        `No new posts to share (latest post: ${latestPost.link}, pubDate: ${postDateStr})`
      );
      return { statusCode: 200, body: "No new posts to share" };
    }

    // Check if newsletter was already sent (Supabase deduplication)
    if (await wasAlreadyNewslettered(latestPost.link)) {
      console.log(`Newsletter already sent for: ${latestPost.link}`);
      return { statusCode: 200, body: "Newsletter already sent" };
    }

    console.log("Dedup check passed — proceeding to send newsletter");

    // Fall back to OG image if RSS had no image or returned a local dev URL
    if (!latestPost.image || !latestPost.image.startsWith("http")) {
      console.log("No absolute image URL in RSS — fetching OG image from post URL");
      latestPost.image = await fetchOgImage(latestPost.link);
    }

    const broadcastId = await sendNewsletter(latestPost);

    await recordNewsletterSend(latestPost.link);

    console.log(`Successfully sent newsletter broadcast: ${broadcastId}`);
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, broadcastId }),
    };
  } catch (error) {
    console.error("Error:", error);
    return { statusCode: 500, body: String(error) };
  }
};
