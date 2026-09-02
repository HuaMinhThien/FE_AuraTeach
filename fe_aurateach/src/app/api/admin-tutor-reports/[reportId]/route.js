// src/app/api/admin-tutor-reports/[reportId]/route.js
import { NextResponse } from "next/server";
import { notificationService } from "@/services/notificationService";

const API_BASE = process.env.NEXT_PUBLIC_JSON_SERVER_URL || 'http://localhost:3007';

// PUT: Cập nhật trạng thái báo cáo
export async function PUT(request, { params }) {
  try {
    const { reportId } = params;
    const body = await request.json();
    const { status, adminNote } = body;

    if (!status) {
      return NextResponse.json(
        { success: false, message: "Thiếu trạng thái" },
        { status: 400 }
      );
    }

    // Lấy báo cáo hiện tại
    const reportRes = await fetch(`${API_BASE}/reports/${reportId}`);
    if (!reportRes.ok) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy báo cáo" },
        { status: 404 }
      );
    }

    const existingReport = await reportRes.json();

    // Lấy thông tin student (người báo cáo)
    const studentRes = await fetch(`${API_BASE}/users?user_id=${existingReport.studentId}`);
    const students = await studentRes.json();
    const student = students[0] || null;

    // Lấy thông tin tutor để hiển thị tên trong email
    const tutorRes = await fetch(`${API_BASE}/tutors?tutor_id=${existingReport.tutorId}`);
    const tutors = await tutorRes.json();
    const tutor = tutors[0] || null;
    const tutorUserRes = await fetch(`${API_BASE}/users?user_id=${tutor?.user_id}`);
    const tutorUsers = await tutorUserRes.json();
    const tutorUser = tutorUsers[0] || null;
    const tutorName = tutorUser?.full_name || 'gia sư';

    // Cập nhật báo cáo
    const updatedReport = {
      ...existingReport,
      status,
      adminNote: adminNote || existingReport.adminNote || "",
      updatedAt: new Date().toISOString(),
      resolvedAt: status === "resolved" || status === "rejected" ? new Date().toISOString() : null,
    };

    const updateRes = await fetch(`${API_BASE}/reports/${reportId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedReport),
    });

    if (!updateRes.ok) {
      throw new Error("Không thể cập nhật báo cáo");
    }

    // === GỬI THÔNG BÁO CHO HỌC VIÊN ===
    try {
      if (student && (status === 'resolved' || status === 'rejected')) {
        await notificationService.notifyReportStatus({
          student,
          report: existingReport,
          status,
          tutorName,
        });
        console.log(`📬 Đã gửi thông báo xử lý báo cáo cho học viên`);
      }    } catch (notifError) {
      console.error("❌ Lỗi gửi thông báo xử lý báo cáo:", notifError);
    }

    // Tạo thông báo in-app cho học viên (nếu chưa có trong notifyReportStatus)
    if (student) {
      const isResolved = status === 'resolved';
      const notification = {
        id: `notif_report_update_${Date.now()}`,
        receiver_id: existingReport.studentId,
        receiver_role: "student",
        type: "report_update",
        title: isResolved ? '✅ Báo cáo của bạn đã được giải quyết' : '❌ Báo cáo của bạn đã bị từ chối',
        message: isResolved 
          ? `Báo cáo của bạn về gia sư ${tutorName} đã được giải quyết.` 
          : `Báo cáo của bạn về gia sư ${tutorName} đã bị từ chối.`,
        related_id: reportId,
        related_type: "report",
        is_read: false,
        created_at: new Date().toISOString(),
      };

      await fetch(`${API_BASE}/notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notification),
      });
    }

    return NextResponse.json({
      success: true,
      message: "Cập nhật báo cáo thành công",
      data: updatedReport,
    });
  } catch (error) {
    console.error("❌ Error updating report:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// DELETE: Xóa báo cáo
export async function DELETE(request, { params }) {
  try {
    const { reportId } = params;

    const deleteRes = await fetch(`${API_BASE}/reports/${reportId}`, {
      method: "DELETE",
    });

    if (!deleteRes.ok) {
      throw new Error("Không thể xóa báo cáo");
    }

    return NextResponse.json({
      success: true,
      message: "Xóa báo cáo thành công",
    });
  } catch (error) {
    console.error("❌ Error deleting report:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}