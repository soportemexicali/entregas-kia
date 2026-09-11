import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yodqebcqsqvpvrvxnbzd.supabase.co'
const supabaseKey = 'sb_publishable_P76ZJXedwk6W_zbOMkeP0w_woBU9hP5'

export const supabase = createClient(supabaseUrl, supabaseKey)