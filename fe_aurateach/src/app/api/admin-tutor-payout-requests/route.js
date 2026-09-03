import { NextResponse } from 'next/server';
import notificationService from '@/services/notificationService';

const API_BASE = 'http://localhost:3007';

// ======================================================
// ĐỔI NGÀY NÀY ĐỂ TEST CHỨC NĂNG TỰ ĐỘNG TẠO LƯƠNG
// Ví dụ: đổi thành 21 để test ngay hôm nay
const AUTO_CREATE_PAYOUT_DAY = 10;
// ======================================================

// Hàm tính lương tháng hiện tại cho 1 gia sư
async function calculateTutorMonthlySalary(tutorId, allSessions, allCourses) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  let totalAmount = 0;
  let totalSessions = 0;

  const tutorCourses = allCourses.filter((c) => c.tutor_id === tutorId);

  allSessions.forEach((session) => {
    if (session.session_status !== 'completed') return;

    const course = tutorCourses.find(
      (c) => (c.course_id || c.id) === session.course_id
    );
    if (!course) return;

    const sessionDate = new Date(session.actual_date);
    if (
      sessionDate.getFullYear() !== currentYear ||
      sessionDate.getMonth() !== currentMonth
    ) {
      return;
    }

    const price = Number(course.price_per_session) || 0;
    let numStudents = 0;
    if (Array.isArray(course.students) && course.students.length > 0) {
      numStudents = course.students.length;
    }

    if (numStudents > 0) {
      totalAmount += price * numStudents * 0.65;
      totalSessions += 1;
    }
  });

  return {
    total_amount: Math.round(totalAmount),
    total_sessions: totalSessions,
  };
}

