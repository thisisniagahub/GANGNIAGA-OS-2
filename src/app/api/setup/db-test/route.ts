import { NextResponse } from 'next/server'

/**
 * Advanced Database Connection Diagnostic
 * Tests multiple connection methods and reports detailed results
 */
export async function GET() {
  const results: Array<{ test: string; status: string; detail: string }> = []
  
  const dbUrl = process.env.DATABASE_URL || ''
  const directUrl = process.env.DIRECT_URL || ''
  
  // Environment info
  results.push({ test: 'DATABASE_URL', status: dbUrl ? 'ok' : 'fail', detail: dbUrl ? dbUrl.replace(/\/\/[^@]+@/, '//***:***@') : 'Not set' })
  results.push({ test: 'DIRECT_URL', status: directUrl ? 'ok' : 'warn', detail: directUrl ? directUrl.replace(/\/\/[^@]+@/, '//***:***@') : 'Not set' })
  results.push({ test: 'NODE_ENV', status: 'ok', detail: process.env.NODE_ENV || 'undefined' })

  // Test 1: Try Prisma with DATABASE_URL
  try {
    const { PrismaClient } = await import('@prisma/client')
    
    const prisma = new PrismaClient({
      log: ['error'],
      datasources: { db: { url: dbUrl } },
    })
    
    try {
      await Promise.race([
        prisma.$connect(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout after 10s')), 10000))
      ])
      results.push({ test: 'Prisma connect (DATABASE_URL)', status: 'ok', detail: 'Connected!' })
      
      try {
        const res = await prisma.$queryRaw`SELECT current_database(), current_user, version() as v`
        results.push({ test: 'Prisma query', status: 'ok', detail: JSON.stringify(res) })
      } catch (qErr) {
        results.push({ test: 'Prisma query', status: 'fail', detail: qErr instanceof Error ? qErr.message : 'Unknown' })
      }
    } catch (connErr) {
      results.push({ test: 'Prisma connect (DATABASE_URL)', status: 'fail', detail: connErr instanceof Error ? `${connErr.name}: ${connErr.message}` : 'Unknown' })
    } finally {
      await prisma.$disconnect().catch(() => {})
    }
  } catch (importErr) {
    results.push({ test: 'Prisma import', status: 'fail', detail: importErr instanceof Error ? importErr.message : 'Unknown' })
  }

  // Test 2: Try Prisma with DIRECT_URL
  if (directUrl && directUrl !== dbUrl) {
    try {
      const { PrismaClient } = await import('@prisma/client')
      const prisma = new PrismaClient({
        log: ['error'],
        datasources: { db: { url: directUrl } },
      })
      
      try {
        await Promise.race([
          prisma.$connect(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout after 10s')), 10000))
        ])
        results.push({ test: 'Prisma connect (DIRECT_URL)', status: 'ok', detail: 'Connected!' })
      } catch (connErr) {
        results.push({ test: 'Prisma connect (DIRECT_URL)', status: 'fail', detail: connErr instanceof Error ? `${connErr.name}: ${connErr.message}` : 'Unknown' })
      } finally {
        await prisma.$disconnect().catch(() => {})
      }
    } catch {}
  }

  // Test 3: Try pg module with various configs
  try {
    const pg = await import('pg')
    const { Client } = pg
    
    const testConfigs = [
      {
        name: 'pg: Direct (no brackets)',
        host: 'db.zriqvihsnwhjipyzwpvq.supabase.co',
        port: 5432,
        database: 'postgres',
        user: 'postgres',
        password: 'Megat202620262',
        ssl: { rejectUnauthorized: false },
      },
      {
        name: 'pg: Pooler ap-southeast-1 (ref user)',
        host: 'aws-0-ap-southeast-1.pooler.supabase.com',
        port: 6543,
        database: 'postgres',
        user: 'postgres.zriqvihsnwhjipyzwpvq',
        password: 'Megat202620262',
        ssl: { rejectUnauthorized: false },
      },
    ]
    
    for (const cfg of testConfigs) {
      const client = new Client({ ...cfg, connectionTimeoutMillis: 8000 })
      try {
        await client.connect()
        const res = await client.query('SELECT 1 as ok')
        results.push({ test: cfg.name, status: 'ok', detail: `Connected! ${JSON.stringify(res.rows)}` })
        await client.end()
        break // Found a working config
      } catch (err) {
        results.push({ test: cfg.name, status: 'fail', detail: err instanceof Error ? err.message.substring(0, 100) : 'Unknown' })
      } finally {
        try { await client.end() } catch {}
      }
    }
  } catch {
    results.push({ test: 'pg module', status: 'warn', detail: 'pg module not available' })
  }

  // Test 4: DNS resolution check
  try {
    const dns = await import('dns')
    const addresses = await new Promise<string[]>((resolve, reject) => {
      dns.resolve4('db.zriqvihsnwhjipyzwpvq.supabase.co', (err, addrs) => {
        if (err) reject(err)
        else resolve(addrs)
      })
    })
    results.push({ test: 'DNS IPv4', status: 'ok', detail: addresses.join(', ') })
  } catch (dnsErr) {
    results.push({ test: 'DNS IPv4', status: 'fail', detail: dnsErr instanceof Error ? dnsErr.message : 'DNS lookup failed' })
  }

  try {
    const dns = await import('dns')
    const addresses = await new Promise<string[]>((resolve, reject) => {
      dns.resolve6('db.zriqvihsnwhjipyzwpvq.supabase.co', (err, addrs) => {
        if (err) reject(err)
        else resolve(addrs)
      })
    })
    results.push({ test: 'DNS IPv6', status: 'ok', detail: addresses.join(', ') })
  } catch (dnsErr) {
    results.push({ test: 'DNS IPv6', status: 'fail', detail: dnsErr instanceof Error ? dnsErr.message : 'DNS lookup failed' })
  }

  // Test 5: Supabase REST API check
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (supabaseUrl && supabaseKey) {
      const res = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      })
      if (res.ok) {
        const data = await res.json()
        const pathCount = Object.keys(data.paths || {}).length
        results.push({ test: 'Supabase REST API', status: 'ok', detail: `Connected, ${pathCount} paths` })
      } else {
        results.push({ test: 'Supabase REST API', status: 'warn', detail: `HTTP ${res.status}` })
      }
    }
  } catch (restErr) {
    results.push({ test: 'Supabase REST API', status: 'fail', detail: restErr instanceof Error ? restErr.message : 'Unknown' })
  }

  return NextResponse.json({ results })
}
