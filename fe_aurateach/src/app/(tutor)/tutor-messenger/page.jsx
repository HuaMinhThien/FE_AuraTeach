"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import ConversationList from "@/app/(public)/(student-private)/messenger/_components/ConversationList";
import ChatWindow from "@/app/(public)/(student-private)/messenger/_components/ChatWindow";
import WelcomeBanner from "@/app/(public)/(student-private)/messenger/_components/WelcomeBanner";
import authService from "@/services/authService";
import adminChatService from "@/services/adminChatService";
import styles from "./page.module.css";

const POLL_INTERVAL = 3000;

// Chuẩn hóa conversation từ Laravel API về shape mà ConversationList / ChatWindow mong đợi
function normalizeConversation(conv, currentUserId) {
  const otherUser =
    conv.other_user ||
    (Array.isArray(conv.users)
      ? conv.users.find((u) => u.user_id !== currentUserId)
      : null);

  return {
    id: conv.conversation_id ?? conv.id,
    conversation_id: conv.conversation_id ?? conv.id,
    type: conv.type ?? "private",
    last_message: conv.last_message ?? "",
    last_message_time: conv.last_message_time ?? null,
    unread_count: conv.unread_count ?? 0,
    other_user: otherUser
      ? {
          user_id: otherUser.user_id ?? otherUser.id,
          full_name: otherUser.full_name ?? "Người dùng",
          avatar: otherUser.avatar ?? null,
          role: otherUser.role ?? "student",
        }
      : { full_name: "AuraTeach Admin", avatar: null, role: "admin" },
    other_user_id: otherUser?.user_id ?? otherUser?.id ?? null,
    is_admin_conv: conv.type === "admin_support",
  };
}

// Admin conversation luôn đứng đầu, còn lại theo last_message_time giảm dần
function sortConversations(convs) {
  return [...convs].sort((a, b) => {
    if (a.is_admin_conv && !b.is_admin_conv) return -1;
    if (!a.is_admin_conv && b.is_admin_conv) return 1;
    const ta = a.last_message_time ? new Date(a.last_message_time).getTime() : 0;
    const tb = b.last_message_time ? new Date(b.last_message_time).getTime() : 0;
    return tb - ta;
  });
}

