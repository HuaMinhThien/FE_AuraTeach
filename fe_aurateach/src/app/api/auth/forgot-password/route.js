import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { otpStore } from "@/lib/otpStore";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
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

        const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.aurateach.io.vn/api";
        
        // Gọi sang Laravel để kiểm tra email tồn tại (Ví dụ route Laravel: GET /api/users?email=...)
        const usersRes = await fetch(`${BACKEND_URL}/users?email=${encodeURIComponent(email)}`, {
            headers: {
                "Accept": "application/json",
            }
        });
        
        const responseData = await usersRes.json();
        // Laravel thường trả về mảng hoặc bọc trong đối tượng data tùy resource
        const users = Array.isArray(responseData) ? responseData : (responseData.data || []);

        if (users.length === 0) {
            return NextResponse.json(
                { success: false, message: "Email không tồn tại trong hệ thống" },
                { status: 404 }
            );
        }

        const user = users[0];
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 5 * 60 * 1000; // 5 phút

        otpStore[email] = { otp, expiresAt };

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "🔐 Mã xác nhận đặt lại mật khẩu - AuraTeach",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa; border-radius: 10px;">
                    <div style="text-align: center; padding: 20px 0;">
                        <h1 style="color: #00236F; margin: 0;">AuraTeach</h1>
                    </div>
                    <div style="background: white; padding: 30px; border-radius: 10px;">
                        <h2 style="color: #00236F; margin-top: 0;">🔐 Xác nhận đặt lại mật khẩu</h2>
                        <p>Chào <strong>${user.full_name || user.name || "bạn"}</strong>,</p>
                        <p>Mã xác nhận của bạn là:</p>
                        <div style="text-align: center; padding: 20px 0;">
                            <span style="display: inline-block; font-size: 32px; font-weight: bold; color: #00236F; background: #e8edf5; padding: 15px 30px; border-radius: 8px; letter-spacing: 4px;">
                                ${otp}
                            </span>
                        </div>
                        <p style="color: #ef4444; font-size: 14px;">⚠️ Mã sẽ hết hạn sau <strong>5 phút</strong>.</p>
                    </div>
                </div>
            `,
        };

        await transporter.sendMail(mailOptions);

        return NextResponse.json({
            success: true,
            message: "Mã xác nhận đã được gửi đến email của bạn",
        });

    } catch (error) {
        console.error("❌ Forgot password error:", error);
        return NextResponse.json(
            { success: false, message: error.message || "Lỗi server kết nối đến Laravel" },
            { status: 500 }
        );
    }
}