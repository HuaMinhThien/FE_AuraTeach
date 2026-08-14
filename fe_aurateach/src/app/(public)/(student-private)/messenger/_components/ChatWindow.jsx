"use client";

import React, { useRef, useEffect, useCallback } from "react";
import MessageInput from "./MessageInput";
import styles from "./ChatWindow.module.css";

// Tách hàm định dạng ra ngoài để tránh khởi tạo lại liên tục
const formatTime = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
};

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Hôm nay";
  if (date.toDateString() === yesterday.toDateString()) return "Hôm qua";
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
};

// Helper kiểm tra và render nội dung tin nhắn (Ảnh hoặc Văn bản)
const renderMessageContent = (content, styles) => {
  const textContent = content || "";
  const isImage = textContent.startsWith('http') && 
    (/\.(jpg|jpeg|png|gif|webp|bmp|svg)($|\?)/i.test(textContent) || textContent.includes('cloudinary.com'));

  if (isImage) {
    return (
      <div className={styles.filePreview}>
        <img
          src={textContent}
          alt="Hình ảnh đính kèm"
          className={styles.messageImage}
          onClick={() => window.open(textContent, '_blank')}
          loading="lazy"
        />
      </div>
    );
  }

  return <p className={styles.messageText}>{textContent}</p>;
};

export default function ChatWindow({
  conversation,
  messages,
  currentUser,
  onSendMessage,
  onLoadMore,
  hasMore,
  sending,
  isInitialLoad,
}) {
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);

  const getCurrentUserId = useCallback(() => {
    return currentUser?.user_id || currentUser?.id;
  }, [currentUser]);

  // Thông tin người trò chuyện cùng
  const otherUser = conversation?.other_user || {};
  const otherUserName = otherUser.full_name || "Người dùng";
  const otherUserAvatar = otherUser.avatar || "/img/default-avatar.svg";
  const otherUserRole = otherUser.role || "student";

  // Auto scroll xuống dưới khi có tin nhắn mới hoặc load lần đầu
  useEffect(() => {
    if (messages.length > 0 && messagesEndRef.current) {
      const lastMsg = messages[messages.length - 1];
      const currentUserId = getCurrentUserId();
      
      if (isInitialLoad?.current || lastMsg?.sender_id === currentUserId) {
        requestAnimationFrame(() => {
          messagesEndRef.current?.scrollIntoView({ 
            behavior: isInitialLoad?.current ? "auto" : "smooth" 
          });
        });
        
        if (isInitialLoad?.current) {
          isInitialLoad.current = false;
        }
      }
    }
  }, [messages, isInitialLoad, getCurrentUserId]);

  // Auto-focus input khi đổi cuộc trò chuyện
  useEffect(() => {
    if (inputRef.current) {
      const timer = setTimeout(() => inputRef.current?.focus(), 200);
      return () => clearTimeout(timer);
    }
  }, [conversation?.id]);

  const handleScroll = (e) => {
    if (e.target.scrollTop === 0 && hasMore && onLoadMore) {
      onLoadMore();
    }
  };

  // Gom nhóm tin nhắn theo ngày
  const messageGroups = React.useMemo(() => {
    const groups = [];
    let currentDate = "";

    messages.forEach((msg) => {
      const msgDate = new Date(msg.created_at).toDateString();
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({
          date: msgDate,
          dateDisplay: formatDate(msg.created_at),
          messages: [],
        });
      }
      groups[groups.length - 1].messages.push(msg);
    });

    return groups;
  }, [messages]);

  const renderUserInfoHeader = () => (
    <div className={styles.chatHeader}>
      <div className={styles.userInfo}>
        {otherUserAvatar && otherUserAvatar !== "/img/default-avatar.svg" ? (
          <img
            src={otherUserAvatar}
            alt={otherUserName}
            className={styles.headerAvatar}
            onError={(e) => { e.target.src = "/img/default-avatar.svg"; }}
          />
        ) : (
          <div className={styles.headerAvatarPlaceholder}>
            {otherUserName?.charAt(0) || "?"}
          </div>
        )}
        <div>
          <span className={styles.headerName}>{otherUserName}</span>
          <span className={styles.headerRole}>
            {otherUserRole === "tutor" ? "👨‍🏫 Gia sư" : "🎓 Học viên"}
          </span>
        </div>
      </div>
      <div className={styles.headerActions}>
        <button className={styles.headerBtn} title="Làm mới">🔄</button>
      </div>
    </div>
  );

  if (messageGroups.length === 0) {
    return (
      <div className={styles.chatWindow}>
        {renderUserInfoHeader()}
        <div className={styles.emptyMessages}>
          <span className={styles.emptyIcon}>💬</span>
          <p>Chưa có tin nhắn nào</p>
          <p className={styles.emptySub}>Hãy bắt đầu cuộc trò chuyện</p>
        </div>
        <MessageInput key={conversation?.id || 'empty'} onSend={onSendMessage} sending={sending} inputRef={inputRef} />
      </div>
    );
  }

  const currentUserId = getCurrentUserId();

  return (
    <div className={styles.chatWindow}>
      {renderUserInfoHeader()}

      <div 
        className={styles.messagesContainer} 
        ref={messagesContainerRef}
        onScroll={handleScroll}
      >
        {hasMore && (
          <div className={styles.loadingMore}>
            <span className={styles.loadingMoreSpinner}></span>
            <p>Đang tải tin nhắn cũ...</p>
          </div>
        )}

        {messageGroups.map((group, groupIndex) => (
          <div key={groupIndex}>
            <div className={styles.dateDivider}>
              <span>{group.dateDisplay}</span>
            </div>
            {group.messages.map((msg, index) => {
              const isOwn = msg.sender_id === currentUserId;

              return (
                <div
                  key={msg.id || msg.message_id || index}
                  className={`${styles.messageWrapper} ${isOwn ? styles.own : styles.other}`}
                >
                  {!isOwn && (
                    <div className={styles.messageAvatar}>
                      {otherUserAvatar && otherUserAvatar !== "/img/default-avatar.svg" ? (
                        <img
                          src={otherUserAvatar}
                          alt=""
                          className={styles.msgAvatar}
                          onError={(e) => { e.target.src = "/img/default-avatar.svg"; }}
                        />
                      ) : (
                        <div className={styles.msgAvatarPlaceholder}>
                          {otherUserName?.charAt(0) || "?"}
                        </div>
                      )}
                    </div>
                  )}
                  <div className={styles.messageContent}>
                    <div className={`${styles.messageBubble} ${isOwn ? styles.ownBubble : styles.otherBubble}`}>
                      {renderMessageContent(msg.content, styles)}
                    </div>
                    <span className={styles.messageTime}>{formatTime(msg.created_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <MessageInput key={conversation?.id || 'main'} onSend={onSendMessage} sending={sending} inputRef={inputRef} />
    </div>
  );
}