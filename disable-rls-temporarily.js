const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function disableRLSTemporarily() {
  try {
    console.log('🔧 Temporarily disabling RLS for testing...')
    
    const tables = [
      'staff',
      'follow_ups', 
      'training_sessions',
      'members',
      'memberships',
      'payments',
      'refund_requests'
    ]
    
    for (const table of tables) {
      console.log(`📝 Disabling RLS for ${table}...`)
      
      const { error } = await supabase.rpc('exec_sql', { 
        sql_query: `ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;` 
      })
      
      if (error) {
        console.error(`❌ Error disabling RLS for ${table}:`, error)
      } else {
        console.log(`✅ RLS disabled for ${table}`)
      }
    }
    
    console.log('🎉 RLS temporarily disabled!')
    console.log('')
    console.log('Now test your application:')
    console.log('1. Login as gym owner')
    console.log('2. Test all features')
    console.log('3. If everything works, we can create proper policies')
    console.log('4. If not, there might be other issues')
    
  } catch (error) {
    console.error('❌ Error disabling RLS:', error)
    process.exit(1)
  }
}

// Run the fix
disableRLSTemporarily()
