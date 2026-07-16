// src/app/api/classes/[id]/route.js
import { NextResponse } from "next/server";
import laravelApi from "@/lib/laravelApi";

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    console.log(`📡 PATCH /api/classes/${id} -> Laravel API`);
    console.log("📝 Update data:", body);

    // Gọi Laravel API để cập nhật course
    const response = await laravelApi.patch(`/courses/${id}`, body);

    return NextResponse.json({
      success: true,
      message: "Cập nhật thành công!",
      data: response.data?.data || response.data,
    });

  } catch (error) {
    console.error("❌ PATCH /api/classes/[id] error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.response?.data?.message || "Lỗi cập nhật" 
      },
      { status: error.response?.status || 500 }
    );
  }
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const response = await laravelApi.get(`/courses/${id}`);

    return NextResponse.json({
      success: true,
      data: response.data?.data || response.data,
    });

  } catch (error) {
    console.error("❌ GET /api/classes/[id] error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.response?.data?.message || "Không tìm thấy khóa học" 
      },
      { status: error.response?.status || 404 }
    );
  }
}