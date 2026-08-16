import { NextResponse } from 'next/server';

const JSON_SERVER_URL = 'http://localhost:3007';

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

    if (!resCourses.ok || !resTutors.ok || !resUsers.ok || !resCategories.ok || !resStudents.ok) {
      return NextResponse.json(
        { success: false, message: 'Lỗi kết nối tới cơ sở dữ liệu' },
        { status: 500 }
      );
    }

    const courses = await resCourses.json();
    const tutors = await resTutors.json();
    const users = await resUsers.json();
    const categories = await resCategories.json();
    const students = await resStudents.json();
    const rawClassSessions = resClassSessions && resClassSessions.ok ? await resClassSessions.json() : [];
    const session_attendance = resSessionAttendance && resSessionAttendance.ok ? await resSessionAttendance.json() : [];

    // Định dạng lại ngày tháng năm (DD/MM/YYYY) cho các buổi học
    const class_sessions = rawClassSessions.map((session) => {
      if (!session.session_date) return session;
      const dateObj = new Date(session.session_date);
      if (isNaN(dateObj.getTime())) return session;

      const day = String(dateObj.getDate()).padStart(2, '0');
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const year = dateObj.getFullYear();

      return {
        ...session,
        formatted_date: `${day}/${month}/${year}`,
        session_date: `${day}/${month}/${year}`,
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