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

        // Kiểm tra OTP ở Next.js cache trước
        const stored = otpStore[email];
        if (!stored || stored.otp !== otp || Date.now() > stored.expiresAt) {
            return NextResponse.json(
                { success: false, message: "Mã xác nhận không hợp lệ hoặc đã hết hạn" },
                { status: 400 }
            );
        }

        const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.aurateach.io.vn/api";

        // 1. Tìm ID của user dựa vào email từ Laravel
        const usersRes = await fetch(`${BACKEND_URL}/users?email=${encodeURIComponent(email)}`, {
            headers: { "Accept": "application/json" }
        });
        const responseData = await usersRes.json();
        const users = Array.isArray(responseData) ? responseData : (responseData.data || []);

        if (users.length === 0) {
            return NextResponse.json(
                { success: false, message: "Không tìm thấy tài khoản trên hệ thống" },
                { status: 404 }
            );
        }

        const user = users[0];
        const userId = user.id || user.user_id;

        // 2. Gửi request PATCH/PUT sang Laravel để update mật khẩu mới
        const updateRes = await fetch(`${BACKEND_URL}/users/${userId}`, {
            method: "PATCH",
            headers: { 
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({ password: newPassword }),
        });

        if (!updateRes.ok) {
            throw new Error("Laravel không thể cập nhật mật khẩu");
        }

        // Xóa OTP sau khi đổi thành công
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