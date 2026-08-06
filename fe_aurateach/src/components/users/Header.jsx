// src/components/users/Header.jsx
"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link"; 
import { usePathname, useRouter } from "next/navigation"; 
import SearchComponent from "./SearchInput";
import Avatar from "@/components/common/Avatar"; // ✅ Import Avatar component
import NotificationBell from "@/components/common/NotificationBell";

// ✅ Thêm flag để kiểm tra JSON Server đã sẵn sàng chưa
const API_BASE = "http://localhost:3007";
let isJsonServerReady = false;
let hasCheckedJsonServer = false;

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
        console.log("=== HEADERS CHECK ===");
        console.log("All cookies:", document.cookie);
        
        const userCookie = getCookie("user_info");
        console.log("user_info cookie value:", userCookie);
        
        if (userCookie) {
            try {
                const decoded = decodeURIComponent(userCookie);
                console.log("Decoded:", decoded);
                const userData = JSON.parse(decoded);
                console.log("✅ Parsed user data:", userData);
                setUser(userData);
                setIsMounted(true);
            } catch (error) {
                console.error("❌ Error parsing:", error);
                setIsMounted(true);
            }
        } else {
            console.log("❌ No user_info cookie");
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
                        console.log("🔄 User updated:", userData);
                        setUser(userData);
                    }
                } catch (error) {
                    console.error("Error checking user:", error);
                }
            } else {
                if (user !== null) {
                    console.log("🔄 User logged out");
                    setUser(null);
                }
            }
        };

        const interval = setInterval(checkUser, 1000);
        return () => clearInterval(interval);
    }, [isMounted, user]);

    // Click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

// ✅ SỬA LẠI HÀM LOGOUT - XÓA HẾT COOKIE
const handleLogout = async () => {
    console.log("=== LOGOUT ===");
    
    try {
        // 1. Gọi API logout của NextAuth để xóa session trên server
        const response = await fetch("/api/auth/signout", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
        });
        
        // 2. Xóa cookie user_info và role
        document.cookie = "user_info=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0";
        document.cookie = "role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0";
        
        // 3. Xóa localStorage
        localStorage.removeItem("user");
        
        // 4. Reset state
        setUser(null);
        setIsDropdownOpen(false);
        
        // 5. Chuyển hướng về trang login
        window.location.href = "/login";
    } catch (error) {
        console.error("Logout error:", error);
        // Fallback: xóa cookie và chuyển hướng
        document.cookie = "user_info=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0";
        document.cookie = "role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0";
        document.cookie = "next-auth.session-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0";
        document.cookie = "next-auth.csrf-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0";
        document.cookie = "next-auth.callback-url=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0";
        localStorage.removeItem("user");
        setUser(null);
        window.location.href = "/login";
    }
};

    // ✅ Kiểm tra JSON Server có hoạt động không (chỉ 1 lần)
    const checkJsonServer = useCallback(async () => {
        if (hasCheckedJsonServer) return isJsonServerReady;
        hasCheckedJsonServer = true;
        
        try {
            const res = await fetch(`${API_BASE}/conversations`, {
                method: 'HEAD',
                signal: AbortSignal.timeout(2000) // Timeout 2s
            });
            isJsonServerReady = res.ok;
            console.log(`📡 JSON Server status: ${isJsonServerReady ? '✅ Ready' : '❌ Not ready'}`);
            return isJsonServerReady;
        } catch {
            isJsonServerReady = false;
            console.log('📡 JSON Server: ❌ Not reachable');
            return false;
        }
    }, []);

    // ✅ Fetch unread count - CHỈ GỌI KHI JSON SERVER SẴN SÀNG
    const fetchUnreadCount = useCallback(async (userId) => {
        // Kiểm tra JSON Server trước khi gọi
        const isReady = await checkJsonServer();
        if (!isReady) {
            // Không log để tránh spam
            return;
        }
        
        try {
            const res = await fetch(`${API_BASE}/conversations`);
            
            if (!res.ok) {
                // Nếu lỗi, đánh dấu JSON Server không sẵn sàng để lần sau bỏ qua
                if (res.status === 404) {
                    isJsonServerReady = false;
                }
                return;
            }
            
            const text = await res.text();
            if (!text) return;
            
            let allConversations;
            try {
                allConversations = JSON.parse(text);
            } catch (parseError) {
                return;
            }
            
            if (!Array.isArray(allConversations)) return;

            // Fetch tutors
            const tutorsRes = await fetch(`${API_BASE}/tutors`);
            if (!tutorsRes.ok) return;
            
            const tutorsText = await tutorsRes.text();
            if (!tutorsText) return;
            
            let allTutors;
            try {
                allTutors = JSON.parse(tutorsText);
            } catch (parseError) {
                return;
            }
            
            if (!Array.isArray(allTutors)) return;
            
            const tutorToUserMap = {};
            const userToTutorMap = {};
            allTutors.forEach(t => {
                if (t.tutor_id && t.user_id) {
                    tutorToUserMap[t.tutor_id] = t.user_id;
                    userToTutorMap[t.user_id] = t.tutor_id;
                }
            });

            const myIds = [userId];
            if (userToTutorMap[userId]) {
                myIds.push(userToTutorMap[userId]);
            }

            const myConversations = allConversations.filter(conv => 
                conv.participants && conv.participants.some(p => myIds.includes(p))
            );

            const totalUnread = myConversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
            setUnreadCount(totalUnread);
        } catch (error) {
            // Bỏ qua lỗi
        }
    }, [checkJsonServer]);

    // ✅ Polling unread count - CHỈ CHẠY KHI CÓ USER
    useEffect(() => {
        if (!user?.user_id) return;
        
        const userId = user.user_id || user.id;
        
        // Delay 2s trước khi fetch lần đầu
        const timeout = setTimeout(() => {
            fetchUnreadCount(userId);
        }, 2000);
        
        const interval = setInterval(() => {
            fetchUnreadCount(userId);
        }, 10000); // Giảm tần suất xuống 10s
        
        return () => {
            clearTimeout(timeout);
            clearInterval(interval);
        };
    }, [user, fetchUnreadCount]);

    const handleProfileClick = () => {
        console.log("=== PROFILE CLICK ===");
        console.log("Current user:", user);
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
                            {/* ✅ Notification Bell */}
                            <NotificationBell 
                                userId={user.user_id || user.id}
                                userRole={user.role || 'student'}
                            />
                            {/* ✅ Icon Messenger với badge unread count */}
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