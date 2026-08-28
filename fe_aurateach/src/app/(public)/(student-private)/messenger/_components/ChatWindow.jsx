"use client";

import React, { useRef, useEffect } from "react";
import MessageInput from "./MessageInput";
import styles from "./ChatWindow.module.css";

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
  const prevMessageCountRef = useRef(messages.length);

  const getCurrentUserId = () => {
    return currentUser?.user_id || currentUser?.id;
  };

  // ✅ Lấy thông tin người khác
  const otherUser = conversation?.other_user || {};
  const otherUserName = otherUser.full_name || "Người dùng";
  const otherUserAvatar = otherUser.avatar || "/img/default-avatar.svg";
  const otherUserRole = otherUser.role || "student";

  // ✅ Khi messages load/change: scroll xuống tin nhắn cuối + auto-focus input
  useEffect(() => {
    if (messages.length > 0 && messagesEndRef.current) {
      const lastMsg = messages[messages.length - 1];
      const currentUserId = getCurrentUserId();
      
      // ✅ Scroll xuống cuối nếu:
      // 1. User vừa gửi tin nhắn (lastMsg.sender_id === currentUserId)
      // 2. Hoặc đây là lần load đầu tiên (isInitialLoad)
      if (isInitialLoad?.current || lastMsg?.sender_id === currentUserId) {
        // Dùng requestAnimationFrame để scroll sau khi DOM update
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
    
    prevMessageCountRef.current = messages.length;
  }, [messages, isInitialLoad]);

  // ✅ Auto-focus input khi conversation thay đổi
  useEffect(() => {
    if (inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 200);
    }
  }, [conversation?.id]);

  const handleScroll = (e) => {
    const { scrollTop } = e.target;
    if (scrollTop === 0 && hasMore && onLoadMore) {
      onLoadMore();
    }
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("vi-VN", { 
      hour: "2-digit", 
      minute: "2-digit" 
    });
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Hôm nay";
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return "Hôm qua";
    }
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const groupMessagesByDate = () => {
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
  };

  const messageGroups = groupMessagesByDate();

  if (messageGroups.length === 0) {
    return (
      <div className={styles.chatWindow}>
        <div className={styles.chatHeader}>
          <div className={styles.userInfo}>
            {otherUserAvatar && otherUserAvatar !== "/img/default-avatar.svg" ? (
              <img
                src={otherUserAvatar}
                alt={otherUserName}
                className={styles.headerAvatar}
                onError={(e) => {
                  e.target.src = "/img/default-avatar.svg";
                }}
              />
            ) : (
              <div className={styles.headerAvatarPlaceholder}>
                {otherUserName?.charAt(0) || "?"}
              </div>
            )}
            <div>
              <span className={styles.headerName}>{otherUserName}</span>
              <span className={styles.headerRole}>
                {otherUserRole === "tutor" ? <img src="/img/icons/team.png" alt="Gia sư" className={styles.roleIcon} /> : <img src="/img/icons/multiple-users-silhouette.png" alt="Học viên" className={styles.roleIcon} />} {otherUserRole === "tutor" ? "Gia sư" : "Học viên"}
              </span>
            </div>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.headerBtn} title="Làm mới">
              🔄
            </button>
          </div>
        </div>
        <div className={styles.emptyMessages}>
          <img src="/img/icons/messenger (1).png" alt="chat" className={styles.emptyIconImg} />
          <p>Chưa có tin nhắn nào</p>
          <p className={styles.emptySub}>Hãy bắt đầu cuộc trò chuyện</p>
        </div>
        <MessageInput key={conversation?.id || 'empty'} onSend={onSendMessage} sending={sending} inputRef={inputRef} />
      </div>
    );
  }

  return (
    <div className={styles.chatWindow}>
      <div className={styles.chatHeader}>
        <div className={styles.userInfo}>
          {otherUserAvatar && otherUserAvatar !== "/img/default-avatar.svg" ? (
            <img
              src={otherUserAvatar}
              alt={otherUserName}
              className={styles.headerAvatar}
              onError={(e) => {
                e.target.src = "/img/default-avatar.svg";
              }}
            />
          ) : (
            <div className={styles.headerAvatarPlaceholder}>
              {otherUserName?.charAt(0) || "?"}
            </div>
          )}
            <div>
              <span className={styles.headerName}>{otherUserName}</span>
              <span className={styles.headerRole}>
                {otherUserRole === "tutor" ? <img src="/img/icons/team.png" alt="Gia sư" className={styles.roleIcon} /> : <img src="/img/icons/multiple-users-silhouette.png" alt="Học viên" className={styles.roleIcon} />} {otherUserRole === "tutor" ? "Gia sư" : "Học viên"}
              </span>
            </div>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.headerBtn} title="Làm mới">
            🔄
          </button>
        </div>
      </div>

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
              const currentUserId = getCurrentUserId();
              const isOwn = msg.sender_id === currentUserId;

              const renderFileContent = () => {
                if (!msg.file_type) return null;
                
                const fileDataUrl = msg.file_data || msg.data;
                const isImage = msg.file_type.startsWith('image/');
                const isVideo = msg.file_type.startsWith('video/');

                if (isImage && fileDataUrl) {
                  return (
                    <div className={styles.filePreview}>
                      <img
                        src={fileDataUrl}
                        alt={msg.file_name || "Hình ảnh"}
                        className={styles.messageImage}
                        onClick={() => window.open(fileDataUrl, '_blank')}
                        loading="lazy"
                      />
                    </div>
                  );
                }

                if (isVideo && fileDataUrl) {
                  return (
                    <div className={styles.filePreview}>
                      <video
                        controls
                        className={styles.messageVideo}
                        preload="metadata"
                      >
                        <source src={fileDataUrl} type={msg.file_type} />
                        Trình duyệt không hỗ trợ video
                      </video>
                    </div>
                  );
                }

                // File attachment (PDF, DOC, ZIP, etc.)
                const formatFileSize = (bytes) => {
                  if (!bytes) return "";
                  if (bytes < 1024) return `${bytes}B`;
                  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
                  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
                };

                return (
                  <div className={styles.fileAttachment}>
                    <div className={styles.fileIcon}>
                      📎
                    </div>
                    <div className={styles.fileInfo}>
                      <span className={styles.fileName}>{msg.file_name || "File đính kèm"}</span>
                      <span className={styles.fileSize}>{formatFileSize(msg.file_size)}</span>
                    </div>
                    {fileDataUrl && (
                      <a
                        href={fileDataUrl}
                        download={msg.file_name}
                        className={styles.fileDownloadBtn}
                        title="Tải xuống"
                      >
                        ⬇
                      </a>
                    )}
                  </div>
                );
              };

              return (
                <div
                  key={msg.id || index}
                  className={`${styles.messageWrapper} ${isOwn ? styles.own : styles.other}`}
                >
                  {!isOwn && (
                    <div className={styles.messageAvatar}>
                      {otherUserAvatar && otherUserAvatar !== "/img/default-avatar.svg" ? (
                        <img
                          src={otherUserAvatar}
                          alt=""
                          className={styles.msgAvatar}
                          onError={(e) => {
                            e.target.src = "/img/default-avatar.svg";
                          }}
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
                      {msg.file_type ? (
                        renderFileContent()
                      ) : (
                        <p className={styles.messageText}>{msg.content}</p>
                      )}
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
