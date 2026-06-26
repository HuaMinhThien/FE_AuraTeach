// src/app/(public)/(auth)/login/page.jsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Headers from "@/components/users/Headers";
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

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      console.log("Response data:", data);

      if (!response.ok) {
        throw new Error(data.message || "Đăng nhập thất bại");
      }

      if (!data.success || !data.user) {
        throw new Error("Dữ liệu đăng nhập không hợp lệ");
      }

      // Tạo userInfo với đúng cấu trúc
      const userInfo = {
        id: data.user.user_id,
        name: data.user.full_name,
        email: data.user.email,
        role: data.user.role,
        avatar: data.user.avatar || "/img/default-avatar.png",
      };

      console.log("✅ UserInfo to save:", userInfo);

      // Lưu cookie
      const expires = rememberMe ? 30 : 1;
      const cookieValue = encodeURIComponent(JSON.stringify(userInfo));
      document.cookie = `user_info=${cookieValue}; path=/; max-age=${expires * 24 * 60 * 60}`;
      document.cookie = `role=${data.user.role}; path=/; max-age=${expires * 24 * 60 * 60}`;

      console.log("✅ Cookies saved:");
      console.log("user_info:", document.cookie);

      // Chuyển hướng
      switch (data.user.role) {
        case "student":
          window.location.href = "/";
          break;
        case "tutor":
          window.location.href = "/tutor";
          break;
        case "admin":
          window.location.href = "/admin";
          break;
        default:
          window.location.href = "/";
      }
    } catch (error) {
      console.error("❌ Login error:", error);
      setError(error.message || "Đăng nhập thất bại");
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
                {error && <div className="aurateach-error-message">{error}</div>}

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
                  <Link href="/forgot-password" className="aurateach-forgot-link">
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
                  Nền tảng kết nối gia sư và học viên<br />
                  tự tin hàng đầu Việt Nam.
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