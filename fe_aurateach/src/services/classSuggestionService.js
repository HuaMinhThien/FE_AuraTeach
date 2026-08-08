// src/services/classSuggestionService.js

const API_BASE = 'http://localhost:3007';

/**
 * Lấy danh sách Tutor phù hợp cho lớp
 */
export async function getEligibleTutors(course) {
  try {
    // Lấy tất cả tutors
    const tutorsRes = await fetch(`${API_BASE}/tutors`);
    const tutors = await tutorsRes.json();

    // Lấy tất cả courses để kiểm tra lịch trống
    const coursesRes = await fetch(`${API_BASE}/courses`);
    const allCourses = await coursesRes.json();

    // Lọc tutor: approved, receive_suggestions = true
    const eligible = tutors.filter(tutor => {
      // Kiểm tra điều kiện cơ bản
      if (tutor.verification_status !== 'approved') return false;
      if (tutor.receive_suggestions !== true) return false;

      // Kiểm tra lịch trống (không trùng với lớp hiện có)
      const hasConflict = allCourses.some(existingCourse => {
        if (existingCourse.tutor_id !== tutor.tutor_id) return false;
        if (existingCourse.status === 'cancelled') return false;
        if (existingCourse.status === 'closed') return false;
        if (existingCourse.status === 'completed') return false;

        // Kiểm tra trùng ngày
        const hasCommonDay = existingCourse.schedule_days?.some(day =>
          course.schedule_days?.includes(day)
        );
        if (!hasCommonDay) return false;

        // Kiểm tra trùng giờ
        const [newStart, newEnd] = course.time_slot?.split('-').map(s => s.trim()) || [];
        const [existStart, existEnd] = existingCourse.time_slot?.split('-').map(s => s.trim()) || [];
        if (!newStart || !newEnd || !existStart || !existEnd) return false;

        // So sánh thời gian
        const newStartMin = timeToMinutes(newStart);
        const newEndMin = timeToMinutes(newEnd);
        const existStartMin = timeToMinutes(existStart);
        const existEndMin = timeToMinutes(existEnd);

        return newStartMin < existEndMin && newEndMin > existStartMin;
      });

      return !hasConflict;
    });

    // Lấy thông tin user cho từng tutor
    const usersRes = await fetch(`${API_BASE}/users`);
    const users = await usersRes.json();

    const result = eligible.map(tutor => {
      const user = users.find(u => u.user_id === tutor.user_id);
      return {
        ...tutor,
        full_name: user?.full_name || 'Gia sư',
        email: user?.email,
        avatar: user?.avatar || '/img/avt/avt.jpg'
      };
    });

    return result;
  } catch (error) {
    console.error('❌ Lỗi lấy danh sách tutor phù hợp:', error);
    return [];
  }
}

/**
 * Chuyển đổi thời gian sang phút
 */
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Gửi đề xuất cho Tutor (KHÔNG tự động gán tutor)
 */