export default function TutorMessengerPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [hasMore] = useState(false);
  const [error, setError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const pollingRef = useRef(null);
  const isPollingActiveRef = useRef(false);
  const isSendingRef = useRef(false);
  const isInitialLoadRef = useRef(true);
  const isFetchingMsgsRef = useRef(false);

  // ── Init ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        if (!currentUser) { router.push("/login"); return; }
        setUser(currentUser);

        const userId = currentUser.user_id ?? currentUser.id;
        if (!userId) {
          setError("Không tìm thấy thông tin người dùng");
          setLoading(false);
          return;
        }

        await loadConversations(userId);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    init();

    return () => stopPolling();
  }, [router]);

  // ── Load conversations ───────────────────────────────────────────────────
  const loadConversations = async (userId) => {
    try {
      // 1. Lấy/tạo conversation với admin
      let adminConv = null;
      try {
        const adminRes = await adminChatService.ensureAdminConversation(userId);
        if (adminRes?.data) adminConv = normalizeConversation(adminRes.data, userId);
      } catch (e) {
        console.warn("Không thể tạo/lấy conversation admin:", e.message);
      }

      // 2. Lấy toàn bộ conversations của user
      let allConvs = [];
      try {
        const res = await adminChatService.getUserConversations(userId);
        const raw = res?.data ?? [];
        allConvs = raw.map((c) => normalizeConversation(c, userId));
      } catch (e) {
        console.warn("Lỗi lấy conversations:", e.message);
      }

      // 3. Merge, tránh duplicate
      if (adminConv) {
        const exists = allConvs.some(
          (c) => c.conversation_id === adminConv.conversation_id
        );
        if (!exists) allConvs.unshift(adminConv);
        else {
          allConvs = allConvs.map((c) =>
            c.conversation_id === adminConv.conversation_id ? { ...c, ...adminConv } : c
          );
        }
      }

      const sorted = sortConversations(allConvs);
      setConversations(sorted);

      const total = sorted.reduce((s, c) => s + (c.unread_count || 0), 0);
      setUnreadCount(total);
    } catch (err) {
      console.error("loadConversations error:", err);
    }
  };

  // ── Messages ─────────────────────────────────────────────────────────────
  const fetchMessages = async (conversationId) => {
    if (isFetchingMsgsRef.current) return;
    isFetchingMsgsRef.current = true;
    try {
      const data = await adminChatService.getMessagesByConversation(conversationId);
      const msgs = Array.isArray(data) ? data : (data?.data ?? []);
      setMessages(msgs);
      isInitialLoadRef.current = true;
    } catch (e) {
      console.error("fetchMessages error:", e);
      setMessages([]);
    } finally {
      isFetchingMsgsRef.current = false;
    }
  };

  // ── Select ───────────────────────────────────────────────────────────────
  const handleSelectConversation = useCallback(async (conversation) => {
    stopPolling();
    setSelectedConversation(conversation);
    setMessages([]);
    isInitialLoadRef.current = true;

    setConversations((prev) =>
      prev.map((c) =>
        c.conversation_id === conversation.conversation_id
          ? { ...c, unread_count: 0 }
          : c
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - (conversation.unread_count || 0)));

    await fetchMessages(conversation.conversation_id);

    try {
      const uid = user?.user_id ?? user?.id;
      if (uid) {
        await adminChatService.updateConversation(conversation.conversation_id, {
          unread_count: 0,
          user_id: uid,
        });
      }
    } catch (_) {}

    startPolling(conversation.conversation_id);
  }, [user]);

  // ── Polling ──────────────────────────────────────────────────────────────
  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    isPollingActiveRef.current = false;
  };

  const startPolling = (conversationId) => {
    isPollingActiveRef.current = true;
    pollingRef.current = setInterval(async () => {
      if (!isPollingActiveRef.current) return;
      try {
        const data = await adminChatService.getMessagesByConversation(conversationId);
        const fresh = Array.isArray(data) ? data : (data?.data ?? []);
        setMessages((prev) => {
          const ids = new Set(prev.map((m) => m.message_id ?? m.id));
          const newMsgs = fresh.filter((m) => !ids.has(m.message_id ?? m.id));
          if (!newMsgs.length) return prev;
          return [...prev, ...newMsgs];
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

  // ── Send ─────────────────────────────────────────────────────────────────
  const sendMessage = async (content) => {
    if (!selectedConversation || !user || isSendingRef.current) return;
    if (typeof content !== "string" || !content.trim()) return;

    isSendingRef.current = true;
    setSending(true);

    const senderId = user.user_id ?? user.id;
    const receiverId = selectedConversation.other_user_id;
    const now = new Date().toISOString();
    const tmpId = `tmp_${Date.now()}`;

    const tmpMsg = {
      message_id: tmpId,
      id: tmpId,
      conversation_id: selectedConversation.conversation_id,
      sender_id: senderId,
      sender_role: user.role ?? "tutor",
      receiver_id: receiverId,
      receiver_role: selectedConversation.other_user?.role ?? "admin",
      content: content.trim(),
      created_at: now,
      is_read: false,
    };

    setMessages((prev) => [...prev, tmpMsg]);

    try {
      const saved = await adminChatService.sendUserMessage({
        conversation_id: selectedConversation.conversation_id,
        sender_id: senderId,
        sender_role: user.role ?? "tutor",
        receiver_id: receiverId,
        receiver_role: selectedConversation.other_user?.role ?? "admin",
        content: content.trim(),
        created_at: now,
        is_read: false,
      });

      const savedMsg = saved?.data ?? saved;
      setMessages((prev) =>
        prev.map((m) =>
          m.message_id === tmpId || m.id === tmpId
            ? { ...savedMsg, message_id: savedMsg.message_id ?? savedMsg.id }
            : m
        )
      );

      try {
        await adminChatService.updateConversation(selectedConversation.conversation_id, {
          last_message: content.trim(),
          last_message_time: now,
          increment_unread_for: receiverId,
        });
      } catch (_) {}

      setConversations((prev) =>
        prev.map((c) =>
          c.conversation_id === selectedConversation.conversation_id
            ? { ...c, last_message: content.trim(), last_message_time: now }
            : c
        )
      );
    } catch (e) {
      setMessages((prev) =>
        prev.filter((m) => m.message_id !== tmpId && m.id !== tmpId)
      );
      alert("Không thể gửi tin nhắn. Vui lòng thử lại.");
    } finally {
      setSending(false);
      isSendingRef.current = false;
    }
  };

  const loadMoreMessages = useCallback(() => {}, []);

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner} />
        <p>Đang tải tin nhắn...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <p>❌ {error}</p>
        <button onClick={() => window.location.reload()}>Thử lại</button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.messengerContainer}>
        <div className={styles.messengerWrapper}>
          <div className={styles.conversationListWrapper}>
            <ConversationList
              conversations={conversations}
              selectedId={selectedConversation?.id ?? selectedConversation?.conversation_id}
              onSelect={handleSelectConversation}
              currentUserId={user?.user_id ?? user?.id}
            />
          </div>
          <div className={styles.chatWrapper}>
            {selectedConversation ? (
              <ChatWindow
                conversation={selectedConversation}
                messages={messages}
                currentUser={user}
                onSendMessage={sendMessage}
                onLoadMore={loadMoreMessages}
                hasMore={hasMore}
                sending={sending}
                isInitialLoad={isInitialLoadRef}
              />
            ) : (
              <WelcomeBanner
                userName={user?.full_name?.split(" ").pop() ?? "bạn"}
                unreadCount={unreadCount}
                conversationCount={conversations.length}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
