import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://prgyvtpodmuhwskxzvqh.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_kAW2_PgfjW7E63GejBXZHg_lE3wCd0l'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)