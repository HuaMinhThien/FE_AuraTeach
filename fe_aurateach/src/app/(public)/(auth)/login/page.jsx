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
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      console.log("=== LOGIN SUBMIT ===");
      console.log("Email:", email);

      // 👇 Gọi qua authService để trỏ đúng sang Laravel (cổng 8000)
      const data = await authService.login({ email, password });
      console.log("Response data:", data);

      if (!data || data.success === false || !data.user) {
        throw new Error(data?.message || "Dữ liệu đăng nhập không hợp lệ từ máy chủ");
      }

      // Tạo userInfo với cấu trúc chuẩn
      const userInfo = {
        id: data.user.user_id || data.user.id,
        name: data.user.full_name || data.user.name,
        email: data.user.email,
        role: data.user.role,
        avatar: data.user.avatar || "/img/default-avatar.png",
      };

      console.log("✅ UserInfo to save:", userInfo);

      // Lưu cookie thời gian theo rememberMe
      const expires = rememberMe ? 30 : 1;
      const maxAgeSeconds = expires * 24 * 60 * 60;

      document.cookie = `user_info=${encodeURIComponent(
        JSON.stringify(userInfo)
      )}; path=/; max-age=${maxAgeSeconds}`;

      document.cookie = `role=${data.user.role}; path=/; max-age=${maxAgeSeconds}`;

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
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="aurateach-form-input"
                    required
                  />
                </div>

                <div className="aurateach-form-group">
                  <label htmlFor="password">Mật khẩu</label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••"
                    className="aurateach-form-input"
                    required
                  />
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