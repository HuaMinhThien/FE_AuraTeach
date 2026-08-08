// src/app/api/tutor/suggestions/route.js
import { NextResponse } from 'next/server';

const API_BASE = 'http://localhost:3007';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tutorId = searchParams.get('tutorId');

    if (!tutorId) {
      return NextResponse.json(
        { success: false, message: 'Thiếu tutorId' },
        { status: 400 }
      );
    }

    console.log('📡 [Tutor Suggestions] Received ID:', tutorId);

    // ✅ Quan trọng: Map user_id → tutor_id (vì cookie lưu user_id, nhưng class_suggestions lưu tutor_id)
    const tutorsRes = await fetch(`${API_BASE}/tutors`);
    const tutors = await tutorsRes.json();
    const matchedTutor = tutors.find(t => t.tutor_id === tutorId || t.user_id === tutorId);
    const actualTutorId = matchedTutor ? matchedTutor.tutor_id : tutorId;

    console.log('📡 [Tutor Suggestions] Mapped to tutor_id:', actualTutorId);

    // 1. Lấy tất cả suggestions của tutor này
    const sugRes = await fetch(
      `${API_BASE}/class_suggestions?tutor_id=${actualTutorId}&status=pending`
    );
    const suggestions = await sugRes.json();

    console.log('📋 [Tutor Suggestions] Found suggestions:', suggestions.length);

    // 2. Lấy thông tin course cho từng suggestion
    const result = [];
    for (const sug of suggestions) {
      const courseRes = await fetch(`${API_BASE}/courses?course_id=${sug.course_id}`);
      const courses = await courseRes.json();
      const course = courses[0];

      if (course && course.status === 'pending_tutor' && !course.tutor_id) {
        // Lấy category name
        const catRes = await fetch(`${API_BASE}/categories?category_id=${course.category_id}`);
        const categories = await catRes.json();
        const category = categories[0];

        result.push({
          ...course,
          suggestion_id: sug.id,
          suggested_at: sug.suggested_at,
          category_name: category?.category_name || 'Chưa phân loại'
        });
      }
    }

    console.log('✅ [Tutor Suggestions] Returning:', result.length, 'classes');

    return NextResponse.json({
      success: true,
      data: result,
      total: result.length
    });
  } catch (error) {
    console.error('❌ [Tutor Suggestions] Lỗi:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}