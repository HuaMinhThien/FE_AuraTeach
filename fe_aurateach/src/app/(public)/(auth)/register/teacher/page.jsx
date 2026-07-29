"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Headers from "@/components/users/Header";
import authService from "@/services/authService";
import "./teacher.css";

export default function TeacherRegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedExpertise, setSelectedExpertise] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [cvLink, setCvLink] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

  // Hàm kiểm tra link CV/Portfolio hợp lệ
  const isValidCvLink = (link) => {
    if (!link) return true; // Cho phép để trống
    
    try {
      const url = new URL(link);
      const hostname = url.hostname.toLowerCase();
      
      // Danh sách domain được phép
      const allowedDomains = [
        // Linkedin
        'linkedin.com',
        'www.linkedin.com',
        // TopCV
        'topcv.vn',
        'www.topcv.vn',
        // Google Drive
        'drive.google.com',
        'www.drive.google.com',
        // Portfolio phổ biến
        'portfolio.com',
        'www.portfolio.com',
        'myportfolio.com',
        'www.myportfolio.com',
        // Github
        'github.com',
        'www.github.com',
        // Behance
        'behance.net',
        'www.behance.net',
        // Dribbble
        'dribbble.com',
        'www.dribbble.com',
        // Các domain khác
        'docs.google.com',
        'www.docs.google.com',
      ];
      
      // Kiểm tra xem hostname có trong danh sách cho phép không
      const isAllowed = allowedDomains.some(domain => 
        hostname === domain || hostname.endsWith('.' + domain)
      );
      
      return isAllowed;
    } catch {
      return false; // URL không hợp lệ
    }
  };

  const expertiseOptions = [
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

  // Xử lý chọn/bỏ chọn môn học
  const toggleExpertise = (subject) => {
    setSelectedExpertise(prev => {
      if (prev.includes(subject)) {
        return prev.filter(item => item !== subject);
      } else {
        return [...prev, subject];
      }
    });
  };

  // Xóa tất cả môn đã chọn
  const clearAllExpertise = () => {
    setSelectedExpertise([]);
  };

  // Đóng dropdown khi click ra ngoài
  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (
      !fullName ||
      !email ||
      !phone ||
      selectedExpertise.length === 0 ||
      !password ||
      !confirmPassword
    ) {
      setError("Vui lòng nhập đầy đủ thông tin và chọn ít nhất 1 lĩnh vực");
      return;
    }

    // Kiểm tra email phải là Gmail
    if (!isValidGmail(email)) {
      setError("Vui lòng sử dụng email Gmail (@gmail.com)");
      return;
    }

    // Kiểm tra số điện thoại
    if (!isValidPhone(phone)) {
      setError("Số điện thoại phải bắt đầu bằng số 0 và có đúng 10 chữ số");
      return;
    }

    // Kiểm tra link CV/Portfolio (nếu có nhập)
    if (cvLink && !isValidCvLink(cvLink)) {
      setError("Link CV/Portfolio không hợp lệ. Chỉ hỗ trợ: LinkedIn, TopCV, Google Drive, Github, Behance, Portfolio");
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

    try {
      const result = await authService.register({
        full_name: fullName,
        email: email,
        password: password,
        phone: phone,
        role: "tutor",
        expertise: selectedExpertise.join(", "),
        cv_link: cvLink
      });

      if (result.success) {
        alert("✅ Đăng ký thành công! Tài khoản của bạn đang chờ admin xét duyệt. Vui lòng đợi thông báo qua email.");
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
                  <label htmlFor="fullName">Họ và tên <span style={{color: '#ef4444'}}>*</span></label>
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
                  <label htmlFor="email">Email liên hệ <span style={{color: '#ef4444'}}>*</span></label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@gmail.com"
                    className="aurateach-form-input"
                    required
                  />
                  <small style={{color: '#6b7280', fontSize: '0.75rem'}}>
                    Chỉ hỗ trợ email Gmail (@gmail.com)
                  </small>
                </div>

                <div className="aurateach-form-group">
                  <label htmlFor="phone">Số điện thoại <span style={{color: '#ef4444'}}>*</span></label>
                  <input
                    type="tel"
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="090 123 4567"
                    className="aurateach-form-input"
                    required
                  />
                  <small style={{color: '#6b7280', fontSize: '0.75rem'}}>
                    Nhập số điện thoại bắt đầu bằng 0 và có 10 chữ số
                  </small>
                </div>

                {/* Lĩnh vực chuyên môn - Dropdown */}
                <div className="aurateach-form-group">
                  <label>
                    Lĩnh vực chuyên môn <span style={{color: '#ef4444'}}>*</span>
                  </label>
                  
                  {/* Dropdown toggle button */}
                  <div 
                    className={`aurateach-dropdown-toggle ${isDropdownOpen ? 'open' : ''}`}
                    onClick={toggleDropdown}
                  >
                    <span className="aurateach-dropdown-text">
                      {selectedExpertise.length > 0 
                        ? `Đã chọn ${selectedExpertise.length} môn` 
                        : 'Chọn lĩnh vực chuyên môn'}
                    </span>
                    <span className="aurateach-dropdown-arrow">
                      {isDropdownOpen ? '▲' : '▼'}
                    </span>
                  </div>

                  {/* Dropdown content */}
                  {isDropdownOpen && (
                    <div className="aurateach-dropdown-content">
                      <div className="aurateach-dropdown-header">
                        <span className="aurateach-dropdown-title">Chọn lĩnh vực</span>
                        {selectedExpertise.length > 0 && (
                          <button 
                            type="button" 
                            className="aurateach-clear-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              clearAllExpertise();
                            }}
                          >
                            Xóa tất cả
                          </button>
                        )}
                      </div>
                      <div className="aurateach-expertise-list">
                        {expertiseOptions.map((subject) => (
                          <label key={subject} className="aurateach-expertise-item">
                            <input
                              type="checkbox"
                              checked={selectedExpertise.includes(subject)}
                              onChange={() => toggleExpertise(subject)}
                            />
                            <span>{subject}</span>
                          </label>
                        ))}
                      </div>
                      <div className="aurateach-dropdown-footer">
                        <button 
                          type="button" 
                          className="aurateach-dropdown-close-btn"
                          onClick={toggleDropdown}
                        >
                          Đóng
                        </button>
                      </div>
                    </div>
                  )}
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
                  <small style={{color: '#6b7280', fontSize: '0.75rem'}}>
                    Hỗ trợ: LinkedIn, TopCV, Google Drive, Github, Behance, Portfolio
                  </small>
                </div>

                <div className="aurateach-form-group">
                  <label htmlFor="password">Mật khẩu <span style={{color: '#ef4444'}}>*</span></label>
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
                  <label htmlFor="confirmPassword">Xác nhận mật khẩu <span style={{color: '#ef4444'}}>*</span></label>
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