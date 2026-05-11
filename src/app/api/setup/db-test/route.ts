import { NextResponse } from 'next/server'

/**
 * Database Connection Diagnostic Route
 * Tests the PostgreSQL connection and returns detailed error info
 */
export async function GET() {
  const results: Array<{ test: string; status: string; detail: string }> = []

  // Test 1: Check if DATABASE_URL is set
  const dbUrl = process.env.DATABASE_URL
  if (dbUrl) {
    const maskedUrl = dbUrl.replace(/\/\/[^@]+@/, '//***:***@')
    results.push({ test: 'DATABASE_URL set', status: 'ok', detail: maskedUrl })
  } else {
    results.push({ test: 'DATABASE_URL set', status: 'fail', detail: 'Not set' })
    return NextResponse.json({ results })
  }

  // Test 2: Check if DIRECT_URL is set
  const directUrl = process.env.DIRECT_URL
  if (directUrl) {
    const maskedUrl = directUrl.replace(/\/\/[^@]+@/, '//***:***@')
    results.push({ test: 'DIRECT_URL set', status: 'ok', detail: maskedUrl })
  } else {
    results.push({ test: 'DIRECT_URL set', status: 'warn', detail: 'Not set - using DATABASE_URL for migrations' })
  }

  // Test 3: Try to import and connect with Prisma
  try {
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient({
      log: ['error', 'warn'],
      datasources: {
        db: { url: dbUrl },
      },
    })

    try {
      // Try a simple query
      await prisma.$connect()
      results.push({ test: 'Prisma $connect', status: 'ok', detail: 'Connected successfully' })

      // Try a raw query
      const result = await prisma.$queryRaw`SELECT current_database(), current_user, version() as v`
      results.push({ 
        test: 'Prisma raw query', 
        status: 'ok', 
        detail: JSON.stringify(result) 
      })

      // Try to check if tables exist
      try {
        const tableCount = await prisma.$queryRaw`
          SELECT count(*) as count 
          FROM information_schema.tables 
          WHERE table_schema = 'public'
        `
        results.push({ 
          test: 'Table check', 
          status: 'ok', 
          detail: `Tables in public schema: ${JSON.stringify(tableCount)}` 
        })
      } catch (tableErr) {
        results.push({ 
          test: 'Table check', 
          status: 'warn', 
          detail: tableErr instanceof Error ? tableErr.message : 'Unknown error' 
        })
      }
    } catch (connErr) {
      results.push({ 
        test: 'Prisma connection', 
        status: 'fail', 
        detail: connErr instanceof Error ? `${connErr.name}: ${connErr.message}` : 'Unknown error' 
      })
    } finally {
      await prisma.$disconnect().catch(() => {})
    }
  } catch (importErr) {
    results.push({ 
      test: 'Prisma import', 
      status: 'fail', 
      detail: importErr instanceof Error ? importErr.message : 'Unknown error' 
    })
  }

  // Test 4: Try direct pg connection
  try {
    // Use pg module directly
    const { Client } = await import('pg')
    
    // Try the pooler URL
    const poolerUrl = dbUrl.replace('db.zriqvihsnwhjipyzwpvq.supabase.co:5432', 'aws-0-ap-southeast-1.pooler.supabase.com:6543')
    const client = new Client({ 
      connectionString: poolerUrl,
      connectionTimeoutMillis: 10000,
    })
    
    try {
      await client.connect()
      const res = await client.query('SELECT 1 as test')
      results.push({ test: 'Direct pg (pooler)', status: 'ok', detail: JSON.stringify(res.rows) })
      await client.end()
    } catch (pgErr) {
      results.push({ 
        test: 'Direct pg (pooler)', 
        status: 'fail', 
        detail: pgErr instanceof Error ? pgErr.message : 'Unknown error' 
      })
      try { await client.end() } catch {}
    }
  } catch (pgImportErr) {
    results.push({ 
      test: 'pg module', 
      status: 'warn', 
      detail: 'pg module not available - using Prisma only' 
    })
  }

  return NextResponse.json({ results, env: { NODE_ENV: process.env.NODE_ENV } })
}
