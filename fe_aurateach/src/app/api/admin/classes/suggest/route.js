// src/app/api/admin/classes/suggest/route.js
import { NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_JSON_SERVER_URL || 'http://localhost:3007';

export async function POST(request) {
  try {
    const { courseId, tutorIds } = await request.json();

    if (!courseId || !tutorIds || tutorIds.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Thiếu thông tin bắt buộc' },
        { status: 400 }
      );
    }


    // 1. Lấy course hiện tại
    const courseRes = await fetch(`${API_BASE}/courses?course_id=${courseId}`);
    const courses = await courseRes.json();
    const course = courses[0];

    if (!course) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy lớp học' },
        { status: 404 }
      );
    }

    // 2. ✅ QUAN TRỌNG: CHỈ CẬP NHẬT suggested_tutors, KHÔNG GÁN TUTOR
    // Tutor chỉ được gán khi bấm "Nhận lớp" ở trang /proposed-class
    const suggestedTutors = course.suggested_tutors || [];
    const newSuggested = [...new Set([...suggestedTutors, ...tutorIds])];


    // ✅ CHỈ CẬP NHẬT suggested_tutors, GIỮ NGUYÊN tutor_id = null
    await fetch(`${API_BASE}/courses/${course.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        suggested_tutors: newSuggested,
        status: 'pending_tutor'  // ✅ VẪN GIỮ pending_tutor
        // ⚠️ KHÔNG set tutor_id
      })
    });

    // 3. Lưu lịch sử gửi đề xuất cho từng tutor
    const usersRes = await fetch(`${API_BASE}/users`);
    const users = await usersRes.json();

    for (const tutorId of tutorIds) {
      // Kiểm tra xem đã gửi cho tutor này chưa
      const existingRes = await fetch(
        `${API_BASE}/class_suggestions?course_id=${courseId}&tutor_id=${tutorId}`
      );
      const existing = await existingRes.json();

      if (existing.length === 0) {
        const suggestion = {
          id: `sug_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          course_id: courseId,
          tutor_id: tutorId,
          suggested_at: new Date().toISOString(),
          status: 'pending'
        };


        await fetch(`${API_BASE}/class_suggestions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(suggestion)
        });
      }

      // Gửi thông báo cho tutor
      const tutorRes = await fetch(`${API_BASE}/tutors?tutor_id=${tutorId}`);
      const tutors = await tutorRes.json();
      const tutor = tutors[0];
      const user = users.find(u => u.user_id === tutor?.user_id);

      if (user) {
        const notification = {
          id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          receiver_id: user.user_id,
          receiver_role: 'tutor',
          type: 'system',
          title: '📩 Đề xuất lớp học mới',
          message: `Admin đã tạo lớp "${course.title}" và đề xuất bạn nhận dạy. Hãy vào trang "Đề xuất lớp học" để xem chi tiết.`,
          related_id: courseId,
          related_type: 'class_suggestion',
          is_read: false,
          created_at: new Date().toISOString()
        };

        await fetch(`${API_BASE}/notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(notification)
        });
      }
    }


    return NextResponse.json({
      success: true,
      message: `Đã gửi đề xuất cho ${tutorIds.length} tutor`,
      sentTo: tutorIds.length
    });
  } catch (error) {
    console.error('❌ [Suggest] Lỗi:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
