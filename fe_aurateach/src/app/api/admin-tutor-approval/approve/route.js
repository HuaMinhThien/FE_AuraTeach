import { NextResponse } from "next/server";
import { notificationService } from "@/services/notificationService";

const API_BASE = process.env.NEXT_PUBLIC_JSON_SERVER_URL || 'http://localhost:3007';

export async function POST(request) {
  try {
    const { userId, tutorId, teaching_levels, level } = await request.json();

    if (!userId || !tutorId) {
      return NextResponse.json(
        { success: false, message: "Thiếu thông tin userId hoặc tutorId" },
        { status: 400 }
      );
    }

    if (!teaching_levels || teaching_levels.length === 0) {
      return NextResponse.json(
        { success: false, message: "Vui lòng chọn ít nhất 1 cấp dạy cho gia sư" },
        { status: 400 }
      );
    }

    if (!level) {
      return NextResponse.json(
        { success: false, message: "Vui lòng chọn trình độ/cấp bậc cho gia sư" },
        { status: 400 }
      );
    }


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

    // Cập nhật tutor status thành approved, gán danh sách teaching_levels và gán level do Admin duyệt
    const updateRes = await fetch(`${API_BASE}/tutors/${tutor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        verification_status: "approved",
        teaching_levels: teaching_levels,
        level: level,
        rejection_reason: null
      })
    });

    if (!updateRes.ok) {
      throw new Error("Không thể cập nhật trạng thái");
    }

    // === GỬI THÔNG BÁO CHO TUTOR ===
    try {
      const userRes = await fetch(`${API_BASE}/users?user_id=${userId}`);
      const users = await userRes.json();
      const user = users[0];

      if (user) {
        await notificationService.notifyTutorApproval({
          tutor,
          user,
          status: 'approved',
          reason: null,
        });
      }
    } catch (notifError) {
      console.error("❌ Lỗi gửi thông báo duyệt tutor:", notifError);
    }


    return NextResponse.json({
      success: true,
      message: "Duyệt hồ sơ giảng viên thành công",
      data: {
        tutorId: tutorId,
        status: "approved",
        teaching_levels: teaching_levels,
        level: level
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
