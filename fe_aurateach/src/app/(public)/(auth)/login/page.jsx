"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { authService } from "@/services/authService";
import Headers from "@/components/users/Header";
import "./login.css";

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Load email và password đã lưu từ localStorage
    const savedEmail = localStorage.getItem("remembered_email");
    const savedPassword = localStorage.getItem("remembered_password");
    const savedRememberMe = localStorage.getItem("remember_me") === "true";

    if (savedRememberMe && savedEmail) {
      setEmail(savedEmail);
      setPassword(savedPassword || "");
      setRememberMe(true);
    }
  }, []);

  // 🔥 Đồng bộ session Google sang Laravel Backend và hệ thống Cookie
  useEffect(() => {
    if (isRedirecting) return;

    // ⚡ Kiểm tra xem người dùng vừa bấm đăng xuất chưa để tránh vòng lặp tự động đăng nhập lại
    const isLoggedOut = sessionStorage.getItem("just_logged_out");
    if (isLoggedOut === "true") {
      return; 
    }

    const syncGoogleWithBackend = async () => {
      if (status === "authenticated" && session?.user && !isSynced) {
        setIsSynced(true);
        setIsLoading(true);

        try {
          const response = await authService.syncGoogle({
            email: session.user.email,
            name: session.user.name,
            avatar: session.user.image,
          });

          const data = response?.data || response;

          if (!data || (!data.user && !data.access_token && !data.token)) {
            throw new Error(data?.message || "Không thể đồng bộ tài khoản Google với máy chủ");
          }

          const userData = data.user || data;
          const userInfo = {
            user_id: userData.user_id || userData.id,
            name: userData.full_name || userData.name,
            full_name: userData.full_name || userData.name,
            email: userData.email,
            role: userData.role || "student",
            avatar: userData.avatar || session.user.image || "/img/default-avatar.png",
          };

          const maxAgeSeconds = 30 * 24 * 60 * 60; // 30 ngày

          document.cookie = `user_info=${encodeURIComponent(JSON.stringify(userInfo))}; path=/; max-age=${maxAgeSeconds}`;
          document.cookie = `role=${userInfo.role}; path=/; max-age=${maxAgeSeconds}`;
          
          if (data.access_token || data.token) {
            document.cookie = `token=${data.access_token || data.token}; path=/; max-age=${maxAgeSeconds}`;
          }

          setIsRedirecting(true);

          switch (userInfo.role) {
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
          console.error("❌ Chi tiết Lỗi đồng bộ Google:", err);
          const errorMsg = err.response?.data?.message || err.message || "Đăng nhập Google thất bại";
          setError(errorMsg);
          setIsSynced(false);
          setIsLoading(false);
        }
      }
    };

    syncGoogleWithBackend();
  }, [session, status, isSynced, isRedirecting, router]);

  // Hàm kiểm tra email Gmail chuẩn
  const isValidGmail = (email) => {
    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    return gmailRegex.test(email);
  };

  // Đăng nhập với email/password (qua authService / Backend Laravel)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setErrors({});

    let hasError = false;
    const newErrors = {};

    if (!email) {
      newErrors.email = "Vui lòng nhập email";
      hasError = true;
    } else if (!isValidGmail(email)) {
      newErrors.email = "Vui lòng sử dụng email Gmail (@gmail.com)";
      hasError = true;
    }

    if (!password) {
      newErrors.password = "Vui lòng nhập mật khẩu";
      hasError = true;
    }

    if (rememberMe) {
      localStorage.setItem("remembered_email", email);
      localStorage.setItem("remembered_password", password);
      localStorage.setItem("remember_me", "true");
    } else {
      localStorage.removeItem("remembered_email");
      localStorage.removeItem("remembered_password");
      localStorage.removeItem("remember_me");
    }

    if (hasError) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.login({ email, password });
      const data = response?.data || response;

      if (!data || data.success === false || (!data.user && !data.access_token && !data.token)) {
        throw new Error(data?.message || "Dữ liệu đăng nhập không hợp lệ từ máy chủ");
      }

      const userData = data.user || data;

      const userInfo = {
        user_id: userData.user_id || userData.id,
        name: userData.full_name || userData.name,
        full_name: userData.full_name || userData.name,
        email: userData.email,
        role: userData.role || "student",
        avatar: userData.avatar || "/img/avt.jpg",
      };

      const expires = rememberMe ? 30 : 1;
      const maxAgeSeconds = expires * 24 * 60 * 60;

      document.cookie = `user_info=${encodeURIComponent(JSON.stringify(userInfo))}; path=/; max-age=${maxAgeSeconds}`;
      document.cookie = `role=${userInfo.role}; path=/; max-age=${maxAgeSeconds}`;

      if (data.access_token || data.token) {
        const tokenValue = data.access_token || data.token;
        document.cookie = `token=${tokenValue}; path=/; max-age=${maxAgeSeconds}`;
        // Lưu vào localStorage để các service (adminChatService, apiClient...) có thể đọc
        localStorage.setItem("access_token", tokenValue);
      }

      switch (data.user.role) {
        case "student":
          window.location.href = "/";
          break;
        case "tutor":
          window.location.href = "/tutor-dashboard";
          break;
        case "admin":
          window.location.href = "/admin-dashboard";
          break;
        default:
          window.location.href = "/";
      }
    } catch (err) {
      console.error("❌ Login error:", err);
      setError(err.response?.data?.message || err.message || "Đăng nhập thất bại");
    } finally {
      setIsLoading(false);
    }
  };

  // Kích hoạt bảng chọn tài khoản Google qua NextAuth
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      // ⚡ Xóa cờ "just_logged_out" đi để cho phép đồng bộ lại khi Google trả về session mới
      sessionStorage.removeItem("just_logged_out");
      
      // Sửa lại thành thế này:
      await signIn("google"); 
    } catch (error) {
      console.error("❌ Google login error:", error);
      setError("Đăng nhập bằng Google thất bại, vui lòng thử lại");
      setIsLoading(false);
    }
  };

  const handleRememberMeChange = (e) => {
    const checked = e.target.checked;
    setRememberMe(checked);
    
    // Nếu bỏ chọn, xóa dữ liệu đã lưu
    if (!checked) {
      localStorage.removeItem("remembered_email");
      localStorage.removeItem("remembered_password");
      localStorage.removeItem("remember_me");
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

              {status === "authenticated" && session?.user && (
                <div style={{ 
                  background: '#fef3c7', 
                  padding: '10px', 
                  borderRadius: '8px',
                  marginBottom: '16px',
                  textAlign: 'center',
                  color: '#92400e',
                  fontSize: '14px'
                }}>
                  ⏳ Đang đồng bộ tài khoản Google với hệ thống...
                </div>
              )}

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
                      onChange={handleRememberMeChange}
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
              </form>

              <div className="aurateach-divider">
                <span>Hoặc đăng nhập với</span>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                className="aurateach-google-button"
                disabled={isLoading}
              >
                <svg className="google-icon" viewBox="0 0 48 48" width="20" height="20">
                  <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                  <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                  <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                  <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                </svg>
                <span>Tiếp tục với Google</span>
              </button>

              <div className="aurateach-register-link">
                Chưa có tài khoản?{" "}
                <Link href="/register" className="aurateach-register-now">
                  Đăng ký ngay
                </Link>
              </div>
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