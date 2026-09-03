// src/components/users/Header.jsx
"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link"; 
import { usePathname, useRouter } from "next/navigation"; 
import SearchComponent from "./SearchInput";
import Avatar from "@/components/common/Avatar"; // ✅ Import Avatar component
import NotificationBell from "@/components/common/NotificationBell";
import { conversationService } from "@/services/conversationService"; // ✅ Import service chat mới
import { authService } from "@/services/authService";
import { signOut } from "next-auth/react";

export default function Header() {
    const pathname = usePathname(); 
    const router = useRouter();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const dropdownRef = useRef(null);
    const [user, setUser] = useState(null);
    const [unreadCount, setUnreadCount] = useState(0);

    const getCookie = (name) => {
        if (typeof window === "undefined") return null;
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    };

    // Load user từ cookie khi component mount
    useEffect(() => {
        const userCookie = getCookie("user_info");
        if (userCookie) {
            try {
                const decoded = decodeURIComponent(userCookie);
                const userData = JSON.parse(decoded);
                setUser(userData);
                setIsMounted(true);
            } catch (error) {
                console.error("❌ Error parsing user cookie:", error);
                setIsMounted(true);
            }
        } else {
            setIsMounted(true);
        }
    }, []);

    // Check cookie mỗi giây
    useEffect(() => {
        if (!isMounted) return;
        
        const checkUser = () => {
            const userCookie = getCookie("user_info");
            if (userCookie) {
                try {
                    const decoded = decodeURIComponent(userCookie);
                    const userData = JSON.parse(decoded);
                    if (JSON.stringify(userData) !== JSON.stringify(user)) {
                        setUser(userData);
                    }
                } catch (error) {
                    console.error("Error checking user:", error);
                }
            } else {
                if (user !== null) {
                    setUser(null);
                }
            }
        };

        const interval = setInterval(checkUser, 5000); // tăng từ 1s → 5s để giảm req
        return () => clearInterval(interval);
    }, [isMounted, user]);

    // Click outside dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Xử lý Đăng xuất - Xóa hết cookie & storage
    const handleLogout = async () => {
        try {
            // ⚡ Đánh dấu cờ là người dùng chủ động đăng xuất để tránh bị NextAuth tự động ép đồng bộ lại ở trang login
            sessionStorage.setItem("just_logged_out", "true");

            await authService.logout();
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            // Dọn dẹp sạch sẽ cookie và storage ở phía client
            document.cookie = "user_info=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0";
            document.cookie = "role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0";
            document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0"; // Xóa luôn token cho chuẩn
            localStorage.removeItem("user");
            
            setUser(null);
            setIsDropdownOpen(false);

            // ⚡ QUAN TRỌNG: Đăng xuất khỏi NextAuth Google session và chuyển hướng về /login
            await signOut({ callbackUrl: "/login", redirect: true });
        }
    };

    // ✅ Lấy số lượng tin nhắn chưa đọc thông qua conversationService
    const fetchUnreadCount = useCallback(async (userId) => {
        // 🛑 Chặn ngay nếu không có userId
        if (!userId) return; 

        try {
            const data = await conversationService.getUnreadCount(userId);
            // Hỗ trợ cả trường hợp BE trả về object { unread_count: X } hoặc trả thẳng con số
            const count = typeof data === 'object' ? (data.unread_count || data.data?.unread_count || 0) : data;
            setUnreadCount(Number(count));
        } catch (error) {
            // Lặng lẽ bỏ qua lỗi kết nối ngầm định nếu có
        }
    }, []);

    // Polling unread count định kỳ khi có user đăng nhập
    useEffect(() => {
        // 🛑 Lấy trực tiếp từ cookie hoặc kiểm tra user state an toàn
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
        
        const timeout = setTimeout(() => {
            fetchUnreadCount(currentUserId);
        }, 1000);
        
        const interval = setInterval(() => {
            fetchUnreadCount(currentUserId);
        }, 30000); // tăng từ 10s → 30s
        
        return () => {
            clearTimeout(timeout);
            clearInterval(interval);
        };
    }, [user, fetchUnreadCount]);

    const handleProfileClick = () => {
        setIsDropdownOpen(false);
        router.push("/profile");
    };

    return (
        <header>
            <div className="header">
                <div className="header-left">
                    <Link href="/" className="header-logo" style={{textDecoration: "none"}}>
                        <Image src="/img/logo-aurateach.png" alt="Logo" width={50} height={40} />  
                        <h1>AuraTeach</h1>
                    </Link>
                    <div className="header-nav">
                        <Link href="/" className={`nav-item ${pathname === "/" ? "active-nav" : ""}`}>
                            <span>Trang chủ</span>
                        </Link>
                        <Link href="/tutorList" className={`nav-item ${pathname === "/tutorList" ? "active-nav" : ""}`}>
                            <span>Tìm gia sư</span>
                        </Link>
                        <Link href="/classList" className={`nav-item ${pathname === "/classList" ? "active-nav" : ""}`}>
                            <span>Tìm lớp học</span>
                        </Link>
                        <Link href="/createSchedule" className={`nav-item ${pathname === "/createSchedule" ? "active-nav" : ""}`}>
                            <span>Tạo lịch học cho riêng bạn</span>
                        </Link>
                    </div>
                </div>

                <div className="header-right">
                    {user ? (
                        <>
                            {/* Notification Bell */}
                            <NotificationBell 
                                userId={user.user_id || user.id}
                                userRole={user.role || 'student'}
                            />
                            {/* Icon Messenger với badge unread count */}
                            <Link href="/messenger" className="header-messenger-icon" title="Tin nhắn">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#00236f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                                </svg>
                                {unreadCount > 0 && (
                                    <span className="header-messenger-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                                )}
                            </Link>
                        </>
                    ) : (
                        <div/>
                    )}

                    {isMounted ? (
                        user ? (
                            <div 
                                className={`header-user-profile ${isDropdownOpen ? "active" : ""}`}
                                ref={dropdownRef}
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)} 
                            >
                                <Avatar 
                                    src={user.avatar}
                                    alt={user.full_name || user.name}
                                    size={35}
                                    fallbackText={user.full_name?.charAt(0) || user.name?.charAt(0) || "U"}
                                />
                                <span className="user-name">{user.full_name || user.name}</span>
                                <svg className={`arrow-icon ${isDropdownOpen ? "rotate" : ""}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00236f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>

                                <div className={`dropdown-menu ${isDropdownOpen ? "show" : ""}`} onClick={(e) => e.stopPropagation()}>
                                    <button onClick={handleProfileClick} className="dropdown-item">
                                        Trang cá nhân
                                    </button>
                                    <button onClick={handleLogout} className="dropdown-item logout-btn">Đăng xuất</button>
                                </div>
                            </div>
                        ) : (
                            <Link href="/login" className={`header-btn login-btn ${pathname === "/login" ? "header-btn-active" : ""}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="20" height="20" fill="currentColor">
                                    <path d="M416 160L480 160C497.7 160 512 174.3 512 192L512 448C512 465.7 497.7 480 480 480L416 480C398.3 480 384 494.3 384 512C384 529.7 398.3 544 416 544L480 544C533 544 576 501 576 448L576 192C576 139 533 96 480 96L416 96C398.3 96 384 110.3 384 128C384 145.7 398.3 160 416 160zM406.6 342.6C419.1 330.1 419.1 309.8 406.6 297.3L278.6 169.3C266.1 156.8 245.8 156.8 233.3 169.3C220.8 181.8 220.8 202.1 233.3 214.6L306.7 288L96 288C78.3 288 64 302.3 64 320C64 337.7 78.3 352 96 352L306.7 352L233.3 425.4C220.8 437.9 220.8 458.2 233.3 470.7C245.8 483.2 266.1 483.2 278.6 470.7L406.6 342.7z"/>
                                </svg>
                                <span>Đăng nhập</span>
                            </Link>
                        )
                    ) : (
                        <div style={{ width: '100px', height: '35px', background: '#f0f0f0', borderRadius: '8px' }}></div>
                    )}
                </div>
            </div>
        </header>
    );
}