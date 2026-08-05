import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// 1. LẤY DANH SÁCH LỚP HỌC THEO ID GIA SƯ ĐĂNG NHẬP
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 6;
    const status = searchParams.get("status") || "all";
    const search = searchParams.get("search") || "";

    // Đọc thông tin gia sư từ Cookie
    const cookieStore = await cookies();
    const userInfoCookie = cookieStore.get("user_info")?.value;
    
    let userId = "u-01";

    if (userInfoCookie) {
      try {
        const decodedUser = JSON.parse(decodeURIComponent(userInfoCookie));
        userId = decodedUser.user_id || decodedUser.id || "u-01";
      } catch (e) {
        console.error("Lỗi parse cookie gia sư trong hàm GET:", e);
      }
    }

    console.log("👤 User ID từ cookie:", userId);

    // Lấy danh sách tutors để map user_id -> tutor_id
    const tutorsRes = await fetch("http://localhost:3007/tutors", { cache: "no-store" });
    const tutors = tutorsRes.ok ? await tutorsRes.json() : [];
    
    // Tìm tutor_id tương ứng với user_id
    const tutor = tutors.find(t => t.user_id === userId);
    const tutorId = tutor?.tutor_id || userId;

    console.log("🔍 Tutor ID tìm được:", tutorId);

    // Lấy tất cả courses của tutor (dùng tutor_id)
    const resFromJsonServer = await fetch(`http://localhost:3007/courses?tutor_id=${tutorId}`, {
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
    }

    // Lấy thông tin users để map student names
    const usersRes = await fetch("http://localhost:3007/users", { cache: "no-store" });
    const allUsers = usersRes.ok ? await usersRes.json() : [];

    // Bộ lọc Trạng thái
    if (status !== "all") {
      rawCourses = rawCourses.filter(c => c.status === status);
    }

    // Bộ lọc Tìm kiếm
    if (search && search.trim() !== "") {
      const searchLower = search.toLowerCase().trim();
      rawCourses = rawCourses.filter(c => 
        (c.title && c.title.toLowerCase().includes(searchLower))
      );
    }

    // Xử lý phân trang
    const totalItems = rawCourses.length;
    const totalPages = Math.ceil(totalItems / limit) || 1;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const activeCourses = rawCourses.slice(startIndex, endIndex);

    // ✅ CHUẨN HÓA DỮ LIỆU TRẢ VỀ CHO CLIENT VÀ THÊM PERMANENT_ROOM_URL
    const formattedClasses = activeCourses.map(course => {
      const studentIds = course.students || [];
      const studentDetails = studentIds.map(studentId => {
        const user = allUsers.find(u => u.user_id === studentId);
        return user ? {
          user_id: user.user_id,
          full_name: user.full_name,
          avatar: user.avatar || "/img/default-avatar.svg",
          email: user.email
        } : {
          user_id: studentId,
          full_name: "Học viên",
          avatar: "/img/default-avatar.svg"
        };
      });

      return {
        id: course.id,
        class_id: course.course_id || course.class_id || `cls-${Math.random()}`,
        class_name: course.title || course.class_name || "Lớp học chưa đặt tên",
        start_date: course.start_date || "15/06/2024",
        end_date: course.end_date || "30/08/2024",
        total_weeks: course.total_weeks || 12,
        status: course.status || "active", 
        schedule_days: course.schedule_days || ["Thứ 2", "Thứ 4", "Thứ 6"],
        time_slot: course.time_slot || "18:00-20:00",
        price_per_session: course.price_per_session || 150000,
        max_students: course.max_students || 15,
        students: studentIds,
        student_details: studentDetails,
        student_count: studentIds.length,
        permanent_room_url: course.permanent_room_url || "" 
      };
    });

    console.log(`📚 Tìm thấy ${totalItems} lớp học cho tutor ${tutorId}`);

    return NextResponse.json({
      success: true,
      data: formattedClasses, // Trả dữ liệu đã định dạng về Client
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

// 2. TẠO LỚP HỌC MỚI 
export async function POST(request) {
  try {
    const body = await request.json();
    
    const cookieStore = await cookies();
    const userInfoCookie = cookieStore.get("user_info")?.value;
    
    let userId = "u-01"; 
    
    if (userInfoCookie) {
      try {
        const decodedUser = JSON.parse(decodeURIComponent(userInfoCookie));
        userId = decodedUser.user_id || decodedUser.id || "u-01"; 
      } catch (e) {
        console.error("Lỗi parse thông tin cookie gia sư:", e);
      }
    }

    console.log("👤 User ID tạo lớp:", userId);

    // Lấy tutor_id từ user_id
    const tutorsRes = await fetch("http://localhost:3007/tutors", { cache: "no-store" });
    const tutors = tutorsRes.ok ? await tutorsRes.json() : [];
    const tutor = tutors.find(t => t.user_id === userId);
    const tutorId = tutor?.tutor_id || userId;

    console.log("🔍 Tutor ID tạo lớp:", tutorId);
    
    const newClassData = {
      id: `course-${Date.now()}`,
      course_id: `course-${Date.now()}`, 
      tutor_id: tutorId, 
      title: body.class_name,
      category_id: body.category || "cat-02",
      level: body.level,
      description: body.description || "",
      max_students: parseInt(body.max_students || 15),
      price_per_session: parseInt(body.price_per_session || 150000),
      start_date: body.start_date,
      end_date: body.end_date,
      total_weeks: parseInt(body.total_weeks),
      schedule_days: body.schedule_days,
      time_slot: body.time_slot,
      thumbnail: body.thumbnail || "/img/default-class-1.jpg",
      status: "active",
      permanent_room_url: body.permanent_room_url || "https://meet.google.com/abc-xyz-def",
      students: []
    };

    const resFromJsonServer = await fetch("http://localhost:3007/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newClassData),
    });

    if (!resFromJsonServer.ok) {
      const errorText = await resFromJsonServer.text();
      console.error("❌ Lỗi tạo lớp:", errorText);
      throw new Error("Lỗi ghi JSON Server");
    }

    const savedData = await resFromJsonServer.json();
    console.log("✅ Lớp học đã được tạo:", savedData);

    return NextResponse.json({ 
      success: true, 
      message: "Tạo lớp thành công!", 
      data: savedData 
    });

  } catch (error) {
    console.error("Lỗi API Route POST khi tạo lớp học:", error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || "Lỗi kết nối cơ sở dữ liệu." 
    }, { status: 500 });
  }
}