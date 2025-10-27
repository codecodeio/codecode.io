# Welcome To CodeCode.io

**codecode.io** is a tech education site focused on simplifying technology for everyone. It features straightforward tutorials, practical guides, and resources for developers and learners. The site is designed with accessibility, modern UI, and internationalization in mind, powered by Astro and the Voyager theme.

Shout out to [Cosmic Themes](https://cosmicthemes.com/) for making beautiful, modern, and highly customizable Astro themes! The [Voyager Theme](https://cosmicthemes.com/themes/voyager) is the starting point for this site.

---

## Roadmap

| Version | Description                                   | Status   |
| ------- | --------------------------------------------- | -------- |
| 1.0.0   | Site Launch: Customized Cosmic Theme: Voyager | Current  |
| 1.1.0   | Pagination for blog listings                  | Upcoming |
| 1.2.0   | Resend Integration for Subscriptions          | Upcoming |
| 1.3.0   | Tip jar for user support/donations            | Upcoming |

---

## Basic Astro Commands

```bash
# Install dependencies
npm install

# Start local dev server
npm run dev

# Build for production
npm run build

# Run Astro CLI commands
npm run astro -- --help
```

## Basic Netlify Commands

```bash
# Preview production build locally
netlify dev

# Deploy site to Netlify (if using Netlify CLI)
netlify deploy

# Open Netlify dashboard
netlify open
```

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

### Daily Workflow
- Make blog changes in `main`, then:
  ```bash
  git add .
  git commit -m "Describe change"
  git push
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

