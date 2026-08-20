// src/services/classSuggestionService.js

const API_BASE = 'http://localhost:3007';

/**
 * Map category_id → các từ khóa môn học xuất hiện trong expertise string của tutor.
 * Tutor lưu expertise dạng chuỗi tự do ("Toán, Ngữ văn"), không dùng slug.
 */
const CATEGORY_KEYWORDS = {
  'cat-02': ['toán', 'toan'],
  'cat-03': ['ngữ văn', 'ngu van', 'văn', 'van'],
  'cat-04': ['lý', 'ly', 'vật lý', 'vat ly'],
  'cat-05': ['hóa', 'hoa', 'hóa học', 'hoa hoc'],
  'cat-06': ['sinh', 'sinh học', 'sinh hoc'],
  'cat-07': ['sử', 'su', 'lịch sử', 'lich su'],
  'cat-08': ['địa', 'dia', 'địa lý', 'dia ly'],
  'cat-09': ['anh', 'tiếng anh', 'tieng anh', 'ngoại ngữ', 'ngoai ngu'],
  'cat-10': ['tin học', 'tin hoc', 'lập trình', 'lap trinh', 'cntt'],
  'cat-11': ['năng khiếu', 'nang khieu', 'âm nhạc', 'am nhac', 'mỹ thuật', 'my thuat'],
};

/**
 * Kiểm tra tutor có dạy được môn học của lớp không.
 * So sánh dựa trên keywords thay vì slug để xử lý expertise dạng chuỗi tự do.
 */
