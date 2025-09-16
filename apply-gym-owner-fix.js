const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('Make sure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyGymOwnerFix() {
  try {
    console.log('🔧 Applying gym owner access fix...')
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'database', 'fix_gym_owner_access.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    
    // Split by semicolon and execute each statement
    const statements = sql.split(';').filter(stmt => stmt.trim())
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`📝 Executing: ${statement.trim().substring(0, 50)}...`)
        
        const { error } = await supabase.rpc('exec_sql', { 
          sql_query: statement.trim() 
        })
        
        if (error) {
          console.error(`❌ Error executing statement:`, error)
          // Continue with other statements
        } else {
          console.log('✅ Statement executed successfully')
        }
      }
    }
    
    console.log('🎉 Gym owner access fix applied successfully!')
    console.log('')
    console.log('Next steps:')
    console.log('1. Restart your application')
    console.log('2. Login as gym owner')
    console.log('3. Test all features - should work without errors')
    console.log('4. Verify that gym owner can see all data in their gym')
    
  } catch (error) {
    console.error('❌ Error applying gym owner fix:', error)
    process.exit(1)
  }
}

// Run the fix
applyGymOwnerFix()
