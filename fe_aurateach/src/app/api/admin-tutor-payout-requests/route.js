import { NextResponse } from 'next/server';
import notificationService from '@/services/notificationService';

const API_BASE = 'http://localhost:3007';

// 1. GET: Lấy danh sách yêu cầu rút tiền
export async function GET() {
  try {
    const [reqRes, bankRes, tutorRes, userRes] = await Promise.all([
      fetch(`${API_BASE}/payout_requests`, { cache: 'no-store' }),
      fetch(`${API_BASE}/tutor_bank_accounts`, { cache: 'no-store' }),
      fetch(`${API_BASE}/tutors`, { cache: 'no-store' }),
      fetch(`${API_BASE}/users`, { cache: 'no-store' }),
    ]);

    if (!reqRes.ok || !bankRes.ok || !tutorRes.ok || !userRes.ok) {
      return NextResponse.json(
        { message: 'Không thể kết nối đến cơ sở dữ liệu' },
        { status: 500 }
      );
    }

    const payoutRequests = await reqRes.json();
    const bankAccounts = await bankRes.json();
    const tutors = await tutorRes.json();
    const users = await userRes.json();

    const enrichedRequests = payoutRequests.map((req) => {
      const tutor = tutors.find((t) => t.tutor_id === req.tutor_id);
      const user = users.find((u) => u.user_id === tutor?.user_id);
      const bank = bankAccounts.find((b) => b.bank_account_id === req.bank_account_id);

      return {
        ...req,
        tutor_name: user?.full_name || 'Gia sư',
        tutor_email: user?.email || '',
        tutor_avatar: user?.avatar || '/img/default-avatar.svg',
        available_balance: tutor?.available_balance || 0,
        bank_name: bank?.bank_name || 'Chưa cập nhật',
        bank_code: bank?.bank_code || '',
        account_number: bank?.account_number || 'Chưa cập nhật',
        account_holder_name: bank?.account_holder_name || 'Chưa cập nhật',
        // Lưu thêm thông tin tutor và user để dùng cho notification
        _tutor: tutor,
        _user: user,
      };
    });

    enrichedRequests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return NextResponse.json(enrichedRequests, { status: 200 });
  } catch (error) {
    console.error('Lỗi khi tải yêu cầu rút tiền:', error);
    return NextResponse.json(
      { message: 'Lỗi máy chủ nội bộ', error: error.message },
      { status: 500 }
    );
  }
}

// 2. PATCH: Xử lý Phê duyệt (approved) hoặc Từ chối (rejected)
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { id, status, rejection_reason, processed_by } = body;

    if (!id || !status) {
      return NextResponse.json(
        { message: 'Thiếu thông tin bắt buộc (id, status)' },
        { status: 400 }
      );
    }

    // Lấy thông tin yêu cầu rút tiền hiện tại
    const payoutReqRes = await fetch(`${API_BASE}/payout_requests/${id}`, { cache: 'no-store' });
    if (!payoutReqRes.ok) {
      return NextResponse.json(
        { message: 'Không tìm thấy yêu cầu rút tiền' },
        { status: 404 }
      );
    }
    const currentPayoutReq = await payoutReqRes.json();

    // Lấy thông tin tutor và user
    const tutorsRes = await fetch(`${API_BASE}/tutors`, { cache: 'no-store' });
    const tutors = await tutorsRes.json();
    const currentTutor = tutors.find((t) => t.tutor_id === currentPayoutReq.tutor_id);

    const usersRes = await fetch(`${API_BASE}/users`, { cache: 'no-store' });
    const users = await usersRes.json();
    const currentUser = users.find((u) => u.user_id === currentTutor?.user_id);

    // Cập nhật trạng thái của payout_request
    const updateReqRes = await fetch(`${API_BASE}/payout_requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        rejection_reason: status === 'rejected' ? rejection_reason : null,
        processed_by: processed_by || 'admin_system',
        processed_at: new Date().toISOString(),
      }),
    });

    if (!updateReqRes.ok) {
      return NextResponse.json(
        { message: 'Cập nhật trạng thái yêu cầu thất bại' },
        { status: 500 }
      );
    }

    const updatedPayoutReq = await updateReqRes.json();

    // NẾU TỪ CHỐI (rejected): Hoàn trả lại số tiền
    if (status === 'rejected') {
      if (currentTutor) {
        const restoredBalance = (currentTutor.available_balance || 0) + (currentPayoutReq.amount || 0);
        await fetch(`${API_BASE}/tutors/${currentTutor.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            available_balance: restoredBalance,
            updated_at: new Date().toISOString(),
          }),
        });
      }

      // === GỬI THÔNG BÁO TỪ CHỐI CHO TUTOR ===
      try {
        if (currentUser && currentTutor) {
          await notificationService.notifyPayoutStatus({
            tutor: currentUser,
            payoutRequest: currentPayoutReq,
            status: 'rejected',
            reason: rejection_reason || 'Không có lý do cụ thể',
          });
          console.log(`📬 Đã gửi thông báo từ chối rút tiền cho ${currentUser.email}`);
        }
      } catch (notifError) {
        console.error("❌ Lỗi gửi thông báo từ chối rút tiền:", notifError);
      }
    }

    // NẾU PHÊ DUYỆT (approved)
    if (status === 'approved') {
      // === GỬI THÔNG BÁO PHÊ DUYỆT CHO TUTOR ===
      try {
        if (currentUser && currentTutor) {
          await notificationService.notifyPayoutStatus({
            tutor: currentUser,
            payoutRequest: currentPayoutReq,
            status: 'approved',
            reason: null,
          });
          console.log(`📬 Đã gửi thông báo phê duyệt rút tiền cho ${currentUser.email}`);
        }
      } catch (notifError) {
        console.error("❌ Lỗi gửi thông báo phê duyệt rút tiền:", notifError);
      }
    }

    return NextResponse.json(
      { message: 'Cập nhật thành công', data: updatedPayoutReq },
      { status: 200 }
    );
  } catch (error) {
    console.error('Lỗi khi xử lý yêu cầu rút tiền:', error);
    return NextResponse.json(
      { message: 'Lỗi máy chủ nội bộ', error: error.message },
      { status: 500 }
    );
  }
}