function tutorMatchesSubject(tutor, categoryId) {
  if (!categoryId || categoryId === 'cap1_homework') return true;

  const tutorSubjects = tutor.subjects || [];
  const tutorExpertise = (tutor.expertise || '').toLowerCase();

  // Nếu tutor có mảng subjects dùng slug giống category_id
  if (tutorSubjects.includes(categoryId)) return true;

  // Nếu tutor dùng expertise dạng chuỗi, so với keyword map
  const keywords = CATEGORY_KEYWORDS[categoryId] || [];
  return keywords.some(kw => tutorExpertise.includes(kw));
}

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

    // Lọc tutor: approved, chấp nhận đề xuất lớp từ admin
    const eligible = tutors.filter(tutor => {
      // Kiểm tra điều kiện cơ bản
      if (tutor.verification_status !== 'approved') return false;

      // Hỗ trợ cả field cũ (receive_suggestions) và field mới (accept_suggested_classes).
      // Mặc định bật nếu cả hai field đều chưa tồn tại (backward-compatible).
      const acceptNew = tutor.accept_suggested_classes;
      const acceptOld = tutor.receive_suggestions;
      const acceptsSuggestions =
        acceptNew !== undefined ? acceptNew !== false
        : acceptOld !== undefined ? acceptOld === true
        : true; // chưa có field nào → mặc định bật
      if (!acceptsSuggestions) return false;

      // Kiểm tra môn học: dùng keyword map để match expertise dạng chuỗi tự do
      if (!tutorMatchesSubject(tutor, course.category_id)) return false;

      // Kiểm tra trình độ (level) của tutor (Sinh viên / Giáo viên)
      // Data dùng field 'level', không phải 'tutor_level'
      const tutorLvl = tutor.tutor_level || tutor.level;
      if (course.tutor_level && tutorLvl !== course.tutor_level) {
        return false;
      }

      // Kiểm tra lịch trùng: tutor không được dạy 2 lớp cùng giờ cùng ngày.
      // Chỉ xét các lớp đã có tutor_id (đã được nhận), bỏ qua lớp pending_tutor
      // vì lớp chưa có tutor chưa chiếm lịch của ai.
      const hasConflict = allCourses.some(existingCourse => {
        // Chỉ kiểm tra lớp đã được gán cho tutor này
        if (existingCourse.tutor_id !== tutor.tutor_id) return false;
        if (!existingCourse.tutor_id) return false; // chưa có tutor → không conflict

        // Bỏ qua các lớp đã kết thúc / huỷ
        if (existingCourse.status === 'cancelled') return false;
        if (existingCourse.status === 'closed') return false;
        if (existingCourse.status === 'completed') return false;

        // Kiểm tra trùng ngày
        const hasCommonDay = existingCourse.schedule_days?.some(day =>
          course.schedule_days?.includes(day)
        );
        if (!hasCommonDay) return false;

        // Kiểm tra trùng giờ (overlap)
        const [newStart, newEnd] = course.time_slot?.split('-').map(s => s.trim()) || [];
        const [existStart, existEnd] = existingCourse.time_slot?.split('-').map(s => s.trim()) || [];
        if (!newStart || !newEnd || !existStart || !existEnd) return false;

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
 * Tutor nhận lớp — phân slot theo thứ tự xác nhận (Nhóm 1 → 5).
 *
 * Luồng:
 *  1. Gia sư gửi xác nhận với bất kỳ courseId nào trong cùng parent_course_id.
 *  2. Hệ thống tìm slot (Nhóm) có slot_number thấp nhất còn trống (pending_tutor, chưa có tutor_id).
 *  3. Gán gia sư vào đúng slot đó.
 *  4. Nếu tất cả 5 slot đã có gia sư → trả về "Lớp đã có đủ gia sư".
 */
export async function acceptClass(courseId, tutorId) {
  try {
    // ✅ Map user_id → tutor_id
    let actualTutorId = tutorId;
    try {
      const tutorsRes = await fetch(`${API_BASE}/tutors`);
      const tutors = await tutorsRes.json();
      const matchedTutor = (tutors || []).find(t => t.tutor_id === tutorId || t.user_id === tutorId);
      actualTutorId = matchedTutor ? matchedTutor.tutor_id : tutorId;
    } catch (e) {
      console.error('⚠️ [acceptClass] Lỗi map user_id → tutor_id:', e.message);
    }

    // 1. Lấy course được gửi lên để biết parent_course_id
    const courseRes = await fetch(`${API_BASE}/courses?course_id=${courseId}`);
    const courses = await courseRes.json();
    const requestedCourse = courses[0];
    if (!requestedCourse) throw new Error('Không tìm thấy lớp học');

    const parentId = requestedCourse.parent_course_id || requestedCourse.course_id;

    // 2. Lấy tất cả courses trong cùng nhóm (cùng parent_course_id), sắp theo slot_number
    const allCoursesRes = await fetch(`${API_BASE}/courses`);
    const allCourses = await allCoursesRes.json();

    const siblingSlots = allCourses
      .filter(c => (c.parent_course_id === parentId || c.course_id === parentId))
      .sort((a, b) => (a.slot_number || 1) - (b.slot_number || 1));

    // 3. Kiểm tra gia sư đã nhận 1 slot trong nhóm này chưa
    const alreadyInGroup = siblingSlots.some(c => c.tutor_id === actualTutorId);
    if (alreadyInGroup) {
      return {
        success: false,
        message: 'Bạn đã nhận dạy một mã lớp trong cùng khóa học này rồi!',
        alreadyAssigned: true
      };
    }

    // 4. Tìm slot có số thứ tự thấp nhất còn trống (pending_tutor, chưa có tutor_id)
    const freeSlot = siblingSlots.find(
      c => c.status === 'pending_tutor' && !c.tutor_id
    );

    if (!freeSlot) {
      // Tất cả 5 slot đã có gia sư
      return {
        success: false,
        message: 'Lớp đã có đủ gia sư nhận! Hẹn bạn ở lớp khác.',
        alreadyAssigned: true,
        classFull: true
      };
    }

    // 5. Kiểm tra giới hạn 5 lớp/cùng khung giờ của tutor
    const tutorActiveClassesInSlot = allCourses.filter(c =>
      c.tutor_id === actualTutorId &&
      c.status !== 'cancelled' &&
      c.status !== 'completed' &&
      c.time_slot === freeSlot.time_slot &&
      c.schedule_days?.some(day => freeSlot.schedule_days?.includes(day))
    );

    if (tutorActiveClassesInSlot.length >= 5) {
      return {
        success: false,
        message: 'Bạn đã đạt giới hạn tối đa 5 lớp trong cùng khung giờ này!',
      };
    }

    // 6. Gán tutor vào slot trống đó
    const updated = await fetch(`${API_BASE}/courses/${freeSlot.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tutor_id: actualTutorId,
        status: 'pending_student',
        tutor_assigned_at: new Date().toISOString()
      })
    });

    const updatedCourse = await updated.json();

    // 7. Cập nhật class_suggestions của tutor → accepted (cho mã lớp được gán)
    const sugRes = await fetch(
      `${API_BASE}/class_suggestions?course_id=${freeSlot.course_id}&tutor_id=${actualTutorId}`
    );
    const suggestions = await sugRes.json();
    if (suggestions.length > 0) {
      await fetch(`${API_BASE}/class_suggestions/${suggestions[0].id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'accepted' })
      });
    }

    // 8. Thông báo cho tutor được gán
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
        message: `Bạn đã nhận "${freeSlot.title}" (Nhóm ${freeSlot.slot_number || '?'}). Học sinh sẽ đăng ký trong thời gian tới.`,
        related_id: freeSlot.course_id,
        related_type: 'class_suggestion'
      });
    }

    // 9. Kiểm tra xem nhóm này đã kín hết chưa → nếu kín, thông báo cho các tutor pending còn lại
    const remainingFreeSlots = siblingSlots.filter(
      c => c.status === 'pending_tutor' && !c.tutor_id && c.course_id !== freeSlot.course_id
    );

    if (remainingFreeSlots.length === 0) {
      // Tất cả slot đã đầy — thông báo cho các tutor pending khác
      const pendingSuggestionsRes = await fetch(
        `${API_BASE}/class_suggestions?course_id=${freeSlot.course_id}&status=pending`
      );
      const pendingSuggestions = await pendingSuggestionsRes.json();

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
              title: '❌ Lớp đã có đủ gia sư',
              message: `Lớp "${requestedCourse.title}" đã có đủ 5 gia sư nhận dạy. Hẹn bạn lần sau!`,
              related_id: freeSlot.course_id,
              related_type: 'class_suggestion'
            });
          }

          await fetch(`${API_BASE}/class_suggestions/${sug.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'expired' })
          });
        }
      }
    }

    return {
      success: true,
      data: updatedCourse,
      assignedSlot: freeSlot.slot_number,
      remainingSlots: remainingFreeSlots.length
    };
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
        accept_suggested_classes: false,
        receive_suggestions: false, // giữ field cũ để tương thích
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
 * Hiển thị mỗi nhóm lớp (parent_course_id) 1 lần — kèm thông tin số slot còn trống.
 */
export async function getTutorSuggestions(tutorId) {
  try {
    // ✅ Map user_id → tutor_id
    const tutorsRes = await fetch(`${API_BASE}/tutors`);
    const tutors = await tutorsRes.json();
    const matchedTutor = tutors.find(t => t.tutor_id === tutorId || t.user_id === tutorId);
    const actualTutorId = matchedTutor ? matchedTutor.tutor_id : tutorId;

    console.log('📡 [getTutorSuggestions] Received ID:', tutorId);
    console.log('📡 [getTutorSuggestions] Mapped to tutor_id:', actualTutorId);

    // Lấy tất cả suggestions pending của tutor này
    const sugRes = await fetch(`${API_BASE}/class_suggestions?tutor_id=${actualTutorId}&status=pending`);
    const suggestions = await sugRes.json();

    console.log('📋 [getTutorSuggestions] Found suggestions:', suggestions.length);

    // Lấy tất cả courses 1 lần để tính slot
    const allCoursesRes = await fetch(`${API_BASE}/courses`);
    const allCourses = await allCoursesRes.json();

    // Gom theo parent_course_id để tránh hiển thị trùng
    const seenParents = new Set();
    const result = [];

    for (const sug of suggestions) {
      const course = allCourses.find(c => c.course_id === sug.course_id);
      if (!course) continue;

      const parentId = course.parent_course_id || course.course_id;

      // Bỏ qua nếu đã xử lý nhóm này
      if (seenParents.has(parentId)) continue;
      seenParents.add(parentId);

      // Đếm slot còn trống trong nhóm
      const siblingsInGroup = allCourses.filter(
        c => (c.parent_course_id === parentId || c.course_id === parentId)
      );
      const freeSlots = siblingsInGroup.filter(
        c => c.status === 'pending_tutor' && !c.tutor_id
      ).length;
      const totalSlots = siblingsInGroup.length;

      // Nếu không còn slot nào → gia sư thấy "Lớp đã có đủ gia sư"
      if (freeSlots === 0) continue;

      // Lấy category name
      const catRes = await fetch(`${API_BASE}/categories?category_id=${course.category_id}`);
      const categories = await catRes.json();
      const category = categories[0];

      result.push({
        ...course,
        suggestion_id: sug.id,
        suggested_at: sug.suggested_at,
        category_name: category?.category_name || 'Chưa phân loại',
        free_slots: freeSlots,
        total_slots: totalSlots,
        slots_full: freeSlots === 0,
      });
    }

    console.log('✅ [getTutorSuggestions] Returning:', result.length, 'classes');

    return result;
  } catch (error) {
    console.error('❌ Lỗi lấy đề xuất:', error);
    return [];
  }
}