// src/app/api/tutor/toggle-suggestions/route.js
import { NextResponse } from 'next/server';

const API_BASE = 'http://localhost:3007';

// GET: Lấy trạng thái accept_suggested_classes của tutor
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

    const tutorsRes = await fetch(`${API_BASE}/tutors`);
    const tutors = await tutorsRes.json();
    const tutor = tutors.find(t => t.user_id === userId || t.tutor_id === userId);

    if (!tutor) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy gia sư' },
        { status: 404 }
      );
    }

    // Mặc định bật nếu chưa có field này
    const accept = tutor.accept_suggested_classes !== false;

    return NextResponse.json({ success: true, accept_suggested_classes: accept });
  } catch (error) {
    console.error('❌ [toggle-suggestions GET] Lỗi:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// PATCH: Cập nhật trạng thái accept_suggested_classes
export async function PATCH(request) {
  try {
    const { userId, accept_suggested_classes } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Thiếu userId' },
        { status: 400 }
      );
    }

    const tutorsRes = await fetch(`${API_BASE}/tutors`);
    const tutors = await tutorsRes.json();
    const tutor = tutors.find(t => t.user_id === userId || t.tutor_id === userId);

    if (!tutor) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy gia sư' },
        { status: 404 }
      );
    }

    const tutorDbId = tutor.id;

    await fetch(`${API_BASE}/tutors/${tutorDbId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accept_suggested_classes,
        receive_suggestions: accept_suggested_classes, // đồng bộ field cũ
      }),
    });

    // Gửi thông báo in-app nếu tutor TẮT nhận lớp đề xuất
    if (accept_suggested_classes === false) {
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await fetch(`${API_BASE}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: notifId,
          receiver_id: userId,
          receiver_role: 'tutor',
          type: 'system',
          title: '🔕 Đã tắt nhận lớp đề xuất',
          message: 'Bạn đã tắt chức năng nhận lớp đề xuất từ Admin. Admin sẽ không gợi ý lớp học mới cho bạn cho đến khi bạn bật lại.',
          related_id: null,
          related_type: null,
          is_read: false,
          created_at: new Date().toISOString(),
        }),
      });
    }

    return NextResponse.json({
      success: true,
      message: accept_suggested_classes
        ? 'Đã bật nhận lớp đề xuất từ Admin'
        : 'Đã tắt nhận lớp đề xuất từ Admin',
      accept_suggested_classes,
    });
  } catch (error) {
    console.error('❌ [toggle-suggestions PATCH] Lỗi:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
