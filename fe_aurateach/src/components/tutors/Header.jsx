"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import "../../css/tutor-style/header.css"; 
import NotificationBell from "@/components/common/NotificationBell";
import { authService } from "@/services/authService";
import { tutorService } from "@/services/tutorService";

export default function Header() {
    const [user, setUser] = useState(null);
    const [monthlySalary, setMonthlySalary] = useState(0);

    // Lấy thông tin user hiện tại bằng authService
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const currentUser = await authService.getCurrentUser();
                setUser(currentUser);
            } catch (error) {
                setUser(null);
            }
        };

        fetchUser();
    }, []);

    // Lấy thông tin thu nhập và tiền lương tháng này từ API Backend đã tối ưu
    useEffect(() => {
        if (!user) return;

        const fetchEarningsData = async () => {
            try {
                const userId = user.user_id || user.tutor_id || user.id || 'u-Wy4QdEzm';
                if (!userId) return;

                const response = await tutorService.getTutorEarningsData(userId);
                console.log("📦 Header - Dữ liệu thu nhập trả về từ API:", response);

                if (response) {
                    // Hứng trọn mọi trường hợp cấu trúc trả về (giống trang income)
                    const actualData = response.data || response;
                    const tutorObj = actualData.tutor || actualData;
                    
                    // Hỗ trợ cả 2 kiểu tên biến từ backend (monthlySalary hoặc monthly_salary)
                    const salary = actualData.monthlySalary 
                                || actualData.monthly_salary 
                                || tutorObj.monthlySalary 
                                || tutorObj.monthly_salary 
                                || 0;

                    setMonthlySalary(salary);
                }
            } catch (error) {
                console.error("Lỗi khi lấy thông tin tiền lương tháng:", error);
                setMonthlySalary(0);
            }
        };

        fetchEarningsData();
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
                <div className="header-icons" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <NotificationBell 
                        userId={userId}
                        userRole="tutor"
                    />
                </div>

                {/* Tiền lương tháng này */}
                <div className="tutor-wallets" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <div className="wallet-item" style={{ background: "#f0fdf4", padding: "4px 10px", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
                        <span style={{ fontSize: "11px", color: "#16a34a", display: "block", fontWeight: "500" }}>
                            Tiền lương tháng này
                        </span>
                        <strong style={{ color: "#15803d", fontSize: "14px" }}>
                            {monthlySalary.toLocaleString("vi-VN")}đ
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