// Hàm tự động tạo tutor_payouts vào ngày quy định
async function autoCreateMonthlyPayouts() {
  const now = new Date();
  const today = now.getDate();

  // Chỉ chạy vào đúng ngày đã cấu hình
  if (today !== AUTO_CREATE_PAYOUT_DAY) {
    return { created: 0, message: `Hôm nay không phải ngày ${AUTO_CREATE_PAYOUT_DAY}` };
  }

  try {
    const [tutorsRes, sessionsRes, coursesRes, banksRes, payoutsRes] = await Promise.all([
      fetch(`${API_BASE}/tutors`, { cache: 'no-store' }),
      fetch(`${API_BASE}/class_sessions`, { cache: 'no-store' }),
      fetch(`${API_BASE}/courses`, { cache: 'no-store' }),
      fetch(`${API_BASE}/tutor_bank_accounts`, { cache: 'no-store' }),
      fetch(`${API_BASE}/tutor_payouts`, { cache: 'no-store' }),
    ]);

    const tutors = await tutorsRes.json();
    const allSessions = await sessionsRes.json();
    const allCourses = await coursesRes.json();
    const allBanks = await banksRes.json();
    const existingPayouts = await payoutsRes.json();

    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    let createdCount = 0;

    for (const tutor of tutors) {
      // Tính lương tháng này
      const { total_amount, total_sessions } = await calculateTutorMonthlySalary(
        tutor.tutor_id,
        allSessions,
        allCourses
      );

      // Chỉ tạo nếu có buổi dạy hoàn thành
      if (total_sessions === 0 || total_amount === 0) continue;

      // Kiểm tra đã có payout của tháng này chưa (tránh tạo trùng)
      const alreadyExists = existingPayouts.some((p) => {
        if (p.tutor_id !== tutor.tutor_id) return false;
        const created = new Date(p.created_at);
        return (
          created.getFullYear() === currentYear &&
          created.getMonth() === currentMonth
        );
      });

      if (alreadyExists) continue;

      // Lấy tài khoản ngân hàng mặc định
      const tutorBanks = allBanks.filter((b) => b.tutor_id === tutor.tutor_id);
      const defaultBank =
        tutorBanks.find((b) => b.is_default) || tutorBanks[0] || null;

      if (!defaultBank) continue; // Không có ngân hàng thì bỏ qua

      const newPayout = {
        tutor_payout_id: `tutor_payout_${Date.now()}_${tutor.tutor_id}`,
        tutor_id: tutor.tutor_id,
        admin_id: '',
        bank_account_id: defaultBank.bank_account_id || defaultBank.id,
        total_amount,
        total_sessions,
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      const createRes = await fetch(`${API_BASE}/tutor_payouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPayout),
      });

      if (createRes.ok) {
        createdCount++;
      }
    }

    return { created: createdCount, message: `Đã tạo ${createdCount} phiếu lương` };
  } catch (err) {
    console.error('Lỗi autoCreateMonthlyPayouts:', err);
    return { created: 0, message: 'Lỗi khi tạo phiếu lương tự động' };
  }
}

// ====================== GET ======================
export async function GET() {
  try {
    // 1. Chạy logic tự động tạo phiếu lương (nếu đúng ngày)
    const autoResult = await autoCreateMonthlyPayouts();
    console.log('[Auto Payout]', autoResult.message);

    // 2. Lấy danh sách tutor_payouts đang pending
    const [payoutRes, bankRes, tutorRes, userRes] = await Promise.all([
      fetch(`${API_BASE}/tutor_payouts?status=pending`, { cache: 'no-store' }),
      fetch(`${API_BASE}/tutor_bank_accounts`, { cache: 'no-store' }),
      fetch(`${API_BASE}/tutors`, { cache: 'no-store' }),
      fetch(`${API_BASE}/users`, { cache: 'no-store' }),
    ]);

    if (!payoutRes.ok || !bankRes.ok || !tutorRes.ok || !userRes.ok) {
      return NextResponse.json(
        { message: 'Không thể kết nối đến cơ sở dữ liệu' },
        { status: 500 }
      );
    }

    const payouts = await payoutRes.json();
    const bankAccounts = await bankRes.json();
    const tutors = await tutorRes.json();
    const users = await userRes.json();

    const enriched = (Array.isArray(payouts) ? payouts : []).map((p) => {
      const tutor = tutors.find((t) => t.tutor_id === p.tutor_id);
      const user = users.find((u) => u.user_id === tutor?.user_id);
      const bank = bankAccounts.find(
        (b) =>
          b.bank_account_id === p.bank_account_id ||
          b.id === p.bank_account_id
      );

      return {
        ...p,
        tutor_name: user?.full_name || 'Gia sư',
        tutor_email: user?.email || '',
        tutor_avatar: user?.avatar || '/img/default-avatar.svg',
        bank_name: bank?.bank_name || 'Chưa cập nhật',
        bank_code: bank?.bank_code || '',
        account_number: bank?.account_number || 'Chưa cập nhật',
        account_holder_name: bank?.account_holder_name || 'Chưa cập nhật',
      };
    });

    // Sắp xếp mới nhất lên đầu
    enriched.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return NextResponse.json(enriched, { status: 200 });
  } catch (error) {
    console.error('Lỗi GET admin-tutor-payout-requests:', error);
    return NextResponse.json(
      { message: 'Lỗi máy chủ nội bộ', error: error.message },
      { status: 500 }
    );
  }
}

// ====================== PATCH ======================
// Xác nhận thanh toán lương (pending → completed)
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { id, status, processed_by } = body;

    if (!id || !status) {
      return NextResponse.json(
        { message: 'Thiếu thông tin bắt buộc (id, status)' },
        { status: 400 }
      );
    }

    // Chỉ cho phép chuyển sang completed
    if (status !== 'completed') {
      return NextResponse.json(
        { message: 'Chỉ hỗ trợ trạng thái completed' },
        { status: 400 }
      );
    }

    // Lấy thông tin hiện tại
    const payoutRes = await fetch(`${API_BASE}/tutor_payouts/${id}`, {
      cache: 'no-store',
    });
    if (!payoutRes.ok) {
      return NextResponse.json(
        { message: 'Không tìm thấy phiếu lương' },
        { status: 404 }
      );
    }
    const currentPayout = await payoutRes.json();

    // Cập nhật status
    const updateRes = await fetch(`${API_BASE}/tutor_payouts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'completed',
        user_id: processed_by || 'admin_system',
        created_at: new Date().toISOString(),
      }),
    });

    if (!updateRes.ok) {
      return NextResponse.json(
        { message: 'Cập nhật trạng thái thất bại' },
        { status: 500 }
      );
    }

    const updated = await updateRes.json();

    // Gửi thông báo cho gia sư (nếu có service)
    try {
      const tutorsRes = await fetch(`${API_BASE}/tutors`, { cache: 'no-store' });
      const tutors = await tutorsRes.json();
      const currentTutor = tutors.find((t) => t.tutor_id === currentPayout.tutor_id);

      const usersRes = await fetch(`${API_BASE}/users`, { cache: 'no-store' });
      const users = await usersRes.json();
      const currentUser = users.find((u) => u.user_id === currentTutor?.user_id);

      if (currentUser && currentTutor) {
        await notificationService.notifyPayoutStatus({
          tutor: currentUser,
          payoutRequest: currentPayout,
          status: 'completed',
          reason: null,
        });
      }
    } catch (notifError) {
      console.error('Lỗi gửi thông báo:', notifError);
    }

    return NextResponse.json(
      { message: 'Đã xác nhận thanh toán lương thành công', data: updated },
      { status: 200 }
    );
  } catch (error) {
    console.error('Lỗi PATCH admin-tutor-payout-requests:', error);
    return NextResponse.json(
      { message: 'Lỗi máy chủ nội bộ', error: error.message },
      { status: 500 }
    );
  }
}