// src/app/api/auth/forgot-password/route.js
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { otpStore } from "@/lib/otpStore";


// Cấu hình email sender
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER, // Email gửi đi
        pass: process.env.EMAIL_PASS, // App password
    },
});

export async function POST(request) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json(
                { success: false, message: "Vui lòng nhập email" },
                { status: 400 }
            );
        }

        // Kiểm tra email có tồn tại trong hệ thống không
        const BACKEND_URL = process.env.BACKEND_API_URL || "http://localhost:3007";
        const usersRes = await fetch(`${BACKEND_URL}/users?email=${encodeURIComponent(email)}`);
        const users = await usersRes.json();

        if (users.length === 0) {
            return NextResponse.json(
                { success: false, message: "Email không tồn tại trong hệ thống" },
                { status: 404 }
            );
        }

        // Tạo mã OTP 6 chữ số
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 5 * 60 * 1000; // Hết hạn sau 5 phút

        // Lưu OTP
        otpStore[email] = { otp, expiresAt };

        console.log(`📧 OTP for ${email}: ${otp}`);

        // Nội dung email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "🔐 Mã xác nhận đặt lại mật khẩu - AuraTeach",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa; border-radius: 10px;">
                    <div style="text-align: center; padding: 20px 0;">
                        <h1 style="color: #00236F; margin: 0;">AuraTeach</h1>
                        <p style="color: #6b7280;">Nền tảng kết nối gia sư và học viên</p>
                    </div>
                    <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <h2 style="color: #00236F; margin-top: 0;">🔐 Xác nhận đặt lại mật khẩu</h2>
                        <p>Chào <strong>${users[0].full_name || "bạn"}</strong>,</p>
                        <p>Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
                        <p>Vui lòng nhập mã xác nhận dưới đây để tiếp tục:</p>
                        <div style="text-align: center; padding: 20px 0;">
                            <span style="display: inline-block; font-size: 32px; font-weight: bold; color: #00236F; background: #e8edf5; padding: 15px 30px; border-radius: 8px; letter-spacing: 4px;">
                                ${otp}
                            </span>
                        </div>
                        <p style="color: #ef4444; font-size: 14px;">
                            ⚠️ Mã xác nhận sẽ hết hạn sau <strong>5 phút</strong>.
                        </p>
                        <p style="color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; padding-top: 15px; margin-top: 15px;">
                            Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
                        </p>
                    </div>
                    <div style="text-align: center; padding: 20px 0; color: #6b7280; font-size: 12px;">
                        <p>© 2026 AuraTeach. All rights reserved.</p>
                    </div>
                </div>
            `,
        };

        // Gửi email
        await transporter.sendMail(mailOptions);

        return NextResponse.json({
            success: true,
            message: "Mã xác nhận đã được gửi đến email của bạn",
            email: email,
        });

    } catch (error) {
        console.error("❌ Forgot password error:", error);
        return NextResponse.json(
            { success: false, message: error.message || "Lỗi server" },
            { status: 500 }
        );
    }
}