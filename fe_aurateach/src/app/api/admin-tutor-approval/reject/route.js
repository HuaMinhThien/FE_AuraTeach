import { NextResponse } from "next/server";
import { notificationService } from "@/services/notificationService";

const API_BASE = process.env.NEXT_PUBLIC_JSON_SERVER_URL || 'http://localhost:3007';

export async function POST(request) {
  try {
    const { userId, tutorId, reason } = await request.json();

    if (!userId || !tutorId) {
      return NextResponse.json(
        { success: false, message: "Thiếu thông tin userId hoặc tutorId" },
        { status: 400 }
      );
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập lý do từ chối" },
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
        { success: false, message: "Hồ sơ này đã được duyệt, không thể từ chối" },
        { status: 400 }
      );
    }

    // Cập nhật tutor status thành rejected
    const updateRes = await fetch(`${API_BASE}/tutors/${tutor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        verification_status: "rejected",
        rejection_reason: reason.trim()
      })
    });

    if (!updateRes.ok) {
      throw new Error("Không thể cập nhật trạng thái");
    }

    // === GỬI THÔNG BÁO CHO TUTOR ===
    try {
      // Lấy thông tin user của tutor
      const userRes = await fetch(`${API_BASE}/users?user_id=${userId}`);
      const users = await userRes.json();
      const user = users[0];

      if (user) {
        await notificationService.notifyTutorApproval({
          tutor,
          user,
          status: 'rejected',
          reason: reason.trim(),
        });
      }
    } catch (notifError) {
      console.error("❌ Lỗi gửi thông báo từ chối tutor:", notifError);
      // Không throw lỗi để không ảnh hưởng đến luồng chính
    }


    return NextResponse.json({
      success: true,
      message: "Đã từ chối hồ sơ giảng viên",
      data: {
        tutorId: tutorId,
        status: "rejected",
        reason: reason.trim()
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
