// src/app/api/classes/[id]/route.js
import { NextResponse } from "next/server";

const API_BASE = "http://localhost:3007";

// PATCH: Cập nhật lớp học
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    console.log(`📡 PATCH /api/classes/${id}`);
    console.log("📝 Update data:", body);

    // Tìm course trong JSON Server
    const findRes = await fetch(`${API_BASE}/courses?course_id=${id}`, { cache: "no-store" });
    const courses = await findRes.json();
    const course = courses[0];

    if (!course) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy lớp học" },
        { status: 404 }
      );
    }

    // Cập nhật course
    const updateRes = await fetch(`${API_BASE}/courses/${course.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!updateRes.ok) {
      throw new Error("Không thể cập nhật lớp học");
    }

    const updatedCourse = await updateRes.json();

    return NextResponse.json({
      success: true,
      message: "Cập nhật thành công!",
      data: updatedCourse,
    });

  } catch (error) {
    console.error("❌ PATCH /api/classes/[id] error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || "Lỗi cập nhật" 
      },
      { status: error.status || 500 }
    );
  }
}

// GET: Lấy chi tiết lớp học
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const res = await fetch(`${API_BASE}/courses?course_id=${id}`, { cache: "no-store" });
    
    if (!res.ok) {
      return NextResponse.json(
        { success: false, message: "Không thể lấy thông tin lớp học" },
        { status: 500 }
      );
    }

    const courses = await res.json();
    const course = courses[0];

    if (!course) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy lớp học" },
        { status: 404 }
      );
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
      { status: error.status || 404 }
    );
  }
}