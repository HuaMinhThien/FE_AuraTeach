"use client";

import Image from "next/image";
import "../../css/tutor-style/sidebar.css"; 
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const API_BASE = "http://localhost:3007";

export default function Sidebar() {
    const router = useRouter();
    const pathname = usePathname();
    const [unreadCount, setUnreadCount] = useState(0);
    const [userId, setUserId] = useState(null);

    // Lấy user_id từ cookie
    useEffect(() => {
        const getCurrentUser = () => {
            const getCookie = (name) => {
                const value = `; ${document.cookie}`;
                const parts = value.split(`; ${name}=`);
                if (parts.length === 2) return parts.pop().split(';').shift();
                return null;
            };
            const userCookie = getCookie("user_info");
            if (userCookie) {
                try {
                    const user = JSON.parse(decodeURIComponent(userCookie));
                    return user.user_id || user.id;
                } catch {
                    return null;
                }
            }
            return null;
        };
        const id = getCurrentUser();
        setUserId(id);
    }, []);

    // Lấy số tin chưa đọc
    useEffect(() => {
        if (!userId) return;

        const fetchUnreadCount = async () => {
            try {
                const [convRes, tutorsRes] = await Promise.all([
                    fetch(`${API_BASE}/conversations`),
                    fetch(`${API_BASE}/tutors`)
                ]);
                
                const allConversations = await convRes.json();
                const allTutors = await tutorsRes.json();
                
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
                console.error("❌ Lỗi lấy số tin chưa đọc:", error);
            }
        };

        fetchUnreadCount();

        // Polling mỗi 10 giây để cập nhật số tin chưa đọc
        const interval = setInterval(fetchUnreadCount, 10000);
        return () => clearInterval(interval);
    }, [userId]);

    const handleLogout = () => {
        document.cookie = "user_info=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        document.cookie = "role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        window.location.href = "/login";
    };

    const menuItems = [
        {
            path: "/tutor-dashboard",
            text: "Bảng điều khiển"
        },
        {
            path: "/tutor-confirm-session",
            text: "Xác nhận buổi học"
        },
        {
            path: "/classroom-management",
            text: "Lớp học của tôi"
        },
        {
            path: "/proposed-class",
            text: "Lớp học đề xuất"
        },
        {
            path: "/schedule",
            text: "Lịch trình"
        },
        {
            path: "/income",
            text: "Thu nhập"
        },
        {
            path: "/profile-tutor",
            text: "Hồ sơ"
        },
        {
            path: "tutor-messenger",
            text: "Tin nhắn",
            badge: unreadCount > 0 ? unreadCount : null
        },


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