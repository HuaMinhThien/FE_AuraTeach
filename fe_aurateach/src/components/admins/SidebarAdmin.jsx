"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import styles from "./Sidebar.module.css";
import Image from "next/image";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [adminData, setAdminData] = useState({
    name: "Admin",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=80",
  });

  useEffect(() => {
    const cookies = document.cookie.split("; ");
    const userInfoCookie = cookies.find((row) => row.startsWith("user_info="));

    if (userInfoCookie) {
      try {
        const cookieValue = userInfoCookie.split("=")[1];
        const decodedValue = decodeURIComponent(cookieValue);
        const userInfo = JSON.parse(decodedValue);

        if (userInfo && userInfo.name) {
          setTimeout(() => {
            setAdminData({
              name: userInfo.name,
              avatar: userInfo.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=80",
            });
          }, 0);
        }
      } catch (error) {
        console.error("Lỗi parse cookie:", error);
      }
    }
  }, []);

  const handleLogout = () => {
    if (window.confirm("Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?")) {
      document.cookie = "user_info=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0";
      router.push("/login");
    }
  };

  const menuItems = [
  { name: "Bảng điều khiển", path: "/admin" },
  { name: "Xét duyệt giảng viên", path: "/admin-tutor-approval" },  // ← Bỏ /admin prefix
  { name: "Quản lý lớp học", path: "/admin-classes" },
  { name: "Quản lý tài khoản người dùng", path: "/admin-account-management" },
  { name: "Lịch trình dạy", path: "/admin-schedule" },
  { name: "Thu nhập & Ví", path: "/admin-revenue" },
  { name: "Cấu hình hồ sơ", path: "/admin-profile" },
];

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
            const isActive = pathname === item.path || pathname?.startsWith(item.path + '/');
            return (
              <li key={index}>
                <Link
                  href={item.path}
                  className={`${styles.menuLink} ${isActive ? styles.active : ""}`}
                >
                  <span className={styles.linkText}>{item.name}</span>
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
              src={adminData.avatar} 
              alt="Admin Avatar" 
              width={36} 
              height={36} 
              className={styles.miniAvatar}
              onError={(e) => {
                e.currentTarget.src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=80";
              }}
            />
          </div>
          <div className={styles.adminInfo}>
            <p className={styles.adminName}>{adminData.name}</p>
            <p className={styles.adminRole}>Quản trị viên</p>
          </div>
        </div>
        
        <button className={styles.logoutBtn} onClick={handleLogout}>
          <span>🚪</span> Đăng xuất
        </button>
      </div>
    </div>
  );
}