const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('Please check your .env.local file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyPaymentFix() {
  try {
    console.log('🔧 Applying payment transaction_reference fix...')
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'database', 'fix_payment_transaction_reference.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql })
    
    if (error) {
      console.error('❌ Error applying payment fix:', error)
      return
    }
    
    console.log('✅ Payment transaction_reference fix applied successfully!')
    console.log('📊 Column added and existing data migrated')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

applyPaymentFix()
