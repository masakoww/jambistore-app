import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import os from 'os';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  // 1. Security Check
  const authHeader = request.headers.get('x-monitoring-secret');
  const secret = process.env.MONITOR_SECRET || process.env.CRON_SECRET;
  
  if (!secret || authHeader !== secret) {
    return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
  }

  const start = Date.now();
  let firestoreStatus = 'unknown';
  let firestoreLatency = 0;

  // 2. Check Firestore Latency
  try {
    const fsStart = Date.now();
    await db.collection('bot_settings').doc('health_check').set({ 
      lastCheck: new Date(),
      checkedBy: 'monitor' 
    }, { merge: true });
    firestoreLatency = Date.now() - fsStart;
    firestoreStatus = 'ok';
  } catch (error) {
    console.error('Firestore Health Check Failed:', error);
    firestoreStatus = 'error';
  }

  // 3. System Stats
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memUsage = (usedMem / totalMem) * 100;

  // CPU Load (Average over 1 min) - Note: In serverless this might be misleading but useful for VPS
  const loadAvg = os.loadavg()[0]; 
  const cpus = os.cpus().length;
  const cpuUsage = (loadAvg / cpus) * 100; // Rough estimate

  // Process Memory
  const processMem = process.memoryUsage();

  return NextResponse.json({
    status: firestoreStatus === 'ok' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    latency: Date.now() - start,
    system: {
      cpuUsage: Math.round(cpuUsage * 100) / 100,
      memoryUsage: Math.round(memUsage * 100) / 100,
      uptime: os.uptime(),
      platform: os.platform(),
    },
    process: {
      rss: Math.round(processMem.rss / 1024 / 1024) + ' MB',
      heapUsed: Math.round(processMem.heapUsed / 1024 / 1024) + ' MB',
    },
    firestore: {
      status: firestoreStatus,
      latency: firestoreLatency,
    }
  });
}
