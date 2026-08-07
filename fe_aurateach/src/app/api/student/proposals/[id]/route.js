import { NextResponse } from "next/server";

const API_BASE = "http://localhost:3007";

// PATCH: Student xác nhận/từ chối
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { student_id, response, reason } = body;

    // 1. Lấy proposal
    const proposalRes = await fetch(`${API_BASE}/proposals?proposal_id=${id}`);
    const proposals = await proposalRes.json();
    const proposal = proposals[0];

    if (!proposal) {
      return NextResponse.json({
        success: false,
        message: "Không tìm thấy đề xuất",
      }, { status: 404 });
    }

    if (proposal.status !== "pending" && proposal.status !== "tutor_approved") {
      return NextResponse.json({
        success: false,
        message: "Đề xuất đã được xử lý",
      }, { status: 400 });
    }

    if (!proposal.student_responses || !proposal.student_responses[student_id]) {
      return NextResponse.json({
        success: false,
        message: "Student không có trong đề xuất này",
      }, { status: 400 });
    }

    if (proposal.student_responses[student_id].status !== null) {
      return NextResponse.json({
        success: false,
        message: "Bạn đã xác nhận đề xuất này rồi",
      }, { status: 400 });
    }

    // 2. Xử lý response
    if (response === "approved") {
      proposal.student_responses[student_id].status = "approved";
      proposal.student_responses[student_id].at = new Date().toISOString();

      // Kiểm tra nếu đã đủ student approved
      const approvedStudents = Object.values(proposal.student_responses)
        .filter(s => s.status === "approved").length;

      const courseRes = await fetch(`${API_BASE}/courses_draft?course_id=${proposal.course_id}`);
      const courses = await courseRes.json();
      const course = courses[0];
      const minStudents = course?.min_students || 2;

      // Nếu đã đủ min students và tutor đã approved
      if (approvedStudents >= minStudents && proposal.tutor_response === "approved") {
        await createActiveClass(proposal);
        proposal.status = "fully_approved";
      }

    } else if (response === "rejected") {
      proposal.student_responses[student_id].status = "rejected";
      proposal.student_responses[student_id].at = new Date().toISOString();
      proposal.student_responses[student_id].reason = reason || null;

      // Kích hoạt cooldown 24h cho student
      const studentRes = await fetch(`${API_BASE}/users?user_id=${student_id}`);
      const students = await studentRes.json();
      const student = students[0];

      if (student) {
        const cooldownUntil = new Date();
        cooldownUntil.setHours(cooldownUntil.getHours() + 24);
        if (!student.preferences) student.preferences = {};
        student.preferences.cooldown_until = cooldownUntil.toISOString();

        await fetch(`${API_BASE}/users/${student.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ preferences: student.preferences }),
        });
      }

      // Kiểm tra số student còn lại
      const remainingStudents = Object.values(proposal.student_responses)
        .filter(s => s.status !== "rejected").length;

      const courseRes = await fetch(`${API_BASE}/courses_draft?course_id=${proposal.course_id}`);
      const courses = await courseRes.json();
      const course = courses[0];
      const minStudents = course?.min_students || 2;

      if (remainingStudents < minStudents) {
        proposal.status = "cancelled";
      }
    }

    // 3. Cập nhật proposal
    const updateRes = await fetch(`${API_BASE}/proposals/${proposal.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(proposal),
    });

    const updated = await updateRes.json();

    return NextResponse.json({
      success: true,
      message: response === "approved" ? "Đã đồng ý đề xuất" : "Đã từ chối đề xuất",
      data: updated,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error.message,
    }, { status: 500 });
  }
}

// Hàm tạo lớp active (giống với tutor)
async function createActiveClass(proposal) {
  try {
    const courseRes = await fetch(`${API_BASE}/courses_draft?course_id=${proposal.course_id}`);
    const courses = await courseRes.json();
    const course = courses[0];
    if (!course) return;

    const approvedStudents = Object.entries(proposal.student_responses)
      .filter(([_, s]) => s.status === "approved")
      .map(([id]) => id);

    const newCourse = {
      ...course,
      course_id: course.course_id,
      tutor_id: proposal.tutor_id,
      students: approvedStudents,
      status: "active",
      created_at: new Date().toISOString(),
    };

    await fetch(`${API_BASE}/courses_draft/${course.id}`, { method: "DELETE" });

    await fetch(`${API_BASE}/courses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newCourse),
    });

    for (const studentId of approvedStudents) {
      await fetch(`${API_BASE}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: `bk_${Date.now()}_${studentId}`,
          student_id: studentId,
          course_id: course.course_id,
          tutor_id: proposal.tutor_id,
          status: "confirmed",
          booking_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          notes: "Admin xếp lớp",
          payment_status: "unpaid",
          payment_amount: course.price_per_session * course.total_weeks,
          payment_method: null,
          transaction_id: null,
        }),
      });
    }

    const tutorRes = await fetch(`${API_BASE}/tutors?tutor_id=${proposal.tutor_id}`);
    const tutors = await tutorRes.json();
    const tutor = tutors[0];

    if (tutor) {
      const totalAmount = course.price_per_session * course.total_weeks * approvedStudents.length;
      const tutorEarning = Math.round(totalAmount * 0.65);
      tutor.pending_balance = (tutor.pending_balance || 0) + tutorEarning;
      tutor.total_earnings = (tutor.total_earnings || 0) + tutorEarning;

      await fetch(`${API_BASE}/tutors/${tutor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pending_balance: tutor.pending_balance,
          total_earnings: tutor.total_earnings,
        }),
      });
    }

  } catch (error) {
    console.error("Lỗi tạo lớp active:", error);
  }
}