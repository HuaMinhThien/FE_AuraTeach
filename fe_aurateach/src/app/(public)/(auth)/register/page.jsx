"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Headers from "@/components/users/Header";
import "./register.css";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

const handleSubmit = async (e) => {
  e.preventDefault();
  setError("");

  // Giữ nguyên các logic kiểm tra cũ của bạn
  if (!fullName || !email || !password || !confirmPassword) {
    setError("Vui lòng nhập đầy đủ thông tin");
    return;
  }
  if (password !== confirmPassword) {
    setError("Mật khẩu xác nhận không khớp");
    return;
  }
  if (!agreeTerms) {
    setError("Vui lòng đồng ý với điều khoản dịch vụ");
    return;
  }

  setIsLoading(true);

  try {
    // Gọi tới API trung gian của Next.js
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        full_name: fullName, 
        email, 
        password, 
        role: 'student' // Mặc định là student
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Đăng ký thất bại");
    }

    // Đăng ký thành công
    router.push("/login");
  } catch (err) {
    setError(err.message);
  } finally {
    setIsLoading(false);
  }
};

  return (
    <>
      <Headers />
      <div className="aurateach-register-page">
        <div className="aurateach-register-container">
          {/* Phần bên trái - Hình ảnh minh họa */}
          <div className="aurateach-register-left">
            <div className="aurateach-register-hero">
              <img
                src="/images/register-hero.jpg"
                alt="Đăng ký AuraTeach"
                className="aurateach-register-hero-img"
              />
              <div className="aurateach-register-hero-overlay">
                <div className="aurateach-hero-icon">📚✨</div>
                <h2>AuraTeach</h2>
                <p>
                  Nền tảng kết nối gia sư và học viên
                  <br />
                  uy tín hàng đầu Việt Nam.
                </p>
              </div>
            </div>
          </div>

          {/* Phần bên phải - Form đăng ký */}
          <div className="aurateach-register-right">
            <div className="aurateach-register-card">
              <h1 className="aurateach-register-title">
                Đăng ký tài khoản AuraTeach
              </h1>
              <p className="aurateach-register-subtitle">
                Kiến tạo tương lai của bạn ngay hôm nay.
              </p>

              <form onSubmit={handleSubmit} className="aurateach-register-form">
                {error && (
                  <div className="aurateach-error-message">{error}</div>
                )}

                <div className="aurateach-form-group">
                  <label htmlFor="fullName">Họ và Tên</label>
                  <input
                    type="text"
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="aurateach-form-input"
                  />
                </div>

                <div className="aurateach-form-group">
                  <label htmlFor="email">Địa chỉ Email</label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@aurateach.vn"
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
                    placeholder="********"
                    className="aurateach-form-input"
                  />
                </div>

                <div className="aurateach-form-group">
                  <label htmlFor="confirmPassword">Xác nhận mật khẩu</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="********"
                    className="aurateach-form-input"
                  />
                </div>

                <div className="aurateach-form-options">
                  <label className="aurateach-checkbox-label">
                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                    />
                    <span>
                      Tôi đồng ý với{" "}
                      <Link href="/terms" className="aurateach-link">
                        Điều khoản Dịch vụ
                      </Link>{" "}
                      và{" "}
                      <Link href="/privacy" className="aurateach-link">
                        Chính sách Bảo mật
                      </Link>{" "}
                      của AuraTeach.
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="aurateach-register-button"
                  disabled={isLoading}
                >
                  {isLoading ? "Đang xử lý..." : "Tạo tài khoản"}
                </button>
              </form>

              {/* Phần chuyển sang đăng ký giảng viên */}
              <div className="aurateach-teacher-invite">
                <p className="aurateach-teacher-title">Bạn là chuyên gia?</p>
                <p className="aurateach-teacher-desc">
                  Hãy trở thành đối tác giảng dạy để chia sẻ kiến thức và tăng
                  thu nhập cùng AuraTeach.
                </p>
                <Link
                  href="/register/teacher"
                  className="aurateach-teacher-button"
                >
                  Đăng ký làm Giảng viên
                </Link>
              </div>

              <div className="aurateach-login-link">
                Đã có tài khoản?{" "}
                <Link href="/login" className="aurateach-login-now">
                  Đăng nhập ngay
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
