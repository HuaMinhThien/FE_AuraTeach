"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import styles from "./Sidebar.module.css";
import Image from "next/image";

const API_BASE = "http://localhost:3007";
const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=80";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  
  const [mounted, setMounted] = useState(false);
  const [adminData, setAdminData] = useState(null);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  
  // State quản lý src của Avatar để tránh lặp vô hạn khi lỗi link
  const [avatarSrc, setAvatarSrc] = useState(DEFAULT_AVATAR);

  useEffect(() => {
    setMounted(true);
    
    const cookies = document.cookie.split("; ");
    const userInfoCookie = cookies.find((row) => row.startsWith("user_info="));

    if (userInfoCookie) {
      try {
        const cookieValue = userInfoCookie.split("=")[1];
        const decodedValue = decodeURIComponent(cookieValue);
        const userInfo = JSON.parse(decodedValue);

        if (userInfo) {
          const userAvatar = userInfo.avatar || DEFAULT_AVATAR;
          setAdminData({
            name: userInfo.full_name || userInfo.name || "Admin",
            avatar: userAvatar,
          });
          setAvatarSrc(userAvatar);
        }
      } catch (error) {
        console.error("Lỗi parse cookie:", error);
        setAdminData({ name: "Admin", avatar: DEFAULT_AVATAR });
        setAvatarSrc(DEFAULT_AVATAR);
      }
    } else {
      setAdminData({ name: "Admin", avatar: DEFAULT_AVATAR });
      setAvatarSrc(DEFAULT_AVATAR);
    }
  }, []);

  // Fetch số lượng thông báo chưa đọc
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await fetch(`${API_BASE}/notifications?receiver_id=u-admin-1&is_read=false`);
        
        if (!res.ok) {
          setUnreadNotifCount(0);
          return;
        }
        
        const data = await res.json();
        if (Array.isArray(data)) {
          setUnreadNotifCount(data.length);
        } else {
          setUnreadNotifCount(0);
        }
      } catch (error) {
        console.warn("⚠️ [Admin Sidebar] Không thể kết nối đến JSON Server:", error.message);
        setUnreadNotifCount(0);
      }
    };

    if (mounted) {
      fetchUnread();
      const interval = setInterval(fetchUnread, 10000);
      return () => clearInterval(interval);
    }
  }, [mounted]);

  // Reset unread count khi vào trang notifications
  useEffect(() => {
    if (pathname === "/admin-notifications") {
      setUnreadNotifCount(0);
    }
  }, [pathname]);

  const handleLogout = () => {
    document.cookie = "user_info=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "user_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    localStorage.removeItem('token');
    router.push('/login');
  };

  // Xử lý khi ảnh lỗi: Chỉ set lại 1 lần về DEFAULT_AVATAR
  const handleImageError = () => {
    if (avatarSrc !== DEFAULT_AVATAR) {
      setAvatarSrc(DEFAULT_AVATAR);
    }
  };

  const menuItems = [
    { name: "Thông báo", path: "/admin-notifications", badge: unreadNotifCount },
    { name: "Bảng điều khiển", path: "/admin-dashboard" },
    { name: "Xét duyệt giảng viên", path: "/admin-tutor-approval" },
    { name: "Quản lý lớp học", path: "/admin-classes-management" },
    { name: "Quản lý tài khoản người dùng", path: "/admin-account-management" },
    { name: "Duyệt yêu cầu rút tiền", path: "/admin-tutor-payout-requests" },
    { name: "Báo cáo gia sư", path: "/admin-tutor-reports" },
    { name: "Tạo lớp học", path: "/admin-create-class" },
    { name: "Đề xuất lớp học", path: "/admin-proposals" },
  ];

  if (!mounted || !adminData) {
    return null; // Hoặc render Skeleton UI đơn giản
  }

  return (
    <div className={styles.sidebar}>
      <div className={styles.logoSection}>
        <div className={styles.logoIcon}>
          <Image src="/img/logo-aurateach.png" alt="AuraTeach Logo" width={60} height={50} priority />
        </div>
        <div className={styles.logoText}>
          <h3>AuraTeach</h3>
          <span>Hệ thống Admin</span>
        </div>
      </div>

      <nav className={styles.navigation}>
        <ul className={styles.menuList}>
          {menuItems.map((item, index) => {
            const isActive = pathname === item.path;
            return (
              <li key={index}>
                <Link
                  href={item.path}
                  className={`${styles.menuLink} ${isActive ? styles.active : ""}`}
                >
                  <span className={styles.linkText}>{item.name}</span>
                  {item.badge > 0 && <span className={styles.badge}>{item.badge}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={styles.footerSection}>
        <div className={styles.adminMiniProfile}>
          <div className={styles.avatarWrapper}>
            <Image 
              src={avatarSrc}
              alt="Admin Avatar"
              width={36}
              height={36}
              className={styles.miniAvatar}
              onError={handleImageError}
              unoptimized={avatarSrc.startsWith("http")} // Cho phép load ảnh URL ngoài không cần config domain trong next.config.js
            />
          </div>
          <div className={styles.adminInfo}>
            <p className={styles.adminName}>{adminData.name}</p>
            <p className={styles.adminRole}>Quản trị viên</p>
          </div>
        </div>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          Đăng xuất
        </button>
      </div>
    </div>
  );
}