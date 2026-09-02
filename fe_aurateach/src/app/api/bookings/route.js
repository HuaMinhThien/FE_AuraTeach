import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE = process.env.NEXT_PUBLIC_JSON_SERVER_URL || 'http://localhost:3007';

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

    if (!courseId || !studentId) {
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


// 2. Kiểm tra trạng thái lớp học
    // ✅ Cho phép đăng ký ở các trạng thái đang tuyển sinh:
    //   - active: lớp đang hoạt động
    //   - pending_student: đã có tutor nhận, chờ học viên đăng ký
    //   - pending_tutor: lớp do Admin tạo, chưa cần tutor vẫn cho học viên
    //     đăng ký và thanh toán ngay.
    const bookableStatuses = ['active', 'pending_student', 'pending_tutor'];
    if (!bookableStatuses.includes(course.status)) {
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

    // 5. KIỂM TRA TRÙNG LỊCH
    const allBookingsRes = await fetch(`${API_BASE}/bookings`, { cache: "no-store" });
    const allBookings = await allBookingsRes.json();
    
    const studentActiveBookings = allBookings.filter(b => 
      b.student_id === studentId && 
      (b.status === 'pending' || b.status === 'confirmed')
    );

    if (studentActiveBookings.length > 0) {
      const bookedCourseIds = studentActiveBookings.map(b => b.course_id);

      const bookedCoursesRes = await Promise.all(
        bookedCourseIds.map(id => 
          fetch(`${API_BASE}/courses?course_id=${id}`, { cache: "no-store" })
            .then(r => r.json())
            .catch(() => [])
        )
      );
      const bookedCourses = bookedCoursesRes.flat();

      let hasConflict = false;
      let conflictDetails = [];

      for (const bookedCourse of bookedCourses) {
        if (!bookedCourse) continue;
        
        const bookedDays = bookedCourse.schedule_days || [];
        const newDays = course.schedule_days || [];
        
        const commonDays = bookedDays.filter(day => newDays.includes(day));
        
        if (commonDays.length === 0) continue;

        const bookedTimeSlot = bookedCourse.time_slot || "";
        const newTimeSlot = course.time_slot || "";

        if (!bookedTimeSlot || !newTimeSlot) continue;

        const [bookedStart, bookedEnd] = bookedTimeSlot.split("-").map(t => t.trim());
        const [newStart, newEnd] = newTimeSlot.split("-").map(t => t.trim());

        if (!bookedStart || !bookedEnd || !newStart || !newEnd) continue;

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

        const isOverlap = newStartMin < bookedEndMin && newEndMin > bookedStartMin;

        if (isOverlap) {
          hasConflict = true;
          conflictDetails.push({
            course_id: bookedCourse.course_id,
            title: bookedCourse.title,
            days: commonDays,
            time_slot: bookedTimeSlot
          });
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

    const isPaid = paymentMethod === "wallet";
    
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
      payment_status: isPaid ? "paid" : "unpaid",
      payment_amount: (course.price_per_session || 0) * (course.total_weeks || 1),
      payment_method: paymentMethod || null,
      transaction_id: isPaid ? `txn-${Date.now()}` : null
    };

    const createRes = await fetch(`${API_BASE}/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newBooking)
    });

    if (!createRes.ok) {
      const errorText = await createRes.text();
      throw new Error(`Không thể tạo booking: ${errorText}`);
    }

    const createdBooking = await createRes.json();

    // 7. Cập nhật course: thêm student vào danh sách
    const updatedStudents = [...currentStudents, studentId];

    const updateRes = await fetch(`${API_BASE}/courses/${course.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ students: updatedStudents })
    });

    if (!updateRes.ok) {
      const errorText = await updateRes.text();
      // Rollback: Xóa booking vừa tạo
      await fetch(`${API_BASE}/bookings/${createdBooking.id}`, { method: "DELETE" });
      throw new Error(`Không thể cập nhật danh sách học viên: ${errorText}`);
    }

    const updatedCourse = await updateRes.json();

    if (updatedStudents.length >= course.max_students) {
      const closeRes = await fetch(`${API_BASE}/courses/${course.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "closed" })
      });
      if (closeRes.ok && course.parent_course_id) {
        const allSecRes = await fetch(`${API_BASE}/courses?parent_course_id=${course.parent_course_id}`);
        const allSecs = await allSecRes.json();
        // Tất cả slot đóng → có thể xử lý thêm sau
      }
    }

    // Gửi thông báo & cập nhật ví tutor
    try {
      let tutorInfo = null;
      let tutorUserId = null;

      if (tutorId) {
        const tutorRes1 = await fetch(`${API_BASE}/tutors?tutor_id=${tutorId}`, { cache: "no-store" });
        const tutorArr1 = await tutorRes1.json();
        if (Array.isArray(tutorArr1) && tutorArr1.length > 0) {
          tutorInfo = tutorArr1[0];
          tutorUserId = tutorInfo.user_id;
        } else {
          const tutorRes2 = await fetch(`${API_BASE}/tutors?user_id=${tutorId}`, { cache: "no-store" });
          const tutorArr2 = await tutorRes2.json();
          if (Array.isArray(tutorArr2) && tutorArr2.length > 0) {
            tutorInfo = tutorArr2[0];
            tutorUserId = tutorInfo.user_id;
          }
        }
      }

      let studentName = "Học viên";
      try {
        const studentRes = await fetch(`${API_BASE}/users?user_id=${studentId}`, { cache: "no-store" });
        const studentArr = await studentRes.json();
        if (Array.isArray(studentArr) && studentArr.length > 0) {
          studentName = studentArr[0]?.full_name || "Học viên";
        }
      } catch { /* không quan trọng */ }

      const courseTitle = course.title || "Khóa học";
      const shouldUpdateWallet = newBooking.payment_method === 'wallet' || newBooking.payment_status === 'paid';

      if (tutorInfo && shouldUpdateWallet) {
        const tutorEarning = Math.round((newBooking.payment_amount || 0) * 0.65);
        await fetch(`${API_BASE}/tutors/${tutorInfo.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pending_balance: (tutorInfo.pending_balance || 0) + tutorEarning,
            total_earnings: (tutorInfo.total_earnings || 0) + tutorEarning,
            updated_at: new Date().toISOString(),
          }),
        });
      }

      const nowTime = new Date().toISOString();
      const notifBase = {
        is_read: false,
        created_at: nowTime,
        related_id: createdBooking.booking_id,
        related_type: 'booking',
        type: 'booking',
      };

      if (tutorUserId) {
        await fetch(`${API_BASE}/notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...notifBase,
            id: `notif_${Date.now()}_t`,
            receiver_id: tutorUserId,
            receiver_role: 'tutor',
            title: '📩 Đăng ký khóa học mới',
            message: `Học viên ${studentName} đã đăng ký khóa học "${courseTitle}".`,
          }),
        });
      }

      await fetch(`${API_BASE}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...notifBase,
          id: `notif_${Date.now()}_a`,
          receiver_id: 'u-admin-1',
          receiver_role: 'admin',
          title: '📊 Đăng ký khóa học mới',
          message: `Học viên ${studentName} đã đăng ký khóa học "${courseTitle}".`,
        }),
      });
    } catch (notifError) {
      console.error("⚠️ Lỗi gửi thông báo/cập nhật ví:", notifError);
    }

    return NextResponse.json({
      success: true,
      message: "Đăng ký khóa học thành công!",
      data: createdBooking
    });

  } catch (error) {
    console.error("❌ Lỗi POST /api/bookings:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi server" },
      { status: 500 }
    );
  }
}
