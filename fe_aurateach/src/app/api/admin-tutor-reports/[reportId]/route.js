// src/app/api/admin-tutor-reports/[reportId]/route.js
import { NextResponse } from "next/server";

const API_BASE = "http://localhost:3007";

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

    // Tạo thông báo cho học viên
    const notification = {
      id: `notif_report_update_${Date.now()}`,
      receiver_id: existingReport.studentId,
      receiver_role: "student",
      type: "report_update",
      title: `📋 Cập nhật báo cáo của bạn`,
      message: `Báo cáo của bạn đã được ${status === "resolved" ? "giải quyết" : status === "rejected" ? "từ chối" : "đang xem xét"}`,
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