#!/usr/bin/env python3
"""Run database migration script"""

import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

# Read migration SQL
with open('migration_add_unified_fields.sql', 'r') as f:
    migration_sql = f.read()

# Connect to Supabase
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
supabase = create_client(supabase_url, supabase_key)

print("Running migration...")
print("=" * 60)

# Split by statement (rough split on semicolons at end of lines)
statements = [stmt.strip() for stmt in migration_sql.split(';') if stmt.strip()]

for i, statement in enumerate(statements, 1):
    # Skip comments and empty statements
    if not statement or statement.startswith('--'):
        continue

    print(f"\n[{i}/{len(statements)}] Executing:")
    print(statement[:100] + "..." if len(statement) > 100 else statement)

    try:
        # Use rpc to execute raw SQL
        result = supabase.rpc('exec', {'query': statement}).execute()
        print("✓ Success")
    except Exception as e:
        # If rpc doesn't work, try direct SQL execution via postgrest
        error_msg = str(e)
        if 'function exec' in error_msg.lower():
            print("⚠ Note: Direct SQL execution not available via Python client")
            print("   The migration SQL has been created at: migration_add_unified_fields.sql")
            print("   Please run it manually in Supabase SQL Editor")
            break
        else:
            print(f"✗ Error: {e}")
            # Continue with other statements

print("\n" + "=" * 60)
print("Migration script completed!")
print("\nIMPORTANT: If migration didn't run automatically,")
print("please execute migration_add_unified_fields.sql in Supabase SQL Editor:")
print(f"  → {supabase_url.replace('https://', 'https://app.')}/project/_/sql")
