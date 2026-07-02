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

    const res = await fetch(`${API_BASE}/bookings`, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json(
        { success: false, message: "Không thể lấy danh sách booking" },
        { status: 500 }
      );
    }

    let bookings = await res.json();

    if (studentId) {
      bookings = bookings.filter(b => b.student_id === studentId);
    }
    if (tutorId) {
      bookings = bookings.filter(b => b.tutor_id === tutorId);
    }
    if (courseId) {
      bookings = bookings.filter(b => b.course_id === courseId);
    }

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
    const { courseId, studentId, tutorId, notes = "", paymentMethod = "wallet" } = body;

    console.log("Tạo booking với dữ liệu:", { courseId, studentId, tutorId, notes, paymentMethod });

    if (!courseId || !studentId || !tutorId) {
      return NextResponse.json(
        { success: false, message: "Thiếu thông tin bắt buộc" },
        { status: 400 }
      );
    }

    // 1. Kiểm tra course tồn tại
    const courseRes = await fetch(`${API_BASE}/courses?course_id=${courseId}`, { cache: "no-store" });
    const courses = await courseRes.json();
    const course = courses[0];

    if (!course) {
      return NextResponse.json(
        { success: false, message: "Khóa học không tồn tại" },
        { status: 404 }
      );
    }

    console.log("📚 Course found:", { id: course.id, course_id: course.course_id, title: course.title });

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

    // 5. KIỂM TRA TRÙNG LỊCH - FIX
    // Lấy tất cả bookings của student (chỉ lấy pending và confirmed)
    const allBookingsRes = await fetch(`${API_BASE}/bookings`, { cache: "no-store" });
    const allBookings = await allBookingsRes.json();
    
    const studentActiveBookings = allBookings.filter(b => 
      b.student_id === studentId && 
      (b.status === 'pending' || b.status === 'confirmed')
    );

    console.log(`Tìm thấy ${studentActiveBookings.length} booking đang hoạt động của student`);

    // Nếu student chưa có booking nào, bỏ qua kiểm tra trùng lịch
    if (studentActiveBookings.length === 0) {
      console.log("Student chưa có booking nào, bỏ qua kiểm tra trùng lịch");
    } else {
      // Lấy các course mà student đã booking
      const bookedCourseIds = studentActiveBookings.map(b => b.course_id);
      console.log("Course IDs đã booking:", bookedCourseIds);

      const bookedCoursesRes = await Promise.all(
        bookedCourseIds.map(id => 
          fetch(`${API_BASE}/courses?course_id=${id}`, { cache: "no-store" })
            .then(r => r.json())
            .catch(() => [])
        )
      );
      const bookedCourses = bookedCoursesRes.flat();
      console.log(`Tìm thấy ${bookedCourses.length} course đã booking`);

      // Kiểm tra trùng lịch - CHỈ KIỂM TRA KHI CÓ ÍT NHẤT 1 NGÀY TRÙNG
      let hasConflict = false;
      let conflictDetails = [];

      for (const bookedCourse of bookedCourses) {
        if (!bookedCourse) continue;
        
        // Kiểm tra ngày học trùng
        const bookedDays = bookedCourse.schedule_days || [];
        const newDays = course.schedule_days || [];
        
        const commonDays = bookedDays.filter(day => newDays.includes(day));
        
        if (commonDays.length === 0) {
          console.log(`Không trùng ngày với course ${bookedCourse.course_id}`);
          continue;
        }

        console.log(`Trùng ngày ${commonDays.join(', ')} với course ${bookedCourse.course_id}`);

        // Kiểm tra khung giờ trùng
        const bookedTimeSlot = bookedCourse.time_slot || "";
        const newTimeSlot = course.time_slot || "";

        // Nếu không có thông tin giờ học, coi như không trùng
        if (!bookedTimeSlot || !newTimeSlot) {
          console.log(`Thiếu thông tin giờ học, bỏ qua kiểm tra`);
          continue;
        }

        const [bookedStart, bookedEnd] = bookedTimeSlot.split("-").map(t => t.trim());
        const [newStart, newEnd] = newTimeSlot.split("-").map(t => t.trim());

        if (!bookedStart || !bookedEnd || !newStart || !newEnd) {
          console.log(`Không parse được giờ học, bỏ qua kiểm tra`);
          continue;
        }

        const toMinutes = (time) => {
          try {
            const parts = time.split(":");
            if (parts.length !== 2) return 0;
            const h = parseInt(parts[0]);
            const m = parseInt(parts[1]);
            if (isNaN(h) || isNaN(m)) return 0;
            return h * 60 + m;
          } catch (e) {
            return 0;
          }
        };

        const bookedStartMin = toMinutes(bookedStart);
        const bookedEndMin = toMinutes(bookedEnd);
        const newStartMin = toMinutes(newStart);
        const newEndMin = toMinutes(newEnd);

        // Kiểm tra khoảng thời gian trùng nhau
        const isOverlap = newStartMin < bookedEndMin && newEndMin > bookedStartMin;

        if (isOverlap) {
          hasConflict = true;
          conflictDetails.push({
            course_id: bookedCourse.course_id,
            title: bookedCourse.title,
            days: commonDays,
            time_slot: bookedTimeSlot
          });
          console.log(`TRÙNG LỊCH với course ${bookedCourse.course_id}: ${bookedTimeSlot}`);
        } else {
          console.log(`Không trùng giờ với course ${bookedCourse.course_id}`);
        }
      }

      if (hasConflict) {
        const conflictMessage = conflictDetails.map(c => 
          `- ${c.title} (${c.days.join(', ')} ${c.time_slot})`
        ).join('\n');
        
        return NextResponse.json(
          { 
            success: false, 
            message: `Lịch học bị trùng với lớp đã đăng ký:\n${conflictMessage}` 
          },
          { status: 400 }
        );
      }
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
      payment_status: paymentMethod === "wallet" ? "paid" : "unpaid",
      payment_amount: course.hourly_rate || course.price_per_session || 0,
      payment_method: paymentMethod || null,
      transaction_id: paymentMethod === "wallet" ? `txn-${Date.now()}` : null
    };

    console.log("💾 Lưu booking:", newBooking);

    // Lưu booking vào JSON Server
    const createRes = await fetch(`${API_BASE}/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newBooking)
    });

    if (!createRes.ok) {
      const errorText = await createRes.text();
      console.error("Lỗi tạo booking:", errorText);
      throw new Error(`Không thể tạo booking: ${errorText}`);
    }

    const createdBooking = await createRes.json();
    console.log("Booking created:", createdBooking);

    // 7. Cập nhật course: thêm student vào danh sách
    const updatedStudents = [...currentStudents, studentId];
    console.log("🔄 Cập nhật course students:", { 
      courseId: course.id, 
      oldStudents: currentStudents, 
      newStudents: updatedStudents 
    });

    const updateRes = await fetch(`${API_BASE}/courses/${course.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ students: updatedStudents })
    });

    if (!updateRes.ok) {
      const errorText = await updateRes.text();
      console.error("Lỗi cập nhật course:", errorText);
      
      await fetch(`${API_BASE}/bookings/${createdBooking.id}`, {
        method: "DELETE"
      });
      throw new Error(`Không thể cập nhật danh sách học viên: ${errorText}`);
    }

    const updatedCourse = await updateRes.json();
    console.log("Course updated:", updatedCourse);

    return NextResponse.json({
      success: true,
      message: "Đăng ký khóa học thành công!",
      data: createdBooking
    });

  } catch (error) {
    console.error("Lỗi POST /api/bookings:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi server" },
      { status: 500 }
    );
  }
}