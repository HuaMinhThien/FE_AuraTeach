"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Headers from "@/components/users/Header";
import "./teacher.css";

export default function TeacherRegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [expertise, setExpertise] = useState("");
  const [cvLink, setCvLink] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const expertiseOptions = [
    "Chọn lĩnh vực của bạn",
    "Toán học",
    "Ngữ văn",
    "Tiếng Anh",
    "Vật lý",
    "Hóa học",
    "Sinh học",
    "Lịch sử",
    "Địa lý",
    "Tin học",
    "Kỹ năng mềm",
    "Lập trình",
    "Ngoại ngữ khác",
    "Âm nhạc - Nghệ thuật",
    "Thể dục - Thể thao",
    "Khác",
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (
      !fullName ||
      !email ||
      !phone ||
      !expertise ||
      !password ||
      !confirmPassword
    ) {
      setError("Vui lòng nhập đầy đủ thông tin");
      return;
    }

    if (expertise === "Chọn lĩnh vực của bạn") {
      setError("Vui lòng chọn lĩnh vực chuyên môn");
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

    if (!agreeTerms) {
      setError("Vui lòng đồng ý với điều khoản");
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      console.log("Đăng ký giảng viên:", {
        fullName,
        email,
        phone,
        expertise,
        cvLink,
        password,
      });
      setIsLoading(false);
      router.push("/login");
    }, 1000);
  };

  return (
    <>
      <Headers />
      <div className="aurateach-teacher-page">
        <div className="aurateach-teacher-container">
          {/* Phần bên trái - Hình ảnh minh họa */}
          <div className="aurateach-teacher-left">
            <div className="aurateach-teacher-hero">
              <img
                src="/images/teacher-hero.jpg"
                alt="Đăng ký giảng viên AuraTeach"
                className="aurateach-teacher-hero-img"
              />
              <div className="aurateach-teacher-hero-overlay">
                <div className="aurateach-hero-icon">🎓✨</div>
                <h2>AuraTeach</h2>
                <p>
                  Nền tảng kết nối gia sư và học viên
                  <br />
                  uy tín hàng đầu Việt Nam.
                </p>
                <div className="aurateach-hero-quote">
                  "Chia sẻ kiến thức - Lan tỏa giá trị"
                </div>
              </div>
            </div>
          </div>

          {/* Phần bên phải - Form đăng ký giảng viên */}
          <div className="aurateach-teacher-right">
            <div className="aurateach-teacher-card">
              <h1 className="aurateach-teacher-title">
                Trở thành Giảng viên tại AuraTeach
              </h1>
              <p className="aurateach-teacher-subtitle">
                Chia sẻ kiến thức của bạn và xây dựng thương hiệu cá nhân.
              </p>

              {/* 3 lợi ích */}
              <div className="aurateach-benefits">
                <div className="benefit-item">
                  <span className="benefit-icon">💰</span>
                  <div>
                    <h4>Tăng thu nhập xứng đáng</h4>
                    <p>
                      Mô hình chia sẻ lợi nhuận hàng đầu nhất thị trường giáo
                      dục trực tuyến.
                    </p>
                  </div>
                </div>
                <div className="benefit-item">
                  <span className="benefit-icon">⏰</span>
                  <div>
                    <h4>Quản lý linh hoạt</h4>
                    <p>
                      Trợ giúp thiết kế giáo trình và chủ động thời gian giảng
                      dạy của riêng bạn.
                    </p>
                  </div>
                </div>
                <div className="benefit-item">
                  <span className="benefit-icon">👥</span>
                  <div>
                    <h4>Cộng đồng gia sư</h4>
                    <p>Kết nối với mạng lưới các giảng viên giỏi.</p>
                  </div>
                </div>
              </div>

              <h3 className="aurateach-form-section-title">
                Đăng ký giảng viên
              </h3>
              <p className="aurateach-form-section-desc">
                Cung cấp thông tin của bạn để bắt đầu hành trình giảng dạy
                chuyên nghiệp.
              </p>

              <form onSubmit={handleSubmit} className="aurateach-teacher-form">
                {error && (
                  <div className="aurateach-error-message">{error}</div>
                )}

                <div className="aurateach-form-group">
                  <label htmlFor="fullName">Họ và tên</label>
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
                  <label htmlFor="email">Email liên hệ</label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="aurateach-form-input"
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
                  <label htmlFor="expertise">Lĩnh vực chuyên môn</label>
                  <select
                    id="expertise"
                    value={expertise}
                    onChange={(e) => setExpertise(e.target.value)}
                    className="aurateach-form-input"
                  >
                    {expertiseOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="aurateach-form-group">
                  <label htmlFor="cvLink">Link CV hoặc Portfolio</label>
                  <input
                    type="url"
                    id="cvLink"
                    value={cvLink}
                    onChange={(e) => setCvLink(e.target.value)}
                    placeholder="https://linkedin.com/in/username"
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
                      Tôi đồng ý với các{" "}
                      <Link href="/terms" className="aurateach-link">
                        điều khoản dành cho đối tác
                      </Link>{" "}
                      và cam kết cung cấp nội dung chính xác, chất lượng cao.
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="aurateach-teacher-button"
                  disabled={isLoading}
                >
                  {isLoading ? "Đang xử lý..." : "Đăng ký làm Giảng viên"}
                </button>

                <div className="aurateach-login-link">
                  Bạn đã có tài khoản giảng viên?{" "}
                  <Link href="/login" className="aurateach-login-now">
                    Đăng nhập ngay
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
