"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import styles from "./Sidebar.module.css";
import Image from "next/image";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter(); // Khởi tạo router để điều hướng sau khi logout

  // Khởi tạo state với dữ liệu mặc định ban đầu
  const [adminData, setAdminData] = useState({
    name: "Admin",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=80",
  });

  useEffect(() => {
    // Đọc cookie trực tiếp tại client
    const cookies = document.cookie.split("; ");
    const userInfoCookie = cookies.find((row) => row.startsWith("user_info="));

    if (userInfoCookie) {
      try {
        const cookieValue = userInfoCookie.split("=")[1];
        const decodedValue = decodeURIComponent(cookieValue);
        const userInfo = JSON.parse(decodedValue);

        if (userInfo && userInfo.name) {
          // Dùng setTimeout để tránh lỗi linter về hiệu năng render
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

  // Hàm xử lý Đăng xuất
  const handleLogout = () => {
    if (window.confirm("Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?")) {
      // 1. Xóa cookie user_info bằng cách set expires về quá khứ và max-age=0
      document.cookie = "user_info=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0";
      
      // 2. Chuyển hướng người dùng về trang đăng nhập
      router.push("/login");
    }
  };

  // Danh sách các Router trong hệ thống Admin
  const menuItems = [
    { name: "Bảng điều khiển", path: "/admin-dashboard"},
    { name: "Quản lý lớp học", path: "/admin-classes"},
    { name: "Quản lý tài khoản người dùng", path: "/admin-account-management"},
    { name: "Lịch trình dạy", path: "/admin-schedule"},
    { name: "Thu nhập & Ví", path: "/admin-revenue"},
    { name: "Cấu hình hồ sơ", path: "/admin-profile"},
  ];

  return (
    <div className={styles.sidebar}>
      {/* 1. Phần Logo đầu trang */}
      <div className={styles.logoSection}>
        <div className={styles.logoIcon}>
          <Image src="/img/logo-aurateach.png" alt="AuraTeach Logo" width={60} height={50} priority />
        </div>
        <div className={styles.logoText}>
          <h3>AuraTeach</h3>
          <span>Hệ thống Admin</span>
        </div>
      </div>

      {/* 2. Phần Menu Navigation */}
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
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* 3. Phần chân Sidebar */}
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