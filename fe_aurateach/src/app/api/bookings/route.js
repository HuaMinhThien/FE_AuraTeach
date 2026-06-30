import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE = "http://localhost:3007";

// GET: Lấy danh sách bookings
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");
    const tutorId = searchParams.get("tutorId");
    const courseId = searchParams.get("courseId");

    // Lấy tất cả bookings từ JSON Server
    const res = await fetch(`${API_BASE}/bookings`, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json(
        { success: false, message: "Không thể lấy danh sách booking" },
        { status: 500 }
      );
    }

    let bookings = await res.json();

    // Lọc theo tham số
    if (studentId) {
      bookings = bookings.filter(b => b.student_id === studentId);
    }
    if (tutorId) {
      bookings = bookings.filter(b => b.tutor_id === tutorId);
    }
    if (courseId) {
      bookings = bookings.filter(b => b.course_id === courseId);
    }

    // Sắp xếp mới nhất trước
    bookings.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return NextResponse.json({
      success: true,
      data: bookings,
      total: bookings.length
    });

  } catch (error) {
    console.error("Lỗi GET /api/bookings:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi server" },
      { status: 500 }
    );
  }
}

// POST: Tạo booking mới
export async function POST(request) {
  try {
    const body = await request.json();
    const { courseId, studentId, tutorId, notes = "" } = body;

    // Validate dữ liệu đầu vào
    if (!courseId || !studentId || !tutorId) {
      return NextResponse.json(
        { success: false, message: "Thiếu thông tin bắt buộc" },
        { status: 400 }
      );
    }

    // 1. Kiểm tra course tồn tại
    const courseRes = await fetch(`${API_BASE}/courses?course_id=${courseId}`);
    const courses = await courseRes.json();
    const course = courses[0];

    if (!course) {
      return NextResponse.json(
        { success: false, message: "Khóa học không tồn tại" },
        { status: 404 }
      );
    }

    // 2. Kiểm tra trạng thái lớp học
    if (course.status !== "active") {
      return NextResponse.json(
        { success: false, message: "Lớp học đã đóng hoặc không còn tuyển sinh" },
        { status: 400 }
      );
    }

    // 3. Kiểm tra số lượng học viên
    const currentStudents = course.students || [];
    if (currentStudents.length >= course.max_students) {
      return NextResponse.json(
        { success: false, message: "Lớp học đã đủ số lượng học viên" },
        { status: 400 }
      );
    }

    // 4. Kiểm tra student đã đăng ký lớp này chưa
    if (currentStudents.includes(studentId)) {
      return NextResponse.json(
        { success: false, message: "Bạn đã đăng ký lớp học này rồi" },
        { status: 400 }
      );
    }

    // 5. Lấy tất cả bookings của student để kiểm tra trùng lịch
    const allBookingsRes = await fetch(`${API_BASE}/bookings`);
    const allBookings = await allBookingsRes.json();
    
    const studentBookings = allBookings.filter(b => 
      b.student_id === studentId && 
      b.status !== 'cancelled' &&
      b.status !== 'completed'
    );

    // Lấy các course mà student đã booking
    const bookedCourseIds = studentBookings.map(b => b.course_id);
    const bookedCoursesRes = await Promise.all(
      bookedCourseIds.map(id => 
        fetch(`${API_BASE}/courses?course_id=${id}`).then(r => r.json())
      )
    );
    const bookedCourses = bookedCoursesRes.flat();

    // Kiểm tra trùng lịch
    const hasConflict = bookedCourses.some(bookedCourse => {
      // So sánh lịch học
      const sameDays = bookedCourse.schedule_days?.some(day => 
        course.schedule_days?.includes(day)
      );
      if (!sameDays) return false;

      // So sánh khung giờ
      const [bookedStart, bookedEnd] = (bookedCourse.time_slot || "").split("-");
      const [newStart, newEnd] = (course.time_slot || "").split("-");
      
      if (!bookedStart || !newStart) return false;

      const toMinutes = (time) => {
        const [h, m] = time.split(":").map(Number);
        return h * 60 + m;
      };

      return toMinutes(newStart) < toMinutes(bookedEnd) && 
             toMinutes(newEnd) > toMinutes(bookedStart);
    });

    if (hasConflict) {
      return NextResponse.json(
        { success: false, message: "Lịch học bị trùng với lớp đã đăng ký khác" },
        { status: 400 }
      );
    }

    // 6. Tạo booking mới
    const newBooking = {
      booking_id: `bk-${Date.now()}`,
      student_id: studentId,
      course_id: courseId,
      tutor_id: tutorId,
      status: "pending",
      booking_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      notes: notes || "",
      payment_status: "unpaid",
      payment_amount: course.hourly_rate || course.price_per_session || 0,
      payment_method: null,
      transaction_id: null
    };

    // Lưu booking vào JSON Server
    const createRes = await fetch(`${API_BASE}/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newBooking)
    });

    if (!createRes.ok) {
      throw new Error("Không thể tạo booking");
    }

    // 7. Cập nhật course: thêm student vào danh sách
    const updatedStudents = [...currentStudents, studentId];
    const updateRes = await fetch(`${API_BASE}/courses/${course.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ students: updatedStudents })
    });

    if (!updateRes.ok) {
      // Rollback: Xóa booking vừa tạo nếu update course thất bại
      await fetch(`${API_BASE}/bookings/${newBooking.booking_id}`, {
        method: "DELETE"
      });
      throw new Error("Không thể cập nhật danh sách học viên");
    }

    // 8. Tạo thông báo cho tutor (nếu có hệ thống notification)
    // TODO: Thêm vào notification system

    return NextResponse.json({
      success: true,
      message: "Đăng ký khóa học thành công! Vui lòng chờ gia sư xác nhận.",
      data: newBooking
    });

  } catch (error) {
    console.error("Lỗi POST /api/bookings:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi server" },
      { status: 500 }
    );
  }
}