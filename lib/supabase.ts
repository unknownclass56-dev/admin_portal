import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cjyaplvwvnheqdasxclv.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqeWFwbHZ3dm5oZXFkYXN4Y2x2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MjE3ODEsImV4cCI6MjA5MDA5Nzc4MX0.hKyjahm0o0Wx4E4mu99-95BlFMdv919s7UZhAWswMlQ'

export const supabase = createClient(supabaseUrl, supabaseKey)
