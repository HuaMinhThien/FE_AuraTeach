import { NextResponse } from "next/server";

const API_BASE = "http://localhost:3007";

// PATCH: Tutor xác nhận/từ chối
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { response, reason } = body;

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

    if (proposal.status !== "pending") {
      return NextResponse.json({
        success: false,
        message: "Đề xuất đã được xử lý",
      }, { status: 400 });
    }

    // 2. Xử lý response
    if (response === "approved") {
      proposal.tutor_response = "approved";
      proposal.tutor_response_at = new Date().toISOString();
      proposal.status = "tutor_approved";

      // Kiểm tra nếu đủ student approved
      const approvedStudents = Object.values(proposal.student_responses)
        .filter(s => s.status === "approved").length;

      // Lấy course để biết min_students
      const courseRes = await fetch(`${API_BASE}/courses_draft?course_id=${proposal.course_id}`);
      const courses = await courseRes.json();
      const course = courses[0];
      const minStudents = course?.min_students || 2;

      if (approvedStudents >= minStudents) {
        // Tạo lớp active
        await createActiveClass(proposal);
        proposal.status = "fully_approved";
      }

    } else if (response === "rejected") {
      proposal.tutor_response = "rejected";
      proposal.tutor_response_at = new Date().toISOString();
      proposal.tutor_reject_reason = reason || null;
      proposal.status = "cancelled";

      // Kích hoạt cooldown 24h cho tutor
      const tutorRes = await fetch(`${API_BASE}/users?user_id=${proposal.tutor_id}`);
      const tutors = await tutorRes.json();
      const tutor = tutors[0];

      if (tutor) {
        const cooldownUntil = new Date();
        cooldownUntil.setHours(cooldownUntil.getHours() + 24);
        if (!tutor.preferences) tutor.preferences = {};
        tutor.preferences.cooldown_until = cooldownUntil.toISOString();

        await fetch(`${API_BASE}/users/${tutor.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ preferences: tutor.preferences }),
        });
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

// Hàm tạo lớp active
async function createActiveClass(proposal) {
  try {
    // 1. Lấy course draft
    const courseRes = await fetch(`${API_BASE}/courses_draft?course_id=${proposal.course_id}`);
    const courses = await courseRes.json();
    const course = courses[0];
    if (!course) return;

    // 2. Lấy danh sách student đã approved
    const approvedStudents = Object.entries(proposal.student_responses)
      .filter(([_, s]) => s.status === "approved")
      .map(([id]) => id);

    // 3. Tạo course active
    const newCourse = {
      ...course,
      course_id: course.course_id,
      tutor_id: proposal.tutor_id,
      students: approvedStudents,
      status: "active",
      created_at: new Date().toISOString(),
    };

    // Xóa khỏi courses_draft
    await fetch(`${API_BASE}/courses_draft/${course.id}`, {
      method: "DELETE",
    });

    // Thêm vào courses
    await fetch(`${API_BASE}/courses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newCourse),
    });

    // 4. Tạo booking cho từng student
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

    // 5. Cộng ví tutor (phí sàn 35%)
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