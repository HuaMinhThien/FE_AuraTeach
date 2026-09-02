import { NextResponse } from 'next/server';

const JSON_SERVER_URL = process.env.NEXT_PUBLIC_JSON_SERVER_URL || 'http://localhost:3007';

// ====================== GET ======================
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ success: false, message: 'Thiếu user_id' }, { status: 400 });
    }

    // 1. Tìm gia sư
    let tutorRes = await fetch(`${JSON_SERVER_URL}/tutors?user_id=${userId}`, { cache: 'no-store' });
    let tutors = await tutorRes.json();
    let tutor = Array.isArray(tutors) ? tutors[0] : null;

    if (!tutor) {
      tutorRes = await fetch(`${JSON_SERVER_URL}/tutors?id=${userId}`, { cache: 'no-store' });
      tutors = await tutorRes.json();
      tutor = Array.isArray(tutors) ? tutors[0] : null;
    }

    if (!tutor) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy hồ sơ Gia sư' }, { status: 404 });
    }

    const tutorId = tutor.tutor_id;

    // 2. Lấy song song dữ liệu
    const [bankAccountsRes, payoutRes, sessionsRes, coursesRes] = await Promise.all([
      fetch(`${JSON_SERVER_URL}/tutor_bank_accounts?tutor_id=${tutorId}`, { cache: 'no-store' }),
      fetch(`${JSON_SERVER_URL}/tutor_payouts?tutor_id=${tutorId}`, { cache: 'no-store' }),
      fetch(`${JSON_SERVER_URL}/class_sessions`, { cache: 'no-store' }),
      fetch(`${JSON_SERVER_URL}/courses`, { cache: 'no-store' }),
    ]);

    const bankAccounts = (await bankAccountsRes.json()) || [];
    let payoutHistory = (await payoutRes.json()) || [];

    // Sắp xếp mới nhất lên đầu
    if (Array.isArray(payoutHistory)) {
      payoutHistory.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else {
      payoutHistory = [];
    }

    // 3. Tính Tiền lương tháng này
    // Công thức: (price_per_session * số học sinh thực tế) * 0.65
    // Chỉ tính khi lớp thực sự có học sinh
    let monthlySalary = 0;
    try {
      const allSessions = await sessionsRes.json();
      const allCourses = await coursesRes.json();

      if (Array.isArray(allSessions) && Array.isArray(allCourses)) {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

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

          // ===== CHỈ TÍNH KHI LỚP CÓ HỌC SINH THỰC TẾ =====
          let numStudents = 0;
          if (Array.isArray(course.students) && course.students.length > 0) {
            numStudents = course.students.length;
          }
          // Nếu không có học sinh → numStudents = 0 → không cộng tiền
          // ==================================================

          monthlySalary += price * numStudents * 0.65;
        });

        monthlySalary = Math.round(monthlySalary);
      }
    } catch (err) {
      console.error('Lỗi tính monthlySalary:', err);
      monthlySalary = 0;
    }

    return NextResponse.json({
      success: true,
      data: {
        tutor,
        bankAccounts,
        payoutHistory,
        monthlySalary,
      },
    });
  } catch (error) {
    console.error('Lỗi GET API tutor-payout-requests:', error);
    return NextResponse.json({ success: false, message: 'Lỗi máy chủ nội bộ' }, { status: 500 });
  }
}

// ====================== POST ======================
export async function POST(request) {
  try {
    const body = await request.json();
    const { action } = body;

    // A. Thêm tài khoản ngân hàng mới
    if (action === 'add_bank_account') {
      const {
        tutor_id,
        bank_name,
        bank_code,
        account_number,
        account_holder_name,
        is_default,
      } = body;

      if (!tutor_id || !bank_name || !account_number || !account_holder_name) {
        return NextResponse.json(
          { success: false, message: 'Vui lòng điền đầy đủ thông tin ngân hàng' },
          { status: 400 }
        );
      }

      // Bỏ mặc định các tài khoản cũ nếu cần
      if (is_default) {
        const oldBanksRes = await fetch(
          `${JSON_SERVER_URL}/tutor_bank_accounts?tutor_id=${tutor_id}`,
          { cache: 'no-store' }
        );
        const oldBanks = await oldBanksRes.json();

        if (Array.isArray(oldBanks)) {
          for (const bank of oldBanks) {
            if (bank.is_default) {
              await fetch(`${JSON_SERVER_URL}/tutor_bank_accounts/${bank.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_default: false }),
              });
            }
          }
        }
      }

      const newBankAccount = {
        bank_account_id: `bank_${Date.now()}`,
        tutor_id,
        bank_name,
        bank_code: bank_code || bank_name.substring(0, 5).toUpperCase(),
        account_number,
        account_holder_name: account_holder_name.toUpperCase(),
        is_default: Boolean(is_default),
        created_at: new Date().toISOString(),
      };

      const saveRes = await fetch(`${JSON_SERVER_URL}/tutor_bank_accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBankAccount),
      });

      if (!saveRes.ok) throw new Error('Không thể lưu tài khoản ngân hàng');

      const savedData = await saveRes.json();

      return NextResponse.json({
        success: true,
        message: 'Thêm ngân hàng thành công',
        data: savedData,
      });
    }

    // B. Đặt ngân hàng làm mặc định
    if (action === 'set_default_bank') {
      const { tutor_id, bank_account_id } = body;

      if (!tutor_id || !bank_account_id) {
        return NextResponse.json(
          { success: false, message: 'Thiếu thông tin tutor_id hoặc bank_account_id' },
          { status: 400 }
        );
      }

      // Lấy tất cả tài khoản của gia sư
      const banksRes = await fetch(
        `${JSON_SERVER_URL}/tutor_bank_accounts?tutor_id=${tutor_id}`,
        { cache: 'no-store' }
      );
      const banks = await banksRes.json();

      if (!Array.isArray(banks) || banks.length === 0) {
        return NextResponse.json(
          { success: false, message: 'Không tìm thấy tài khoản ngân hàng' },
          { status: 404 }
        );
      }

      // Cập nhật: tài khoản được chọn → true, các tài khoản khác → false
      for (const bank of banks) {
        const shouldBeDefault =
          bank.bank_account_id === bank_account_id || bank.id === bank_account_id;

        await fetch(`${JSON_SERVER_URL}/tutor_bank_accounts/${bank.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_default: shouldBeDefault }),
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Đã đặt tài khoản làm mặc định thành công',
      });
    }

    return NextResponse.json(
      { success: false, message: 'Hành động không được hỗ trợ' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Lỗi POST API tutor-payout-requests:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi máy chủ nội bộ' },
      { status: 500 }
    );
  }
}