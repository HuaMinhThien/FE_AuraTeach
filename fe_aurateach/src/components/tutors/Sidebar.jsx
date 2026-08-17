"use client";

import Image from "next/image";
import "../../css/tutor-style/sidebar.css"; 
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { tutorService } from "@/services/tutorService"; 
import { conversationService } from "@/services/conversationService"; // 👈 Sử dụng service mới

export default function Sidebar() {
    const router = useRouter();
    const pathname = usePathname();
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        const fetchSidebarData = async () => {
            try {
                // Lấy user_id từ cookie
                const getCookie = (name) => {
                    const value = `; ${document.cookie}`;
                    const parts = value.split(`; ${name}=`);
                    if (parts.length === 2) return parts.pop().split(';').shift();
                    return null;
                };

                const userCookie = getCookie("user_info");
                if (!userCookie) return;

                const user = JSON.parse(decodeURIComponent(userCookie));
                const userId = user.user_id || user.id;
                if (!userId) return;

                // Gọi song song thông qua conversationService và tutorService chuẩn
                const [convRes, tutorsRes] = await Promise.all([
                    // conversationService.getConversations(),
                    tutorService.getTutors()
                ]);
                
                const allConversations = Array.isArray(convRes) ? convRes : (convRes?.data || []);
                const allTutors = Array.isArray(tutorsRes) ? tutorsRes : (tutorsRes?.data || []);
                
                // ✅ Tạo map tutor_id ↔ user_id
                const userToTutorMap = {};
                if (Array.isArray(allTutors)) {
                    allTutors.forEach(t => {
                        if (t.tutor_id && t.user_id) {
                            userToTutorMap[t.user_id] = t.tutor_id;
                        }
                    });
                }
                
                // ✅ Mở rộng ID để filter
                const myIds = [userId];
                if (userToTutorMap[userId]) {
                    myIds.push(userToTutorMap[userId]);
                }
                
                const userConversations = allConversations.filter(conv => 
                    conv.participants && conv.participants.some(p => myIds.includes(p))
                );
                
                const totalUnread = userConversations.reduce(
                    (sum, conv) => sum + (conv.unread_count || 0), 
                    0
                );
                
                setUnreadCount(totalUnread);
            } catch (error) {
                console.error("❌ Lỗi đồng bộ Sidebar:", error);
            }
        };

        fetchSidebarData();

        // Polling mỗi 10 giây để cập nhật số tin chưa đọc
        const interval = setInterval(fetchSidebarData, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleLogout = () => {
        document.cookie = "user_info=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        document.cookie = "role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        window.location.href = "/login";
    };

    const menuItems = [
        { path: "/tutor-dashboard", text: "Bảng điều khiển" },
        { path: "/classroom-management", text: "Lớp học của tôi" },
        {
            path: "/proposed-class",
            text: "Lớp học đề xuất"
        },
        { path: "/schedule", text: "Lịch trình" },
        { path: "/income", text: "Thu nhập" },
        { path: "/profile-tutor", text: "Hồ sơ" },
        { 
            path: "/tutor-messenger", 
            text: "Tin nhắn",
            badge: unreadCount > 0 ? unreadCount : null
        },
        // {
        //     path: 
        // }

    ];

    return (
        <aside className="sidebar">
            <div className="logo-container">
                <div className="logo-img">
                    <Image 
                        src="/img/logo-aurateach.png" 
                        alt="Logo AuraTeach" 
                        width={50} 
                        height={40} 
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