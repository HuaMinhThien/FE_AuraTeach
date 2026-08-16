// src/app/api/classes/route.js
import { NextResponse } from "next/server";

const API_BASE = "http://localhost:3007";

// Helper generate room id
function generateRoomId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 1. GET: Lấy danh sách lớp học & Populate thông tin học viên
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "6", 10);
    const status = searchParams.get("status") || "all";
    const search = searchParams.get("search") || "";
    const tutorId = searchParams.get("tutor_id") || "";

    // Fetch courses, users, tutors đồng thời từ json-server
    const [coursesRes, usersRes, tutorsRes] = await Promise.all([
      fetch(`${API_BASE}/courses`, { cache: "no-store" }),
      fetch(`${API_BASE}/users`, { cache: "no-store" }),
      fetch(`${API_BASE}/tutors`, { cache: "no-store" }),
    ]);

    if (!coursesRes.ok || !usersRes.ok || !tutorsRes.ok) {
      throw new Error("Không thể lấy dữ liệu từ Server");
    }

    let courses = await coursesRes.json();
    const users = await usersRes.json();
    const tutors = await tutorsRes.json();

    const userMap = new Map(users.map((u) => [u.user_id, u]));

    // Lọc theo tutor_id nếu có (hỗ trợ map user_id → tutor_id khi client gửi user_id từ cookie)
    if (tutorId) {
      const matchedTutor = tutors.find(t => t.tutor_id === tutorId || t.user_id === tutorId);
      const actualTutorId = matchedTutor ? matchedTutor.tutor_id : tutorId;
      courses = courses.filter((c) => c.tutor_id === actualTutorId);
    }

    let filteredCourses = courses;

    if (status !== "all") {
      filteredCourses = filteredCourses.filter((c) => c.status === status);
    }

    if (search.trim() !== "") {
      const query = search.toLowerCase().trim();
      filteredCourses = filteredCourses.filter((c) => {
        const matchClassName = c.title?.toLowerCase().includes(query);
        const matchStudentName = (c.students || []).some((studentId) => {
          const user = userMap.get(studentId);
          return user?.full_name?.toLowerCase().includes(query);
        });
        return matchClassName || matchStudentName;
      });
    }

    // Sắp xếp lớp mới tạo gần nhất lên đầu (trang 1)
    filteredCourses.sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA; // mới nhất trước
    });

    const totalItems = filteredCourses.length;
    const totalPages = Math.ceil(totalItems / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedCourses = filteredCourses.slice(startIndex, startIndex + limit);

    const mappedData = paginatedCourses.map((course) => {
      const detailedStudents = (course.students || []).map((studentId) => {
        const studentUser = userMap.get(studentId);
        return {
          student_id: studentId,
          full_name: studentUser ? studentUser.full_name : "Học sinh chưa cập nhật",
          email: studentUser ? studentUser.email : "Chưa có email",
          phone: studentUser ? studentUser.phone : "",
          avatar: studentUser ? studentUser.avatar : "",
        };
      });

      return {
        class_id: course.course_id || course.id,
        class_name: course.title,
        total_weeks: course.total_weeks,
        start_date: course.start_date,
        end_date: course.end_date,
        status: course.status,
        max_students: course.max_students,
        min_students: course.min_students || 2,
        permanent_room_url: course.permanent_room_url,
        schedule_days: course.schedule_days,
        time_slot: course.time_slot,
        students: detailedStudents,
        tutor_id: course.tutor_id,
        created_by: course.created_by,
        tutor_assigned_at: course.tutor_assigned_at,
        suggested_tutors: course.suggested_tutors || [],
        original_tutor: course.original_tutor || null,
        cancelled_at: course.cancelled_at || null,
        cancelled_reason: course.cancelled_reason || null,
        created_at: course.created_at,
      };
    });

    return NextResponse.json({
      success: true,
      data: mappedData,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalItems: totalItems,
      },
    });
  } catch (error) {
    console.error("❌ GET /api/classes error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi tải danh sách lớp học" },
      { status: 500 }
    );
  }
}

// 2. POST: Xử lý Tạo Lớp Học Mới (Hỗ trợ cả Tutor và Admin)
export async function POST(request) {
  try {
    const body = await request.json();

    // Kiểm tra nếu là Admin tạo lớp (có field created_by)
    const isAdminCreating = body.created_by && body.created_by.startsWith('admin');

    // Tạo course_id
    const courseId = body.course_id || `course_${Date.now()}`;

    // Xác định status mặc định
    let defaultStatus = 'active';
    if (isAdminCreating) {
      defaultStatus = 'pending_tutor'; // Admin tạo → chờ Tutor nhận
    } else if (body.status) {
      defaultStatus = body.status;
    }

    // Tạo permanent_room_url nếu chưa có
    const roomUrl = body.permanent_room_url || `https://meet.google.com/${generateRoomId()}`;

    const newCourse = {
      course_id: courseId,
      tutor_id: body.tutor_id || null,
      title: body.class_name || body.title,
      category_id: body.category_id,
      level: body.level,
      description: body.description || "",
      max_students: body.max_students,
      min_students: body.min_students || 0,
      price_per_session: body.price_per_session,
      start_date: body.start_date,
      end_date: body.end_date,
      total_weeks: body.total_weeks,
      schedule_days: body.schedule_days || [],
      time_slot: body.time_slot || `${body.start_time || '07:00'}-${body.end_time || '09:00'}`,
      thumbnail: body.thumbnail || body.image || '/img/class/default-class-1.jpg',
      permanent_room_url: roomUrl,
      status: defaultStatus,
      students: body.students || [],
      created_by: body.created_by || null,
      tutor_assigned_at: body.tutor_assigned_at || null,
      suggested_tutors: body.suggested_tutors || [],
      original_tutor: body.original_tutor || null,
      cancelled_at: body.cancelled_at || null,
      cancelled_reason: body.cancelled_reason || null,
      created_at: body.created_at || new Date().toISOString(),
    };

    // Gửi dữ liệu tạo khóa học mới sang json-server
    const res = await fetch(`${API_BASE}/courses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newCourse),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Không thể lưu lớp học: ${errorText}`);
    }

    const createdData = await res.json();

    // Nếu là Admin tạo lớp, trả về thêm thông tin để gửi đề xuất
    if (isAdminCreating) {
      return NextResponse.json({
        success: true,
        message: "Tạo lớp học thành công! Đang chờ Tutor nhận.",
        data: createdData,
        isAdminCreated: true,
        nextStep: "Gửi đề xuất cho Tutor phù hợp",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Tạo lớp học thành công!",
      data: createdData,
    });
  } catch (error) {
    console.error("❌ POST /api/classes error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Đã xảy ra lỗi khi tạo lớp học" },
      { status: 500 }
    );
  }
}