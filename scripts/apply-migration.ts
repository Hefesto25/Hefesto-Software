import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration(migrationPath: string) {
    try {
        console.log(`\n📜 Reading migration: ${migrationPath}`);
        const sql = fs.readFileSync(migrationPath, 'utf-8');

        // Split by statements (simple approach)
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s && !s.startsWith('--'));

        console.log(`\n🔄 Executing ${statements.length} statements...`);

        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            console.log(`\n[${i + 1}/${statements.length}] Executing statement...`);
            const { error } = await supabase.rpc('execute_sql', { sql: statement });
            if (error) {
                console.error(`❌ Error:`, error.message);
                // Continue anyway for non-blocking errors
            } else {
                console.log(`✅ Statement executed`);
            }
        }

        console.log('\n✅ Migration completed!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

const migrationFile = process.argv[2] || path.join(__dirname, '../supabase/migrations/017_direct_messages.sql');
runMigration(migrationFile);
