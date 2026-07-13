"use client";

import Image from "next/image";
import "../../css/tutor-style/sidebar.css"; 
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function Sidebar() {
    const router = useRouter();
    const pathname = usePathname(); // Lấy đường dẫn URL hiện tại để check active

    const handleLogout = () => {
        document.cookie = "user_info=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        document.cookie = "role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        window.location.href = "/login";
    };

    // Định nghĩa danh sách menu khớp cấu trúc thư mục của bạn
    const menuItems = [
        {
            path: "/tutor-dashboard",
            text: "Bảng điều khiển"
        },
        {
            path: "/classroom-management",
            text: "Lớp học của tôi"
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
        }
    ];

    return (
        <aside className="sidebar">
            {/* Khối Logo */}
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
                        // Kiểm tra xem URL hiện tại có trùng với path của menu không
                        const isActive = pathname === item.path;
                        
                        return (
                            <li key={index}>
                                <Link 
                                    href={item.path} 
                                    className={`menu-item ${isActive ? "active" : ""}`}
                                    style={{ textDecoration: "none" }} // Đảm bảo không bị gạch chân chữ
                                >
                                    <span className="icon">{item.icon}</span>
                                    <span className="text">{item.text}</span>
                                </Link>
                            </li>
                        );
                    })}
                    
                    {/* Nút Đăng xuất giữ nguyên */}
                    <li style={{marginTop: "auto"}}>
                        <button onClick={handleLogout} className="logout-btn">
                            <span className="text">Đăng xuất</span>
                        </button>
                    </li>
                </ul>
            </nav>
        </aside>
    );
}