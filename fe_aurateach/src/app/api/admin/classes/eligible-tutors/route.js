// src/app/api/admin/classes/eligible-tutors/route.js
import { NextResponse } from 'next/server';
import { getEligibleTutors } from '@/services/classSuggestionService';

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

    const tutors = await getEligibleTutors(course);

    return NextResponse.json({
      success: true,
      data: tutors,
      total: tutors.length
    });
  } catch (error) {
    console.error('❌ API eligible-tutors error:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}