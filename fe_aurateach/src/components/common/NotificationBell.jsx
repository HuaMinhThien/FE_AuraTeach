"use client";

import { useState, useEffect, useRef } from "react";
import styles from "./NotificationBell.module.css";
import { notificationService } from "@/services/notificationService"; // ✅ Import service mới

export default function NotificationBell({ userId, userRole }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Debug
  useEffect(() => {
    console.log("🔔 [NotificationBell] Mounted with userId:", userId);
  }, [userId]);

  // Fetch notifications thông qua notificationService
  useEffect(() => {
    if (!userId) {
      console.log("⏳ [NotificationBell] No userId, skipping fetch");
      return;
    }

    const fetchNotifications = async () => {
      try {
        setLoading(true);
        console.log(`📡 [NotificationBell] Fetching for user: ${userId}`);
        
        const data = await notificationService.getNotifications(userId);
        console.log(`📊 [NotificationBell] Found ${data.length} notifications`);
        
        if (Array.isArray(data)) {
          const sorted = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          setNotifications(sorted);
          setUnreadCount(sorted.filter(n => !n.is_read).length);
        } else {
          setNotifications([]);
          setUnreadCount(0);
        }
      } catch (error) {
        console.warn("⚠️ [NotificationBell] Fetch error:", error.message);
        setNotifications([]);
        setUnreadCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [userId]);

  // Click outside dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDropdown = () => {
    console.log("🔔 [NotificationBell] Toggle dropdown, current state:", isOpen);
    setIsOpen(!isOpen);
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diff = (now - date) / 1000;

    if (diff < 60) return "Vừa xong";
    if (diff < 3600) return `${Math.floor(diff / 60)}p trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h trước`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
    return date.toLocaleDateString("vi-VN", { 
      day: "2-digit", 
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "booking": return "📩";
      case "payment": return "💰";
      case "system": return "🔔";
      case "message": return "💬";
      default: return "📌";
    }
  };

  // Nếu không có userId, hiển thị icon mặc định
  if (!userId) {
    return (
      <div className={styles.container} style={{ position: 'relative', display: 'inline-block' }}>
        <button className={styles.bellBtn} title="Thông báo">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button
        className={styles.bellBtn}
        onClick={toggleDropdown}
        title="Thông báo"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <h3>🔔 Thông báo</h3>
            {notifications.length > 0 && (
              <span className={styles.count}>{notifications.length}</span>
            )}
          </div>

          <div className={styles.notifList}>
            {loading ? (
              <div className={styles.loadingState}>
                <div className={styles.loadingSpinner}></div>
                <p>Đang tải...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>🔔</span>
                <p>Chưa có thông báo nào</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`${styles.notifItem} ${!notif.is_read ? styles.unread : ''}`}
                  onClick={async () => {
                    if (!notif.is_read) {
                      try {
                        await notificationService.markAsRead(notif.id);
                        setNotifications(prev => 
                          prev.map(n => 
                            n.id === notif.id ? { ...n, is_read: true } : n
                          )
                        );
                        setUnreadCount(prev => Math.max(0, prev - 1));
                      } catch (error) {
                        console.error("❌ Lỗi mark as read:", error);
                      }
                    }
                  }}
                >
                  <div className={styles.notifIcon}>
                    {getTypeIcon(notif.type)}
                  </div>
                  <div className={styles.notifContent}>
                    <div className={styles.notifHeader}>
                      <span className={styles.notifTitle}>{notif.title || "Thông báo"}</span>
                      {!notif.is_read && <span className={styles.unreadBadge}>Mới</span>}
                    </div>
                    <p className={styles.notifMessage}>{notif.message || "Không có nội dung"}</p>
                    <div className={styles.notifMeta}>
                      <span className={styles.notifTime}>{formatTime(notif.created_at)}</span>
                      <span className={styles.notifType}>{notif.type || "system"}</span>
                    </div>
                  </div>
                  {!notif.is_read && <div className={styles.unreadDot} />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}