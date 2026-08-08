// src/app/api/admin/classes/cancel/route.js
import { NextResponse } from 'next/server';
import { tutorCancelClass } from '@/services/classSuggestionService';

export async function POST(request) {
  try {
    const { courseId, tutorId } = await request.json();

    if (!courseId || !tutorId) {
      return NextResponse.json(
        { success: false, message: 'Thiếu thông tin bắt buộc' },
        { status: 400 }
      );
    }

    const result = await tutorCancelClass(courseId, tutorId);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Đã hủy lớp và gửi lại đề xuất cho tutor khác'
      });
    } else {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('❌ API cancel error:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}