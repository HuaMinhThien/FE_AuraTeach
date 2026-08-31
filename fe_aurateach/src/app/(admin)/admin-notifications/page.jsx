"use client";

import { useEffect, useState, useCallback } from "react";
import styles from "./notifications.module.css";
import notificationService from "@/services/notificationService";

const ADMIN_USER_ID = "u-admin-1"; // ID mặc định của Admin

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState(null);

  // 🚀 Tải danh sách thông báo thông qua service chuẩn
  const fetchNotifications = useCallback(async () => {
    try {
      setError(null);
      const data = await notificationService.getNotifications(ADMIN_USER_ID);
      
      // Sort mới nhất lên đầu dựa vào created_at
      const sortedData = Array.isArray(data) 
        ? data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        : [];
        
      setNotifications(sortedData);
    } catch (err) {
      console.error("❌ [Admin Notif] Fetch error:", err);
      setError(err.message || "Không thể tải thông báo");
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // Polling mỗi 10s
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // 🚀 Đánh dấu 1 thông báo đã đọc qua service
  const handleMarkAsRead = async (notif) => {
    if (notif.is_read) return;
    try {
      await notificationService.markAsRead(notif.id);
      setNotifications(prev =>
        prev.map(n => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
    } catch (error) {
      console.error("❌ [Admin Notif] Mark as read error:", error);
    }
  };

  // 🚀 Đánh dấu tất cả đã đọc qua service
  const handleMarkAllAsRead = async () => {
    try {
      const result = await notificationService.markAllAsRead(ADMIN_USER_ID);
      if (result.success && result.count > 0) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      }
    } catch (error) {
      console.error("❌ [Admin Notif] Mark all as read error:", error);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "booking": return "📩";
      case "payment": return <img src="/img/icons/money.png" alt="payment" className={styles.notifTypeIcon} />;
      case "system": return <img src="/img/icons/notificationn.png" alt="system" className={styles.notifTypeIcon} />;
      default: return <img src="/img/icons/messenger (1).png" alt="message" className={styles.notifTypeIcon} />;
    }
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
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === "unread") return !n.is_read;
    if (filter === "read") return n.is_read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Đang tải thông báo...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <h1 className={styles.headerIcon}><img src="/img/icons/notificationn.png" alt="Thông báo" className={styles.headerIconImg} /> Thông báo</h1>
          </div>
        </header>
        <div style={{ 
          padding: '40px 20px', 
          textAlign: 'center',
          background: '#fef2f2',
          borderRadius: '12px',
          border: '1px solid #fecaca'
        }}>
          <p style={{ color: '#dc2626', fontSize: '16px', marginBottom: '12px' }}>
            ❌ {error}
          </p>
          <button 
            onClick={fetchNotifications}
            style={{
              padding: '8px 24px',
              background: '#4f46e5',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.headerIcon}><img src="/img/icons/notificationn.png" alt="Thông báo" className={styles.headerIconImg} /> Thông báo</h1>
          <span className={styles.headerCount}>
            {unreadCount > 0 ? `${unreadCount} chưa đọc` : "Tất cả đã đọc"}
          </span>
        </div>
        <div className={styles.headerRight}>
          {unreadCount > 0 && (
            <button className={styles.markAllBtn} onClick={handleMarkAllAsRead}>
              <img src="/img/icons/security.png" alt="Đã đọc" className={styles.btnIcon} /> Đánh dấu tất cả đã đọc
            </button>
          )}
        </div>
      </header>

      <div className={styles.filterTabs}>
        <button
          className={`${styles.filterTab} ${filter === "all" ? styles.activeFilter : ""}`}
          onClick={() => setFilter("all")}
        >
          Tất cả ({notifications.length})
        </button>
        <button
          className={`${styles.filterTab} ${filter === "unread" ? styles.activeFilter : ""}`}
          onClick={() => setFilter("unread")}
        >
          Chưa đọc ({unreadCount})
        </button>
        <button
          className={`${styles.filterTab} ${filter === "read" ? styles.activeFilter : ""}`}
          onClick={() => setFilter("read")}
        >
          Đã đọc ({notifications.length - unreadCount})
        </button>
      </div>

      <div className={styles.notifList}>
        {filteredNotifications.length === 0 ? (
          <div className={styles.emptyState}>
            <img src="/img/icons/notificationn.png" alt="empty" className={styles.emptyIconImg} />
            <p>Không có thông báo nào</p>
          </div>
        ) : (
          filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              className={`${styles.notifItem} ${!notif.is_read ? styles.unread : ""}`}
              onClick={() => handleMarkAsRead(notif)}
            >
              <div className={styles.notifIcon}>
                {getTypeIcon(notif.type)}
              </div>
              <div className={styles.notifContent}>
                <div className={styles.notifHeader}>
                  <h4 className={styles.notifTitle}>{notif.title || "Thông báo"}</h4>
                  {!notif.is_read && <span className={styles.unreadBadge}>Mới</span>}
                </div>
                <p className={styles.notifMessage}>{notif.message || "Không có nội dung"}</p>
                <div className={styles.notifMeta}>
                  <span className={styles.notifTime}>{formatTime(notif.created_at)}</span>
                  <span className={styles.notifRole}>{notif.receiver_role || "Hệ thống"}</span>
                </div>
              </div>
              {!notif.is_read && <div className={styles.unreadDot} />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}