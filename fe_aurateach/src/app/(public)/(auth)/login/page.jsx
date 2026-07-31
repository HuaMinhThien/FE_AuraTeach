// src/app/(public)/(auth)/login/page.jsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authService } from "@/services/authService";
import Headers from "@/components/users/Header";
import "./login.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Hàm kiểm tra email Gmail
  const isValidGmail = (email) => {
    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    return gmailRegex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setErrors({});

    let hasError = false;
    const newErrors = {};

    // Kiểm tra email
    if (!email) {
      newErrors.email = "Vui lòng nhập email";
      hasError = true;
    } else if (!isValidGmail(email)) {
      newErrors.email = "Vui lòng sử dụng email Gmail (@gmail.com)";
      hasError = true;
    }

    // Kiểm tra password
    if (!password) {
      newErrors.password = "Vui lòng nhập mật khẩu";
      hasError = true;
    }

    if (hasError) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);

    try {
      console.log("=== LOGIN SUBMIT ===");
      console.log("Email:", email);

      // Gọi qua authService để trỏ đúng sang Laravel
      const data = await authService.login({ email, password });
      console.log("Response data:", data);

      if (!data || data.success === false || !data.user) {
        throw new Error(data?.message || "Dữ liệu đăng nhập không hợp lệ từ máy chủ");
      }

      // Tạo userInfo với cấu trúc chuẩn (hỗ trợ cả user_id và id)
      const userInfo = {
        user_id: data.user.user_id || data.user.id,
        name: data.user.full_name || data.user.name,
        email: data.user.email,
        role: data.user.role,
        avatar: data.user.avatar || "/img/avt.jpg",
      };

      console.log("✅ UserInfo to save:", userInfo);

      // Tính toán thời gian hết hạn cookie theo rememberMe
      const expires = rememberMe ? 30 : 1;
      const maxAgeSeconds = expires * 24 * 60 * 60;

      // Lưu cookie thông tin user và role
      document.cookie = `user_info=${encodeURIComponent(
        JSON.stringify(userInfo)
      )}; path=/; max-age=${maxAgeSeconds}`;

      document.cookie = `role=${data.user.role}; path=/; max-age=${maxAgeSeconds}`;

      // Lưu token xác thực từ main (nếu có trả về từ server)
      if (data.token) {
        document.cookie = `token=${data.token}; path=/; max-age=${maxAgeSeconds}`;
      }

      console.log("✅ Cookies saved successfully");

      // Chuyển hướng theo phân quyền (role)
      switch (data.user.role) {
        case "student":
          router.push("/");
          break;
        case "tutor":
          router.push("/tutor-dashboard");
          break;
        case "admin":
          router.push("/admin-dashboard");
          break;
        default:
          router.push("/");
      }
    } catch (err) {
      console.error("❌ Login error:", err);
      setError(err.response?.data?.message || err.message || "Đăng nhập thất bại");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Headers />
      <div className="aurateach-login-page">
        <div className="aurateach-login-container">
          <div className="aurateach-login-box">
            <div className="aurateach-login-card">
              <h1 className="aurateach-login-title">Đăng nhập</h1>
              <p className="aurateach-login-subtitle">
                Truy cập vào hành trình học tập chuyên nghiệp của bạn
              </p>

              <form onSubmit={handleSubmit} className="aurateach-login-form">
                {error && (
                  <div className="aurateach-error-message">{error}</div>
                )}

                <div className="aurateach-form-group">
                  <label htmlFor="email">Email <span style={{color: '#ef4444'}}>*</span></label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) {
                        setErrors(prev => ({ ...prev, email: '' }));
                      }
                    }}
                    placeholder="example@gmail.com"
                    className={`aurateach-form-input ${errors.email ? 'input-error' : ''}`}
                    required
                  />
                  {errors.email && (
                    <span className="error-text">{errors.email}</span>
                  )}
                  <small style={{color: '#6b7280', fontSize: '0.75rem'}}>
                    Chỉ hỗ trợ email Gmail (@gmail.com)
                  </small>
                </div>

                <div className="aurateach-form-group">
                  <label htmlFor="password">Mật khẩu <span style={{color: '#ef4444'}}>*</span></label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) {
                        setErrors(prev => ({ ...prev, password: '' }));
                      }
                    }}
                    placeholder="••••••"
                    className={`aurateach-form-input ${errors.password ? 'input-error' : ''}`}
                    required
                  />
                  {errors.password && (
                    <span className="error-text">{errors.password}</span>
                  )}
                </div>

                <div className="aurateach-form-options">
                  <label className="aurateach-checkbox-label">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span>Ghi nhớ đăng nhập</span>
                  </label>
                  <Link
                    href="/forgot-password"
                    className="aurateach-forgot-link"
                  >
                    Quên mật khẩu?
                  </Link>
                </div>

                <button
                  type="submit"
                  className="aurateach-login-button"
                  disabled={isLoading}
                >
                  {isLoading ? "Đang xử lý..." : "Đăng nhập"}
                </button>

                <div className="aurateach-register-link">
                  Chưa có tài khoản?{" "}
                  <Link href="/register" className="aurateach-register-now">
                    Đăng ký ngay
                  </Link>
                </div>
              </form>
            </div>
          </div>

          <div className="aurateach-hero-right">
            <div className="aurateach-hero-image">
              <div className="aurateach-hero-content"> 
                <div className="aurateach-hero-icon">📚✨</div>
                <h2>AuraTeach</h2>
                <p>
                  Nền tảng kết nối gia sư và học viên
                  <br />
                   hàng đầu Việt Nam.
                </p>
              </div>

              <div className="aurateach-stats-box">
                <div className="stats-item">
                  <span className="stats-icon">⭐</span>
                  <div className="stats-info">
                    <h4>500+</h4>
                    <p>Gia sư</p>
                  </div>
                </div>
                <div className="stats-divider"></div>
                <div className="stats-item">
                  <span className="stats-icon">🎓</span>
                  <div className="stats-info">
                    <h4>2,000+</h4>
                    <p>Học viên</p>
                  </div>
                </div>
                <div className="stats-divider"></div>
                <div className="stats-item">
                  <span className="stats-icon">💯</span>
                  <div className="stats-info">
                    <h4>98%</h4>
                    <p>Hài lòng</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}