export async function sendSuggestions(courseId, tutorIds) {
  try {
    const courseRes = await fetch(`${API_BASE}/courses?course_id=${courseId}`);
    const courses = await courseRes.json();
    const course = courses[0];
    if (!course) throw new Error('Không tìm thấy lớp học');

    // ✅ CHỈ CẬP NHẬT suggested_tutors, KHÔNG GÁN TUTOR
    const suggestedTutors = course.suggested_tutors || [];
    const newSuggested = [...new Set([...suggestedTutors, ...tutorIds])];

    await fetch(`${API_BASE}/courses/${course.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        suggested_tutors: newSuggested,
        status: 'pending_tutor'
        // ⚠️ KHÔNG set tutor_id - Tutor chỉ được gán khi bấm "Nhận lớp"
      })
    });

    // Lưu lịch sử gửi đề xuất
    for (const tutorId of tutorIds) {
      const suggestion = {
        id: `sug_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        course_id: courseId,
        tutor_id: tutorId,
        suggested_at: new Date().toISOString(),
        status: 'pending'
      };

      await fetch(`${API_BASE}/class_suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(suggestion)
      });
    }

    // Gửi thông báo cho từng tutor
    const usersRes = await fetch(`${API_BASE}/users`);
    const users = await usersRes.json();

    for (const tutorId of tutorIds) {
      const tutorRes = await fetch(`${API_BASE}/tutors?tutor_id=${tutorId}`);
      const tutors = await tutorRes.json();
      const tutor = tutors[0];
      const user = users.find(u => u.user_id === tutor?.user_id);

      if (user) {
        await createNotification({
          receiver_id: user.user_id,
          receiver_role: 'tutor',
          type: 'system',
          title: '📩 Đề xuất lớp học mới',
          message: `Admin đã tạo lớp "${course.title}" và đề xuất bạn nhận dạy. Hãy vào trang "Đề xuất lớp học" để xem chi tiết.`,
          related_id: courseId,
          related_type: 'class_suggestion'
        });
      }
    }

    return { success: true, sentTo: tutorIds.length };
  } catch (error) {
    console.error('❌ Lỗi gửi đề xuất:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Tutor nhận lớp (First come first serve)
 */
export async function acceptClass(courseId, tutorId) {
  try {
    // ✅ Map user_id → tutor_id (vì client gửi user_id từ cookie, nhưng class_suggestions/course lưu tutor_id)
    let actualTutorId = tutorId;
    try {
      const tutorsRes = await fetch(`${API_BASE}/tutors`);
      const tutors = await tutorsRes.json();
      const matchedTutor = (tutors || []).find(t => t.tutor_id === tutorId || t.user_id === tutorId);
      actualTutorId = matchedTutor ? matchedTutor.tutor_id : tutorId;
    } catch (e) {
      console.error('⚠️ [acceptClass] Lỗi map user_id → tutor_id:', e.message);
    }

    // 1. Lấy course hiện tại
    const courseRes = await fetch(`${API_BASE}/courses?course_id=${courseId}`);
    const courses = await courseRes.json();
    const course = courses[0];
    if (!course) throw new Error('Không tìm thấy lớp học');

    // 2. Kiểm tra race condition
    if (course.tutor_id) {
      return {
        success: false,
        message: 'Lớp đã có tutor khác nhận!',
        alreadyAssigned: true
      };
    }

    if (course.status !== 'pending_tutor') {
      return {
        success: false,
        message: 'Lớp không ở trạng thái chờ tutor',
      };
    }

    // 3. Cập nhật course: gán tutor (dùng actualTutorId), chuyển status
    const updated = await fetch(`${API_BASE}/courses/${course.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tutor_id: actualTutorId,
        status: 'pending_student',
        tutor_assigned_at: new Date().toISOString()
      })
    });

    const updatedCourse = await updated.json();

    // 4. Cập nhật class_suggestions của tutor này thành accepted
    const sugRes = await fetch(`${API_BASE}/class_suggestions?course_id=${courseId}&tutor_id=${actualTutorId}`);
    const suggestions = await sugRes.json();
    if (suggestions.length > 0) {
      await fetch(`${API_BASE}/class_suggestions/${suggestions[0].id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'accepted' })
      });
    }

// 5. Gửi thông báo cho tutor được nhận (dùng actualTutorId)
    const tutorRes = await fetch(`${API_BASE}/tutors?tutor_id=${actualTutorId}`);
    const tutors = await tutorRes.json();
    const tutor = tutors[0];

    const usersRes = await fetch(`${API_BASE}/users`);
    const users = await usersRes.json();
    const user = users.find(u => u.user_id === tutor?.user_id);

    if (user) {
      await createNotification({
        receiver_id: user.user_id,
        receiver_role: 'tutor',
        type: 'system',
        title: '🎉 Bạn đã nhận lớp thành công!',
        message: `Bạn đã nhận lớp "${course.title}". Học sinh sẽ đăng ký trong thời gian tới.`,
        related_id: courseId,
        related_type: 'class_suggestion'
      });
    }

    // 6. Gửi thông báo cho các tutor khác (đã gửi đề xuất nhưng chưa nhận)
    const allSuggestionsRes = await fetch(`${API_BASE}/class_suggestions?course_id=${courseId}&status=pending`);
    const pendingSuggestions = await allSuggestionsRes.json();

for (const sug of pendingSuggestions) {
      if (sug.tutor_id !== actualTutorId) {
        const otherTutorRes = await fetch(`${API_BASE}/tutors?tutor_id=${sug.tutor_id}`);
        const otherTutors = await otherTutorRes.json();
        const otherTutor = otherTutors[0];
        const otherUser = users.find(u => u.user_id === otherTutor?.user_id);

        if (otherUser) {
          await createNotification({
            receiver_id: otherUser.user_id,
            receiver_role: 'tutor',
            type: 'system',
            title: '❌ Lớp đã có tutor',
            message: `Lớp "${course.title}" đã có tutor nhận. Hẹn bạn lần sau!`,
            related_id: courseId,
            related_type: 'class_suggestion'
          });
        }

        // Cập nhật status suggestion của các tutor khác thành expired
        await fetch(`${API_BASE}/class_suggestions/${sug.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'expired' })
        });
      }
    }

    return { success: true, data: updatedCourse };
  } catch (error) {
    console.error('❌ Lỗi tutor nhận lớp:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Tạo thông báo in-app
 */
async function createNotification(data) {
  const notification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ...data,
    is_read: false,
    created_at: new Date().toISOString()
  };

  await fetch(`${API_BASE}/notifications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(notification)
  });
}

/**
 * Cron job: Kiểm tra và xử lý các lớp
 */
export async function checkClasses() {
  const now = new Date();
  const results = {
    activated: [],
    cancelled: [],
    errors: []
  };

  try {
    // Lấy tất cả lớp có status = "pending_student"
    const coursesRes = await fetch(`${API_BASE}/courses`);
    const allCourses = await coursesRes.json();
    const pendingCourses = allCourses.filter(c => c.status === 'pending_student');

    for (const course of pendingCourses) {
      const startDate = new Date(course.start_date);
      const diffDays = Math.ceil((startDate - now) / (1000 * 60 * 60 * 24));

      // Kiểm tra 5 ngày trước ngày bắt đầu
      if (diffDays <= 5) {
        const studentCount = course.students?.length || 0;
        const minStudents = course.min_students || 2;

        if (studentCount >= minStudents) {
          // Đủ học sinh → active
          await fetch(`${API_BASE}/courses/${course.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'active' })
          });
          results.activated.push(course.course_id);
          console.log(`✅ Lớp ${course.title} đã được active (${studentCount}/${minStudents} học sinh)`);
        } else {
          // Không đủ → hủy
          await cancelCourseAndRefund(course);
          results.cancelled.push(course.course_id);
          console.log(`❌ Lớp ${course.title} đã bị hủy (chỉ có ${studentCount}/${minStudents} học sinh)`);
        }
      }
    }
  } catch (error) {
    console.error('❌ Cron job error:', error);
    results.errors.push(error.message);
  }

  return results;
}

