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

## 3. Configure Vercel
In **Project Settings -> Environment Variables**, add the following variables. Set `SUPABASE_SERVICE_KEY` and `JWT_SECRET` as Secret values, and keep them server-side. Do not use a `NEXT_PUBLIC_` or `VITE_` prefix for the Supabase key.

| Name | Used for |
|------|----------|
| `JWT_SECRET` | Signing login cookies |
| `SUPABASE_URL` | Connecting to the Supabase project |
| `SUPABASE_SERVICE_KEY` | Server-side database access |

Enable these variables for **Production** and **Preview** so both production and preview deployments can use the database. Add **Development** if you use `vercel dev`. Enter real values only in Vercel or a local ignored `.env` file; do not commit them.

You can add the variables in the Vercel dashboard or with `vercel env add` for each name above. When prompted, choose the environments listed here.

## 4. Deploy
In the project folder (the one containing `server.js`), with no `node_modules`, `data` or `.env`:
```
npm install -g vercel
vercel login
vercel
vercel --prod
```
For `JWT_SECRET` use a long random text, for example:
```
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```
Open the link that `vercel --prod` prints and create an account.
