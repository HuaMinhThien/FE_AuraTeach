// src/app/api/auth/verify-otp/route.js
import { NextResponse } from "next/server";
import { otpStore } from "@/lib/otpStore";


export async function POST(request) {
    try {
        const { email, otp } = await request.json();

        if (!email || !otp) {
            return NextResponse.json(
                { success: false, message: "Vui lòng nhập đầy đủ thông tin" },
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

        return NextResponse.json({
            success: true,
            message: "Mã xác nhận chính xác",
        });

    } catch (error) {
        console.error("❌ Verify OTP error:", error);
        return NextResponse.json(
            { success: false, message: error.message || "Lỗi server" },
            { status: 500 }
        );
    }
}