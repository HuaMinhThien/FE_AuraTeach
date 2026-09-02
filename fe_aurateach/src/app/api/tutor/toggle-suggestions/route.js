// src/app/api/tutor/toggle-suggestions/route.js
import { NextResponse } from 'next/server';

const LARAVEL_API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// GET: Lấy trạng thái receive_suggestions của tutor từ Laravel backend
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Thiếu userId' },
        { status: 400 }
      );
    }

    console.log('📥 [toggle-suggestions GET] Calling Laravel API for user:', userId);

    // Gọi Laravel backend để lấy thông tin tutor
    const tutorsRes = await fetch(`${LARAVEL_API}/tutors?user_id=${userId}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!tutorsRes.ok) {
      throw new Error(`Laravel API returned ${tutorsRes.status}`);
    }

    const tutorsData = await tutorsRes.json();
    console.log('📋 Laravel response:', tutorsData);

    // Xử lý response từ Laravel
    let tutor = null;
    if (tutorsData.data && Array.isArray(tutorsData.data)) {
      tutor = tutorsData.data.find(t => t.user_id === userId);
    } else if (Array.isArray(tutorsData)) {
      tutor = tutorsData.find(t => t.user_id === userId);
    }

    if (!tutor) {
      console.warn('⚠️ Tutor not found for user_id:', userId);
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy gia sư' },
        { status: 404 }
      );
    }

    console.log('✅ Tutor found:', tutor.user_id, 'receive_suggestions:', tutor.receive_suggestions);

    // Normalize boolean value
    const normalizeBoolean = (value) => {
      if (value === undefined || value === null) return true;
      if (typeof value === 'boolean') return value;
      if (typeof value === 'number') return value !== 0;
      const str = String(value).trim().toLowerCase();
      return !['false', '0', 'no', 'off'].includes(str);
    };

    const acceptValue = normalizeBoolean(tutor.receive_suggestions);

    return NextResponse.json({
      success: true,
      accept_suggested_classes: acceptValue,
      receive_suggestions: acceptValue,
    });
  } catch (error) {
    console.error('❌ [toggle-suggestions GET] Error:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// PATCH: Cập nhật trạng thái receive_suggestions qua Laravel backend
export async function PATCH(request) {
  try {
    const payload = await request.json();
    const { userId, accept_suggested_classes, receive_suggestions } = payload;

    console.log('📤 [toggle-suggestions PATCH] Request payload:', payload);

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Thiếu userId' },
        { status: 400 }
      );
    }

    // Xác định giá trị mới
    const nextValue =
      accept_suggested_classes !== undefined
        ? accept_suggested_classes
        : receive_suggestions !== undefined
          ? receive_suggestions
          : true;

    console.log('🔄 Toggling to:', nextValue);

    // Gọi Laravel backend để cập nhật
    const token = request.headers.get('Authorization') || '';
    const response = await fetch(`${LARAVEL_API}/tutor/toggle-suggestions`, {
      method: 'PATCH',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': token } : {}),
      },
      body: JSON.stringify({
        userId: userId,
        receive_suggestions: nextValue,
        accept_suggested_classes: nextValue,
      }),
    });

    const responseData = await response.json();
    console.log('✅ [toggle-suggestions PATCH] Laravel response:', responseData);

    if (!response.ok) {
      throw new Error(responseData.message || `Laravel API returned ${response.status}`);
    }

    return NextResponse.json({
      success: true,
      message: responseData.message || (nextValue
        ? 'Đã bật nhận lớp đề xuất từ Admin'
        : 'Đã tắt nhận lớp đề xuất từ Admin'),
      accept_suggested_classes: nextValue,
      receive_suggestions: nextValue,
    });
  } catch (error) {
    console.error('❌ [toggle-suggestions PATCH] Error:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
