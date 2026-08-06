import { NextResponse } from "next/server";

const BACKEND_URL = "http://localhost:3007";

export async function POST(request) {
  try {
    console.log("=== START LOGIN API (CALLING BACKEND :3007) ===");

    // Lấy dữ liệu từ request client
    const { email, password } = await request.json();
    console.log("📧 Email đăng nhập:", email);

    // Validate dữ liệu đầu vào
    if (!email || !password) {
      console.log("❌ Thiếu email hoặc password");
      return NextResponse.json(
        {
          success: false,
          message: "Vui lòng nhập đầy đủ email và mật khẩu",
        },
        { status: 400 }
      );
    }

    // === VALIDATION: Kiểm tra email phải là Gmail ===
    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (!gmailRegex.test(email)) {
      console.log("❌ Email không phải Gmail:", email);
      return NextResponse.json(
        {
          success: false,
          message: "Chỉ hỗ trợ email Gmail (@gmail.com)",
        },
        { status: 400 }
      );
    }

    // === 1. CALL API LẤY DANH SÁCH USERS TỪ JSON SERVER ===
    const usersRes = await fetch(`${BACKEND_URL}/users`, {
      cache: "no-store",
    });

    if (!usersRes.ok) {
      console.error("❌ Không thể kết nối tới Backend JSON Server ở port 3007");
      return NextResponse.json(
        {
          success: false,
          message: "Lỗi kết nối máy chủ dữ liệu Backend",
        },
        { status: 500 }
      );
    }

    const users = await usersRes.json();
    console.log("📊 Số lượng users từ Backend:", users.length);

    // === 2. TÌM USER TRONG BẢNG USERS ===
    const user = users.find(
      (u) => u.email === email && u.password === password
    );

    console.log("🔍 Tìm thấy user:", user ? "YES" : "NO");

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Email hoặc mật khẩu không đúng",
        },
        { status: 401 }
      );
    }

    // === 3. KIỂM TRA TRẠNG THÁI TÀI KHOẢN (ACTIVE / BANNED) ===
    if (user.status !== "active") {
      console.log("⚠️ User status:", user.status);
      return NextResponse.json(
        {
          success: false,
          message: "Tài khoản đã bị khóa hoặc chưa được kích hoạt",
        },
        { status: 403 }
      );
    }

    // === 4. NẾU LÀ TUTOR: CALL API LẤY THÔNG TIN HỒ SƠ VÀ KIỂM TRA DUYỆT ===
    if (user.role === "tutor") {
      const tutorsRes = await fetch(
        `${BACKEND_URL}/tutors?user_id=${user.user_id}`,
        { cache: "no-store" }
      );

      if (!tutorsRes.ok) {
        return NextResponse.json(
          {
            success: false,
            message: "Lỗi khi kiểm tra thông tin giảng viên",
          },
          { status: 500 }
        );
      }

      const tutorData = await tutorsRes.json();
      const tutor = tutorData[0]; // Lấy bản ghi tutor tương ứng

      if (!tutor) {
        return NextResponse.json(
          {
            success: false,
            message: "Không tìm thấy hồ sơ giảng viên",
          },
          { status: 404 }
        );
      }

      console.log(`📋 Tutor verification_status: ${tutor.verification_status}`);

      // === KIỂM TRA TRẠNG THÁI DUYỆT HỒ SƠ (TẠM THỜI COMMENT ĐỂ TEST) ===
      // Khi có backend thật, bỏ comment các dòng bên dưới
      
      // if (tutor.verification_status === "pending") {
      //   return NextResponse.json(
      //     {
      //       success: false,
      //       message: "Tài khoản của bạn đang chờ admin xét duyệt. Vui lòng đợi thông báo!",
      //     },
      //     { status: 403 }
      //   );
      // }

      // if (tutor.verification_status === "rejected") {
      //   const rejectReason = tutor.rejection_reason || "Không có lý do cụ thể";
      //   return NextResponse.json(
      //     {
      //       success: false,
      //       message: `Tài khoản của bạn không được duyệt. Lý do: ${rejectReason}`,
      //     },
      //     { status: 403 }
      //   );
      // }

      // if (
      //   tutor.verification_status !== "approved" &&
      //   tutor.verification_status !== "Đã xác minh"
      // ) {
      //   return NextResponse.json(
      //     {
      //       success: false,
      //       message: "Trạng thái tài khoản không hợp lệ. Vui lòng liên hệ hỗ trợ.",
      //     },
      //     { status: 403 }
      //   );
      // }

      console.log(
        ` Tutor ${user.full_name} đã được xác minh (${tutor.verification_status})`
      );
    }

    if (user.role === "student") {
      console.log(` Student ${user.full_name} đăng nhập thành công`);
    }

    if (user.role === "admin") {
      console.log(` Admin ${user.full_name} đăng nhập thành công`);
    }

    // === 5. XÓA FIELD PASSWORD TRƯỚC KHI TRẢ VỀ CLIENT ===
    const { password: _, ...userInfo } = user;

    console.log(" Login thành công cho user:", userInfo.email);
    console.log("=== END LOGIN API ===");

    return NextResponse.json({
      success: true,
      user: userInfo,
      message: "Đăng nhập thành công",
    });
  } catch (error) {
    console.error("=== ❌ LOGIN API ERROR ===");
    console.error("Error message:", error.message);

    return NextResponse.json(
      {
        success: false,
        message: "Đã có lỗi xảy ra, vui lòng thử lại sau",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}