import { NextResponse } from "next/server";
import { cookies } from "next/headers"; // Thêm để đọc thông tin đăng nhập từ Cookie trên Server side

// 1. LẤY DANH SÁCH LỚP HỌC (logic phân trang, tìm kiếm)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 6;
    const status = searchParams.get("status") || "all";
    const search = searchParams.get("search") || "";

    const resFromJsonServer = await fetch("http://localhost:3007/classByIdTutor", {
      cache: "no-store" 
    });

    if (!resFromJsonServer.ok) {
      return NextResponse.json(
        { success: false, data: [], pagination: { totalPages: 1 }, message: "Không thể kết nối tới JSON Server." }
      );
    }

    const jsonServerData = await resFromJsonServer.json();
    
    let rawCourses = [];
    if (Array.isArray(jsonServerData)) {
      rawCourses = jsonServerData;
    } else if (jsonServerData.courses) {
      rawCourses = jsonServerData.courses; 
    } else if (jsonServerData.classByIdTutor) {
      rawCourses = jsonServerData.classByIdTutor;
    }

    let standardizedClasses = rawCourses.map(course => ({
      class_id: course.course_id || course.class_id || `cls-${Math.random()}`,
      class_name: course.title || course.class_name || "Lớp học chưa đặt tên",
      start_date: course.start_date || "15/06/2024",
      end_date: course.end_date || "30/08/2024",
      total_weeks: course.total_weeks || 12,
      status: course.status || "active", 
      meet_link: course.permanent_room_url || course.meet_link || "#",
      schedule_days: course.schedule_days || ["Thứ 2", "Thứ 4", "Thứ 6"],
      students: course.students || []
    }));

    if (status !== "all") {
      standardizedClasses = standardizedClasses.filter(c => c.status === status);
    }

    if (search && search.trim() !== "") {
      const searchLower = search.toLowerCase().trim();
      standardizedClasses = standardizedClasses.filter(c => 
        c.class_name.toLowerCase().includes(searchLower) ||
        c.students.some(s => s.full_name && s.full_name.toLowerCase().includes(searchLower))
      );
    }

    const totalItems = standardizedClasses.length;
    const totalPages = Math.ceil(totalItems / limit) || 1;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = standardizedClasses.slice(startIndex, endIndex);

    return NextResponse.json({
      success: true,
      data: paginatedData,
      pagination: { currentPage: page, limit, totalItems, totalPages }
    });

  } catch (error) {
    console.error("Lỗi kết nối API Route với JSON Server:", error);
    return NextResponse.json(
      { success: false, data: [], pagination: { totalPages: 1 }, message: "Lỗi xử lý server dữ liệu." }, 
      { status: 500 }
    );
  }
}

// 2. TẠO LỚP HỌC MỚI ĐỘNG THEO ID GIA SƯ ĐĂNG NHẬP
export async function POST(request) {
  try {
    const body = await request.json();
    
    // Đọc Cookie từ trình duyệt gửi lên Server
    const cookieStore = await cookies();
    const userInfoCookie = cookieStore.get("user_info")?.value;
    
    let dynamicTutorId = "tutor_01"; // Giá trị dự phòng nếu không tìm thấy cookie
    
    if (userInfoCookie) {
      try {
        const decodedUser = JSON.parse(decodeURIComponent(userInfoCookie));
        // Lấy trường ID của gia sư trong cookie. 
        // Hãy đổi lại thành decodedUser.tutor_id hoặc decodedUser.user_id nếu cấu trúc cookie của bạn khác trường .id
        dynamicTutorId = decodedUser.id || decodedUser.tutor_id || "tutor_01"; 
      } catch (e) {
        console.error("Lỗi parse thông tin cookie gia sư:", e);
      }
    }
    
    const newClassData = {
      course_id: `course-${Date.now()}`, 
      tutor_id: dynamicTutorId, 
      title: body.class_name,
      category: body.category || "Chưa phân loại",
      level: body.level,
      description: body.description || "",
      max_students: parseInt(body.max_students || 15),
      hourly_rate: parseInt(body.hourly_rate || 150000),
      start_date: body.start_date,
      end_date: body.end_date,
      total_weeks: parseInt(body.total_weeks),
      schedule_days: body.schedule_days,
      time_slot: body.time_slot,
      thumbnail: body.thumbnail || "/img/default-class-1.jpg",
      status: "active",
      permanent_room_url: "https://meet.google.com/abc-xyz-def",
      students: []
    };

    // MINH ơi cái này để vào danh sách quản lý riêng của Tutor thôi không cần làm API này
    await fetch("http://localhost:3007/classByIdTutor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newClassData),
    });

    // Lưu vào danh sách các khóa học hiển thị tổng thể
    const resFromJsonServer = await fetch("http://localhost:3007/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newClassData),
    });

    if (!resFromJsonServer.ok) throw new Error("Lỗi ghi JSON Server");

    const savedData = await resFromJsonServer.json();
    return NextResponse.json({ success: true, message: "Tạo lớp thành công!", data: savedData });

  } catch (error) {
    console.error("Lỗi API Route POST khi tạo lớp học:", error);
    return NextResponse.json({ success: false, message: "Lỗi kết nối cơ sở dữ liệu." }, { status: 500 });
  }
}