"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

    if (!email || !password) {
      setError("Vui lòng nhập đầy đủ email và mật khẩu");
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      console.log("Đăng nhập với:", { email, password, rememberMe });
      setIsLoading(false);
    }, 1000);
  };

  return (
    <>
      <Headers />
      <div className="aurateach-login-page">
        <div className="aurateach-login-container">
          
          {/* Box đăng nhập - căn giữa */}
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

          {/* Hình ảnh minh họa bên phải */}
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
              
              {/* Box nhỏ nằm trong hình ảnh minh họa - góc dưới bên trái */}
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