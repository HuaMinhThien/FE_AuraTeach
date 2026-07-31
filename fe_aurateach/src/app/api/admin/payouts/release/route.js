import { NextResponse } from "next/server";

const API_BASE = "http://localhost:3007";

// POST: Admin giải ngân tiền cho tutor (chuyển pending_balance → available_balance)
export async function POST(request) {
  try {
    const body = await request.json();
    const { tutorId, amount, adminId } = body;

    console.log("📤 [Payout Release] Release request:", { tutorId, amount, adminId });

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

    const pendingBalance = tutor.pending_balance || 0;
    const availableBalance = tutor.available_balance || 0;

    // 2. Kiểm tra số dư chờ đủ để giải ngân
    if (pendingBalance < amount) {
      return NextResponse.json(
        { success: false, message: `Số dư chờ không đủ. Hiện có: ${pendingBalance.toLocaleString('vi-VN')}đ` },
        { status: 400 }
      );
    }

    // 3. Cập nhật ví: giảm pending, tăng available
    const updatedPending = pendingBalance - amount;
    const updatedAvailable = availableBalance + amount;

    const updateRes = await fetch(`${API_BASE}/tutors/${tutor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pending_balance: updatedPending,
        available_balance: updatedAvailable,
        updated_at: new Date().toISOString(),
      }),
    });

    if (!updateRes.ok) {
      throw new Error("Không thể cập nhật số dư");
    }

    // 4. Ghi log giao dịch
    const payoutRecord = {
      id: `payout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tutor_id: tutorId,
      amount: amount,
      type: 'release',
      status: 'completed',
      admin_id: adminId || 'u-admin-1',
      created_at: new Date().toISOString(),
      note: `Giải ngân ${amount.toLocaleString('vi-VN')}đ từ số dư chờ`,
    };

    await fetch(`${API_BASE}/payouts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payoutRecord),
    });

    // 5. Tạo thông báo cho tutor
    const notif = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      receiver_id: tutor.user_id || tutorId,
      receiver_role: 'tutor',
      type: 'payment',
      title: '💰 Giải ngân thành công',
      message: `Admin đã giải ngân ${amount.toLocaleString('vi-VN')}đ vào ví khả dụng của bạn.`,
      related_id: payoutRecord.id,
      related_type: 'payout',
      is_read: false,
      created_at: new Date().toISOString(),
    };
    await fetch(`${API_BASE}/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notif),
    });

    console.log("✅ [Payout Release] Success:", {
      tutorId,
      amount,
      pendingBalance,
      updatedPending,
      updatedAvailable,
    });

    return NextResponse.json({
      success: true,
      message: `Giải ngân ${amount.toLocaleString('vi-VN')}đ thành công!`,
      data: {
        tutor_id: tutorId,
        pending_balance: updatedPending,
        available_balance: updatedAvailable,
        released_amount: amount,
        payout_id: payoutRecord.id,
      },
    });
  } catch (error) {
    console.error("❌ [Payout Release] Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi server" },
      { status: 500 }
    );
  }
}

// GET: Lấy danh sách lịch sử giải ngân
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tutorId = searchParams.get("tutorId");

    const res = await fetch(`${API_BASE}/payouts`, { cache: "no-store" });
    const payouts = await res.json();

    let filtered = Array.isArray(payouts) ? payouts : [];

    if (tutorId) {
      filtered = filtered.filter(p => p.tutor_id === tutorId);
    }

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

