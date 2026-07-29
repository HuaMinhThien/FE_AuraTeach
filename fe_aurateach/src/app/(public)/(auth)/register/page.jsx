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
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const termsRef = useRef(null);

  // Hàm kiểm tra email Gmail
  const isValidGmail = (email) => {
    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    return gmailRegex.test(email);
  };

  // Hàm kiểm tra số điện thoại Việt Nam
  const isValidPhone = (phone) => {
    const phoneRegex = /^0[0-9]{9}$/;
    return phoneRegex.test(phone);
  };

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
    setErrors({});

    let hasError = false;
    const newErrors = {};

    // Kiểm tra từng field
    if (!fullName) {
      newErrors.fullName = "Vui lòng nhập họ và tên";
      hasError = true;
    }

    if (!email) {
      newErrors.email = "Vui lòng nhập email";
      hasError = true;
    } else if (!isValidGmail(email)) {
      newErrors.email = "Vui lòng sử dụng email Gmail (@gmail.com)";
      hasError = true;
    }

    if (phone && !isValidPhone(phone)) {
      newErrors.phone = "Số điện thoại phải bắt đầu bằng 0 và có đúng 10 chữ số";
      hasError = true;
    }

    if (!password) {
      newErrors.password = "Vui lòng nhập mật khẩu";
      hasError = true;
    } else if (password.length < 6) {
      newErrors.password = "Mật khẩu phải có ít nhất 6 ký tự";
      hasError = true;
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Vui lòng xác nhận mật khẩu";
      hasError = true;
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Mật khẩu xác nhận không khớp";
      hasError = true;
    }

    if (!hasScrolledToBottom) {
      newErrors.terms = "Vui lòng đọc hết điều khoản trước khi đăng ký";
      hasError = true;
      setIsTermsOpen(true);
    } else if (!agreeTerms) {
      newErrors.terms = "Vui lòng đồng ý với điều khoản dịch vụ";
      hasError = true;
    }

    if (hasError) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);

    try {
      const result = await authService.register({
        fullName: fullName,
        email: email,
        password: password,
        phone: phone,
        role: "student",
        grade: "",
        schoolName: ""
      });

      if (result.success) {
        alert(result.message);
        router.push("/login");
      } else {
        setError(result.message || "Đăng ký thất bại, vui lòng thử lại");
      }
    } catch (error) {
      setError(error.message || "Đã xảy ra lỗi khi đăng ký");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Headers />
      <div className="aurateach-register-page">
        <div className="aurateach-register-container">
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
                  <label htmlFor="fullName">Họ và Tên <span style={{color: '#ef4444'}}>*</span></label>
                  <input
                    type="text"
                    id="fullName"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (errors.fullName) {
                        setErrors(prev => ({ ...prev, fullName: '' }));
                      }
                    }}
                    placeholder="Nguyễn Văn A"
                    className={`aurateach-form-input ${errors.fullName ? 'input-error' : ''}`}
                    required
                  />
                  {errors.fullName && (
                    <span className="error-text">{errors.fullName}</span>
                  )}
                </div>

                <div className="aurateach-form-group">
                  <label htmlFor="email">Địa chỉ Email <span style={{color: '#ef4444'}}>*</span></label>
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
                  <label htmlFor="phone">Số điện thoại</label>
                  <input
                    type="tel"
                    id="phone"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (errors.phone) {
                        setErrors(prev => ({ ...prev, phone: '' }));
                      }
                    }}
                    placeholder="090 123 4567"
                    className={`aurateach-form-input ${errors.phone ? 'input-error' : ''}`}
                  />
                  {errors.phone && (
                    <span className="error-text">{errors.phone}</span>
                  )}
                  <small style={{color: '#6b7280', fontSize: '0.75rem'}}>
                    Nhập số điện thoại bắt đầu bằng 0 và có 10 chữ số
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
                    placeholder="********"
                    className={`aurateach-form-input ${errors.password ? 'input-error' : ''}`}
                    required
                  />
                  {errors.password && (
                    <span className="error-text">{errors.password}</span>
                  )}
                </div>

                <div className="aurateach-form-group">
                  <label htmlFor="confirmPassword">Xác nhận mật khẩu <span style={{color: '#ef4444'}}>*</span></label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errors.confirmPassword) {
                        setErrors(prev => ({ ...prev, confirmPassword: '' }));
                      }
                    }}
                    placeholder="********"
                    className={`aurateach-form-input ${errors.confirmPassword ? 'input-error' : ''}`}
                    required
                  />
                  {errors.confirmPassword && (
                    <span className="error-text">{errors.confirmPassword}</span>
                  )}
                </div>

                {/* Điều khoản dịch vụ */}
                <div className={`aurateach-terms-section ${errors.terms ? 'has-error' : ''}`}>
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
                        onChange={(e) => {
                          setAgreeTerms(e.target.checked);
                          if (errors.terms) {
                            setErrors(prev => ({ ...prev, terms: '' }));
                          }
                        }}
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
                  {errors.terms && (
                    <span className="error-text">{errors.terms}</span>
                  )}
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