"use client";

import { useEffect, useState } from "react";
import styles from "../_css/sec3.module.css";

const API_BASE = "http://localhost:3007";

const TYPE_ICONS = {
  booking: "📩",
  payment: "💰",
  system: "🔔",
  message: "💬",
};

const TYPE_CLASSES = {
  booking: styles.blueIcon,
  payment: styles.orangeIcon,
  system: styles.indigoIcon,
  message: styles.goldIcon,
};

export default function Tutor_sec3({ activitiesData: propActivities }) {
  const [notifications, setNotifications] = useState([]);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const getCookie = (name) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
      return null;
    };
    const userCookie = getCookie("user_info");
    if (userCookie) {
      try {
        const user = JSON.parse(decodeURIComponent(userCookie));
        const id = user.user_id || user.id;
        setUserId(id);
        console.log("👤 [Tutor_sec3] User ID:", id);
      } catch (e) {
        console.error("❌ Lỗi parse cookie:", e);
      }
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      console.log("⏳ [Tutor_sec3] Chưa có userId, chờ...");
      return;
    }

    const fetchNotifs = async () => {
      try {
        console.log(`📡 [Tutor_sec3] Fetching notifications for user: ${userId}`);
        const res = await fetch(`${API_BASE}/notifications?receiver_id=${userId}`);
        
        if (!res.ok) {
          console.warn(`⚠️ [Tutor_sec3] API returned ${res.status}: ${res.statusText}`);
          setNotifications([]);
          return;
        }
        
        const data = await res.json();
        console.log(`📊 [Tutor_sec3] Found ${data.length} notifications`);
        
        if (Array.isArray(data)) {
          // ✅ Sắp xếp mới nhất lên đầu
          const sorted = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          setNotifications(sorted);
        } else {
          setNotifications([]);
        }
      } catch (error) {
        console.warn("⚠️ [Tutor_sec3] Không thể kết nối đến JSON Server:", error.message);
        setNotifications([]);
      }
    };

    fetchNotifs();
    const interval = setInterval(fetchNotifs, 10000);
    return () => clearInterval(interval);
  }, [userId]);

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
      day: "2-digit", month: "2-digit",
      hour: "2-digit", minute: "2-digit"
    });
  };

  // ✅ Lấy notifications từ API
  const items = notifications.length > 0
    ? notifications.map((n, idx) => {
        let content = n.message || '';
        if (n.title && !content.includes(n.title)) {
          content = `${n.title}: ${content}`;
        }
        return {
          id: n.id || idx,
          icon: TYPE_ICONS[n.type] || "🔔",
          iconClass: TYPE_CLASSES[n.type] || styles.blueIcon,
          content: content,
          time: formatTime(n.created_at),
        };
      })
    : (propActivities || []);

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Hoạt động mới nhất</h3>
      <div className={styles.timeline}>
                {items.length === 0 ? (
          <div style={{ padding: "20px 0", color: "#94a3b8", textAlign: "center", fontSize: "13px" }}>
            Chưa có hoạt động nào
          </div>
        ) : (
          items.slice(0, 5).map((act) => (
            <div key={act.id} className={styles.activityItem}>
              <div className={`${styles.iconBox} ${act.iconClass}`}>
                {act.icon}
              </div>
              <div className={styles.details}>
                <div className={styles.contentBody}>
                  {typeof act.content === "string" ? act.content : act.content}
                </div>
                <span className={styles.timeLabel}>{act.time}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}