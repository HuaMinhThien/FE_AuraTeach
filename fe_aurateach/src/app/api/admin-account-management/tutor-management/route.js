import { NextResponse } from 'next/server';

const BACKEND_URL = 'http://localhost:3007';

// 1. GET: Lấy danh sách gia sư tích hợp dữ liệu tổng hợp
export async function GET() {
  try {
    const [usersRes, tutorsRes] = await Promise.all([
      fetch(`${BACKEND_URL}/users`, { cache: 'no-store' }),
      fetch(`${BACKEND_URL}/tutors`, { cache: 'no-store' })
    ]);

    const users = await usersRes.json();
    const tutors = await tutorsRes.json();

    const tutorList = users
      .filter(u => u.role === 'tutor')
      .map(user => {
        const detail = tutors.find(t => t.user_id === user.user_id) || {};
        return { ...user, ...detail };
      });

    return NextResponse.json({ success: true, data: tutorList });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 2. PUT: Xử lý Khóa tài khoản (bảng users) HOẶC Duyệt hồ sơ (bảng tutors)
export async function PUT(request) {
  try {
    const { userId, tutorId, status, verificationStatus } = await request.json();

    // Trường hợp 1: Cập nhật Khóa/Mở khóa (Tương tác bảng /users)
    if (userId && status !== undefined) {
      const userRes = await fetch(`${BACKEND_URL}/users?user_id=${userId}`);
      const userData = await userRes.json();
      if (userData.length > 0) {
        await fetch(`${BACKEND_URL}/users/${userData[0].id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        });
      }
    }

    // Trường hợp 2: Duyệt hồ sơ Gia sư (Tương tác bảng /tutors)
    if (tutorId && verificationStatus !== undefined) {
      const tutorRes = await fetch(`${BACKEND_URL}/tutors?tutor_id=${tutorId}`);
      const tutorData = await tutorRes.json();
      if (tutorData.length > 0) {
        await fetch(`${BACKEND_URL}/tutors/${tutorData[0].id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ verification_status: verificationStatus })
        });
      }
    }

    return NextResponse.json({ success: true, message: "Cập nhật dữ liệu gia sư lên Backend thành công!" });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}