// src/app/(public)/(auth)/login/page.jsx
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn, useSession, signOut } from "next-auth/react";
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

  // 🔥 Kiểm tra cookie user_info khi load trang
  useEffect(() => {
    // Nếu đang redirecting, không làm gì
    if (isRedirecting) return;
    
    const hasUserInfo = document.cookie.includes("user_info");
    const hasRole = document.cookie.includes("role");
    
    console.log("=== LOGIN PAGE CHECK ===");
    console.log("hasUserInfo:", hasUserInfo);
    console.log("hasRole:", hasRole);
    console.log("Session status:", status);
    
    // Nếu đã có user_info và role, và đã authenticated -> chuyển hướng về trang chủ
    if (hasUserInfo && hasRole && status === "authenticated") {
      console.log("✅ Đã có user_info và role, chuyển hướng về trang chủ");
      setIsRedirecting(true);
      window.location.href = "/";
      return;
    }
    
    // Nếu có session nhưng chưa có user_info -> đồng bộ
    if (status === "authenticated" && session?.user && !isSynced && !hasUserInfo) {
      console.log("🔄 Đồng bộ session Google sang cookie:", session.user);
      
      const userInfo = {
        id: session.user.id || session.user.email,
        user_id: session.user.id || session.user.email,
        full_name: session.user.name,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role || "student",
        avatar: session.user.image || "/img/default-avatar.png",
      };
      
      document.cookie = `user_info=${encodeURIComponent(
        JSON.stringify(userInfo)
      )}; path=/; max-age=${30 * 24 * 60 * 60}`;
      
      document.cookie = `role=${userInfo.role}; path=/; max-age=${30 * 24 * 60 * 60}`;
      
      console.log("✅ Cookie user_info đã được set:", document.cookie);
      setIsSynced(true);
      
      setTimeout(() => {
        setIsRedirecting(true);
        window.location.href = "/";
      }, 300);
    }
    
    // ✅ Nếu không có session và không có user_info -> ở lại trang login
  }, [session, status, isSynced, isRedirecting]);

  // Hàm kiểm tra email Gmail
  const isValidGmail = (email) => {
    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    return gmailRegex.test(email);
  };

  // Đăng nhập với email/password
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

    if (hasError) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Đăng nhập thất bại");
      }

      if (!data.success || !data.user) {
        throw new Error("Dữ liệu đăng nhập không hợp lệ");
      }

      const userInfo = {
        user_id: data.user.user_id,
        name: data.user.full_name,
        email: data.user.email,
        role: data.user.role,
        avatar: data.user.avatar || "/img/avt.jpg",
      };

      const expires = rememberMe ? 30 : 1;
      document.cookie = `user_info=${encodeURIComponent(
        JSON.stringify(userInfo)
      )}; path=/; max-age=${expires * 24 * 60 * 60}`;

      document.cookie = `role=${data.user.role}; path=/; max-age=${expires * 24 * 60 * 60}`;

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
    } catch (error) {
      console.error("❌ Login error:", error);
      setError(error.message || "Đăng nhập thất bại");
    } finally {
      setIsLoading(false);
    }
  };

  // Đăng nhập với Google
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await signIn("google", { 
        callbackUrl: "/login",
        redirect: false
      });
    } catch (error) {
      console.error("❌ Google login error:", error);
      setError("Đăng nhập bằng Google thất bại, vui lòng thử lại");
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

              {status === "authenticated" && session?.user && !isSynced && (
                <div style={{ 
                  background: '#fef3c7', 
                  padding: '10px', 
                  borderRadius: '8px',
                  marginBottom: '16px',
                  textAlign: 'center',
                  color: '#92400e',
                  fontSize: '14px'
                }}>
                  ⏳ Đang đồng bộ tài khoản Google...
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