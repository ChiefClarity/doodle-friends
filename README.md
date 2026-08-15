# Doodle Friends — deployment guide

This turns the Claude-artifact version into a real website with its own
link — no Claude account needed for your cousins to use it. Same setup
as SML Poki Card Co: Supabase for the database, GitHub for the code,
Vercel for hosting.

Total cost: $0. Everything here is free at this size.

## What you'll end up with

A real website where anyone with the link can make an account, draw,
add friends, and see each other's art — no Claude account, no app to
download, just a link.

## 1. Create a Supabase project (the database)

1. Go to supabase.com and sign in (or create a free account).
2. Click **New project**. Give it a name like "doodle-friends".
3. Once it's created, open the **SQL Editor** (left sidebar), paste in
   the entire contents of `supabase-schema.sql` from this folder, and
   click **Run**. This creates the profiles, friends, and drawings tables.
4. Go to **Project Settings > API** (left sidebar, gear icon). Copy the
   **Project URL** and the **anon public** key — you'll need both in
   step 3 below. Keep this tab open.

## 2. Push this code to GitHub

1. Go to github.com and create a **new repository** called
   `doodle-friends` (Public or Private both work).
2. Follow GitHub's instructions on that page to push this folder up —
   it'll look something like:
   ```
   git init
   git add .
   git commit -m "Doodle Friends"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/doodle-friends.git
   git push -u origin main
   ```

## 3. Deploy to Vercel

1. Go to vercel.com and sign in with your GitHub account.
2. Click **Add New > Project**, and import the `doodle-friends` repo
   you just pushed.
3. Before clicking Deploy, open **Environment Variables** and add:
   - `VITE_SUPABASE_URL` — the Project URL from step 1
   - `VITE_SUPABASE_ANON_KEY` — the anon public key from step 1
4. Click **Deploy**. In about a minute, Vercel gives you a real working
   link like `doodle-friends-yourname.vercel.app` — that's the one to
   send your cousins!

## 4. (Optional) A custom domain

If you want something like `doodlefriends.com` instead of the
`.vercel.app` link:
1. Buy the domain (e.g. on Namecheap) — this is the one step that
   costs money, usually $10–15/year, and needs an adult's card.
2. In Vercel, go to your project's **Settings > Domains**, add the
   domain, and follow the DNS instructions shown.

## Good next steps, once it's live

- **Real accounts with passwords** — right now anyone can pick any
  name, same as the Claude version. Fine for family, but worth
  upgrading if this ever grows beyond people you know.
- **Faster image loading** — drawings are currently stored directly in
  the database as compressed images. If the gallery ever feels slow
  with lots of drawings, moving images to Supabase Storage (a proper
  file-storage bucket) would speed that up.
- **Push notifications** — Supabase can trigger a notification when a
  friend posts a new drawing, so you don't have to keep checking the feed.
