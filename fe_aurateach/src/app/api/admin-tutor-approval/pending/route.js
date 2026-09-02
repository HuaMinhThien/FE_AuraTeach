import { NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_JSON_SERVER_URL || 'http://localhost:3007';

export async function GET() {
  try {

    // Lấy tất cả tutors từ JSON Server
    const tutorsRes = await fetch(`${API_BASE}/tutors`);
    const tutors = await tutorsRes.json();

    // Lấy tất cả users từ JSON Server
    const usersRes = await fetch(`${API_BASE}/users`);
    const users = await usersRes.json();

    // Lọc tutors có verification_status = "pending"
    const pendingTutors = tutors
      .filter(t => t.verification_status === "pending")
      .map(tutor => {
        const user = users.find(u => u.user_id === tutor.user_id);
        return {
          ...tutor,
          ...user,
          tutor_id: tutor.tutor_id,
          user_id: tutor.user_id,
        };
      });


    return NextResponse.json({
      success: true,
      data: pendingTutors,
    });

  } catch (error) {
    console.error("❌ Error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
