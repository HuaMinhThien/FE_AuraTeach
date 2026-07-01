"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import "../../css/tutor-style/header.css"; 

export default function Header() {
    const [user, setUser] = useState(null);
    // Quản lý trạng thái 2 ví động từ API
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

    // 1. Kiểm tra thông tin User từ Cookie
    useEffect(() => {
        const checkUser = () => {
            const userCookie = getCookie("user_info");
            if (userCookie) {
                try {
                    const userData = JSON.parse(decodeURIComponent(userCookie));
                    // Đảm bảo không set lại liên tục nếu dữ liệu không đổi để tránh re-render thừa
                    setUser((prev) => JSON.stringify(prev) === JSON.stringify(userData) ? prev : userData);
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

    // 2. Fetch dữ liệu ví từ API khi đã có thông tin User ID từ cookie
    useEffect(() => {
        if (!user) return;

        const fetchTutorWallet = async () => {
            try {
                // Lấy mã định danh (u-01) từ cookie của bạn
                const tutorId = user.user_id || user.tutor_id || user.id; 
                
                if (!tutorId) return;

                // Gọi endpoint tutors kèm query parameter filter theo user_id
                const res = await fetch(`http://localhost:3007/tutors?user_id=${tutorId}`);                
                
                if (res.ok) {
                    const currentTutorData = await res.json();
                    console.log("Dữ liệu log thực tế:", currentTutorData); // Bạn sẽ thấy nó bọc trong dấu ngoặc vuông [ ]
                    
                    // SỬA TẠI ĐÂY: Vì json-server trả về một MẢNG, cần lấy phần tử đầu tiên [0]
                    if (Array.isArray(currentTutorData) && currentTutorData.length > 0) {
                        const tutorInfo = currentTutorData[0]; 
                        
                        setBalances({
                            pending: tutorInfo.pending_balance || 0,
                            available: tutorInfo.available_balance || 0
                        });
                    } else if (!Array.isArray(currentTutorData) && currentTutorData) {
                        // Phòng trường hợp sau này bạn đổi API về dạng trả thẳng Object trực tiếp
                        setBalances({
                            pending: currentTutorData.pending_balance || 0,
                            available: currentTutorData.available_balance || 0
                        });
                    }
                }
            } catch (error) {
                console.error("Lỗi khi fetch ví tiền từ bảng tutors:", error);
            }
        };

        fetchTutorWallet();
        // Cập nhật lại số dư mỗi 10 giây
        const intervalWallet = setInterval(fetchTutorWallet, 10000);
        return () => clearInterval(intervalWallet);
    }, [user]);

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