import { NextResponse } from "next/server";

const API_BASE = "http://localhost:3007";

// POST: Tạo đề xuất
export async function POST(request) {
  try {
    const body = await request.json();
    const { course_id, tutor_id, student_ids, admin_id } = body;

    // 1. Lấy thông tin course draft
    const courseRes = await fetch(`${API_BASE}/courses_draft?course_id=${course_id}`);
    const courses = await courseRes.json();
    const course = courses[0];

    if (!course) {
      return NextResponse.json({
        success: false,
        message: "Không tìm thấy lớp học",
      }, { status: 404 });
    }

    // 2. Kiểm tra tutor
    const tutorRes = await fetch(`${API_BASE}/users?user_id=${tutor_id}`);
    const tutors = await tutorRes.json();
    const tutor = tutors[0];

    if (!tutor || !tutor.preferences?.accept_proposals) {
      return NextResponse.json({
        success: false,
        message: "Tutor đã tắt nhận đề xuất",
      }, { status: 400 });
    }

    // 3. Kiểm tra giới hạn đề xuất/ngày của tutor
    const today = new Date().toISOString().split('T')[0];
    const allProposalsRes = await fetch(`${API_BASE}/proposals`);
    const allProposals = await allProposalsRes.json();

    const tutorProposalsToday = allProposals.filter(p => 
      p.tutor_id === tutor_id && 
      p.created_at?.startsWith(today) &&
      p.status === "pending"
    );

    if (tutorProposalsToday.length >= 3) {
      return NextResponse.json({
        success: false,
        message: "Tutor đã nhận đủ 3 đề xuất trong ngày hôm nay",
      }, { status: 400 });
    }

    // 4. Kiểm tra cooldown của tutor
    if (tutor.preferences?.cooldown_until) {
      const cooldownUntil = new Date(tutor.preferences.cooldown_until);
      if (new Date() < cooldownUntil) {
        return NextResponse.json({
          success: false,
          message: `Tutor đang trong thời gian chờ (còn ${Math.ceil((cooldownUntil - new Date()) / 3600000)} giờ)`,
        }, { status: 400 });
      }
    }

    // 5. Kiểm tra trùng giờ học của tutor
    const existingCoursesRes = await fetch(`${API_BASE}/courses?tutor_id=${tutor_id}&status=active`);
    const existingCourses = await existingCoursesRes.json();

    const hasConflict = existingCourses.some(c => {
      const commonDays = c.schedule_days?.filter(d => course.schedule_days?.includes(d)) || [];
      if (commonDays.length === 0) return false;
      return c.time_slot === course.time_slot;
    });

    if (hasConflict) {
      return NextResponse.json({
        success: false,
        message: "Tutor đã có lớp trùng giờ học này",
      }, { status: 400 });
    }

    // 6. Kiểm tra student
    const invalidStudents = [];
    const studentResponses = {};

    for (const studentId of student_ids) {
      const studentRes = await fetch(`${API_BASE}/users?user_id=${studentId}`);
      const students = await studentRes.json();
      const student = students[0];

      if (!student || !student.preferences?.accept_proposals) {
        invalidStudents.push(studentId);
        continue;
      }

      // Kiểm tra giới hạn 5 đề xuất/ngày của student
      const studentProposalsToday = allProposals.filter(p => 
        p.student_ids?.includes(studentId) &&
        p.created_at?.startsWith(today) &&
        p.status === "pending"
      );

      if (studentProposalsToday.length >= 5) {
        invalidStudents.push(studentId);
        continue;
      }

      // Kiểm tra cooldown của student
      if (student.preferences?.cooldown_until) {
        const cooldownUntil = new Date(student.preferences.cooldown_until);
        if (new Date() < cooldownUntil) {
          invalidStudents.push(studentId);
          continue;
        }
      }

      // Kiểm tra trùng giờ học của student
      const studentCoursesRes = await fetch(`${API_BASE}/courses?status=active`);
      const studentCourses = await studentCoursesRes.json();
      const studentHasConflict = studentCourses.some(c => 
        c.students?.includes(studentId) &&
        c.schedule_days?.some(d => course.schedule_days?.includes(d)) &&
        c.time_slot === course.time_slot
      );

      if (studentHasConflict) {
        invalidStudents.push(studentId);
        continue;
      }

      studentResponses[studentId] = { status: null, at: null };
    }

    if (invalidStudents.length > 0) {
      return NextResponse.json({
        success: false,
        message: `Một số student không hợp lệ: ${invalidStudents.join(', ')}`,
        invalidStudents,
      }, { status: 400 });
    }

    // 7. Tạo proposal
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 2);

    const newProposal = {
      proposal_id: `prop_${Date.now()}`,
      course_id,
      admin_id: admin_id || "u-admin-1",
      tutor_id,
      student_ids,
      status: "pending",
      student_responses: studentResponses,
      tutor_response: null,
      tutor_response_at: null,
      tutor_reject_reason: null,
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString(),
    };

    const res = await fetch(`${API_BASE}/proposals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newProposal),
    });

    if (!res.ok) {
      throw new Error("Không thể tạo đề xuất");
    }

    const data = await res.json();

    // 8. Cập nhật daily count cho tutor
    if (tutor.preferences) {
      tutor.preferences.daily_proposal_count = (tutor.preferences.daily_proposal_count || 0) + 1;
      tutor.preferences.daily_proposal_date = today;
      
      const tutorUpdateRes = await fetch(`${API_BASE}/users/${tutor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: tutor.preferences }),
      });
    }

    return NextResponse.json({
      success: true,
      message: "Gửi đề xuất thành công",
      data: data,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error.message,
    }, { status: 500 });
  }
}

// GET: Lấy danh sách đề xuất
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tutor_id = searchParams.get("tutor_id");
    const student_id = searchParams.get("student_id");

    let url = `${API_BASE}/proposals`;
    const params = new URLSearchParams();

    if (tutor_id) params.append("tutor_id", tutor_id);
    if (student_id) params.append("student_id", student_id);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const res = await fetch(url);
    const data = await res.json();

    // Sắp xếp mới nhất lên đầu
    const sorted = (data || []).sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    );

    return NextResponse.json({
      success: true,
      data: sorted,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error.message,
    }, { status: 500 });
  }
}