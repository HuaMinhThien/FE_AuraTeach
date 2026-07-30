import { NextResponse } from "next/server";

const API_BASE = "http://localhost:3007";

// Helper: Tạo ID ngẫu nhiên
const generateId = () => {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
};

// Hàm kiểm tra link CV/Portfolio hợp lệ
const isValidCvLink = (link) => {
  if (!link) return true; // Cho phép để trống
  
  try {
    const url = new URL(link);
    const hostname = url.hostname.toLowerCase();
    
    // Danh sách domain được phép
    const allowedDomains = [
      'linkedin.com',
      'www.linkedin.com',
      'topcv.vn',
      'www.topcv.vn',
      'drive.google.com',
      'www.drive.google.com',
      'portfolio.com',
      'www.portfolio.com',
      'myportfolio.com',
      'www.myportfolio.com',
      'github.com',
      'www.github.com',
      'behance.net',
      'www.behance.net',
      'dribbble.com',
      'www.dribbble.com',
      'docs.google.com',
      'www.docs.google.com',
    ];
    
    return allowedDomains.some(domain => 
      hostname === domain || hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
};

// POST: Đăng ký tài khoản mới
export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      fullName, 
      email, 
      password, 
      phone, 
      role, 
      expertise, 
      cvLink,
      grade,
      schoolName
    } = body;

    console.log("=== START REGISTER API ===");
    console.log("📧 Email:", email);
    console.log("👤 Role:", role);

    // 1. Validate dữ liệu đầu vào
    if (!fullName || !email || !password || !role) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập đầy đủ thông tin bắt buộc" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: "Mật khẩu phải có ít nhất 6 ký tự" },
        { status: 400 }
      );
    }

    // === VALIDATION: Kiểm tra email phải là Gmail ===
    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (!gmailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: "Chỉ hỗ trợ email Gmail (@gmail.com)" },
        { status: 400 }
      );
    }

    // === VALIDATION: Kiểm tra số điện thoại (nếu có) ===
    if (phone) {
      const phoneRegex = /^0[0-9]{9}$/;
      if (!phoneRegex.test(phone)) {
        return NextResponse.json(
          { success: false, message: "Số điện thoại phải bắt đầu bằng 0 và có đúng 10 chữ số" },
          { status: 400 }
        );
      }
    }

    // === VALIDATION: Kiểm tra link CV/Portfolio (nếu có) ===
    if (cvLink && !isValidCvLink(cvLink)) {
      return NextResponse.json(
        { success: false, message: "Link CV/Portfolio không hợp lệ. Chỉ hỗ trợ: LinkedIn, TopCV, Google Drive, Github, Behance, Portfolio" },
        { status: 400 }
      );
    }

    // 2. Kiểm tra email đã tồn tại chưa
    const checkEmailRes = await fetch(`${API_BASE}/users?email=${encodeURIComponent(email)}`);
    const existingUsers = await checkEmailRes.json();

    if (existingUsers.length > 0) {
      return NextResponse.json(
        { success: false, message: "Email này đã được đăng ký" },
        { status: 400 }
      );
    }

    // 3. Tạo user mới
    const newUser = {
      user_id: generateId(),
      email: email,
      password: password,
      full_name: fullName,
      phone: phone || "",
      avatar: "/img/avt/avt.jpg",
      role: role,
      status: "active",
      created_at: new Date().toISOString()
    };

    // 4. Lưu user vào JSON Server
    const createUserRes = await fetch(`${API_BASE}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser)
    });

    if (!createUserRes.ok) {
      throw new Error("Không thể tạo tài khoản user");
    }

    // 5. Tạo profile tương ứng với role
    let profileData = null;

    if (role === "student") {
      profileData = {
        student_id: `student_${Date.now()}`,
        user_id: newUser.user_id,
        grade: grade || "",
        school_name: schoolName || "",
        created_at: new Date().toISOString()
      };

      const createStudentRes = await fetch(`${API_BASE}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData)
      });

      if (!createStudentRes.ok) {
        await fetch(`${API_BASE}/users/${newUser.user_id}`, { method: "DELETE" });
        throw new Error("Không thể tạo hồ sơ học viên");
      }

    } else if (role === "tutor") {
      if (!expertise) {
        return NextResponse.json(
          { success: false, message: "Vui lòng chọn lĩnh vực chuyên môn" },
          { status: 400 }
        );
      }

      profileData = {
        tutor_id: `tutor_${Date.now()}`,
        user_id: newUser.user_id,
        bio: "",
        expertise: expertise,
        rating: 0,
        verification_status: "pending",
        experience: "",
        pending_balance: 0,
        available_balance: 0,
        cv_link: cvLink || "",
        created_at: new Date().toISOString()
      };

      const createTutorRes = await fetch(`${API_BASE}/tutors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData)
      });

      if (!createTutorRes.ok) {
        await fetch(`${API_BASE}/users/${newUser.user_id}`, { method: "DELETE" });
        throw new Error("Không thể tạo hồ sơ gia sư");
      }
    }

    // 6. Trả về kết quả thành công
    const { password: _, ...userInfo } = newUser;

    let successMessage = "";
    if (role === "student") {
      successMessage = "Đăng ký tài khoản Học viên thành công! Vui lòng đăng nhập.";
    } else if (role === "tutor") {
      successMessage = "Đăng ký tài khoản Giảng viên thành công! Tài khoản của bạn đang chờ admin xét duyệt. Vui lòng đợi thông báo.";
    }

    console.log("✅ Register success:", userInfo.email);
    console.log("=== END REGISTER API ===");

    return NextResponse.json({
      success: true,
      message: successMessage,
      data: {
        user: userInfo,
        profile: profileData
      }
    });

  } catch (error) {
    console.error("❌ Register API error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi server" },
      { status: 500 }
    );
  }
}