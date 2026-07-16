import { NextResponse } from "next/server";

const API_BASE = "http://localhost:3007";

export async function DELETE(request) {
  try {
    const { userId, tutorId } = await request.json();

    if (!userId || !tutorId) {
      return NextResponse.json(
        { success: false, message: "Thiếu thông tin userId hoặc tutorId" },
        { status: 400 }
      );
    }

    console.log(`🗑️ Delete tutor: userId=${userId}, tutorId=${tutorId}`);

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

    if (tutor.verification_status !== "rejected") {
      return NextResponse.json(
        { success: false, message: "Chỉ có thể xóa hồ sơ đã bị từ chối" },
        { status: 400 }
      );
    }

    // Lấy user hiện tại
    const userRes = await fetch(`${API_BASE}/users?user_id=${userId}`);
    const users = await userRes.json();
    const user = users[0];

    // Xóa tutor
    const deleteTutorRes = await fetch(`${API_BASE}/tutors/${tutor.id}`, {
      method: "DELETE"
    });

    if (!deleteTutorRes.ok) {
      throw new Error("Không thể xóa hồ sơ tutor");
    }

    // Xóa user nếu tồn tại
    if (user) {
      await fetch(`${API_BASE}/users/${user.id}`, {
        method: "DELETE"
      });
      console.log(`🗑️ Đã xóa user ${userId}`);
    }

    console.log(`🗑️ Đã xóa hoàn toàn hồ sơ tutor ${tutorId} và user ${userId}`);

    return NextResponse.json({
      success: true,
      message: "Đã xóa hồ sơ giảng viên và tài khoản liên quan",
      data: {
        tutorId: tutorId,
        userId: userId
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