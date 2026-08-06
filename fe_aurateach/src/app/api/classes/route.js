import { NextResponse } from "next/server";

const API_BASE = "http://localhost:3007";

// 1. HAM GET: Lấy danh sách lớp học & Populate thông tin học viên
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "6", 10);
    const status = searchParams.get("status") || "all";
    const search = searchParams.get("search") || "";

    // Fetch courses và users đồng thời từ json-server
    const [coursesRes, usersRes] = await Promise.all([
      fetch(`${API_BASE}/courses`, { cache: "no-store" }),
      fetch(`${API_BASE}/users`, { cache: "no-store" }),
    ]);

    if (!coursesRes.ok || !usersRes.ok) {
      throw new Error("Không thể lấy dữ liệu từ Server");
    }

    const courses = await coursesRes.json();
    const users = await usersRes.json();

    const userMap = new Map(users.map((u) => [u.user_id, u]));

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
        permanent_room_url: course.permanent_room_url,
        schedule_days: course.schedule_days,
        students: detailedStudents,
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

// 2. HAM POST: Xử lý Tạo Lớp Học Mới
export async function POST(request) {
  try {
    const body = await request.json();

    // Ánh xạ dữ liệu gửi từ Form sang cấu trúc lưu trong json-server
    const newCourse = {
      course_id: `course_${Date.now()}`,
      tutor_id: body.tutor_id,
      title: body.class_name,
      category_id: body.category_id,
      level: body.level,
      description: body.description,
      max_students: body.max_students,
      price_per_session: body.price_per_session,
      start_date: body.start_date,
      end_date: body.end_date,
      total_weeks: body.total_weeks,
      schedule_days: body.schedule_days,
      time_slot: body.time_slot,
      image: body.thumbnail,
      permanent_room_url: body.permanent_room_url,
      status: "active", // Trạng thái mặc định khi tạo mới
      students: [],    // Khởi tạo danh sách học sinh rỗng
      created_at: new Date().toISOString(),
    };

    // Gửi dữ liệu tạo khóa học mới sang json-server (JSON Server hỗ trợ cả id tự sinh)
    const res = await fetch(`${API_BASE}/courses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newCourse),
    });

    if (!res.ok) {
      throw new Error("Không thể lưu lớp học vào cơ sở dữ liệu");
    }

    const createdData = await res.json();

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