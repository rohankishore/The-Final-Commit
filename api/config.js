export default function handler(request, response) {
  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response.status(500).json({
      error: 'Supabase environment variables are not set on the server.'
    });
  }
  response.status(200).json({
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
  });
}

