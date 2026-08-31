import { NextResponse } from 'next/server';

const JSON_SERVER_URL = 'http://localhost:3007';

// Bắt buộc không cache — tránh lấy dữ liệu điểm danh cũ
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const [
      resCourses,
      resTutors,
      resUsers,
      resCategories,
      resStudents,
      resClassSessions,
      resSessionAttendance,
    ] = await Promise.all([
      fetch(`${JSON_SERVER_URL}/courses`, { cache: 'no-store' }),
      fetch(`${JSON_SERVER_URL}/tutors`, { cache: 'no-store' }),
      fetch(`${JSON_SERVER_URL}/users`, { cache: 'no-store' }),
      fetch(`${JSON_SERVER_URL}/categories`, { cache: 'no-store' }),
      fetch(`${JSON_SERVER_URL}/students`, { cache: 'no-store' }).catch(() => null),
      fetch(`${JSON_SERVER_URL}/class_sessions`, { cache: 'no-store' }).catch(() => null),
      fetch(`${JSON_SERVER_URL}/session_attendance`, { cache: 'no-store' }).catch(() => null),
    ]);

    if (!resCourses.ok || !resTutors.ok || !resUsers.ok || !resCategories.ok) {
      return NextResponse.json(
        { success: false, message: 'Lỗi kết nối tới cơ sở dữ liệu' },
        { status: 500 }
      );
    }

    const courses = await resCourses.json();
    const tutors = await resTutors.json();
    const users = await resUsers.json();
    const categories = await resCategories.json();
    const students = resStudents && resStudents.ok ? await resStudents.json() : [];
    const rawClassSessions = resClassSessions && resClassSessions.ok ? await resClassSessions.json() : [];
    const session_attendance = resSessionAttendance && resSessionAttendance.ok
      ? await resSessionAttendance.json()
      : [];

    const class_sessions = rawClassSessions.map((session) => {
      const rawDate = session.actual_date || session.session_date;
      if (!rawDate) return session;

      const dateObj = new Date(rawDate);
      if (isNaN(dateObj.getTime())) return session;

      const day = String(dateObj.getDate()).padStart(2, '0');
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const year = dateObj.getFullYear();
      const formatted = `${day}/${month}/${year}`;

      return {
        ...session,
        formatted_date: formatted,
        session_date: session.session_date || formatted,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        courses,
        tutors,
        users,
        categories,
        students,
        class_sessions,
        session_attendance,
      },
    });
  } catch (error) {
    console.error('Lỗi tại API Route Admin Classes Management:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi máy chủ nội bộ' },
      { status: 500 }
    );
  }
}