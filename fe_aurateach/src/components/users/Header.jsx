// src/components/users/Headers.jsx
"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link"; 
import { usePathname, useRouter } from "next/navigation"; 
import SearchComponent from "./SearchInput";

export default function Headers() {
    const pathname = usePathname(); 
    const router = useRouter();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    const getCookie = (name) => {
        if (typeof window === "undefined") return null;
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    };

    const [user, setUser] = useState(() => {
        const userCookie = getCookie("user_info");
        if (userCookie) {
            try {
                return JSON.parse(decodeURIComponent(userCookie));
            } catch (error) {
                return null;
            }
        }
        return null;
    });

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
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = () => {
        document.cookie = "user_info=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        document.cookie = "role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        setUser(null);
        setIsDropdownOpen(false);
        router.push("/login");
    };

    // Hàm kiểm tra và trả về avatar hợp lệ
    const getValidAvatar = (avatar) => {
        if (!avatar) return "/img/default-avatar.png";
        
        // Nếu là URL hợp lệ (http, https)
        if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
            return avatar;
        }
        
        // Nếu là đường dẫn tuyệt đối (bắt đầu bằng /)
        if (avatar.startsWith('/')) {
            return avatar;
        }
        
        // Các trường hợp khác (như "helo") -> trả về default
        return "/img/default-avatar.png";
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
                    </div>
                </div>

                <div className="header-right">
                    <SearchComponent />

                    {user ? (
                        <div 
                            className={`header-user-profile ${isDropdownOpen ? "active" : ""}`}
                            ref={dropdownRef}
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)} 
                        >
                            {/* DÙNG Image VỚI src ĐÃ ĐƯỢC KIỂM TRA */}
                            <Image 
                                src={getValidAvatar(user.avatar)} 
                                alt="Avatar" 
                                width={35} 
                                height={35} 
                                className="user-avatar"
                            />
                            <span className="user-name">{user.name}</span>
                            
                            <svg className={`arrow-icon ${isDropdownOpen ? "rotate" : ""}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00236f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>

                            <div className={`dropdown-menu ${isDropdownOpen ? "show" : ""}`} onClick={(e) => e.stopPropagation()}>
                            {user.role === "tutor" ? (
                                <Link href="/tutor-dashboard" onClick={() => setIsDropdownOpen(false)}>
                                    Trang cá nhân
                                </Link>
                            ) : (
                                <Link href="/profile" onClick={() => setIsDropdownOpen(false)}>
                                    Trang cá nhân
                                </Link>
                            )}
                                <button onClick={handleLogout} className="logout-btn">Đăng xuất</button>
                            </div>
                        </div>
                    ) : (
                        <Link href="/login" className={`header-btn login-btn ${pathname === "/login" ? "header-btn-active" : ""}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="20" height="20" fill="currentColor">
                                <path d="M416 160L480 160C497.7 160 512 174.3 512 192L512 448C512 465.7 497.7 480 480 480L416 480C398.3 480 384 494.3 384 512C384 529.7 398.3 544 416 544L480 544C533 544 576 501 576 448L576 192C576 139 533 96 480 96L416 96C398.3 96 384 110.3 384 128C384 145.7 398.3 160 416 160zM406.6 342.6C419.1 330.1 419.1 309.8 406.6 297.3L278.6 169.3C266.1 156.8 245.8 156.8 233.3 169.3C220.8 181.8 220.8 202.1 233.3 214.6L306.7 288L96 288C78.3 288 64 302.3 64 320C64 337.7 78.3 352 96 352L306.7 352L233.3 425.4C220.8 437.9 220.8 458.2 233.3 470.7C245.8 483.2 266.1 483.2 278.6 470.7L406.6 342.7z"/>
                            </svg>
                            <span>Đăng nhập</span>
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
}