// src/app/api/admin/classes/eligible-tutors/route.js
// Proxy sang Laravel BE, nhận token từ Authorization header của request

import { NextResponse } from 'next/server';

const LARAVEL_API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export async function POST(request) {
  try {
    const body = await request.json();
    const { course } = body;

    if (!course) {
      return NextResponse.json(
        { success: false, message: 'Thiếu thông tin lớp học' },
        { status: 400 }
      );
    }

    // Lấy token từ Authorization header do FE truyền lên
    const authHeader = request.headers.get('Authorization') || '';

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(authHeader ? { 'Authorization': authHeader } : {}),
    };

    const laravelRes = await fetch(`${LARAVEL_API}/admin/eligible-tutors`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ course }),
    });

    const data = await laravelRes.json();

    if (!laravelRes.ok) {
      return NextResponse.json(
        { success: false, message: data.message || 'Lỗi từ server' },
        { status: laravelRes.status }
      );
    }

    return NextResponse.json({
      success: true,
      data: data.data || data,
      total: (data.data || data)?.length || data.count || 0,
    });

  } catch (error) {
    console.error('❌ API eligible-tutors error:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
