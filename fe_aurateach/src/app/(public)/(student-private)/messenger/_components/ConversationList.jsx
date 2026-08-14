"use client";

import React, { useMemo } from "react";
import styles from "./ConversationList.module.css";

const formatTime = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const diff = (new Date() - date) / 1000 / 60;

  if (diff < 1) return "Vừa xong";
  if (diff < 60) return `${Math.floor(diff)}p`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h`;
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
};

const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  return parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0][0];
};

export default function ConversationList({ 
  conversations, 
  selectedId, 
  onSelect, 
  currentUserId 
}) {
  // Sắp xếp cuộc trò chuyện tối ưu bằng useMemo
  const sortedConversations = useMemo(() => {
    if (!Array.isArray(conversations)) return [];
    return [...conversations].sort((a, b) => {
      const timeA = a.last_message_time ? new Date(a.last_message_time).getTime() : 0;
      const timeB = b.last_message_time ? new Date(b.last_message_time).getTime() : 0;
      return timeB - timeA;
    });
  }, [conversations]);

  if (sortedConversations.length === 0) {
    return (
      <div className={styles.emptyList}>
        <span className={styles.emptyIcon}>📭</span>
        <p>Chưa có hội thoại nào</p>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      <div className={styles.header}>
        <h3>Tin nhắn</h3>
        <span className={styles.count}>{sortedConversations.length}</span>
      </div>
      <div className={styles.items}>
        {sortedConversations.map((conv) => {
          const convId = conv.conversation_id || conv.id;
          const isActive = convId === selectedId;
          const unreadCount = conv.unread_count || 0;
          const displayName = conv.other_user?.full_name || "Người dùng";
          const displayAvatar = conv.other_user?.avatar || "/img/default-avatar.svg";

          return (
            <div
              key={convId}
              className={`${styles.conversationItem} ${isActive ? styles.active : ""} ${unreadCount > 0 ? styles.unreadItem : ""}`}
              onClick={() => onSelect(conv)}
            >
              <div className={styles.avatarWrapper}>
                {displayAvatar && displayAvatar !== "/img/default-avatar.svg" ? (
                  <img 
                    src={displayAvatar} 
                    alt={displayName}
                    className={styles.avatar}
                    onError={(e) => { e.target.src = "/img/default-avatar.svg"; }}
                  />
                ) : (
                  <div className={styles.avatarPlaceholder}>
                    {getInitials(displayName)}
                  </div>
                )}
                {unreadCount > 0 && (
                  <span className={styles.unreadBadge}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>

              <div className={styles.conversationInfo}>
                <div className={styles.conversationHeader}>
                  <span className={`${styles.name} ${unreadCount > 0 ? styles.nameUnread : ""}`}>
                    {displayName}
                  </span>
                  <span className={styles.time}>
                    {formatTime(conv.last_message_time)}
                  </span>
                </div>
                <p className={`${styles.lastMessage} ${unreadCount > 0 ? styles.unread : ""}`}>
                  {conv.last_message || "Chưa có tin nhắn"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}