/**
 * Hủy lớp và hoàn tiền cho student
 */
async function cancelCourseAndRefund(course) {
  // 1. Cập nhật status
  await fetch(`${API_BASE}/courses/${course.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_reason: 'Không đủ số lượng học sinh đăng ký (cần tối thiểu 2 học sinh)'
    })
  });

  // 2. Hoàn tiền cho student (nếu có)
  if (course.students?.length > 0) {
    await refundStudents(course.course_id);
  }

  // 3. Thông báo cho tutor và student
  const usersRes = await fetch(`${API_BASE}/users`);
  const users = await usersRes.json();

  // Thông báo cho tutor
  if (course.tutor_id) {
    const tutorRes = await fetch(`${API_BASE}/tutors?tutor_id=${course.tutor_id}`);
    const tutors = await tutorRes.json();
    const tutor = tutors[0];
    const tutorUser = users.find(u => u.user_id === tutor?.user_id);

    if (tutorUser) {
      await createNotification({
        receiver_id: tutorUser.user_id,
        receiver_role: 'tutor',
        type: 'system',
        title: '❌ Lớp học đã bị hủy',
        message: `Lớp "${course.title}" đã bị hủy vì không đủ số lượng học sinh đăng ký.`,
        related_id: course.course_id,
        related_type: 'class_cancelled'
      });
    }
  }

  // Thông báo cho student
  for (const studentId of (course.students || [])) {
    const studentUser = users.find(u => u.user_id === studentId);
    if (studentUser) {
      await createNotification({
        receiver_id: studentUser.user_id,
        receiver_role: 'student',
        type: 'system',
        title: '❌ Lớp học đã bị hủy',
        message: `Lớp "${course.title}" đã bị hủy vì không đủ số lượng học sinh đăng ký. Tiền của bạn đã được hoàn lại.`,
        related_id: course.course_id,
        related_type: 'class_cancelled'
      });
    }
  }
}

/**
 * Hoàn tiền cho student
 */
export async function refundStudents(courseId) {
  try {
    const courseRes = await fetch(`${API_BASE}/courses?course_id=${courseId}`);
    const courses = await courseRes.json();
    const course = courses[0];
    if (!course || !course.students) return { success: true };

    // Lấy tất cả bookings của course
    const bookingsRes = await fetch(`${API_BASE}/bookings?course_id=${courseId}`);
    const bookings = await bookingsRes.json();

    for (const booking of bookings) {
      if (booking.payment_status === 'paid') {
        // Cập nhật booking: hoàn tiền
        await fetch(`${API_BASE}/bookings/${booking.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payment_status: 'refunded',
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
        });

        // Ghi nhận giao dịch hoàn tiền
        const refund = {
          id: `refund_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          booking_id: booking.booking_id,
          student_id: booking.student_id,
          course_id: courseId,
          amount: booking.payment_amount || 0,
          status: 'completed',
          created_at: new Date().toISOString()
        };

        await fetch(`${API_BASE}/refunds`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(refund)
        });
      }
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Lỗi hoàn tiền:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Tutor hủy lớp sau khi nhận
 */
export async function tutorCancelClass(courseId, tutorId) {
  try {
    const courseRes = await fetch(`${API_BASE}/courses?course_id=${courseId}`);
    const courses = await courseRes.json();
    const course = courses[0];
    if (!course) throw new Error('Không tìm thấy lớp học');

    // Kiểm tra: còn ít nhất 3 ngày đến khi khai giảng
    const now = new Date();
    const startDate = new Date(course.start_date);
    const diffDays = Math.ceil((startDate - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 3) {
      return {
        success: false,
        message: 'Không thể hủy vì còn ít hơn 3 ngày đến khi khai giảng'
      };
    }

    // 1. Reset course
    await fetch(`${API_BASE}/courses/${course.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tutor_id: null,
        status: 'pending_tutor',
        tutor_assigned_at: null,
        original_tutor: tutorId
      })
    });

    // 2. Khóa nhận đề xuất của tutor này trong 7 ngày
    const blockUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await fetch(`${API_BASE}/tutors?tutor_id=${tutorId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        receive_suggestions: false,
        suggestion_block_until: blockUntil
      })
    });

    // 3. Gửi lại đề xuất cho tất cả tutor (trừ tutor đã hủy)
    const eligibleTutors = await getEligibleTutors(course);
    const otherTutors = eligibleTutors
      .filter(t => t.tutor_id !== tutorId)
      .map(t => t.tutor_id);

    if (otherTutors.length > 0) {
      await sendSuggestions(courseId, otherTutors);
    }

    // 4. Thông báo cho student đã đăng ký
    if (course.students?.length > 0) {
      const usersRes = await fetch(`${API_BASE}/users`);
      const users = await usersRes.json();

      for (const studentId of course.students) {
        const studentUser = users.find(u => u.user_id === studentId);
        if (studentUser) {
          await createNotification({
            receiver_id: studentUser.user_id,
            receiver_role: 'student',
            type: 'system',
            title: '⚠️ Tutor đã hủy lớp học',
            message: `Tutor đã hủy lớp "${course.title}". Hệ thống sẽ tìm tutor mới cho bạn.`,
            related_id: courseId,
            related_type: 'tutor_cancelled'
          });
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Lỗi tutor hủy lớp:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Lấy danh sách đề xuất cho Tutor
 */
export async function getTutorSuggestions(tutorId) {
  try {
    // ✅ Map user_id → tutor_id (vì cookie lưu user_id, nhưng class_suggestions lưu tutor_id)
    const tutorsRes = await fetch(`${API_BASE}/tutors`);
    const tutors = await tutorsRes.json();
    const matchedTutor = tutors.find(t => t.tutor_id === tutorId || t.user_id === tutorId);
    const actualTutorId = matchedTutor ? matchedTutor.tutor_id : tutorId;

    console.log('📡 [getTutorSuggestions] Received ID:', tutorId);
    console.log('📡 [getTutorSuggestions] Mapped to tutor_id:', actualTutorId);

    // Lấy tất cả suggestions của tutor này
    const sugRes = await fetch(`${API_BASE}/class_suggestions?tutor_id=${actualTutorId}&status=pending`);
    const suggestions = await sugRes.json();

    console.log('📋 [getTutorSuggestions] Found suggestions:', suggestions.length);

    // Lấy thông tin course cho từng suggestion
    const result = [];
    for (const sug of suggestions) {
      const courseRes = await fetch(`${API_BASE}/courses?course_id=${sug.course_id}`);
      const courses = await courseRes.json();
      const course = courses[0];
      
      // ✅ Chỉ lấy các lớp đang ở trạng thái pending_tutor và chưa có tutor
      if (course && course.status === 'pending_tutor' && !course.tutor_id) {
        // Lấy category name
        const catRes = await fetch(`${API_BASE}/categories?category_id=${course.category_id}`);
        const categories = await catRes.json();
        const category = categories[0];

        result.push({
          ...course,
          suggestion_id: sug.id,
          suggested_at: sug.suggested_at,
          category_name: category?.category_name || 'Chưa phân loại'
        });
      }
    }

    console.log('✅ [getTutorSuggestions] Returning:', result.length, 'classes');

    return result;
  } catch (error) {
    console.error('❌ Lỗi lấy đề xuất:', error);
    return [];
  }
}