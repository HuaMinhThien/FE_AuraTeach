import { NextResponse } from "next/server";

const API_BASE = "http://localhost:3007";

// Chạy mỗi 6 giờ (có thể dùng Vercel Cron Jobs hoặc tương tự)
export async function GET() {
  try {
    // Lấy tất cả proposals đang pending
    const res = await fetch(`${API_BASE}/proposals?status=pending`);
    const proposals = await res.json();

    const now = new Date();
    let expiredCount = 0;

    for (const proposal of proposals) {
      if (!proposal.expires_at) continue;
      
      const expiresAt = new Date(proposal.expires_at);
      if (now > expiresAt) {
        // Hết hạn → hủy proposal
        const updateRes = await fetch(`${API_BASE}/proposals/${proposal.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "cancelled",
            cancel_reason: "Hết hạn phản hồi",
          }),
        });
        
        if (updateRes.ok) {
          expiredCount++;
          console.log(`✅ Đã hủy proposal ${proposal.proposal_id} do hết hạn`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Đã kiểm tra ${proposals.length} proposals, hủy ${expiredCount} proposal hết hạn`,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error.message,
    }, { status: 500 });
  }
}