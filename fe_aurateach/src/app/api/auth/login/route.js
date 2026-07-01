import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    const res = await fetch("http://localhost:8000/api/login", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json" // Quan trọng: Yêu cầu Laravel trả về JSON
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      // Trả về chính xác lỗi từ Laravel (401, 403, 404)
      return NextResponse.json({ message: data.message || "Đăng nhập thất bại" }, { status: res.status });
    }

    return NextResponse.json({ success: true, user: data.user });
    
  } catch (error) {
    console.error("Login Proxy Error:", error);
    return NextResponse.json({ message: "Lỗi kết nối tới server" }, { status: 500 });
  }
}