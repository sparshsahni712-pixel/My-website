# Forge AI — Cloudflare starter

A small working MVP: enter a prompt, generate a standalone HTML website through Gemini, preview it in a sandboxed iframe, and download the HTML.

## 1. Requirements

- A Cloudflare account
- Node.js installed on your computer
- Gemini API key

## 2. Install

```bash
npm install
npx wrangler login
```

## 3. Add API keys as Worker secrets

```bash
npx wrangler secret put GEMINI_API_KEY
```

Paste your Gemini key only into the terminal prompt. Do not put keys in `public/`, frontend JavaScript, GitHub, or `wrangler.toml`.

You can configure the model name in `wrangler.toml` if the model is available to your API account.

## 4. Run locally

```bash
npm run dev
```

Open the local URL printed by Wrangler.

## 5. Deploy

```bash
npm run deploy
```

Wrangler will deploy the Worker and its static assets. Your app will receive a `workers.dev` address if your account has that option enabled.

## 6. GitHub

Create a private GitHub repository and upload this project. Never commit API keys. If you connect the repository to Cloudflare Builds, configure the deployment command as `npx wrangler deploy` and add the API keys as Cloudflare Worker secrets.

## What this starter includes

- Responsive builder dashboard
- Prompt-to-HTML generation
- Gemini provider integration
- Up to 3 attempts for temporary HTTP errors (429/500/502/503/504)
- Sandboxed preview
- Download generated HTML

## What it does NOT include yet

This is a Gemini-only starter MVP, not a complete Lovable competitor. It does not yet include user accounts, D1 project saving, R2 uploads, multi-file React generation, visual editing, secure production build isolation, custom domains, or one-click deployment of each customer's generated site. Those should be added in later phases and tested before accepting real customer projects.
