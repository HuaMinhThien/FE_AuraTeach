// src/app/api/auth/reset-password/route.js
import { NextResponse } from "next/server";
import { otpStore } from "@/lib/otpStore";


export async function POST(request) {
    try {
        const { email, otp, newPassword } = await request.json();

        if (!email || !otp || !newPassword) {
            return NextResponse.json(
                { success: false, message: "Vui lòng nhập đầy đủ thông tin" },
                { status: 400 }
            );
        }

        if (newPassword.length < 6) {
            return NextResponse.json(
                { success: false, message: "Mật khẩu phải có ít nhất 6 ký tự" },
                { status: 400 }
            );
        }

        // Kiểm tra OTP
        const stored = otpStore[email];
        if (!stored) {
            return NextResponse.json(
                { success: false, message: "Mã xác nhận không hợp lệ hoặc đã hết hạn" },
                { status: 400 }
            );
        }

        if (stored.otp !== otp) {
            return NextResponse.json(
                { success: false, message: "Mã xác nhận không đúng" },
                { status: 400 }
            );
        }

        if (Date.now() > stored.expiresAt) {
            delete otpStore[email];
            return NextResponse.json(
                { success: false, message: "Mã xác nhận đã hết hạn. Vui lòng yêu cầu lại" },
                { status: 400 }
            );
        }

        // Cập nhật mật khẩu mới
        const BACKEND_URL = process.env.BACKEND_API_URL || "http://localhost:3007";
        
        // Lấy user hiện tại
        const usersRes = await fetch(`${BACKEND_URL}/users?email=${encodeURIComponent(email)}`);
        const users = await usersRes.json();
        
        if (users.length === 0) {
            return NextResponse.json(
                { success: false, message: "Không tìm thấy tài khoản" },
                { status: 404 }
            );
        }

        const user = users[0];

        // Cập nhật password
        const updateRes = await fetch(`${BACKEND_URL}/users/${user.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password: newPassword }),
        });

        if (!updateRes.ok) {
            throw new Error("Không thể cập nhật mật khẩu");
        }

        // Xóa OTP sau khi sử dụng
        delete otpStore[email];

        return NextResponse.json({
            success: true,
            message: "Đặt lại mật khẩu thành công! Vui lòng đăng nhập.",
        });

    } catch (error) {
        console.error("❌ Reset password error:", error);
        return NextResponse.json(
            { success: false, message: error.message || "Lỗi server" },
            { status: 500 }
        );
    }
}