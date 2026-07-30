"use client";

import { useEffect, useState, useCallback } from "react";
import styles from "./notifications.module.css";

const API_BASE = "http://localhost:3007";

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("📡 [Admin Notif] Fetching notifications...");
      
      // ✅ Lấy tất cả notifications, sau đó sort trong JS
      const res = await fetch(`${API_BASE}/notifications?receiver_id=u-admin-1`);
      
      console.log("📡 [Admin Notif] Response status:", res.status);
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      console.log("📊 [Admin Notif] Data received:", data);
      
      let notifData = [];
      if (Array.isArray(data)) {
        // ✅ Sort mới nhất lên đầu
        notifData = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      } else if (data && typeof data === 'object') {
        notifData = data.data || data.notifications || [];
        if (Array.isArray(notifData)) {
          notifData = notifData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        } else {
          notifData = [];
        }
      }
      
      console.log("📊 [Admin Notif] Final data length:", notifData.length);
      setNotifications(notifData);
      
    } catch (error) {
      console.error("❌ [Admin Notif] Fetch error:", error);
      setError(error.message || "Không thể tải thông báo");
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleMarkAsRead = async (notif) => {
    try {
      console.log(`📝 [Admin Notif] Marking as read: ${notif.id}`);
      
      const res = await fetch(`${API_BASE}/notifications/${notif.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_read: true }),
      });
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      
      setNotifications(prev =>
        prev.map(n => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
    } catch (error) {
      console.error("❌ [Admin Notif] Mark as read error:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unread = notifications.filter(n => !n.is_read);
      if (unread.length === 0) return;
      
      console.log(`📝 [Admin Notif] Marking ${unread.length} notifications as read`);
      
      await Promise.all(
        unread.map(n =>
          fetch(`${API_BASE}/notifications/${n.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_read: true }),
          })
        )
      );
      
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error("❌ [Admin Notif] Mark all as read error:", error);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "booking": return "📩";
      case "payment": return "💰";
      case "system": return "🔔";
      default: return "💬";
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

  console.log("🔔 [Admin Notif] Render - notifications:", notifications.length);
  console.log("🔔 [Admin Notif] Render - filtered:", filteredNotifications.length);
  console.log("🔔 [Admin Notif] Render - unreadCount:", unreadCount);

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
            <h1>🔔 Thông báo</h1>
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
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            💡 Hãy đảm bảo JSON Server đang chạy: <br/>
            <code style={{ background: '#f3f4f6', padding: '4px 8px', borderRadius: '4px' }}>
              npx json-server --watch src/app/api/data.json --port 3007
            </code>
          </p>
          <button 
            onClick={fetchNotifications}
            style={{
              marginTop: '16px',
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
          <h1>🔔 Thông báo</h1>
          <span className={styles.headerCount}>
            {unreadCount > 0 ? `${unreadCount} chưa đọc` : "Tất cả đã đọc"}
          </span>
        </div>
        <div className={styles.headerRight}>
          {unreadCount > 0 && (
            <button className={styles.markAllBtn} onClick={handleMarkAllAsRead}>
              ✅ Đánh dấu tất cả đã đọc
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
            <span className={styles.emptyIcon}>🔔</span>
            <p>Không có thông báo nào</p>
          </div>
        ) : (
          filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              className={`${styles.notifItem} ${!notif.is_read ? styles.unread : ""}`}
              onClick={() => !notif.is_read && handleMarkAsRead(notif)}
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