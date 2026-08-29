"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import authService from "@/services/authService";
import adminChatService from "@/services/adminChatService";
import styles from "./page.module.css";

const POLL_INTERVAL = 3000;

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTime(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMin = (now - date) / 60000;
  if (diffMin < 1) return "Vừa xong";
  if (diffMin < 60) return `${Math.floor(diffMin)}p`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h`;
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

function formatMsgTime(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateLabel(dateStr) {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Hôm nay";
  if (date.toDateString() === yesterday.toDateString()) return "Hôm qua";
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  return parts.length > 1
    ? parts[0][0] + parts[parts.length - 1][0]
    : parts[0][0];
}

function groupByDate(messages) {
  const groups = [];
  let curDate = "";
  for (const msg of messages) {
    const d = new Date(msg.created_at).toDateString();
    if (d !== curDate) {
      curDate = d;
      groups.push({ dateLabel: formatDateLabel(msg.created_at), messages: [] });
    }
    groups[groups.length - 1].messages.push(msg);
  }
  return groups;
}

function roleLabel(role) {
  if (role === "tutor") return "Gia sư";
  if (role === "student") return "Học viên";
  return role ?? "";
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Avatar({ name, src, size = 42 }) {
  const [err, setErr] = useState(false);
  if (src && !err) {
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className={styles.avatarImg}
        onError={() => setErr(true)}
      />
    );
  }
  return (
    <div className={styles.avatarPlaceholder} style={{ width: size, height: size, fontSize: size * 0.35 }}>
      {getInitials(name)}
    </div>
  );
}

function ConversationItem({ conv, isActive, onClick }) {
  const other = conv.other_user;
  const unread = conv.unread_count || 0;
  return (
    <div
      className={`${styles.convItem} ${isActive ? styles.convItemActive : ""} ${unread > 0 ? styles.convItemUnread : ""}`}
      onClick={onClick}
    >
      <div className={styles.convAvatar}>
        <Avatar name={other?.full_name} src={other?.avatar} />
        {unread > 0 && (
          <span className={styles.unreadBadge}>{unread > 99 ? "99+" : unread}</span>
        )}
      </div>
      <div className={styles.convInfo}>
        <div className={styles.convTop}>
          <span className={`${styles.convName} ${unread > 0 ? styles.convNameBold : ""}`}>
            {other?.full_name || "Người dùng"}
          </span>
          <span className={styles.convTime}>{formatTime(conv.last_message_time)}</span>
        </div>
        <p className={`${styles.convLast} ${unread > 0 ? styles.convLastUnread : ""}`}>
          {conv.last_message || "Chưa có tin nhắn"}
        </p>
        <span className={styles.convRole}>{roleLabel(other?.role)}</span>
      </div>
    </div>
  );
}

function MessageBubble({ msg, isOwn }) {
  return (
    <div className={`${styles.msgWrapper} ${isOwn ? styles.msgOwn : styles.msgOther}`}>
      <div className={`${styles.bubble} ${isOwn ? styles.bubbleOwn : styles.bubbleOther}`}>
        <p className={styles.msgText}>{msg.content}</p>
      </div>
      <span className={styles.msgTime}>{formatMsgTime(msg.created_at)}</span>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminChatPage() {
  const router = useRouter();

  const [admin, setAdmin] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  const bottomRef = useRef(null);
  const pollingRef = useRef(null);
  const isPollingRef = useRef(false);
  const textareaRef = useRef(null);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const user = await authService.getCurrentUser();
      if (!user) { router.push("/login"); return; }
      if (user.role !== "admin") { router.push("/"); return; }
      setAdmin(user);
      await loadConversations();
    };
    init();
  }, [router]);

  const loadConversations = async () => {
    try {
      setLoadingConvs(true);
      const res = await adminChatService.getAdminConversations();
      // Chuẩn hóa: đảm bảo luôn có conversation_id (BE dùng conversation_id, JSON Server dùng id)
      const normalized = (res.data || []).map((c) => ({
        ...c,
        conversation_id: c.conversation_id ?? c.id,
      }));
      setConversations(normalized);
    } catch (e) {
      setError("Không thể tải danh sách chat: " + e.message);
    } finally {
      setLoadingConvs(false);
    }
  };

  // ── Select conversation ───────────────────────────────────────────────────
  const handleSelect = useCallback(async (conv) => {
    setSelected(conv);
    setMessages([]);
    stopPolling();

    // đánh dấu đã đọc trong local state ngay lập tức
    setConversations((prev) =>
      prev.map((c) =>
        c.conversation_id === conv.conversation_id ? { ...c, unread_count: 0 } : c
      )
    );

    setLoadingMsgs(true);
    try {
      const res = await adminChatService.getAdminMessages(conv.conversation_id);
      // Chuẩn hóa message_id (BE dùng message_id, JSON Server dùng id)
      const msgs = (res.data || []).map((m) => ({
        ...m,
        message_id: m.message_id ?? m.id,
      }));
      setMessages(msgs);
    } catch (e) {
      console.error("Lỗi tải tin nhắn:", e);
    } finally {
      setLoadingMsgs(false);
    }

    startPolling(conv.conversation_id);
    setTimeout(() => textareaRef.current?.focus(), 200);
  }, []);

  // ── Polling ───────────────────────────────────────────────────────────────
  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    isPollingRef.current = false;
  };

  const startPolling = (conversationId) => {
    isPollingRef.current = true;
    pollingRef.current = setInterval(async () => {
      if (!isPollingRef.current) return;
      try {
        const res = await adminChatService.getAdminMessages(conversationId);
        const fresh = (res.data || []).map((m) => ({ ...m, message_id: m.message_id ?? m.id }));
        setMessages((prev) => {
          const ids = new Set(prev.map((m) => m.message_id));
          const newMsgs = fresh.filter((m) => !ids.has(m.message_id));
          return newMsgs.length ? [...prev, ...newMsgs] : prev;
        });
        // cập nhật last_message trong danh sách
        if (fresh.length > 0) {
          const last = fresh[fresh.length - 1];
          setConversations((prev) =>
            prev.map((c) =>
              c.conversation_id === conversationId
                ? { ...c, last_message: last.content, last_message_time: last.created_at }
                : c
            )
          );
        }
      } catch (_) {}
    }, POLL_INTERVAL);
  };

  useEffect(() => () => stopPolling(), []);

  // ── Scroll to bottom ──────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = input.trim();
    if (!text || !selected || sending) return;
    setSending(true);
    setInput("");

    // optimistic update
    const tmpId = `tmp_${Date.now()}`;
    const tmpMsg = {
      message_id: tmpId,
      conversation_id: selected.conversation_id,
      sender_id: admin.user_id,
      sender_role: "admin",
      content: text,
      created_at: new Date().toISOString(),
      is_read: false,
    };
    setMessages((prev) => [...prev, tmpMsg]);

    try {
      const res = await adminChatService.sendAdminMessage(selected.conversation_id, text);
      const saved = res.data;
      // thay tmp bằng bản thật
      setMessages((prev) =>
        prev.map((m) => (m.message_id === tmpId ? saved : m))
      );
      setConversations((prev) =>
        prev.map((c) =>
          c.conversation_id === selected.conversation_id
            ? { ...c, last_message: text, last_message_time: saved.created_at }
            : c
        )
      );
    } catch (e) {
      // rollback optimistic msg
      setMessages((prev) => prev.filter((m) => m.message_id !== tmpId));
      setInput(text);
      alert("Không thể gửi tin nhắn: " + e.message);
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Filter conversations ──────────────────────────────────────────────────
  const filtered = conversations.filter((c) => {
    if (!search) return true;
    const name = c.other_user?.full_name?.toLowerCase() || "";
    return name.includes(search.toLowerCase());
  });

  const totalUnread = conversations.reduce((s, c) => s + (c.unread_count || 0), 0);
  const msgGroups = groupByDate(messages);

  // ── Render ────────────────────────────────────────────────────────────────
  if (loadingConvs) {
    return (
      <div className={styles.centered}>
        <div className={styles.spinner} />
        <p>Đang tải...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.centered}>
        <p className={styles.errorText}>{error}</p>
        <button className={styles.retryBtn} onClick={loadConversations}>Thử lại</button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <h1 className={styles.pageTitle}>Hỗ trợ người dùng</h1>
          <p className={styles.pageSubtitle}>
            {conversations.length} cuộc trò chuyện
            {totalUnread > 0 && (
              <span className={styles.totalUnread}> · {totalUnread} chưa đọc</span>
            )}
          </p>
        </div>
        <button className={styles.refreshBtn} onClick={loadConversations} title="Làm mới">
          ↻
        </button>
      </div>

      <div className={styles.layout}>
        {/* ── Conversation list ── */}
        <aside className={styles.sidebar}>
          <div className={styles.searchBox}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              className={styles.searchInput}
              placeholder="Tìm người dùng..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className={styles.convList}>
            {filtered.length === 0 ? (
              <div className={styles.emptyConv}>
                <span>💬</span>
                <p>{search ? "Không tìm thấy" : "Chưa có cuộc trò chuyện nào"}</p>
              </div>
            ) : (
              filtered.map((conv) => (
                <ConversationItem
                  key={conv.conversation_id}
                  conv={conv}
                  isActive={selected?.conversation_id === conv.conversation_id}
                  onClick={() => handleSelect(conv)}
                />
              ))
            )}
          </div>
        </aside>

        {/* ── Chat window ── */}
        <main className={styles.chatArea}>
          {!selected ? (
            <div className={styles.emptyChat}>
              <div className={styles.emptyChatIcon}>💬</div>
              <h3>Chọn một cuộc trò chuyện</h3>
              <p>Chọn người dùng bên trái để bắt đầu hỗ trợ</p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className={styles.chatHeader}>
                <div className={styles.chatHeaderUser}>
                  <Avatar
                    name={selected.other_user?.full_name}
                    src={selected.other_user?.avatar}
                    size={38}
                  />
                  <div>
                    <p className={styles.chatHeaderName}>
                      {selected.other_user?.full_name || "Người dùng"}
                    </p>
                    <p className={styles.chatHeaderRole}>
                      {roleLabel(selected.other_user?.role)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className={styles.messagesArea}>
                {loadingMsgs ? (
                  <div className={styles.centered}>
                    <div className={styles.spinner} />
                  </div>
                ) : msgGroups.length === 0 ? (
                  <div className={styles.emptyMessages}>
                    <p>Chưa có tin nhắn nào</p>
                    <p className={styles.emptyMessagesSub}>Hãy gửi tin nhắn đầu tiên</p>
                  </div>
                ) : (
                  msgGroups.map((group, gi) => (
                    <div key={gi}>
                      <div className={styles.dateDivider}>
                        <span>{group.dateLabel}</span>
                      </div>
                      {group.messages.map((msg) => (
                        <MessageBubble
                          key={msg.message_id}
                          msg={msg}
                          isOwn={msg.sender_role === "admin"}
                        />
                      ))}
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className={styles.inputArea}>
                <textarea
                  ref={textareaRef}
                  className={styles.textarea}
                  placeholder="Nhập tin nhắn hỗ trợ..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  disabled={sending}
                />
                <button
                  className={styles.sendBtn}
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                >
                  {sending ? <span className={styles.sendSpinner} /> : "➤"}
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
