import { NextResponse } from 'next/server';

const JSON_SERVER_URL = 'http://localhost:3007';

// 1. GET: Lấy toàn bộ dữ liệu cần thiết cho trang Thu nhập của Gia sư
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ success: false, message: 'Thiếu user_id' }, { status: 400 });
    }

    // 1. Tìm gia sư theo user_id
    let tutorRes = await fetch(`${JSON_SERVER_URL}/tutors?user_id=${userId}`, { cache: 'no-store' });
    let tutors = await tutorRes.json();
    let tutor = tutors[0];

    // 2. Dự phòng: Nếu không tìm thấy theo user_id, thử tìm theo id
    if (!tutor) {
      tutorRes = await fetch(`${JSON_SERVER_URL}/tutors?id=${userId}`, { cache: 'no-store' });
      tutors = await tutorRes.json();
      tutor = tutors[0];
    }

    if (!tutor) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy hồ sơ Gia sư' }, { status: 404 });
    }

    // Lấy danh sách ngân hàng & danh sách yêu cầu rút tiền của Gia sư này
    const [bankAccountsRes, payoutRequestsRes] = await Promise.all([
      fetch(`${JSON_SERVER_URL}/tutor_bank_accounts?tutor_id=${tutor.tutor_id}`, { cache: 'no-store' }),
      fetch(`${JSON_SERVER_URL}/payout_requests?tutor_id=${tutor.tutor_id}`, { cache: 'no-store' }),
    ]);

    const bankAccounts = (await bankAccountsRes.json()) || [];
    const payoutRequests = (await payoutRequestsRes.json()) || [];

    // Sắp xếp yêu cầu rút tiền mới nhất lên đầu
    payoutRequests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return NextResponse.json({
      success: true,
      data: {
        tutor,
        bankAccounts,
        payoutRequests,
      },
    });
  } catch (error) {
    console.error('Lỗi GET API payout-requests:', error);
    return NextResponse.json({ success: false, message: 'Lỗi máy chủ nội bộ' }, { status: 500 });
  }
}

// 2. POST: Xử lý tạo mới Ngân hàng hoặc Tạo yêu cầu rút tiền
export async function POST(request) {
  try {
    const body = await request.json();
    const { action } = body;

    // A. THÊM TÀI KHOẢN NGÂN HÀNG MỚI
    if (action === 'add_bank_account') {
      const { tutor_id, bank_name, bank_code, account_number, account_holder_name, is_default } = body;

      if (!tutor_id || !bank_name || !account_number || !account_holder_name) {
        return NextResponse.json({ success: false, message: 'Vui lòng điền đầy đủ thông tin ngân hàng' }, { status: 400 });
      }

      // Nếu tài khoản mới đặt là default, chuyển các tài khoản cũ về is_default = false
      if (is_default) {
        const oldBanksRes = await fetch(`${JSON_SERVER_URL}/tutor_bank_accounts?tutor_id=${tutor_id}`);
        const oldBanks = await oldBanksRes.json();
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

      const savedData = await saveRes.json();
      return NextResponse.json({ success: true, message: 'Thêm ngân hàng thành công', data: savedData });
    }

    // B. TẠO YÊU CẦU RÚT TIỀN (Chuẩn theo ERD Payout_requests)
    if (action === 'create_payout_request') {
      const { tutor_id, bank_account_id, amount } = body;

      if (!tutor_id || !bank_account_id || !amount || amount <= 0) {
        return NextResponse.json({ success: false, message: 'Thông tin yêu cầu rút tiền không hợp lệ' }, { status: 400 });
      }

      // Kiểm tra số dư của Gia sư
      const tutorRes = await fetch(`${JSON_SERVER_URL}/tutors?tutor_id=${tutor_id}`);
      const tutors = await tutorRes.json();
      const tutor = tutors[0];

      if (!tutor) {
        return NextResponse.json({ success: false, message: 'Gia sư không tồn tại' }, { status: 404 });
      }

      if ((tutor.available_balance || 0) < amount) {
        return NextResponse.json({ success: false, message: 'Số dư khả dụng không đủ để thực hiện giao dịch' }, { status: 400 });
      }

      const requestCode = `PR-${Date.now().toString().slice(-6)}`;

      const newPayoutRequest = {
        payout_req_id: `pr_${Date.now()}`,
        bank_account_id,
        tutor_id,
        processed_by: null,
        request_code: requestCode,
        amount: Number(amount),
        status: 'pending', // 'pending' | 'approved' | 'rejected'
        rejection_reason: null,
        processed_at: null,
        created_at: new Date().toISOString(),
      };

      // 1. Lưu bản ghi rút tiền
      const saveReq = await fetch(`${JSON_SERVER_URL}/payout_requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPayoutRequest),
      });

      // 2. Tạm trừ số tiền khỏi ví khả dụng (available_balance)
      const updatedAvailable = (tutor.available_balance || 0) - amount;
      await fetch(`${JSON_SERVER_URL}/tutors/${tutor.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ available_balance: updatedAvailable }),
      });

      const savedData = await saveReq.json();
      return NextResponse.json({ success: true, message: 'Tạo yêu cầu rút tiền thành công', data: savedData });
    }

    return NextResponse.json({ success: false, message: 'Hành động không được hỗ trợ' }, { status: 400 });
  } catch (error) {
    console.error('Lỗi POST API payout-requests:', error);
    return NextResponse.json({ success: false, message: 'Lỗi máy chủ nội bộ' }, { status: 500 });
  }
}