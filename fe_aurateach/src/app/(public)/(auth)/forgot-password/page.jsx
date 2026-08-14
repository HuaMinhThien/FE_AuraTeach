// src/app/(public)/(auth)/forgot-password/page.jsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Headers from "@/components/users/Header";
import authService from "@/services/authService";
import "./forgot-password.css";

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [step, setStep] = useState(1);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);
    const [verifiedEmail, setVerifiedEmail] = useState(""); // Lưu email đã xác thực

    // Gửi mã OTP sử dụng authService
    const handleSendOTP = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        setIsLoading(true);

        try {
            const data = await authService.forgotPassword(email);

            // Kiểm tra kết quả trả về từ service/apiClient
            if (data && (data.success !== false)) {
                setSuccess("✅ Mã xác nhận đã được gửi đến email của bạn!");
                setVerifiedEmail(email); // Lưu email đã gửi
                setStep(2);
                setResendTimer(60);
                const timer = setInterval(() => {
                    setResendTimer((prev) => {
                        if (prev <= 1) {
                            clearInterval(timer);
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);
            } else {
                setError(data?.message || "Có lỗi xảy ra");
            }
        } catch (error) {
            setError(error.message || "Không thể gửi mã xác nhận");
        } finally {
            setIsLoading(false);
        }
    };

    // 🔥 KIỂM TRA OTP TRƯỚC KHI CHUYỂN BƯỚC SỬ DỤNG authService
    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!otp || otp.length < 6) {
            setError("Vui lòng nhập đầy đủ mã 6 chữ số");
            return;
        }

        setIsLoading(true);

        try {
            const data = await authService.verifyOtp(verifiedEmail, otp);

            if (data && (data.success !== false)) {
                setSuccess("✅ Mã xác nhận chính xác! Vui lòng nhập mật khẩu mới.");
                setStep(3); // Chỉ chuyển sang bước 3 khi OTP đúng
            } else {
                setError(data?.message || "Mã xác nhận không đúng hoặc đã hết hạn");
            }
        } catch (error) {
            setError(error.message || "Mã xác nhận không đúng");
        } finally {
            setIsLoading(false);
        }
    };

    // Đặt lại mật khẩu sử dụng authService
    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (newPassword !== confirmPassword) {
            setError("Mật khẩu xác nhận không khớp");
            return;
        }

        if (newPassword.length < 6) {
            setError("Mật khẩu phải có ít nhất 6 ký tự");
            return;
        }

        setIsLoading(true);

        try {
            const data = await authService.resetPassword(verifiedEmail, otp, newPassword);

            if (data && (data.success !== false)) {
                setSuccess("✅ Đặt lại mật khẩu thành công!");
                setTimeout(() => {
                    router.push("/login");
                }, 2000);
            } else {
                setError(data?.message || "Có lỗi xảy ra");
            }
        } catch (error) {
            setError(error.message || "Đặt lại mật khẩu thất bại");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <Headers />
            <div className="forgot-password-page">
                <div className="forgot-password-container">
                    <div className="forgot-password-card">
                        <h1 className="forgot-password-title">Quên mật khẩu</h1>
                        <p className="forgot-password-subtitle">
                            {step === 1 && "Nhập email của bạn để nhận mã xác nhận"}
                            {step === 2 && "Nhập mã xác nhận đã được gửi đến email của bạn"}
                            {step === 3 && "Tạo mật khẩu mới cho tài khoản của bạn"}
                        </p>

                        {error && (
                            <div className="forgot-password-error">{error}</div>
                        )}
                        {success && (
                            <div className="forgot-password-success">{success}</div>
                        )}

                        {/* Step 1: Nhập email */}
                        {step === 1 && (
                            <form onSubmit={handleSendOTP} className="forgot-password-form">
                                <div className="form-group">
                                    <label htmlFor="email">Email <span style={{color: '#ef4444'}}>*</span></label>
                                    <input
                                        type="email"
                                        id="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="example@gmail.com"
                                        className="form-input"
                                        required
                                    />
                                    <small style={{color: '#6b7280', fontSize: '0.75rem'}}>
                                        Nhập email đã đăng ký tài khoản AuraTeach
                                    </small>
                                </div>

                                <button
                                    type="submit"
                                    className="forgot-password-button"
                                    disabled={isLoading}
                                >
                                    {isLoading ? "Đang gửi..." : "Gửi mã xác nhận"}
                                </button>
                            </form>
                        )}

                        {/* Step 2: Nhập OTP - CÓ KIỂM TRA */}
                        {step === 2 && (
                            <form onSubmit={handleVerifyOTP} className="forgot-password-form">
                                <div className="form-group">
                                    <label htmlFor="otp">Mã xác nhận <span style={{color: '#ef4444'}}>*</span></label>
                                    <input
                                        type="text"
                                        id="otp"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                        placeholder="Nhập mã 6 chữ số"
                                        className="form-input"
                                        maxLength={6}
                                        required
                                    />
                                    <small style={{color: '#6b7280', fontSize: '0.75rem'}}>
                                        Nhập mã 6 chữ số đã được gửi đến email của bạn
                                    </small>
                                </div>

                                <div className="forgot-password-actions">
                                    <button
                                        type="submit"
                                        className="forgot-password-button"
                                        disabled={isLoading || otp.length < 6}
                                    >
                                        {isLoading ? "Đang kiểm tra..." : "Xác nhận mã"}
                                    </button>
                                    <button
                                        type="button"
                                        className="forgot-password-resend"
                                        onClick={handleSendOTP}
                                        disabled={resendTimer > 0 || isLoading}
                                    >
                                        {resendTimer > 0 
                                            ? `Gửi lại sau ${resendTimer}s` 
                                            : "Gửi lại mã"}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Step 3: Đổi mật khẩu */}
                        {step === 3 && (
                            <form onSubmit={handleResetPassword} className="forgot-password-form">
                                <div className="form-group">
                                    <label htmlFor="newPassword">Mật khẩu mới <span style={{color: '#ef4444'}}>*</span></label>
                                    <input
                                        type="password"
                                        id="newPassword"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="********"
                                        className="form-input"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="confirmPassword">Xác nhận mật khẩu <span style={{color: '#ef4444'}}>*</span></label>
                                    <input
                                        type="password"
                                        id="confirmPassword"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="********"
                                        className="form-input"
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="forgot-password-button"
                                    disabled={isLoading}
                                >
                                    {isLoading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
                                </button>
                            </form>
                        )}

                        <div className="forgot-password-footer">
                            <Link href="/login" className="forgot-password-link">
                                ← Quay lại đăng nhập
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}