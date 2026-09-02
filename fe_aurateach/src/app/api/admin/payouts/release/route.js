import { NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_JSON_SERVER_URL || 'http://localhost:3007';

export async function POST(request) {
  try {
    const body = await request.json();
    const { tutorId, amount, adminId } = body;

    if (!tutorId || !amount) {
      return NextResponse.json(
        { success: false, message: "Thiếu thông tin bắt buộc" },
        { status: 400 }
      );
    }

    const tutorRes = await fetch(`${API_BASE}/tutors?tutor_id=${tutorId}`);
    const tutors = await tutorRes.json();
    const tutor = Array.isArray(tutors) ? tutors[0] : tutors;

    if (!tutor) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy gia sư" },
        { status: 404 }
      );
    }

    const pendingBalance = Number(tutor.pending_balance || 0);
    const availableBalance = Number(tutor.available_balance || 0);
    const releaseAmount = Number(amount);

    if (pendingBalance < releaseAmount) {
      return NextResponse.json(
        { success: false, message: `Số dư chờ không đủ. Hiện có: ${pendingBalance.toLocaleString('vi-VN')}đ` },
        { status: 400 }
      );
    }

    const updatedPending = pendingBalance - releaseAmount;
    const updatedAvailable = availableBalance + releaseAmount;

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

    const payoutRecord = {
      id: `payout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tutor_id: tutorId,
      amount: releaseAmount,
      type: 'release',
      status: 'completed',
      admin_id: adminId || 'u-admin-1',
      created_at: new Date().toISOString(),
      note: `Giải ngân ${releaseAmount.toLocaleString('vi-VN')}đ từ số dư chờ`,
    };

    await fetch(`${API_BASE}/payouts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payoutRecord),
    });

    const notif = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      receiver_id: tutor.user_id || tutorId,
      receiver_role: 'tutor',
      type: 'payment',
      title: '💰 Giải ngân thành công',
      message: `Admin đã giải ngân ${releaseAmount.toLocaleString('vi-VN')}đ vào ví khả dụng của bạn.`,
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

    return NextResponse.json({
      success: true,
      message: `Giải ngân ${releaseAmount.toLocaleString('vi-VN')}đ thành công!`,
      data: {
        tutor_id: tutorId,
        pending_balance: updatedPending,
        available_balance: updatedAvailable,
        released_amount: releaseAmount,
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

