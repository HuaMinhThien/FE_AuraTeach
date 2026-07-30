import { NextResponse } from "next/server";

const API_BASE = "http://localhost:3007";

// POST: Tutor yêu cầu rút tiền (chuyển available_balance → ví ngân hàng)
export async function POST(request) {
  try {
    const body = await request.json();
    const { tutorId, amount, bankInfo } = body;

    console.log("📤 [Payout Request] Request:", { tutorId, amount, bankInfo });

    if (!tutorId || !amount) {
      return NextResponse.json(
        { success: false, message: "Thiếu thông tin bắt buộc" },
        { status: 400 }
      );
    }

    // 1. Tìm tutor
    const tutorRes = await fetch(`${API_BASE}/tutors?tutor_id=${tutorId}`);
    const tutors = await tutorRes.json();
    const tutor = Array.isArray(tutors) ? tutors[0] : tutors;

    if (!tutor) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy gia sư" },
        { status: 404 }
      );
    }

    const availableBalance = tutor.available_balance || 0;

    // 2. Kiểm tra số dư khả dụng
    if (availableBalance < amount) {
      return NextResponse.json(
        { success: false, message: `Số dư khả dụng không đủ. Hiện có: ${availableBalance.toLocaleString('vi-VN')}đ` },
        { status: 400 }
      );
    }

    // 3. Tạo yêu cầu rút tiền (pending)
    const updatedAvailable = availableBalance - amount;

    const payoutRequest = {
      id: `withdraw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tutor_id: tutorId,
      tutor_name: tutor.bio || 'Gia sư',
      amount: amount,
      type: 'withdraw',
      status: 'pending', // pending → admin xem xét → approved/rejected
      bank_info: bankInfo || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      note: `Yêu cầu rút ${amount.toLocaleString('vi-VN')}đ`,
    };

    await fetch(`${API_BASE}/payouts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payoutRequest),
    });

    // 4. Tạm giữ số tiền (giảm available_balance)
    await fetch(`${API_BASE}/tutors/${tutor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        available_balance: updatedAvailable,
        pending_balance: (tutor.pending_balance || 0) + amount, // tạm chuyển sang pending
        updated_at: new Date().toISOString(),
      }),
    });

    // 5. Thông báo cho admin
    const notif = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      receiver_id: 'u-admin-1',
      receiver_role: 'admin',
      type: 'payment',
      title: '💳 Yêu cầu rút tiền mới',
      message: `Gia sư yêu cầu rút ${amount.toLocaleString('vi-VN')}đ. Vui lòng xem xét.`,
      related_id: payoutRequest.id,
      related_type: 'payout',
      is_read: false,
      created_at: new Date().toISOString(),
    };
    await fetch(`${API_BASE}/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notif),
    });

    console.log("✅ [Payout Request] Success:", {
      tutorId,
      amount,
      availableBalance,
      updatedAvailable,
    });

    return NextResponse.json({
      success: true,
      message: "Yêu cầu rút tiền đã được gửi! Admin sẽ xem xét trong thời gian sớm nhất.",
      data: {
        ...payoutRequest,
        available_balance: updatedAvailable,
      },
    });
  } catch (error) {
    console.error("❌ [Payout Request] Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi server" },
      { status: 500 }
    );
  }
}

// GET: Lấy danh sách yêu cầu rút tiền
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tutorId = searchParams.get("tutorId");
    const status = searchParams.get("status");

    const res = await fetch(`${API_BASE}/payouts`, { cache: "no-store" });
    const payouts = await res.json();

    let filtered = Array.isArray(payouts) ? payouts : [];

    if (tutorId) {
      filtered = filtered.filter(p => p.tutor_id === tutorId);
    }

    if (status) {
      filtered = filtered.filter(p => p.status === status);
    }

    // Chỉ lấy các giao dịch withdraw
    filtered = filtered.filter(p => p.type === 'withdraw');

    // Sắp xếp mới nhất lên đầu
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return NextResponse.json({
      success: true,
      data: filtered,
      total: filtered.length,
    });
  } catch (error) {
    console.error("❌ [Payout List] Error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
