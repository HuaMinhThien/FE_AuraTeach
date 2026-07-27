"use client";

import React, { useState, useRef, useEffect } from "react";
import styles from "./MessageInput.module.css";

export default function MessageInput({ onSend, sending, inputRef: externalInputRef }) {
  const [message, setMessage] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const menuRef = useRef(null);

  // ✅ Sử dụng ref từ ngoài nếu có, không thì dùng ref nội bộ
  const inputRef = externalInputRef || textareaRef;

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 80)}px`;
    }
  }, [message, inputRef]);

  // ✅ Đóng menu khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !sending) {
      onSend(message);
      setMessage("");
      // ✅ Focus lại input sau khi gửi để có thể gõ tiếp
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
        inputRef.current.focus();
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // ✅ Focus input khi component mount hoặc khi key (conversation) thay đổi
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputRef]);

  // ✅ Xử lý chọn file
  const handleFileSelect = (type) => {
    setShowMenu(false);
    if (fileInputRef.current) {
      if (type === "image") {
        fileInputRef.current.accept = "image/*";
        fileInputRef.current.multiple = true;
      } else if (type === "video") {
        fileInputRef.current.accept = "video/*";
        fileInputRef.current.multiple = false;
      } else if (type === "file") {
        fileInputRef.current.accept = "*";
        fileInputRef.current.multiple = true;
      }
      fileInputRef.current.click();
    }
  };

  // ✅ Xử lý file sau khi chọn
  const handleFilesChange = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const fileData = {
          id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          type: file.type,
          size: file.size,
          data: event.target.result, // base64
        };
        onSend(fileData);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    e.target.value = "";
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <form className={styles.inputContainer} onSubmit={handleSubmit}>
      <div className={styles.inputWrapper}>
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          className={styles.fileInputHidden}
          onChange={handleFilesChange}
        />

        {/* Nút 3 chấm */}
        <div className={styles.menuContainer} ref={menuRef}>
          <button
            type="button"
            className={styles.menuBtn}
            onClick={() => setShowMenu(!showMenu)}
            title="Đính kèm file"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <circle cx="10" cy="4" r="1.5" />
              <circle cx="10" cy="10" r="1.5" />
              <circle cx="10" cy="16" r="1.5" />
            </svg>
          </button>

          {showMenu && (
            <div className={styles.dropdownMenu}>
              <button
                type="button"
                className={styles.menuItem}
                onClick={() => handleFileSelect("image")}
              >
                <span className={styles.menuIcon}>🖼️</span>
                <span>Hình ảnh</span>
              </button>
              <button
                type="button"
                className={styles.menuItem}
                onClick={() => handleFileSelect("video")}
              >
                <span className={styles.menuIcon}>🎬</span>
                <span>Video</span>
              </button>
              <button
                type="button"
                className={styles.menuItem}
                onClick={() => handleFileSelect("file")}
              >
                <span className={styles.menuIcon}>📎</span>
                <span>File</span>
              </button>
            </div>
          )}
        </div>

        <textarea
          ref={inputRef}
          className={styles.input}
          placeholder="Nhập tin nhắn..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={sending}
          autoFocus
        />
        <button 
          type="submit" 
          className={styles.sendBtn}
          disabled={!message.trim() || sending}
        >
          {sending ? (
            <span className={styles.sendingSpinner}></span>
          ) : (
            "➤"
          )}
        </button>
      </div>
    </form>
  );
}
