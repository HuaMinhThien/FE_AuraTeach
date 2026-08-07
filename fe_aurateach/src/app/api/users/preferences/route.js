import { NextResponse } from "next/server";

const API_BASE = "http://localhost:3007";

// PATCH: Cập nhật preferences
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { user_id, accept_proposals } = body;

    const userRes = await fetch(`${API_BASE}/users?user_id=${user_id}`);
    const users = await userRes.json();
    const user = users[0];

    if (!user) {
      return NextResponse.json({
        success: false,
        message: "Không tìm thấy user",
      }, { status: 404 });
    }

    if (!user.preferences) user.preferences = {};
    user.preferences.accept_proposals = accept_proposals;

    const updateRes = await fetch(`${API_BASE}/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferences: user.preferences }),
    });

    const updated = await updateRes.json();

    return NextResponse.json({
      success: true,
      message: accept_proposals ? "Đã bật nhận đề xuất" : "Đã tắt nhận đề xuất",
      data: {
        user_id,
        accept_proposals,
      },
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error.message,
    }, { status: 500 });
  }
}

// GET: Lấy preferences
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get("user_id");

    const userRes = await fetch(`${API_BASE}/users?user_id=${user_id}`);
    const users = await userRes.json();
    const user = users[0];

    if (!user) {
      return NextResponse.json({
        success: false,
        message: "Không tìm thấy user",
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        user_id,
        accept_proposals: user.preferences?.accept_proposals ?? true,
        cooldown_until: user.preferences?.cooldown_until || null,
        daily_proposal_count: user.preferences?.daily_proposal_count || 0,
        daily_proposal_date: user.preferences?.daily_proposal_date || null,
      },
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error.message,
    }, { status: 500 });
  }
}