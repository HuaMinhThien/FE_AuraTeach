// src/app/api/refund/[courseId]/route.js
import { NextResponse } from 'next/server';
import { refundStudents } from '@/services/classSuggestionService';

export async function POST(request, { params }) {
  try {
    const { courseId } = await params;
    
    if (!courseId) {
      return NextResponse.json(
        { success: false, message: 'Thiếu courseId' },
        { status: 400 }
      );
    }

    const result = await refundStudents(courseId);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Hoàn tiền thành công'
      });
    } else {
      return NextResponse.json(
        { success: false, message: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ Refund error:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}