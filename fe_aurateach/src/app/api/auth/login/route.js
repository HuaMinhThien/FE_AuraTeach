// src/app/api/auth/login/route.js
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

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

    // === TÌM FILE DATA.JSON - THÊM ĐƯỜNG DẪN src/api/data.json ===
    const possiblePaths = [
      path.join(process.cwd(), "src", "api", "data.json"),  // ← THÊM DÒNG NÀY
      path.join(process.cwd(), "src", "data.json"),
      path.join(process.cwd(), "data.json"),
      path.join(process.cwd(), "src", "app", "api", "data.json"),
      path.join(process.cwd(), "public", "data.json"),
      path.join(process.cwd(), "src", "data", "data.json"),
    ];

    let dataPath = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        dataPath = p;
        console.log("✅ Tìm thấy data.json tại:", p);
        break;
      }
    }

    if (!dataPath) {
      console.error("❌ Không tìm thấy file data.json ở bất kỳ vị trí nào!");
      console.log("📁 Các vị trí đã tìm:", possiblePaths);
      return NextResponse.json(
        { 
          success: false,
          message: "Lỗi hệ thống: Không tìm thấy dữ liệu" 
        },
        { status: 500 }
      );
    }

    // === ĐỌC FILE DATA.JSON ===
    let jsonData;
    try {
      jsonData = fs.readFileSync(dataPath, "utf8");
      console.log("✅ Đã đọc file data.json");
    } catch (readError) {
      console.error("❌ Lỗi đọc file:", readError);
      return NextResponse.json(
        { 
          success: false,
          message: "Không thể đọc file dữ liệu" 
        },
        { status: 500 }
      );
    }

    // === PARSE JSON ===
    let data;
    try {
      data = JSON.parse(jsonData);
      console.log("✅ Đã parse JSON thành công");
      console.log("📊 Số lượng users:", data.users?.length || 0);
    } catch (parseError) {
      console.error("❌ Lỗi parse JSON:", parseError);
      return NextResponse.json(
        { 
          success: false,
          message: "File dữ liệu không đúng định dạng" 
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

    // ===== QUAN TRỌNG: Kiểm tra verification_status nếu là tutor =====
    if (user.role === "tutor") {
      // Lấy thông tin tutor
      const tutor = data.tutors.find(t => t.user_id === user.user_id);

      if (!tutor) {
        return NextResponse.json(
          { 
            success: false,
            message: "Không tìm thấy hồ sơ giảng viên" 
          },
          { status: 404 }
        );
      }

      console.log(`📋 Tutor verification_status: ${tutor.verification_status}`);

      // Kiểm tra verification_status
      if (tutor.verification_status === "pending") {
        return NextResponse.json(
          { 
            success: false,
            message: "Tài khoản của bạn đang chờ admin xét duyệt. Vui lòng đợi thông báo!" 
          },
          { status: 403 }
        );
      }

      if (tutor.verification_status === "rejected") {
        const rejectReason = tutor.rejection_reason || "Không có lý do cụ thể";
        return NextResponse.json(
          { 
            success: false,
            message: `Tài khoản của bạn không được duyệt. Lý do: ${rejectReason}` 
          },
          { status: 403 }
        );
      }

      // Nếu verification_status là "approved" hoặc "Đã xác minh" thì cho phép đăng nhập
      if (tutor.verification_status !== "approved" && tutor.verification_status !== "Đã xác minh") {
        return NextResponse.json(
          { 
            success: false,
            message: "Trạng thái tài khoản không hợp lệ. Vui lòng liên hệ hỗ trợ." 
          },
          { status: 403 }
        );
      }

      console.log(`✅ Tutor ${user.full_name} đã được xác minh (${tutor.verification_status})`);
    }

    // ===== Nếu là student hoặc admin, không cần kiểm tra verification =====
    if (user.role === "student") {
      console.log(`✅ Student ${user.full_name} đăng nhập thành công`);
    }

    if (user.role === "admin") {
      console.log(`✅ Admin ${user.full_name} đăng nhập thành công`);
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