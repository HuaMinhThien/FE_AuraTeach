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

    console.log("📝 Tạo booking với dữ liệu:", { courseId, studentId, tutorId, notes, paymentMethod });

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

    // 5. KIỂM TRA TRÙNG LỊCH
    const allBookingsRes = await fetch(`${API_BASE}/bookings`, { cache: "no-store" });
    const allBookings = await allBookingsRes.json();
    
    const studentActiveBookings = allBookings.filter(b => 
      b.student_id === studentId && 
      (b.status === 'pending' || b.status === 'confirmed')
    );

    console.log(`📋 Tìm thấy ${studentActiveBookings.length} booking đang hoạt động của student`);

    if (studentActiveBookings.length > 0) {
      const bookedCourseIds = studentActiveBookings.map(b => b.course_id);
      console.log("📋 Course IDs đã booking:", bookedCourseIds);

      const bookedCoursesRes = await Promise.all(
        bookedCourseIds.map(id => 
          fetch(`${API_BASE}/courses?course_id=${id}`, { cache: "no-store" })
            .then(r => r.json())
            .catch(() => [])
        )
      );
      const bookedCourses = bookedCoursesRes.flat();
      console.log(`📋 Tìm thấy ${bookedCourses.length} course đã booking`);

      let hasConflict = false;
      let conflictDetails = [];

      for (const bookedCourse of bookedCourses) {
        if (!bookedCourse) continue;
        
        const bookedDays = bookedCourse.schedule_days || [];
        const newDays = course.schedule_days || [];
        
        const commonDays = bookedDays.filter(day => newDays.includes(day));
        
        if (commonDays.length === 0) continue;

        console.log(`⚠️ Trùng ngày ${commonDays.join(', ')} với course ${bookedCourse.course_id}`);

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
          console.log(`❌ TRÙNG LỊCH với course ${bookedCourse.course_id}: ${bookedTimeSlot}`);
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
    // 🔥 QUAN TRỌNG: Nếu paymentMethod là "wallet", set payment_status = "paid"
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

    console.log("💾 Lưu booking:", newBooking);

    // Lưu booking vào JSON Server
    const createRes = await fetch(`${API_BASE}/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newBooking)
    });

    if (!createRes.ok) {
      const errorText = await createRes.text();
      console.error("❌ Lỗi tạo booking:", errorText);
      throw new Error(`Không thể tạo booking: ${errorText}`);
    }

    const createdBooking = await createRes.json();
    console.log("✅ Booking created:", createdBooking);

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
      console.error("❌ Lỗi cập nhật course:", errorText);
      
      // Rollback: Xóa booking vừa tạo
      await fetch(`${API_BASE}/bookings/${createdBooking.id}`, {
        method: "DELETE"
      });
      throw new Error(`Không thể cập nhật danh sách học viên: ${errorText}`);
    }

    const updatedCourse = await updateRes.json();
    console.log("✅ Course updated:", updatedCourse);

    // ============================================================
    // 🔥 PHẦN QUAN TRỌNG: GỬI THÔNG BÁO & CẬP NHẬT VÍ TUTOR
    // ============================================================
    try {
      // === 1. TÌM THÔNG TIN TUTOR ===
      let tutorInfo = null;
      let tutorUserId = null;
      let tutorIdForSearch = tutorId;

      console.log("🔍 Đang tìm tutor với tutor_id:", tutorIdForSearch);

      // Thử tìm theo tutor_id trước
      const tutorRes1 = await fetch(`${API_BASE}/tutors?tutor_id=${tutorIdForSearch}`, { cache: "no-store" });
      const tutorData1 = await tutorRes1.json();
      const tutorArr1 = Array.isArray(tutorData1) ? tutorData1 : [];
      
      if (tutorArr1.length > 0) {
        tutorInfo = tutorArr1[0];
        tutorUserId = tutorInfo.user_id;
        console.log("✅ Tìm thấy tutor theo tutor_id:", tutorInfo.tutor_id, "-> user_id:", tutorUserId);
      } else {
        // Fallback: tìm theo user_id (trường hợp tutorId là user_id)
        console.log("🔍 Không tìm thấy theo tutor_id, thử tìm theo user_id:", tutorIdForSearch);
        const tutorRes2 = await fetch(`${API_BASE}/tutors?user_id=${tutorIdForSearch}`, { cache: "no-store" });
        const tutorData2 = await tutorRes2.json();
        const tutorArr2 = Array.isArray(tutorData2) ? tutorData2 : [];
        
        if (tutorArr2.length > 0) {
          tutorInfo = tutorArr2[0];
          tutorUserId = tutorInfo.user_id;
          console.log("✅ Tìm thấy tutor theo user_id:", tutorUserId);
        }
      }

      if (!tutorInfo) {
        console.error("❌ Không tìm thấy tutor cho tutorId:", tutorId);
      } else {
        console.log("✅ Tutor info:", {
          tutor_id: tutorInfo.tutor_id,
          user_id: tutorInfo.user_id,
          pending_balance: tutorInfo.pending_balance,
          available_balance: tutorInfo.available_balance
        });
      }

      // === 2. LẤY TÊN HỌC VIÊN ===
      let studentName = "Học viên";
      try {
        const studentRes = await fetch(`${API_BASE}/users?user_id=${studentId}`, { cache: "no-store" });
        const studentData = await studentRes.json();
        const studentArr = Array.isArray(studentData) ? studentData : [];
        if (studentArr.length > 0) {
          studentName = studentArr[0]?.full_name || "Học viên";
          console.log("👤 Student name:", studentName);
        }
      } catch (e) {
        console.error("⚠️ Lỗi tìm student:", e);
      }

      const courseTitle = course.title || "Khóa học";

      // === 3. CẬP NHẬT VÍ TUTOR ===
      // 🔥 Điều kiện: payment_method = "wallet" HOẶC payment_status = "paid"
      const shouldUpdateWallet = (newBooking.payment_method === 'wallet' || newBooking.payment_status === 'paid');
      console.log(`💰 Kiểm tra cập nhật ví: payment_method=${newBooking.payment_method}, payment_status=${newBooking.payment_status}, shouldUpdate=${shouldUpdateWallet}`);

      if (tutorInfo && shouldUpdateWallet) {
        const tutorAmount = newBooking.payment_amount || 0;
        const currentPending = tutorInfo.pending_balance || 0;
        const currentAvailable = tutorInfo.available_balance || 0;
        const currentTotalEarnings = tutorInfo.total_earnings || 0;
        
        // Phí sàn 39%: Tutor nhận 61%, Admin giữ 39%
        const tutorEarning = Math.round(tutorAmount * 0.65);
        const adminFee = tutorAmount - tutorEarning;

        console.log(`💰 Cập nhật ví tutor:`, {
          tutorId: tutorInfo.tutor_id,
          tutorUserId: tutorUserId,
          amount: tutorAmount,
          tutorEarning: tutorEarning,
          adminFee: adminFee,
          currentPending: currentPending,
          newPending: currentPending + tutorEarning
        });

        // Cập nhật pending_balance và total_earnings
        const updateWalletRes = await fetch(`${API_BASE}/tutors/${tutorInfo.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pending_balance: currentPending + tutorEarning,
            total_earnings: currentTotalEarnings + tutorEarning,
            updated_at: new Date().toISOString(),
          }),
        });

        if (updateWalletRes.ok) {
          console.log(`💰 [Tutor Wallet] Updated: ${currentPending} → ${currentPending + tutorEarning}`);
        } else {
          console.error("❌ Lỗi cập nhật ví tutor:", await updateWalletRes.text());
        }
      } else {
        console.log("⏭️ Bỏ qua cập nhật ví (không đủ điều kiện)");
      }

      // === 4. GỬI THÔNG BÁO CHO TUTOR ===
      if (tutorUserId) {
        const nowTime = new Date().toISOString();
        const tutorNotifData = {
          id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          receiver_id: tutorUserId,
          receiver_role: 'tutor',
          type: 'booking',
          title: '📩 Đăng ký khóa học mới',
          message: `Học viên ${studentName} đã đăng ký khóa học "${courseTitle}".`,
          related_id: createdBooking.booking_id,
          related_type: 'booking',
          is_read: false,
          created_at: nowTime,
        };

        console.log("📬 Gửi notification cho tutor:", {
          receiver_id: tutorUserId,
          title: tutorNotifData.title
        });

        const tutorNotifRes = await fetch(`${API_BASE}/notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tutorNotifData),
        });

        if (tutorNotifRes.ok) {
          console.log(`📬 Tutor notif sent successfully to: ${tutorUserId}`);
        } else {
          console.error("❌ Lỗi gửi tutor notification:", await tutorNotifRes.text());
        }
      }

      // === 5. GỬI THÔNG BÁO CHO ADMIN ===
      const adminNotifData = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        receiver_id: 'u-admin-1',
        receiver_role: 'admin',
        type: 'booking',
        title: '📊 Đăng ký khóa học mới',
        message: `Học viên ${studentName} đã đăng ký khóa học "${courseTitle}" với gia sư.`,
        related_id: createdBooking.booking_id,
        related_type: 'booking',
        is_read: false,
        created_at: new Date().toISOString(),
      };

      console.log("📬 Gửi notification cho admin:", {
        receiver_id: 'u-admin-1',
        title: adminNotifData.title
      });

      const adminNotifRes = await fetch(`${API_BASE}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adminNotifData),
      });

      if (adminNotifRes.ok) {
        console.log(`📬 Admin notif sent successfully`);
      } else {
        console.error("❌ Lỗi gửi admin notification:", await adminNotifRes.text());
      }

    } catch (notifError) {
      console.error("⚠️ Lỗi trong quá trình gửi thông báo/cập nhật ví:", notifError);
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