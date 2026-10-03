# Put Taskspace online with Vercel + Supabase

Vercel cannot keep files, so online the data goes into a free Supabase database.
Your code already supports both: with the Supabase values empty it uses files (your computer),
with them filled in it uses Supabase.

## 1. Create the database (Supabase, free plan)
1. Sign up at https://supabase.com and click **New project**. Save the database password.
2. Open **SQL Editor -> New query**, paste everything from `supabase-setup.sql`, click **Run**.
3. Open **Project Settings -> API** (or API Keys). Copy:
   - the **Project URL**  -> `SUPABASE_URL`
   - the **secret key** (also called `service_role`) -> `SUPABASE_SERVICE_KEY`
   Never share this key and never put it in `public/`.

## 2. Test it on your computer (optional)
Copy `.env.example` to `.env`, fill in the three values, run `npm start`.

## 3. Deploy
In the project folder (the one containing `server.js`), with no `node_modules`, `data` or `.env`:
```
npm install -g vercel
vercel login
vercel
vercel env add JWT_SECRET
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_KEY
vercel --prod
```
Choose **Production** for each variable. For `JWT_SECRET` use a long random text, for example:
```
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```
Open the link that `vercel --prod` prints and create an account.
