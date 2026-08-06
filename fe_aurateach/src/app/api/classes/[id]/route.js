// src/app/api/classes/[id]/route.js
import { NextResponse } from "next/server";

const API_BASE = 'http://localhost:3007';

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    console.log(`📡 PATCH /api/classes/${id}`);
    console.log("📝 Update data:", body);

    // Gọi JSON Server để cập nhật course
    const response = await fetch(`${API_BASE}/courses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error('Không thể cập nhật khóa học');
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      message: "Cập nhật thành công!",
      data: data,
    });

  } catch (error) {
    console.error("❌ PATCH /api/classes/[id] error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || "Lỗi cập nhật" 
      },
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const response = await fetch(`${API_BASE}/courses?course_id=${id}`, { cache: 'no-store' });
    const data = await response.json();
    const course = Array.isArray(data) ? data[0] : data;

    if (!course) {
      return NextResponse.json({
        success: false,
        message: "Không tìm thấy khóa học",
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: course,
    });

  } catch (error) {
    console.error("❌ GET /api/classes/[id] error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || "Không tìm thấy khóa học" 
      },
      { status: 404 }
    );
  }
}
