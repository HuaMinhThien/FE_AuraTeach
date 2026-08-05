"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import "../../css/tutor-style/header.css"; 
import { tutorService } from "@/services/tutorService";

export default function Header() {
    const [user, setUser] = useState(null);
    const [balances, setBalances] = useState({
        pending: 0,
        available: 0
    });

    const getCookie = (name) => {
        if (typeof window === "undefined") return null;
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    };

    // 💡 Gộp chung việc kiểm tra user từ cookie VÀ fetch ví tiền vào 1 useEffect duy nhất
    useEffect(() => {
        const fetchUserDataAndWallet = async () => {
            const userCookie = getCookie("user_info");
            if (!userCookie) {
                setUser(null);
                return;
            }

            try {
                const userData = JSON.parse(decodeURIComponent(userCookie));
                console.log("📦 Dữ liệu user đọc từ cookie Header:", userData); // Xem nó in ra cấu trúc gì ở F12 -> Console
                
                setUser((prev) => JSON.stringify(prev) === JSON.stringify(userData) ? prev : userData);

                // Mở rộng tìm kiếm tất cả các khả năng tên biến ID có thể xuất hiện trong cookie
                const tutorId = userData?.user_id || userData?.tutor_id || userData?.id || userData?.userId || userData?.account_id;
                
                if (!tutorId) {
                    console.warn("⚠️ Cookie user_info không tìm thấy trường ID nào phù hợp! Các trường hiện có:", Object.keys(userData));
                    return;
                }

                // Gọi API lấy thông tin gia sư qua tutorService
                const data = await tutorService.getByUserId(tutorId);
                const tutors = Array.isArray(data) ? data : (data?.data || []);

                if (tutors.length > 0) {
                    const tutorInfo = tutors[0];
                    setBalances({
                        pending: tutorInfo.pending_balance || 0,
                        available: tutorInfo.available_balance || 0
                    });
                } else if (!Array.isArray(data) && data) {
                    setBalances({
                        pending: data.pending_balance || 0,
                        available: data.available_balance || 0
                    });
                }
            } catch (error) {
                console.error("🔴 Lỗi khi đồng bộ thông tin user hoặc ví ở Header:", error);
            }
        };

        fetchUserDataAndWallet();

        const interval = setInterval(fetchUserDataAndWallet, 10000);
        return () => clearInterval(interval);
    }, []);

    const getValidAvatar = (avatar) => {
        if (!avatar) return "/img/default-avatar.png";
        if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
            return avatar;
        }
        if (avatar.startsWith('/')) {
            return avatar;
        }
        return "/img/default-avatar.png";
    };

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