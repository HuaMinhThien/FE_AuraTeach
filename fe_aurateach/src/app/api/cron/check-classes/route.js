// src/app/api/cron/check-classes/route.js
import { NextResponse } from 'next/server';
import { checkClasses } from '@/services/classSuggestionService';

export async function GET(request) {
  // Bảo vệ trong production
  if (process.env.NODE_ENV === 'production') {
    const authHeader = request.headers.get('x-api-key');
    if (authHeader !== process.env.CRON_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
  }

  try {
    const results = await checkClasses();
    return NextResponse.json({
      success: true,
      ...results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Cron job error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// Cho phép POST để test
export async function POST(request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    );
  }

  try {
    const results = await checkClasses();
    return NextResponse.json({
      success: true,
      ...results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Cron job error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
