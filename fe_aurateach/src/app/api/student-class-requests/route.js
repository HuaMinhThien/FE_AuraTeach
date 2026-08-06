import { NextResponse } from 'next/server';

// Mock sinh link Google Meet tự động từ Backend
function generateMeetLink() {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const segment = (len) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `https://meet.google.com/${segment(3)}-${segment(4)}-${segment(3)}`;
}

export async function POST(request) {
  try {
    const body = await request.json();

    // Tự động sinh link Google Meet nếu chưa có
    const meet_link = generateMeetLink();

    const newClassRequest = {
      request_id: `req-${Date.now()}`,
      student_id: body.student_id || "std-001",
      category_id: body.category_id,
      title: body.title,
      description: body.description,
      grade_level: body.grade_level,
      tutor_level: body.tutor_level,
      price_per_session: Number(body.price_per_session),
      max_students: Number(body.max_students),
      schedule_type: body.schedule_type,
      total_weeks: Number(body.total_weeks),
      start_date: body.start_date,
      schedule_days: body.schedule_days,
      start_time: body.start_time,
      end_time: body.end_time,
      meet_link: meet_link,
      status: "pending",
      created_at: new Date().toISOString()
    };

    // Trong môi trường localhost, trả về dữ liệu thành công kèm link Meet đã sinh
    return NextResponse.json({
      success: true,
      message: "Đăng yêu cầu tạo lớp thành công!",
      data: newClassRequest
    }, { status: 201 });

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: "Lỗi xử lý hệ thống",
      error: error.message
    }, { status: 500 });
  }
}