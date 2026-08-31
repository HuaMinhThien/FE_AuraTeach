"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import styles from "./Sidebar.module.css";
import Image from "next/image";
import { notificationService } from "@/services/notificationService";
import adminChatService from "@/services/adminChatService";


const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=80";
const CHAT_POLL_INTERVAL = 15000; // polling unread count mỗi 15s

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  
  const [mounted, setMounted] = useState(false);
  const [adminData, setAdminData] = useState(null);
  const [adminUserId, setAdminUserId] = useState(null);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [avatarSrc, setAvatarSrc] = useState(DEFAULT_AVATAR);

  useEffect(() => {
    setMounted(true);
    
    const cookies = document.cookie.split("; ");
    const userInfoCookie = cookies.find((row) => row.startsWith("user_info="));
    const userIdCookie = cookies.find((row) => row.startsWith("user_id="));

    if (userIdCookie) {
      setAdminUserId(userIdCookie.split("=")[1]);
    } else {
      setAdminUserId("u-admin-1");
    }

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

  // Sử dụng notificationService để lấy số lượng thông báo chưa đọc
  useEffect(() => {
    if (!mounted || !adminUserId) return;

    const fetchUnreadCount = async () => {
      const result = await notificationService.getUnreadCount(adminUserId);
      if (result.success) {
        setUnreadNotifCount(result.count);
      } else {
        setUnreadNotifCount(0);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 10000); // Poll mỗi 10s
    return () => clearInterval(interval);
  }, [mounted, adminUserId]);

  useEffect(() => {
    if (pathname === "/admin-notifications") {
      setUnreadNotifCount(0);
    }
  }, [pathname]);

    useEffect(() => {
    if (!mounted) return;

    const fetchChatUnread = async () => {
      try {
        const res = await adminChatService.getAdminUnreadCount();
        setUnreadChatCount(res.unread_count || 0);
      } catch {
        setUnreadChatCount(0);
      }
    };

    fetchChatUnread();
    const interval = setInterval(fetchChatUnread, CHAT_POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [mounted]);

  // Reset chat unread khi đang ở trang admin-chat
  useEffect(() => {
    if (pathname === "/admin-chat") {
      setUnreadChatCount(0);
    }
  }, [pathname]);

  const handleLogout = () => {
    document.cookie = "user_info=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "user_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    localStorage.removeItem('token');
    router.push('/login');
  };

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
    { name: "Tạo lớp học mới", path: "/admin-create-class" },
    { name: "Quản lý tài khoản người dùng", path: "/admin-account-management" },
    { name: "Trả lương cho gia sư", path: "/admin-tutor-payout-requests" },
    { name: "Báo cáo gia sư", path: "/admin-tutor-reports" },
    { name: "Hỗ trợ người dùng", path: "/admin-chat", badge: unreadChatCount },
    { name: "Nội dung trang home", path: "/admin-content-management" },
  ];

  if (!mounted || !adminData) {
    return null; 
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
              unoptimized={avatarSrc.startsWith("http")}
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