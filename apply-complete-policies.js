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

async function applyCompletePolicies() {
  try {
    console.log('🔧 Applying complete RLS policies...')
    
    // Drop existing policies first
    const dropPolicies = [
      'DROP POLICY IF EXISTS "Gym owners can access staff" ON staff',
      'DROP POLICY IF EXISTS "Gym owners can access members" ON members',
      'DROP POLICY IF EXISTS "Gym owners can access memberships" ON memberships',
      'DROP POLICY IF EXISTS "Gym owners can access payments" ON payments',
      'DROP POLICY IF EXISTS "Gym owners can access refunds" ON refund_requests',
      'DROP POLICY IF EXISTS "Gym owners can access follow-ups" ON follow_ups',
      'DROP POLICY IF EXISTS "Gym owners can access training sessions" ON training_sessions',
      'DROP POLICY IF EXISTS "Gym owners can access attendance" ON attendance',
      'DROP POLICY IF EXISTS "Gym owners can access inquiries" ON inquiries',
      'DROP POLICY IF EXISTS "Gym owners can access expenses" ON expenses'
    ]
    
    for (const policy of dropPolicies) {
      console.log(`📝 Dropping: ${policy}`)
      await supabase.rpc('exec_sql', { sql_query: policy })
    }
    
    // Create new policies
    const policies = [
      // Staff policies
      `CREATE POLICY "Gym owners can access staff" ON staff FOR ALL USING (
        gym_id IN (SELECT id FROM gyms WHERE owner_id = auth.uid())
      )`,
      
      // Members policies
      `CREATE POLICY "Gym owners can access members" ON members FOR ALL USING (
        gym_id IN (SELECT id FROM gyms WHERE owner_id = auth.uid())
      )`,
      
      // Memberships policies
      `CREATE POLICY "Gym owners can access memberships" ON memberships FOR ALL USING (
        member_id IN (
          SELECT id FROM members WHERE gym_id IN (
            SELECT id FROM gyms WHERE owner_id = auth.uid()
          )
        )
      )`,
      
      // Payments policies
      `CREATE POLICY "Gym owners can access payments" ON payments FOR ALL USING (
        gym_id IN (SELECT id FROM gyms WHERE owner_id = auth.uid())
      )`,
      
      // Refund requests policies
      `CREATE POLICY "Gym owners can access refunds" ON refund_requests FOR ALL USING (
        gym_id IN (SELECT id FROM gyms WHERE owner_id = auth.uid())
      )`,
      
      // Follow-ups policies
      `CREATE POLICY "Gym owners can access follow-ups" ON follow_ups FOR ALL USING (
        gym_id IN (SELECT id FROM gyms WHERE owner_id = auth.uid())
      )`,
      
      // Training sessions policies
      `CREATE POLICY "Gym owners can access training sessions" ON training_sessions FOR ALL USING (
        member_id IN (
          SELECT id FROM members WHERE gym_id IN (
            SELECT id FROM gyms WHERE owner_id = auth.uid()
          )
        )
      )`,
      
      // Attendance policies
      `CREATE POLICY "Gym owners can access attendance" ON attendance FOR ALL USING (
        gym_id IN (SELECT id FROM gyms WHERE owner_id = auth.uid())
      )`,
      
      // Inquiries policies
      `CREATE POLICY "Gym owners can access inquiries" ON inquiries FOR ALL USING (
        gym_id IN (SELECT id FROM gyms WHERE owner_id = auth.uid())
      )`,
      
      // Expenses policies
      `CREATE POLICY "Gym owners can access expenses" ON expenses FOR ALL USING (
        gym_id IN (SELECT id FROM gyms WHERE owner_id = auth.uid())
      )`
    ]
    
    for (const policy of policies) {
      console.log(`📝 Creating: ${policy.substring(0, 50)}...`)
      const { error } = await supabase.rpc('exec_sql', { sql_query: policy })
      
      if (error) {
        console.error(`❌ Error creating policy:`, error)
      } else {
        console.log('✅ Policy created successfully')
      }
    }
    
    console.log('🎉 Complete RLS policies applied successfully!')
    console.log('')
    console.log('Now test your application:')
    console.log('1. Login as gym owner')
    console.log('2. All features should work without errors')
    console.log('3. Gym owner should see all data in their gym')
    
  } catch (error) {
    console.error('❌ Error applying policies:', error)
    process.exit(1)
  }
}

// Run the fix
applyCompletePolicies()
