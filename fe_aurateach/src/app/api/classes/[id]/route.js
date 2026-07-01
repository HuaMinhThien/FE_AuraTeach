// src/app/api/classes/[id]/route.js
import { NextResponse } from "next/server";

export async function PATCH(request, { params }) {
  try {
    // 1. Sửa tại đây: Lấy chính xác thuộc tính id từ trong object params ra (hoặc await params nếu dùng Next.js 15)
    const { id: classId } = await params; 
    
    const body = await request.json(); // Nhận dữ liệu { status: "closed" } từ Client

    // 2. Gửi lệnh cập nhật tới JSON Server
    const resFromJsonServer = await fetch(`http://localhost:8000/api/courses/${classId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: body.status }),
    });

    if (!resFromJsonServer.ok) {
      return NextResponse.json(
        { success: false, message: "Không thể cập nhật trạng thái lớp học trên JSON Server." },
        { status: resFromJsonServer.status }
      );
    }

    const updatedData = await resFromJsonServer.json();

    return NextResponse.json({
      success: true,
      message: "Cập nhật trạng thái khóa lớp trên cơ sở dữ liệu thành công!",
      data: updatedData
    });

  } catch (error) {
    console.error("Lỗi xảy ra tại API Route PATCH:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi kết nối hoặc xử lý dữ liệu hệ thống phía server." }, 
      { status: 500 }
    );
  }
}