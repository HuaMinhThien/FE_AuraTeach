"use client";

import Image from "next/image";
import "../../css/tutor-style/sidebar.css"; 
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { conversationService } from "@/services/conversationService"; 

export default function Sidebar() {
    const router = useRouter();
    const pathname = usePathname();
    const [unreadCount, setUnreadCount] = useState(0);
    const [user, setUser] = useState(null);

    const getCookie = (name) => {
        if (typeof window === "undefined") return null;
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    };

    // 1. Load user từ cookie khi component mount
    useEffect(() => {
        const userCookie = getCookie("user_info");
        if (userCookie) {
            try {
                const decoded = decodeURIComponent(userCookie);
                const userData = JSON.parse(decoded);
                setUser(userData);
            } catch (error) {
                console.error("❌ Error parsing user cookie:", error);
            }
        }
    }, []);

    // 2. Lấy số lượng tin nhắn chưa đọc chuẩn xác bằng conversationService.getUnreadCount (giống Header)
    const fetchUnreadCount = useCallback(async (userId) => {
        if (!userId) return; 

        try {
            const data = await conversationService.getUnreadCount(userId);
            const count = typeof data === 'object' ? (data.unread_count || data.data?.unread_count || 0) : data;
            setUnreadCount(Number(count));
        } catch (error) {
            console.error("❌ Lỗi lấy số tin nhắn chưa đọc Sidebar:", error);
        }
    }, []);

    // 3. Polling định kỳ lấy unread count giống hệt Header để cập nhật badge đồng bộ
    useEffect(() => {
        const userCookie = getCookie("user_info");
        let currentUserId = user?.user_id || user?.id;

        if (!currentUserId && userCookie) {
            try {
                const userData = JSON.parse(decodeURIComponent(userCookie));
                currentUserId = userData.user_id || userData.id;
            } catch (e) {
                // Ignore parse error
            }
        }

        if (!currentUserId) return; 
        
        // Gọi ngay lần đầu
        fetchUnreadCount(currentUserId);
        
        // Polling mỗi 10 giây
        const interval = setInterval(() => {
            fetchUnreadCount(currentUserId);
        }, 10000); 
        
        return () => clearInterval(interval);
    }, [user, fetchUnreadCount]);

    const handleLogout = () => {
        document.cookie = "user_info=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        document.cookie = "role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        window.location.href = "/login";
    };

    const menuItems = [
        { path: "/tutor-dashboard", text: "Bảng điều khiển" },
        {
            path: "/tutor-confirm-session",
            text: "Xác nhận buổi học"
        },
        { path: "/classroom-management", text: "Lớp học của tôi" },
        {
            path: "/proposed-class",
            text: "Lớp học đề xuất"
        },
        { path: "/schedule", text: "Lịch trình" },
        {
            path: "/timesheet",
            text: "Bảng chấm công"
        },
        { path: "/income", text: "Thu nhập" },
        { path: "/profile-tutor", text: "Hồ sơ" },
        { 
            path: "/tutor-messenger", 
            text: "Tin nhắn",
            // Thêm logic hiển thị 99+ cho đồng bộ với Header
            badge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : null
        },
    ];

    return (
        <aside className="sidebar">
            <div className="logo-container">
                <div className="logo-img">
                    <Image 
                        src="/img/logo-aurateach.png" 
                        alt="Logo AuraTeach" 
                        width={60} 
                        height={50} 
                        priority
                    />
                </div>
                <div className="logo-text">
                    <h2>AuraTeach</h2>
                    <p>Cổng thông tin giảng viên</p>
                </div>
            </div>

            <nav className="sidebar-menu">
                <ul>
                    {menuItems.map((item, index) => {
                        const isActive = pathname === item.path;
                        
                        return (
                            <li key={index}>
                                <Link 
                                    href={item.path} 
                                    className={`menu-item ${isActive ? "active" : ""}`}
                                    style={{ textDecoration: "none" }}
                                >
                                    <span className="text">{item.text}</span>
                                    {item.badge && (
                                        <span className="badge-unread">{item.badge}</span>
                                    )}
                                </Link>
                            </li>
                        );
                    })}
                    
                    <li style={{ marginTop: "auto" }}>
                        <button onClick={handleLogout} className="logout-btn">
                            <span className="text">Đăng xuất</span>
                        </button>
                    </li>
                </ul>
            </nav>
        </aside>
    );
}