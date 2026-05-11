import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Database Setup Route
 * 
 * This route initializes the Supabase PostgreSQL database with the Prisma schema.
 * Call POST /api/setup/database with x-setup-secret header to create all tables.
 * Call GET /api/setup/database to check database connection status.
 * 
 * On Vercel: This will work automatically because Vercel can connect to Supabase.
 * On local dev: May timeout if database is not reachable (e.g., IPv6-only hosts).
 */

// Lazy-load Prisma to avoid crash on import when DB is unreachable
async function getDb() {
  try {
    const { db } = await import('@/lib/db')
    // Quick health check with timeout
    const countPromise = db.user.count({ take: 1 })
    const timeoutPromise = new Promise<null>((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout')), 5000)
    )
    await Promise.race([countPromise, timeoutPromise])
    return db
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    // Security check
    const setupSecret = process.env.SETUP_SECRET || 'gangniaga-setup-2025'
    const requestSecret = req.headers.get('x-setup-secret')
    
    if (requestSecret !== setupSecret) {
      return NextResponse.json({ error: 'Unauthorized. Provide x-setup-secret header.' }, { status: 401 })
    }

    const db = await getDb()

    if (!db) {
      return NextResponse.json({ 
        error: 'Cannot connect to database. Please check DATABASE_URL environment variable.',
        hint: 'If deploying on Vercel, make sure to set DATABASE_URL in Vercel Environment Variables.',
        status: 'disconnected',
      }, { status: 503 })
    }

    // Check if already set up
    try {
      const userCount = await db.user.count({ take: 1 })
      if (userCount >= 0) {
        return NextResponse.json({ 
          message: 'Database is connected and tables exist',
          status: 'ready',
        })
      }
    } catch {
      // Tables don't exist yet, proceed with setup
    }

    // Read and execute migration SQL
    let migrationSQL: string
    try {
      const migrationPath = join(process.cwd(), 'prisma', 'migration.sql')
      migrationSQL = readFileSync(migrationPath, 'utf-8')
    } catch {
      return NextResponse.json({ 
        error: 'Migration SQL file not found at prisma/migration.sql',
        status: 'error',
      }, { status: 500 })
    }

    // Split SQL into individual statements and execute them
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

export async function GET() {
  const db = await getDb()

  if (!db) {
    return NextResponse.json({
      status: 'disconnected',
      database: 'postgresql',
      provider: 'supabase',
      message: 'Database is not reachable. Check DATABASE_URL. If on Vercel, set env vars in dashboard.',
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
      message: 'Database is connected and tables exist',
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
