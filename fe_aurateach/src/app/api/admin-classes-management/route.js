import { NextResponse } from 'next/server';

const JSON_SERVER_URL = 'http://localhost:3007';

export async function GET() {
  try {
    const [resCourses, resTutors, resUsers, resConfirmations] = await Promise.all([
      fetch(`${JSON_SERVER_URL}/courses`, { cache: 'no-store' }),
      fetch(`${JSON_SERVER_URL}/tutors`, { cache: 'no-store' }),
      fetch(`${JSON_SERVER_URL}/users`, { cache: 'no-store' }),
      fetch(`${JSON_SERVER_URL}/lesson_confirmations`, { cache: 'no-store' }),
    ]);

    if (!resCourses.ok || !resTutors.ok || !resUsers.ok || !resConfirmations.ok) {
      return NextResponse.json(
        { success: false, message: 'Lỗi kết nối tới cơ sở dữ liệu' },
        { status: 500 }
      );
    }

    const courses = await resCourses.json();
    const tutors = await resTutors.json();
    const users = await resUsers.json();
    const confirmations = await resConfirmations.json();

    return NextResponse.json({
      success: true,
      data: { courses, tutors, users, confirmations },
    });
  } catch (error) {
    console.error('Lỗi tại API Route Admin Classes Management:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi máy chủ nội bộ' },
      { status: 500 }
    );
  }
}