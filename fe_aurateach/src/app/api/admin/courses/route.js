import { NextResponse } from "next/server";

const API_BASE = "http://localhost:3007";

// POST: Tạo lớp draft
export async function POST(request) {
  try {
    const body = await request.json();

    // Validate ngày bắt đầu
    const startDate = new Date(body.start_date);
    const today = new Date();
    const minStartDate = new Date(today);
    minStartDate.setDate(today.getDate() + 7);

    if (startDate < minStartDate) {
      return NextResponse.json({
        success: false,
        message: `Ngày bắt đầu phải cách hôm nay ít nhất 7 ngày. Ngày hợp lệ: ${minStartDate.toISOString().split('T')[0]}`,
      }, { status: 400 });
    }

    // Tạo course draft mới
    const newCourse = {
      course_id: `course_${Date.now()}`,
      title: body.title,
      category_id: body.category_id,
      level: body.level,
      description: body.description || "",
      price_per_session: Number(body.price_per_session),
      schedule_days: body.schedule_days || [],
      time_slot: body.time_slot || "18:00-20:00",
      start_date: body.start_date,
      end_date: body.end_date || null,
      total_weeks: Number(body.total_weeks) || 12,
      min_students: Number(body.min_students) || 2,
      max_students: Number(body.max_students) || 5,
      status: "draft",
      students: [],
      tutor_id: null,
      created_by: body.admin_id || "u-admin-1",
      created_at: new Date().toISOString(),
    };

    // Lưu vào JSON Server
    const res = await fetch(`${API_BASE}/courses_draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newCourse),
    });

    if (!res.ok) {
      throw new Error("Không thể tạo lớp học");
    }

    const data = await res.json();

    return NextResponse.json({
      success: true,
      message: "Tạo lớp thành công",
      data: data,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error.message,
    }, { status: 500 });
  }
}

// GET: Lấy danh sách course draft
export async function GET() {
  try {
    const res = await fetch(`${API_BASE}/courses_draft`);
    const data = await res.json();
    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error.message,
    }, { status: 500 });
  }
}