import { NextResponse } from "next/server";

const API_BASE = "http://localhost:3007";

export async function POST(request) {
  try {
    const { userId, tutorId } = await request.json();

    if (!userId || !tutorId) {
      return NextResponse.json(
        { success: false, message: "Thiếu thông tin userId hoặc tutorId" },
        { status: 400 }
      );
    }

    console.log(`✅ Approve tutor: userId=${userId}, tutorId=${tutorId}`);

    // Lấy tutor hiện tại
    const tutorRes = await fetch(`${API_BASE}/tutors?tutor_id=${tutorId}`);
    const tutors = await tutorRes.json();
    const tutor = tutors[0];

    if (!tutor) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy hồ sơ giảng viên" },
        { status: 404 }
      );
    }

    if (tutor.verification_status === "approved") {
      return NextResponse.json(
        { success: false, message: "Hồ sơ này đã được duyệt trước đó" },
        { status: 400 }
      );
    }

    // Cập nhật tutor status thành approved
    const updateRes = await fetch(`${API_BASE}/tutors/${tutor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        verification_status: "approved",
        rejection_reason: null
      })
    });

    if (!updateRes.ok) {
      throw new Error("Không thể cập nhật trạng thái");
    }

    console.log(`✅ Tutor ${tutorId} đã được duyệt thành công`);

    return NextResponse.json({
      success: true,
      message: "Duyệt hồ sơ giảng viên thành công",
      data: {
        tutorId: tutorId,
        status: "approved"
      }
    });

  } catch (error) {
    console.error("❌ Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi server" },
      { status: 500 }
    );
  }
}