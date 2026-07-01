import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();
    
    const res = await fetch("http://localhost:8000/api/register", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json" // Yêu cầu Laravel trả về JSON
      },
      body: JSON.stringify(body),
    });

    // Thay vì gọi .json() ngay, hãy lấy text trước để tránh crash
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      // Nếu Laravel trả về 500 không phải JSON, ta vẫn bắt được lỗi
      console.error("Laravel không trả về JSON hợp lệ:", text);
      return NextResponse.json({ message: "Lỗi hệ thống từ server" }, { status: 500 });
    }

    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json({ message: "Lỗi kết nối tới API" }, { status: 500 });
  }
}