"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import "../../css/tutor-style/header.css"; 
import NotificationBell from "@/components/common/NotificationBell";

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

    useEffect(() => {
        const checkUser = () => {
            const userCookie = getCookie("user_info");
            if (userCookie) {
                try {
                    const userData = JSON.parse(decodeURIComponent(userCookie));
                    setUser(userData);
                } catch (error) {
                    setUser(null);
                }
            } else {
                setUser(null);
            }
        };

        checkUser();
        const interval = setInterval(checkUser, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!user) return;

        const fetchTutorWallet = async () => {
            try {
                const tutorId = user.user_id || user.tutor_id || user.id; 
                if (!tutorId) return;

                const res = await fetch(`http://localhost:3007/tutors?user_id=${tutorId}`);                
                if (res.ok) {
                    const currentTutorData = await res.json();
                    if (Array.isArray(currentTutorData) && currentTutorData.length > 0) {
                        const tutorInfo = currentTutorData[0]; 
                        setBalances({
                            pending: tutorInfo.pending_balance || 0,
                            available: tutorInfo.available_balance || 0
                        });
                    }
                }
            } catch (error) {
                console.error("Lỗi khi fetch ví tiền:", error);
            }
        };

        fetchTutorWallet();
        const intervalWallet = setInterval(fetchTutorWallet, 10000);
        return () => clearInterval(intervalWallet);
    }, [user]);

    const getValidAvatar = (avatar) => {
        if (!avatar) return "/img/avt/avt.jpg";
        if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
            return avatar;
        }
        if (avatar.startsWith('/')) {
            return avatar;
        }
        return "/img/avt/avt.jpg";
    };

    const userId = user?.user_id || user?.id || null;

    return (
        <>
            <header>
                {/* ✅ ĐẢM BẢO ICON CHUÔNG HIỂN THỊ ĐÚNG */}
                <div className="header-icons" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <NotificationBell 
                        userId={userId}
                        userRole="tutor"
                    />
                </div>

                {/* Ví tiền */}
                <div className="tutor-wallets" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <div className="wallet-item" style={{ background: "#fffbeb", padding: "4px 10px", borderRadius: "8px", border: "1px solid #fde68a" }}>
                        <span style={{ fontSize: "11px", color: "#d97706", display: "block", fontWeight: "500" }}>Chờ nhận</span>
                        <strong style={{ color: "#b45309", fontSize: "14px" }}>
                            {balances.pending.toLocaleString("vi-VN")}đ
                        </strong>
                    </div>

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
                            style={{borderRadius: "50%", objectFit: "cover"}}
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