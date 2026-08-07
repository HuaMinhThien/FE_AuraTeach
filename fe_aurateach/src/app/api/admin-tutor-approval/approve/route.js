import { NextResponse } from "next/server";
import notificationService from "@/services/notificationService";

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
          status: 'approved',
          reason: null,
        });
        console.log(`📬 Đã gửi thông báo duyệt tutor cho ${user.email}`);
      }
    } catch (notifError) {
      console.error("❌ Lỗi gửi thông báo duyệt tutor:", notifError);
      // Không throw lỗi để không ảnh hưởng đến luồng chính
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