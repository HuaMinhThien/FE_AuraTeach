"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/authService";
import adminChatService from "@/services/adminChatService";
import styles from "./page.module.css";

const POLL_INTERVAL = 3000;
const SEARCH_DEBOUNCE = 350; // ms chờ trước khi gọi API tìm kiếm

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
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
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

function roleBadgeClass(role) {
  if (role === "tutor") return styles.roleTutor;
  if (role === "student") return styles.roleStudent;
  return "";
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
    <div
      className={styles.avatarPlaceholder}
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {getInitials(name)}
    </div>
  );
}

// Item trong danh sách conversation đang có
function ConversationItem({ conv, isActive, onClick }) {
  const other = conv.other_user;
  const unread = conv.unread_count || 0;
  return (
    <div
      className={`${styles.convItem} ${isActive ? styles.convItemActive : ""} ${
        unread > 0 ? styles.convItemUnread : ""
      }`}
      onClick={onClick}
    >
      <div className={styles.convAvatar}>
        <Avatar name={other?.full_name} src={other?.avatar} />
        {unread > 0 && (
          <span className={styles.unreadBadge}>
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </div>
      <div className={styles.convInfo}>
        <div className={styles.convTop}>
          <span
            className={`${styles.convName} ${
              unread > 0 ? styles.convNameBold : ""
            }`}
          >
            {other?.full_name || "Người dùng"}
          </span>
          <span className={styles.convTime}>
            {formatTime(conv.last_message_time)}
          </span>
        </div>
        <p
          className={`${styles.convLast} ${
            unread > 0 ? styles.convLastUnread : ""
          }`}
        >
          {conv.last_message || "Chưa có tin nhắn"}
        </p>
        <span className={`${styles.convRole} ${roleBadgeClass(other?.role)}`}>
          {roleLabel(other?.role)}
        </span>
      </div>
    </div>
  );
}

// Item kết quả tìm kiếm user (chưa hoặc đã có conversation)
function UserSearchItem({ user, isActive, onClick }) {
  const hasConv = !!user.conversation_id;
  return (
    <div
      className={`${styles.convItem} ${isActive ? styles.convItemActive : ""} ${
        styles.searchResultItem
      }`}
      onClick={onClick}
    >
      <div className={styles.convAvatar}>
        <Avatar name={user.full_name} src={user.avatar} />
      </div>
      <div className={styles.convInfo}>
        <div className={styles.convTop}>
          <span className={styles.convName}>{user.full_name}</span>
          {!hasConv && <span className={styles.newChatBadge}>Mới</span>}
        </div>
        <p className={styles.convLast}>{user.email}</p>
        <span className={`${styles.convRole} ${roleBadgeClass(user.role)}`}>
          {roleLabel(user.role)}
        </span>
      </div>
    </div>
  );
}

function MessageBubble({ msg, isOwn }) {
  return (
    <div
      className={`${styles.msgWrapper} ${
        isOwn ? styles.msgOwn : styles.msgOther
      }`}
    >
      <div
        className={`${styles.bubble} ${
          isOwn ? styles.bubbleOwn : styles.bubbleOther
        }`}
      >
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

  // Search
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]); // users từ API
  const [searching, setSearching] = useState(false);
  const searchDebounceRef = useRef(null);
  const isSearchMode = search.trim().length > 0;

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

  // ── Search với debounce ───────────────────────────────────────────────────
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (!search.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await adminChatService.searchUsers(search.trim());
        setSearchResults(res.data || []);
      } catch (e) {
        console.error("searchUsers error:", e);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, SEARCH_DEBOUNCE);

    return () => clearTimeout(searchDebounceRef.current);
  }, [search]);

  // ── Select conversation (từ danh sách sẵn có) ────────────────────────────
  const handleSelectConv = useCallback(
    async (conv) => {
      setSelected(conv);
      setMessages([]);
      setSearch(""); // đóng search mode khi chọn conv
      stopPolling();

      setConversations((prev) =>
        prev.map((c) =>
          c.conversation_id === conv.conversation_id
            ? { ...c, unread_count: 0 }
            : c
        )
      );

      setLoadingMsgs(true);
      try {
        const res = await adminChatService.getAdminMessages(conv.conversation_id);
        const sorted = (res.data || [])
          .map((m) => ({ ...m, message_id: m.message_id ?? m.id }))
          .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        setMessages(sorted);
      } catch (e) {
        console.error("Lỗi tải tin nhắn:", e);
      } finally {
        setLoadingMsgs(false);
      }

      startPolling(conv.conversation_id);
      setTimeout(() => textareaRef.current?.focus(), 200);
    },
    []
  );

  // ── Chọn user từ kết quả search ──────────────────────────────────────────
  const handleSelectUser = useCallback(
    async (user) => {
      setSearch("");
      setSearchResults([]);

      // Nếu đã có conversation thì mở thẳng
      if (user.conversation_id) {
        const existing = conversations.find(
          (c) => c.conversation_id === user.conversation_id
        );
        if (existing) {
          handleSelectConv(existing);
          return;
        }
        // Conversation tồn tại trong DB nhưng chưa load vào state → load lại
        await loadConversations();
        // Tìm lại sau khi load
        setSelected((prev) => prev); // trigger re-render, handleSelectConv sẽ được gọi bởi useEffect bên dưới
        // Tạo một object tạm để mở chat ngay
        const tmpConv = {
          conversation_id: user.conversation_id,
          other_user: {
            user_id: user.user_id,
            full_name: user.full_name,
            avatar: user.avatar,
            role: user.role,
          },
          last_message: "",
          last_message_time: null,
          unread_count: 0,
        };
        handleSelectConv(tmpConv);
        return;
      }

      // Chưa có conversation → tạo mới qua ensureAdminConversation
      try {
        // Dùng ensureAdminConversation với user_id của người dùng được chọn
        const res = await adminChatService.ensureAdminConversation(user.user_id);
        const convData = res.data;
        const newConv = {
          ...convData,
          conversation_id: convData.conversation_id ?? convData.id,
          other_user: {
            user_id: user.user_id,
            full_name: user.full_name,
            avatar: user.avatar,
            role: user.role,
          },
          last_message: "",
          last_message_time: convData.last_message_time ?? new Date().toISOString(),
          unread_count: 0,
        };

        // Thêm vào danh sách nếu chưa có
        setConversations((prev) => {
          const exists = prev.some(
            (c) => c.conversation_id === newConv.conversation_id
          );
          return exists ? prev : [newConv, ...prev];
        });

        handleSelectConv(newConv);
      } catch (e) {
        alert("Không thể tạo cuộc trò chuyện: " + e.message);
      }
    },
    [conversations, handleSelectConv]
  );

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
        const fresh = (res.data || []).map((m) => ({
          ...m,
          message_id: m.message_id ?? m.id,
        }));
        setMessages((prev) => {
          const ids = new Set(prev.map((m) => m.message_id));
          const newMsgs = fresh.filter((m) => !ids.has(m.message_id));
          if (!newMsgs.length) return prev;
          return [...prev, ...newMsgs].sort(
            (a, b) => new Date(a.created_at) - new Date(b.created_at)
          );
        });
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

  // ── Send ──────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = input.trim();
    if (!text || !selected || sending) return;
    setSending(true);
    setInput("");

    const tmpId = `tmp_${Date.now()}`;
    setMessages((prev) =>
      [...prev, {
        message_id: tmpId,
        conversation_id: selected.conversation_id,
        sender_id: admin.user_id,
        sender_role: "admin",
        content: text,
        created_at: new Date().toISOString(),
        is_read: false,
      }].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    );

    try {
      const res = await adminChatService.sendAdminMessage(
        selected.conversation_id,
        text
      );
      const saved = { ...res.data, message_id: res.data?.message_id ?? res.data?.id };
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

  const totalUnread = conversations.reduce(
    (s, c) => s + (c.unread_count || 0),
    0
  );
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
        <button className={styles.retryBtn} onClick={loadConversations}>
          Thử lại
        </button>
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
        <button
          className={styles.refreshBtn}
          onClick={loadConversations}
          title="Làm mới"
        >
          ↻
        </button>
      </div>

      <div className={styles.layout}>
        {/* ── Sidebar ── */}
        <aside className={styles.sidebar}>
          {/* Search box */}
          <div className={styles.searchBox}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              className={styles.searchInput}
              placeholder="Tìm tên hoặc email người dùng..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                className={styles.searchClear}
                onClick={() => setSearch("")}
                title="Xóa tìm kiếm"
              >
                ✕
              </button>
            )}
          </div>

          <div className={styles.convList}>
            {/* ── MODE: đang tìm kiếm ── */}
            {isSearchMode ? (
              searching ? (
                <div className={styles.searchingIndicator}>
                  <div className={styles.spinnerSm} />
                  <span>Đang tìm...</span>
                </div>
              ) : searchResults.length === 0 ? (
                <div className={styles.emptyConv}>
                  <span>🔍</span>
                  <p>Không tìm thấy người dùng nào</p>
                </div>
              ) : (
                <>
                  <div className={styles.sectionLabel}>
                    {searchResults.length} kết quả
                  </div>
                  {searchResults.map((user) => (
                    <UserSearchItem
                      key={user.user_id}
                      user={user}
                      isActive={
                        selected?.other_user?.user_id === user.user_id
                      }
                      onClick={() => handleSelectUser(user)}
                    />
                  ))}
                </>
              )
            ) : (
              /* ── MODE: danh sách conversations ── */
              conversations.length === 0 ? (
                <div className={styles.emptyConv}>
                  <span>💬</span>
                  <p>Chưa có cuộc trò chuyện nào</p>
                  <p className={styles.emptyConvHint}>
                    Tìm kiếm người dùng để bắt đầu chat
                  </p>
                </div>
              ) : (
                <>
                  <div className={styles.sectionLabel}>Cuộc trò chuyện</div>
                  {conversations.map((conv) => (
                    <ConversationItem
                      key={conv.conversation_id}
                      conv={conv}
                      isActive={
                        selected?.conversation_id === conv.conversation_id
                      }
                      onClick={() => handleSelectConv(conv)}
                    />
                  ))}
                </>
              )
            )}
          </div>
        </aside>

        {/* ── Chat area ── */}
        <main className={styles.chatArea}>
          {!selected ? (
            <div className={styles.emptyChat}>
              <div className={styles.emptyChatIcon}>💬</div>
              <h3>Chọn một cuộc trò chuyện</h3>
              <p>Hoặc tìm kiếm người dùng để bắt đầu nhắn tin</p>
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
                      <span
                        className={`${styles.chatRoleBadge} ${roleBadgeClass(
                          selected.other_user?.role
                        )}`}
                      >
                        {roleLabel(selected.other_user?.role)}
                      </span>
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
                    <p className={styles.emptyMessagesSub}>
                      Hãy gửi tin nhắn đầu tiên
                    </p>
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
                          isOwn={
                            msg.sender_role === "admin" ||
                            msg.sender_id === admin?.user_id
                          }
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
