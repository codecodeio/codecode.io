# Welcome To CodeCode.io

**codecode.io** is a tech education site focused on simplifying technology for everyone. It features straightforward tutorials, practical guides, and resources for developers and learners. The site is designed with accessibility, modern UI, and internationalization in mind, powered by Astro, Supabase, and the Voyager theme.

Shout out to [Cosmic Themes](https://cosmicthemes.com/) for making beautiful, modern, and highly customizable Astro themes! The [Voyager Theme](https://cosmicthemes.com/themes/voyager) is the starting point for this site.

---

## Roadmap

| Version   | Description                                    | Status      |
| --------- | ---------------------------------------------- | ----------- |
| 1.0.0     | Site Launch: Customized Cosmic Theme: Voyager  | Complete    |
| 1.0.1     | Pagination for blog listings                   | Complete    |
| 1.0.2     | Resend Integration for Subscriptions           | Complete    |
| 1.0.3     | Double opt-in sign up with Supabase/Resend     | Complete    |
| 1.0.4     | Auto share published articles to Bluesky       | Complete    |
| **1.0.5** | **Tip jar for user support/donations**         | **Upcoming** |

---

## Basic Astro Commands

```bash
# Install dependencies
pnpm install

# Start local dev server
pnpm run dev

# Build for production
pnpm run build

# Run Astro CLI commands
pnpm run astro -- --help
```

## Basic Netlify Commands

```bash
# Preview production build locally
netlify dev
ntl dev

# Deploy site to Netlify (if using Netlify CLI)
netlify deploy
ntl deploy

# Open Netlify dashboard
netlify open
ntl open
```

## Testing Netlify Functions

```bash
# Start Netlify dev server (required for function testing)
netlify dev

# In another terminal, test the Bluesky auto-share function
netlify functions:invoke share-to-bluesky --payload '{}'  
```

**Expected results:**
- `No new posts to share` - Latest post is older than 10 minutes (normal)
- `Already posted` - Post was already shared (Supabase deduplication)
- `No posts found in RSS` - RSS feed is empty or unavailable
- `{"success": true, ...}` - Post was created successfully

---

## Branching Strategy

This project is based on a theme. To keep the theme code and any customizations organized, the following branching strategy is used:

### Branches
- **`theme`**  
  Clean copy of the original theme repository with no edits (`upstream`).  
  - Contains only commits from the theme author.  
  - Never make direct edits here.  
  - Updated by merging changes from `upstream/main`.
  
- **`main`**  
  This site's customized branch (`origin`).  
  - Based on `theme`.  
  - Contains all commits specific to this site.  
  - Merges in updates from `theme` when the vendor releases changes.
  
## Branching Workflow

1. **Set up remotes**
   ```bash
   git remote remove origin
   git remote add origin git@github.com:codecodeio/codecode.io.git
   git remote remove upstream
   git remote add upstream git@github.com:Cosmic-Themes/voyager.git

   git remote -v
   origin	git@github.com:codecodeio/codecode.io.git (fetch)
   origin	git@github.com:codecodeio/codecode.io.git (push)
   upstream	git@github.com:Cosmic-Themes/voyager.git (fetch)
   upstream	git@github.com:Cosmic-Themes/voyager.git (push)
   ```
2. **Create Theme Branch**
   ```bash
   git fetch upstream
   git checkout -b theme upstream/main
   git push -u origin theme
   ```

### Theme Updates
```bash
# Update theme branch with latest theme changes
git fetch upstream
git checkout theme
git merge upstream/main
git push origin theme

# Merge theme changes into this site
git checkout main
git merge theme
git push origin main
```

---

## Environment Variables

| Variable               | Description                                      |
| ---------------------- | ------------------------------------------------ |
| `RESEND_API_KEY`       | Email service for transactional emails           |
| `SEND_EMAIL_FROM`      | Default sender email address                     |
| `SUPABASE_URL`         | Supabase project URL                             |
| `SUPABASE_ANON_KEY`    | Supabase anonymous/public key                    |
| `SUPABASE_SECRET_KEY`  | Supabase secret key (server-side, bypasses RLS)  |
| `BLUESKY_HANDLE`       | Bluesky handle (e.g., yourname.bsky.social)      |
| `BLUESKY_APP_PASSWORD` | Bluesky app-specific password                    |

