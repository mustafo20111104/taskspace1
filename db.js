// STORAGE SWITCH: picks where data is saved.
//   - SUPABASE_URL and SUPABASE_SERVICE_KEY are set -> Supabase database (use this online)
//   - otherwise                                      -> JSON files in "data" (fine on your computer)
// Both stores have exactly the same functions, so the rest of the code does not care.

const useSupabase = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);

if (process.env.VERCEL && !useSupabase) {
  throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_KEY in the Vercel project settings.");
}

module.exports = useSupabase ? require("./store-supabase") : require("./store-json");
