// src/app/api/admin-tutor-reports/route.js
import { NextResponse } from "next/server";

const API_BASE = "http://localhost:3007";

// GET: Lấy danh sách báo cáo
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const tutorId = searchParams.get("tutorId");

    let url = `${API_BASE}/reports`;
    const params = new URLSearchParams();

    if (status) params.append("status", status);
    if (tutorId) params.append("tutorId", tutorId);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json(
        { success: false, message: "Không thể lấy danh sách báo cáo" },
        { status: 500 }
      );
    }

    const reports = await res.json();
    
    // Lấy tất cả users và tutors để map
    const [usersRes, tutorsRes, coursesRes] = await Promise.all([
      fetch(`${API_BASE}/users`),
      fetch(`${API_BASE}/tutors`),
      fetch(`${API_BASE}/courses`)
    ]);

    const users = usersRes.ok ? await usersRes.json() : [];
    const tutors = tutorsRes.ok ? await tutorsRes.json() : [];
    const courses = coursesRes.ok ? await coursesRes.json() : [];

    // ✅ Enrich dữ liệu báo cáo
    const enrichedReports = reports.map((report) => {
      // Tìm tutor từ tutor_id
      const tutorProfile = tutors.find(
        (t) => t.tutor_id === report.tutorId || t.id === report.tutorId
      );
      
      // Tìm user của tutor
      let tutorUser = null;
      if (tutorProfile) {
        tutorUser = users.find(
          (u) => u.user_id === tutorProfile.user_id || u.id === tutorProfile.user_id
        );
      }

      // Tìm student từ studentId
      const studentUser = users.find(
        (u) => u.user_id === report.studentId || u.id === report.studentId
      );

      // Tìm course từ courseId
      const course = courses.find(
        (c) => c.course_id === report.courseId || c.id === report.courseId
      );

      return {
        ...report,
        tutor: tutorUser || null,
        student: studentUser || null,
        course: course || null,
      };
    });

    return NextResponse.json({
      success: true,
      data: enrichedReports,
    });
  } catch (error) {
    console.error("❌ Error fetching reports:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// POST: Tạo báo cáo mới
export async function POST(request) {
  try {
    const body = await request.json();
    const { tutorId, studentId, courseId, reason, description, evidence, reportedBy } = body;

    if (!tutorId || !studentId || !courseId || !reason) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập đầy đủ thông tin" },
        { status: 400 }
      );
    }

    // Kiểm tra xem report đã tồn tại chưa (tránh spam)
    const checkRes = await fetch(`${API_BASE}/reports?tutorId=${tutorId}&studentId=${studentId}&courseId=${courseId}&status=pending`);
    const existingReports = await checkRes.json();
    
    if (existingReports.length > 0) {
      return NextResponse.json(
        { success: false, message: "Bạn đã có báo cáo đang chờ xử lý cho lớp học này" },
        { status: 400 }
      );
    }

    const newReport = {
      id: `report_${Date.now()}`,
      tutorId,
      studentId,
      courseId,
      reason,
      description: description || "",
      evidence: evidence || null,
      reportedBy: reportedBy || studentId,
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const res = await fetch(`${API_BASE}/reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newReport),
    });

    if (!res.ok) {
      throw new Error("Không thể tạo báo cáo");
    }

    const createdReport = await res.json();

    // Tạo thông báo cho Admin
    const notification = {
      id: `notif_report_${Date.now()}`,
      receiver_id: "u-admin-1",
      receiver_role: "admin",
      type: "report",
      title: "📋 Báo cáo gia sư mới",
      message: `Học viên đã gửi báo cáo về gia sư. Lý do: ${reason}`,
      related_id: createdReport.id,
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
      message: "Gửi báo cáo thành công!",
      data: createdReport,
    });
  } catch (error) {
    console.error("❌ Error creating report:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}