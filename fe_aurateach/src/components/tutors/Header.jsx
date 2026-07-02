"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import "../../css/tutor-style/header.css"; 
import userService from "@/services/userService";

export default function Header() {
    const [user, setUser] = useState(null);
    const [balances, setBalances] = useState({ pending: 0, available: 0 });

    // 1. Thêm lại hàm này ở đây
    const getValidAvatar = (avatar) => {
        if (!avatar) return "/img/default-avatar.png";
        if (avatar.startsWith('http://') || avatar.startsWith('https://')) return avatar;
        return avatar.startsWith('/') ? avatar : `/${avatar}`;
    };

    // 2. Hàm lấy cookie cũng cần được định nghĩa lại nếu nó không nằm trong import
    const getCookie = (name) => {
        if (typeof window === "undefined") return null;
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    };

    useEffect(() => {
        const initDashboard = async () => {
            const userCookie = getCookie("user_info");
            if (!userCookie) return;

            try {
                const userDataFromCookie = JSON.parse(decodeURIComponent(userCookie));
                const userId = userDataFromCookie.user_id || userDataFromCookie.id;

                // GỌI SONG SONG CẢ 2 API
                const [userData, walletData] = await Promise.all([
                    userService.getUserDetails(userId),
                    userService.getTutorDetails(userId)
                ]);

                // Set User
                setUser(userData);

                // Set Wallet
                const wallet = Array.isArray(walletData) ? walletData[0] : walletData;
                if (wallet) {
                    setBalances({
                        pending: wallet.pending_balance || 0,
                        available: wallet.available_balance || 0
                    });
                }
            } catch (error) {
                console.error("Lỗi khởi tạo dashboard:", error);
            }
        };

        initDashboard();
        
        // Vẫn giữ interval để cập nhật ví tiền mỗi 10s
        const interval = setInterval(initDashboard, 10000);
        return () => clearInterval(interval);
    }, []);

    return (
        <>
            <header>
                <div className="icons">
                    <Image src="/img/icons/notificationn.png" alt="Notification" width={20} height={20} />
                </div>

                {/* Khu vực hiển thị 2 ví tiền động của Gia Sư */}
                <div className="tutor-wallets" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    {/* Ví chờ nhận */}
                    <div className="wallet-item" style={{ background: "#fffbeb", padding: "4px 10px", borderRadius: "8px", border: "1px solid #fde68a" }}>
                        <span style={{ fontSize: "11px", color: "#d97706", display: "block", fontWeight: "500" }}>Chờ nhận</span>
                        <strong style={{ color: "#b45309", fontSize: "14px" }}>
                            {balances.pending.toLocaleString("vi-VN")}đ
                        </strong>
                    </div>

                    {/* Ví khả dụng để rút */}
                    <div className="wallet-item" style={{ background: "#f0fdf4", padding: "4px 10px", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
                        <span style={{ fontSize: "11px", color: "#16a34a", display: "block", fontWeight: "500" }}>Khả dụng (Rút)</span>
                        <strong style={{ color: "#15803d", fontSize: "14px" }}>
                            {balances.available.toLocaleString("vi-VN")}đ
                            
                        </strong>
                    </div>
                </div>

                <hr />

                <div className="user-info">
                    <div className="avatar">
                        <Image
                            src={getValidAvatar(user?.avatar)}
                            alt="User Avatar"
                            width={40}
                            height={40}
                            style={{borderRadius: `50%`, objectFit: "cover"}}
                        />
                    </div>
                    <div className="user-details">
                        <p>{user?.full_name || user?.name || "Gia sư"}</p> 
                    </div>
                </div>
            </header>
        </>
    );
}