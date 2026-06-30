// src/app/api/auth/login/route.js
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    console.log("=== START LOGIN API ===");
    
    // Lấy dữ liệu từ request
    const { email, password } = await request.json();
    console.log("📧 Email:", email);

    // Validate input
    if (!email || !password) {
      console.log("❌ Thiếu email hoặc password");
      return NextResponse.json(
        { 
          success: false,
          message: "Vui lòng nhập đầy đủ email và mật khẩu" 
        },
        { status: 400 }
      );
    }

    let data;
    try {
      // Gọi lên API lấy danh sách dữ liệu tổng hợp của Laravel (Laragon cổng 8000)
      const laravelResponse = await fetch("http://localhost:8000/api/auth-data", {
        method: "GET",
        headers: {
          "Accept": "application/json",
        },
      });

      // Gán dữ liệu trả về (chứa mảng users) vào biến data
      data = await laravelResponse.json(); 
      console.log("✅ Đã lấy dữ liệu thành công từ Laravel Backend");
      console.log("📊 Số lượng users:", data.users?.length || 0);
    } catch (fetchError) {
      console.error("❌ Lỗi lấy dữ liệu từ Backend:", fetchError);
      return NextResponse.json(
        { 
          success: false,
          message: "Lỗi hệ thống: Không thể kết nối tới Backend" 
        },
        { status: 500 }
      );
    }

    // === TÌM USER ===
    const user = data.users.find(
      (u) => u.email === email && u.password === password
    );

    console.log("🔍 Tìm thấy user:", user ? "YES" : "NO");
    
    if (user) {
      console.log("👤 User info:", {
        id: user.user_id,
        email: user.email,
        role: user.role,
        status: user.status
      });
    }

    if (!user) {
      return NextResponse.json(
        { 
          success: false,
          message: "Email hoặc mật khẩu không đúng" 
        },
        { status: 401 }
      );
    }

    // === KIỂM TRA TRẠNG THÁI TÀI KHOẢN ===
    if (user.status !== "active") {
      console.log("⚠️ User status:", user.status);
      return NextResponse.json(
        { 
          success: false,
          message: "Tài khoản đã bị khóa hoặc chưa được kích hoạt" 
        },
        { status: 403 }
      );
    }

    // === XÓA PASSWORD TRƯỚC KHI TRẢ VỀ ===
    const { password: _, ...userInfo } = user;

    console.log("✅ Login thành công cho user:", userInfo.email);
    console.log("=== END LOGIN API ===");

    // === TRẢ VỀ KẾT QUẢ ===
    return NextResponse.json({
      success: true,
      user: userInfo,
      message: "Đăng nhập thành công",
    });

  } catch (error) {
    console.error("=== ❌ LOGIN API ERROR ===");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    
    return NextResponse.json(
      { 
        success: false,
        message: "Đã có lỗi xảy ra, vui lòng thử lại sau",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      },
      { status: 500 }
    );
  }
}