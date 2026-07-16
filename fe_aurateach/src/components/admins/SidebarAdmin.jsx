"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Sidebar.module.css";
import Image from "next/image";

export default function Sidebar() {
  const pathname = usePathname();
  
  // Thêm state để kiểm tra component đã mount chưa
  const [mounted, setMounted] = useState(false);
  
  // State lưu thông tin admin, mặc định là null để tránh mismatch
  const [adminData, setAdminData] = useState(null);

  // Chạy 1 lần sau khi component mount
  useEffect(() => {
    setMounted(true);
    
    // Đọc cookie tại client
    const cookies = document.cookie.split("; ");
    const userInfoCookie = cookies.find((row) => row.startsWith("user_info="));

    if (userInfoCookie) {
      try {
        const cookieValue = userInfoCookie.split("=")[1];
        const decodedValue = decodeURIComponent(cookieValue);
        const userInfo = JSON.parse(decodedValue);

        if (userInfo) {
          setAdminData({
            name: userInfo.full_name || userInfo.name || "Admin",
            avatar: userInfo.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=80",
          });
        }
      } catch (error) {
        console.error("Lỗi parse cookie:", error);
        // Fallback nếu lỗi
        setAdminData({
          name: "Admin",
          avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=80",
        });
      }
    } else {
      // Fallback nếu không có cookie
      setAdminData({
        name: "Admin",
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=80",
      });
    }
  }, []);

  // Danh sách các Router trong hệ thống Admin
  const menuItems = [
    { name: "Dashboard", path: "/admin-dashboard"},
    { name: "Quản lý lớp học", path: "/admin-classes"},
    { name: "Quản lý tài khoản người dùng", path: "/admin-account-management"},
    { name: "Lịch trình dạy", path: "/admin-schedule"},
    { name: "Thu nhập & Ví", path: "/admin-revenue"},
    { name: "Cấu hình hồ sơ", path: "/admin-profile"},
  ];

  // Trong khi chưa mount (Server render hoặc client chưa hydrate),
  // render placeholder để tránh mismatch
  if (!mounted || !adminData) {
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
                src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=80"
                alt="Admin Avatar"
                width={36}
                height={36}
                className={styles.miniAvatar}
              />
            </div>
            <div className={styles.adminInfo}>
              <p className={styles.adminName}>Admin</p>
              <p className={styles.adminRole}>Quản trị viên</p>
            </div>
          </div>
          <button className={styles.logoutBtn}>
            <span>🚪</span> Đăng xuất
          </button>
        </div>
      </div>
    );
  }

  // Render khi đã mount (có dữ liệu từ cookie)
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
        <button className={styles.logoutBtn}>
          <span>🚪</span> Đăng xuất
        </button>
      </div>
    </div>
  );
}