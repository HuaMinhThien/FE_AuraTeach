"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Headers from "@/components/users/Header";
import authService from "@/services/authService";
import "./register.css";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const termsRef = useRef(null);

  const handleTermsScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollTop + clientHeight >= scrollHeight - 10) {
      setHasScrolledToBottom(true);
    } else {
      setHasScrolledToBottom(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Các validate cũ vẫn giữ nguyên
    if (!fullName || !email || !password || !confirmPassword) {
      setError("Vui lòng nhập đầy đủ thông tin");
      return;
    }
    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }
    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }
    if (!hasScrolledToBottom) {
      setError("Vui lòng đọc hết điều khoản trước khi đăng ký");
      setIsTermsOpen(true);
      return;
    }
    if (!agreeTerms) {
      setError("Vui lòng đồng ý với điều khoản dịch vụ");
      return;
    }

    setIsLoading(true);

    try {
      // Đổi tên trường thành full_name để khớp với Laravel
      const result = await authService.register({
        full_name: fullName, 
        email: email,
        password: password,
        phone: phone,
        role: "student"
      });

      // Kiểm tra kết quả trả về từ authService
      if (result) {
        alert("Đăng ký thành công! Vui lòng đăng nhập.");
        router.push("/login");
      }
    } catch (error) {
      // Bắt lỗi từ server và hiển thị
      setError(error.message || "Đăng ký thất bại, vui lòng kiểm tra lại thông tin");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Headers />
      <div className="aurateach-register-page">
        <div className="aurateach-register-container">
          {/* Phần bên trái - Hình ảnh minh họa (sticky) */}
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
                <div className="aurateach-hero-quote">
                  "Kiến tạo tương lai - Bắt đầu từ hôm nay"
                </div>
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
                    required
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
                    required
                  />
                </div>

                <div className="aurateach-form-group">
                  <label htmlFor="phone">Số điện thoại</label>
                  <input
                    type="tel"
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="090 123 4567"
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
                    required
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
                    required
                  />
                </div>

                {/* Điều khoản dịch vụ */}
                <div className="aurateach-terms-section">
                  <button
                    type="button"
                    className="aurateach-terms-toggle"
                    onClick={() => setIsTermsOpen(!isTermsOpen)}
                  >
                    <span>📋 Điều khoản dịch vụ</span>
                    <span className="aurateach-terms-arrow">
                      {isTermsOpen ? "▲" : "▼"}
                    </span>
                  </button>

                  {isTermsOpen && (
                    <div 
                      className="aurateach-terms-content"
                      ref={termsRef}
                      onScroll={handleTermsScroll}
                    >
                      <div className="aurateach-terms-text">
                        <h4>⚠️ QUY ĐỊNH QUAN TRỌNG</h4>
                        <p>
                          <strong>Để bảo vệ uy tín nền tảng, chống thất thoát doanh thu và đảm bảo an toàn cho cả hai bên, hệ thống áp dụng các biện pháp nghiêm ngặt:</strong>
                        </p>
                        <p>
                          <strong>Ràng buộc pháp lý:</strong>
                        </p>
                        <p>
                          <strong>Đối với học viên:</strong> Khi đăng ký, bắt buộc phải xác nhận điều khoản: 
                          <span className="aurateach-terms-highlight">
                            "Website nghiêm cấm mọi hình thức tự ý giao dịch hoặc học ngoài nền tảng. Nếu cố tình vi phạm, website sẽ KHÔNG chịu trách nhiệm hoàn tiền, không giải quyết khiếu nại khi xảy ra lừa đảo và tài khoản sẽ bị khóa vĩnh viễn".
                          </span>
                        </p>
                        <p className="aurateach-terms-warning">
                          ⚠️ Vi phạm sẽ bị khóa tài khoản vĩnh viễn và chịu hoàn toàn trách nhiệm trước pháp luật.
                        </p>
                      </div>
                      {!hasScrolledToBottom && (
                        <div className="aurateach-terms-scroll-hint">
                          ⬇️ Vui lòng kéo xuống hết để xác nhận đã đọc ⬇️
                        </div>
                      )}
                      {hasScrolledToBottom && (
                        <div className="aurateach-terms-scroll-complete">
                          ✅ Đã đọc hết điều khoản
                        </div>
                      )}
                    </div>
                  )}

                  <div className="aurateach-form-options">
                    <label className="aurateach-checkbox-label">
                      <input
                        type="checkbox"
                        checked={agreeTerms}
                        onChange={(e) => setAgreeTerms(e.target.checked)}
                        disabled={!hasScrolledToBottom}
                      />
                      <span>
                        Tôi đã đọc và đồng ý với{" "}
                        <span className="aurateach-link" onClick={() => setIsTermsOpen(true)}>
                          Điều khoản Dịch vụ
                        </span>{" "}
                        và{" "}
                        <span className="aurateach-link" onClick={() => setIsTermsOpen(true)}>
                          Chính sách Bảo mật
                        </span>{" "}
                        của AuraTeach.
                      </span>
                    </label>
                  </div>
                  {!hasScrolledToBottom && isTermsOpen && (
                    <p className="aurateach-terms-hint">
                      ⚠️ Vui lòng kéo xuống hết nội dung điều khoản để có thể đồng ý
                    </p>
                  )}
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