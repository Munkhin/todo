import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    // verify authorization for cron job
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // TODO: Read connected sources from database/storage
    // For now, this is a placeholder that shows the pattern

    console.log('[Cron] Starting scheduled sync...');

    const connectedSources = ['gmail', 'google-classroom']; // placeholder
    const results = [];

    for (const sourceId of connectedSources) {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/sources/${sourceId}/sync`, {
          method: 'POST',
        });
        const data = await response.json();
        results.push({ sourceId, ...data });
      } catch (error) {
        console.error(`[Cron] Failed to sync ${sourceId}:`, error);
        results.push({ sourceId, success: false, error: String(error) });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error) {
    console.error('[Cron] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Cron job failed' },
      { status: 500 }
    );
  }
}
