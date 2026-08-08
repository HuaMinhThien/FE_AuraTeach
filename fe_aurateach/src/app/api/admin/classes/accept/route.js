// src/app/api/admin/classes/accept/route.js
import { NextResponse } from 'next/server';
import { acceptClass } from '@/services/classSuggestionService';

export async function POST(request) {
  try {
    const { courseId, tutorId } = await request.json();

    if (!courseId || !tutorId) {
      return NextResponse.json(
        { success: false, message: 'Thiếu thông tin bắt buộc' },
        { status: 400 }
      );
    }

    const result = await acceptClass(courseId, tutorId);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Nhận lớp thành công!',
        data: result.data
      });
    } else {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: result.alreadyAssigned ? 409 : 400 }
      );
    }
  } catch (error) {
    console.error('❌ API accept error:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}