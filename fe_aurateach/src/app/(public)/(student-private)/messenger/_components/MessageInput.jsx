"use client";

import React, { useState, useRef, useEffect } from "react";
import styles from "./MessageInput.module.css";

export default function MessageInput({ onSend, sending, inputRef: externalInputRef }) {
  const [message, setMessage] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const menuRef = useRef(null);

  const inputRef = externalInputRef || textareaRef;

  // Tự động co giãn textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 80)}px`;
    }
  }, [message, inputRef]);

  // Đóng menu khi click ra ngoài
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

  const handleFileSelect = (type) => {
    setShowMenu(false);
    if (!fileInputRef.current) return;
    
    if (type === "image") {
      fileInputRef.current.accept = "image/*";
      fileInputRef.current.multiple = true;
    } else if (type === "video") {
      fileInputRef.current.accept = "video/*";
      fileInputRef.current.multiple = false;
    } else {
      fileInputRef.current.accept = "*";
      fileInputRef.current.multiple = true;
    }
    fileInputRef.current.click();
  };

  const handleFilesChange = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        onSend({
          id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          type: file.type,
          size: file.size,
          data: event.target.result,
        });
      };
      reader.readAsDataURL(file);
    });

    e.target.value = "";
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <form className={styles.inputContainer} onSubmit={handleSubmit}>
      <div className={styles.inputWrapper}>
        <input
          ref={fileInputRef}
          type="file"
          className={styles.fileInputHidden}
          onChange={handleFilesChange}
        />

        <div className={styles.menuContainer} ref={menuRef}>
          <button
            type="button"
            className={styles.menuBtn}
            onClick={() => setShowMenu(prev => !prev)}
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
              <button type="button" className={styles.menuItem} onClick={() => handleFileSelect("image")}>
                <span className={styles.menuIcon}>🖼️</span> <span>Hình ảnh</span>
              </button>
              <button type="button" className={styles.menuItem} onClick={() => handleFileSelect("video")}>
                <span className={styles.menuIcon}>🎬</span> <span>Video</span>
              </button>
              <button type="button" className={styles.menuItem} onClick={() => handleFileSelect("file")}>
                <span className={styles.menuIcon}>📎</span> <span>File</span>
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
          {sending ? <span className={styles.sendingSpinner}></span> : "➤"}
        </button>
      </div>
    </form>
  );
}