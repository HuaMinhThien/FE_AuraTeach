"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

export default function StudentSidebar({ unreadCount = 0 }) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    document.cookie = "user_info=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    router.push("/login");
  };

  const menuItems = [
    {
      id: "profile",
      label: "Thông tin cá nhân",
      href: "/profile",
      active: pathname === "/profile"
    },
    {
      id: "lich-su-book",
      label: "Lịch sử đăng ký lớp học",
      href: "/lich-su-book",
      active: pathname === "/lich-su-book"
    },
    {
      id: "my-classes",
      label: "Lịch học của tôi",
      href: "/my-classes",
      active: pathname === "/my-classes" || pathname?.startsWith("/my-classes/")
    },
    {
      id: "messenger",
      label: "Tin nhắn",
      href: "/messenger",
      active: pathname === "/messenger" || pathname?.startsWith("/messenger/"),
      badge: unreadCount > 0 ? unreadCount : null
    }
  ];

  return (
    <div className="profile-sidebar">
      <div className="sidebar-title">
        <h2>QUẢN LÝ TÀI KHOẢN</h2>
      </div>
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`sidebar-link ${item.active ? "active" : ""}`}
          >
            <span className="sidebar-icon">{item.icon}</span>
            {item.label}
            {item.badge && (
              <span className="sidebar-badge">{item.badge}</span>
            )}
          </Link>
        ))}
        <button onClick={handleLogout} className="sidebar-link logout">
          <span className="sidebar-icon"></span>
          Đăng xuất
        </button>
      </nav>
    </div>
  );
}