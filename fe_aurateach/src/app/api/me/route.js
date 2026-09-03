// src/app/api/me/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.aurateach.io.vn/api';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get('access_token');

    if (!tokenCookie) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const response = await fetch(`${BACKEND_URL}/auth/me`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${tokenCookie.value}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const data = await response.json();
    return NextResponse.json({ user: data.user ?? data }, { status: 200 });
  } catch (error) {
    console.error('❌ /api/me error:', error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
