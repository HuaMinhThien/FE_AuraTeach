import { NextResponse } from "next/server";

const API_BASE = "http://localhost:3007";

// Helper: Tạo ID ngẫu nhiên
const generateId = () => {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
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
      avatar: "/img/default-avatar.svg",
      role: role, // "student" hoặc "tutor"
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
      // Tạo student profile
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
        // Rollback: Xóa user vừa tạo
        await fetch(`${API_BASE}/users/${newUser.user_id}`, { method: "DELETE" });
        throw new Error("Không thể tạo hồ sơ học viên");
      }

    } else if (role === "tutor") {
      // Tạo tutor profile
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
        qualification: expertise,
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
        // Rollback: Xóa user vừa tạo
        await fetch(`${API_BASE}/users/${newUser.user_id}`, { method: "DELETE" });
        throw new Error("Không thể tạo hồ sơ gia sư");
      }
    }

    // 6. Trả về kết quả thành công
      const { password: _, ...userInfo } = newUser;

    // Tạo message phù hợp với role
      let successMessage = "";
      if (role === "student") {
        successMessage = "Đăng ký tài khoản Học viên thành công! Vui lòng đăng nhập.";
      } else if (role === "tutor") {
        successMessage = "Đăng ký tài khoản Giảng viên thành công! Tài khoản của bạn đang chờ admin xét duyệt. Vui lòng đợi thông báo.";
      }

      return NextResponse.json({
        success: true,
        message: successMessage,
        data: {
          user: userInfo,
          profile: profileData
        }
      });

  } catch (error) {
    console.error("Lỗi POST /api/auth/register:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi server" },
      { status: 500 }
    );
  }
}