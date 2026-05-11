import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Database Setup Route - Comprehensive version
 * 
 * GET  /api/setup/database — Check connection status and get setup instructions
 * POST /api/setup/database — Create tables using Prisma ($executeRawUnsafe)
 * 
 * If the database is not reachable, returns instructions for manual setup.
 */

async function getDb() {
  try {
    const { db } = await import('@/lib/db')
    const countPromise = db.user.count({ take: 1 })
    const timeoutPromise = new Promise<null>((_, reject) =>
      setTimeout(() => reject(new Error('Connection timeout')), 8000)
    )
    await Promise.race([countPromise, timeoutPromise])
    return db
  } catch {
    return null
  }
}

export async function GET() {
  const db = await getDb()

  if (!db) {
    // Database not reachable - return instructions
    let migrationSQL = ''
    try {
      migrationSQL = readFileSync(join(process.cwd(), 'prisma', 'migration.sql'), 'utf-8')
    } catch {
      migrationSQL = '-- Migration SQL not found. Run: npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script'
    }

    return NextResponse.json({
      status: 'disconnected',
      database: 'postgresql',
      provider: 'supabase',
      message: 'Database is not reachable. This is likely due to IPv6-only DNS or the connection pooler not being enabled.',
      instructions: {
        step1: 'Go to your Supabase Dashboard: https://supabase.com/dashboard/project/zriqvihsnwhjipyzwpvq',
        step2: 'Navigate to Project Settings → Database → Connection string',
        step3: 'Copy the "Connection pooling" URL (port 6543) — this uses IPv4 and works with Vercel',
        step4: 'Update the DATABASE_URL environment variable on Vercel with the pooler URL',
        step5: 'Go to the SQL Editor in Supabase Dashboard',
        step6: 'Paste and run the migration SQL to create all tables',
        step7: 'Redeploy on Vercel for the changes to take effect',
      },
      poolerUrlFormat: 'postgresql://postgres.zriqvihsnwhjipyzwpvq:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=15',
      directUrlFormat: 'postgresql://postgres:[YOUR-PASSWORD]@db.zriqvihsnwhjipyzwpvq.supabase.co:5432/postgres',
      migrationSQL: migrationSQL.substring(0, 500) + '...(truncated — use POST to apply or copy from prisma/migration.sql)',
    }, { status: 503 })
  }

  try {
    const userCount = await db.user.count()
    const orgCount = await db.organization.count()

    return NextResponse.json({
      status: 'connected',
      database: 'postgresql',
      provider: 'supabase',
      hasUsers: userCount > 0,
      hasOrganizations: orgCount > 0,
      userCount,
      organizationCount: orgCount,
      message: 'Database is connected and tables exist! 🎉',
    })
  } catch (error) {
    return NextResponse.json({
      status: 'connected_but_no_tables',
      database: 'postgresql',
      provider: 'supabase',
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Database is reachable but tables may not exist yet. Call POST /api/setup/database to create them.',
    }, { status: 503 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const setupSecret = process.env.SETUP_SECRET || 'gangniaga-setup-2025'
    const requestSecret = req.headers.get('x-setup-secret')

    if (requestSecret !== setupSecret) {
      return NextResponse.json({ error: 'Unauthorized. Provide x-setup-secret header.' }, { status: 401 })
    }

    const db = await getDb()

    if (!db) {
      return NextResponse.json({
        error: 'Cannot connect to database.',
        hint: 'The database might be unreachable due to IPv6-only DNS. Please use the Supabase SQL Editor to run the migration manually.',
        status: 'disconnected',
      }, { status: 503 })
    }

    // Check if already set up
    try {
      const userCount = await db.user.count()
      if (userCount >= 0) {
        return NextResponse.json({
          message: 'Database is already set up and accessible',
          status: 'ready',
          userCount,
        })
      }
    } catch {
      // Tables don't exist yet, proceed with setup
    }

    // Read and execute migration SQL
    let migrationSQL: string
    try {
      migrationSQL = readFileSync(join(process.cwd(), 'prisma', 'migration.sql'), 'utf-8')
    } catch {
      return NextResponse.json({
        error: 'Migration SQL file not found at prisma/migration.sql',
        status: 'error',
      }, { status: 500 })
    }

    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    const results: Array<{ statement: string; status: string }> = []
    const errors: Array<{ statement: string; error: string }> = []

    for (const statement of statements) {
      try {
        await db.$executeRawUnsafe(statement)
        results.push({ statement: statement.substring(0, 60) + '...', status: 'ok' })
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Unknown error'
        if (errMsg.includes('already exists')) {
          results.push({ statement: statement.substring(0, 60) + '...', status: 'already_exists' })
        } else {
          errors.push({ statement: statement.substring(0, 60) + '...', error: errMsg })
        }
      }
    }

    return NextResponse.json({
      message: 'Database setup completed',
      tablesCreated: results.length,
      errors: errors.length,
      details: { results: results.slice(0, 20), errors: errors.slice(0, 10) },
      status: errors.length === 0 ? 'success' : 'partial',
    })
  } catch (error) {
    console.error('Database setup error:', error)
    return NextResponse.json({
      error: 'Database setup failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      status: 'error',
    }, { status: 500 })
  }
}
