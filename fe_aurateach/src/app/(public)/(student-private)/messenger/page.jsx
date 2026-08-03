"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/users/Header.jsx";
import StudentSidebar from "@/components/users/StudentSidebar.jsx";
import ConversationList from "./_components/ConversationList";
import ChatWindow from "./_components/ChatWindow";
import WelcomeBanner from "./_components/WelcomeBanner";
import { authService } from "@/services/authService";
import styles from "./page.module.css";

const API_BASE = "http://localhost:3007";

function MessengerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationIdFromUrl = searchParams.get('conversationId');
  
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const pollingRef = useRef(null);
  const isInitialLoadRef = useRef(true);
  const isSendingRef = useRef(false);
  const isPollingActiveRef = useRef(false);
  const hasUrlBeenHandledRef = useRef(false);
  const lastMessageCountRef = useRef(0);

  useEffect(() => {
    const initPage = async () => {
      try {
        console.log("🚀 START INIT MESSENGER");
        const currentUser = await authService.getCurrentUser();
        console.log("👤 Current user:", currentUser);
        
        if (!currentUser) {
          router.push("/login");
          return;
        }
        setUser(currentUser);
        
        const userId = currentUser.user_id || currentUser.id;
        console.log("📡 User ID:", userId);
        
        if (!userId) {
          console.error("❌ Không tìm thấy user_id trong cookie");
          setError("Không tìm thấy thông tin người dùng");
          setLoading(false);
          return;
        }
        
        await fetchConversations(userId);
      } catch (error) {
        console.error("❌ Lỗi tải messenger:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    initPage();

    return () => {
      if (pollingRef.current) {
        console.log("🧹 Cleanup: Stop polling");
        clearInterval(pollingRef.current);
        pollingRef.current = null;
        isPollingActiveRef.current = false;
      }
    };
  }, [router]);

  useEffect(() => {
    if (conversations.length > 0 && conversationIdFromUrl) {
      const targetConv = conversations.find(c => c.id === conversationIdFromUrl);
      if (targetConv) {
        console.log("📌 Selecting conversation from URL:", targetConv);
        hasUrlBeenHandledRef.current = true;
        handleSelectConversation(targetConv);
      }
    }
  }, [conversations, conversationIdFromUrl]);

  const fetchConversations = async (userId) => {
    try {
      console.log(`📡 Fetching conversations for: ${userId}`);
      const res = await fetch(`${API_BASE}/conversations`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const allConversations = await res.json();
      if (!Array.isArray(allConversations)) {
        setConversations([]);
        return;
      }
      const tutorsRes = await fetch(`${API_BASE}/tutors`);
      const allTutors = await tutorsRes.json();
      const tutorToUserMap = {};
      const userToTutorMap = {};
      if (Array.isArray(allTutors)) {
        allTutors.forEach(t => {
          if (t.tutor_id && t.user_id) {
            tutorToUserMap[t.tutor_id] = t.user_id;
            userToTutorMap[t.user_id] = t.tutor_id;
          }
        });
      }
      const myIds = [userId];
      if (userToTutorMap[userId]) {
        myIds.push(userToTutorMap[userId]);
      }
      const userConversations = allConversations.filter(conv => {
        if (!conv.participants) return false;
        return conv.participants.some(p => myIds.includes(p));
      });
      if (userConversations.length === 0) {
        setConversations([]);
        setUnreadCount(0);
        return;
      }
      const totalUnread = userConversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
      setUnreadCount(totalUnread);
      const convWithUsers = await Promise.all(
        userConversations.map(async (conv) => {
          const otherParticipantId = conv.participants.find(p => !myIds.includes(p));
          let lookupUserId = otherParticipantId;
          if (tutorToUserMap[otherParticipantId]) {
            lookupUserId = tutorToUserMap[otherParticipantId];
          }
          try {
            const userRes = await fetch(`${API_BASE}/users?user_id=${lookupUserId}`);
            const users = await userRes.json();
            const otherUser = users[0] || { 
              full_name: "Người dùng", 
              avatar: "/img/default-avatar.svg",
              role: "tutor"
            };
            return { ...conv, other_user: otherUser, other_user_id: lookupUserId };
          } catch (err) {
            return {
              ...conv,
              other_user: { full_name: "Người dùng", avatar: "/img/default-avatar.svg", role: "tutor" },
              other_user_id: lookupUserId,
            };
          }
        })
      );
      setConversations(convWithUsers);
    } catch (error) {
      setConversations([]);
    }
  };

  const saveMessagesToLocal = (conversationId, msgs) => {
    try {
      localStorage.setItem(`messages_${conversationId}`, JSON.stringify(msgs));
    } catch (e) {
      console.warn("⚠️ Cannot save to localStorage:", e);
    }
  };

  const loadMessagesFromLocal = (conversationId) => {
    try {
      const saved = localStorage.getItem(`messages_${conversationId}`);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  };

  const fetchMessages = async (conversationId, resetOffset = true) => {
    let messagesToUse = null;
    try {
      const res = await fetch(
        `${API_BASE}/messages?conversation_id=${conversationId}&_sort=created_at&_order=asc`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        messagesToUse = data;
        saveMessagesToLocal(conversationId, data);
        lastMessageCountRef.current = data.length;
      }
    } catch (error) {
      console.error("❌ Lỗi lấy tin nhắn:", error);
    }
    if (!messagesToUse || messagesToUse.length === 0) {
      const localMessages = loadMessagesFromLocal(conversationId);
      if (localMessages && localMessages.length > 0) {
        messagesToUse = localMessages;
      }
    }
    if (messagesToUse && messagesToUse.length > 0) {
      if (resetOffset) {
        setMessages(messagesToUse);
        setOffset(messagesToUse.length);
        isInitialLoadRef.current = true;
      } else {
        setMessages(prev => [...prev, ...messagesToUse]);
        setOffset(prev => prev + messagesToUse.length);
      }
      setHasMore(false);
    } else {
      if (resetOffset) {
        setMessages([]);
        setOffset(0);
        isInitialLoadRef.current = true;
      }
      setHasMore(false);
    }
  };

  const loadMoreMessages = useCallback(async () => {
    if (!selectedConversation || !hasMore) return;
    await fetchMessages(selectedConversation.id, false);
  }, [selectedConversation, hasMore]);

  const sendMessage = async (content) => {
    if (!selectedConversation || !user) return;
    if (isSendingRef.current) return;
    const isFile = typeof content === 'object' && content.file_data;
    if (!isFile && !content.trim()) return;
    isSendingRef.current = true;
    setSending(true);
    try {
      const senderId = user.user_id || user.id;
      const receiverId = selectedConversation.other_user_id;
      const newMessage = {
        id: isFile ? content.id : `msg_${Date.now()}`,
        conversation_id: selectedConversation.id,
        sender_id: senderId,
        sender_role: user.role || "student",
        receiver_id: receiverId,
        receiver_role: selectedConversation.other_user?.role || "tutor",
        content: isFile ? `[${content.file_type.startsWith('image') ? 'Hình ảnh' : content.file_type.startsWith('video') ? 'Video' : 'File'}] ${content.file_name}` : content.trim(),
        created_at: new Date().toISOString(),
        is_read: false,
        ...(isFile ? {
          file_name: content.file_name,
          file_type: content.file_type,
          file_size: content.file_size,
          file_data: content.file_data,
        } : {}),
      };
      setMessages(prev => {
        const updated = [...prev, newMessage];
        saveMessagesToLocal(selectedConversation.id, updated);
        return updated;
      });
      const res = await fetch(`${API_BASE}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMessage),
      });
      if (res.ok) {
        const savedMsg = await res.json();
        setMessages(prev => {
          const updated = prev.map(m => m.id === newMessage.id ? savedMsg : m);
          saveMessagesToLocal(selectedConversation.id, updated);
          return updated;
        });
        await fetch(`${API_BASE}/conversations/${selectedConversation.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            last_message: isFile ? `📎 ${content.file_name}` : content.trim(),
            last_message_time: new Date().toISOString(),
            unread_count: 1,
          }),
        });
      }
    } catch (error) {
      alert("Không thể gửi tin nhắn. Vui lòng thử lại.");
    } finally {
      setSending(false);
      isSendingRef.current = false;
    }
  };

  const handleSelectConversation = async (conversation) => {
    setSelectedConversation(conversation);
    setOffset(0);
    setHasMore(true);
    setMessages([]);
    isInitialLoadRef.current = true;
    lastMessageCountRef.current = 0;
    await markAsRead(conversation.id);
    await fetchMessages(conversation.id, true);
  };

  const markAsRead = async (conversationId) => {
    try {
      await fetch(`${API_BASE}/conversations/${conversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unread_count: 0 }),
      });
      setConversations(prev => prev.map(conv => conv.id === conversationId ? { ...conv, unread_count: 0 } : conv));
      const conv = conversations.find(c => c.id === conversationId);
      if (conv) {
        setUnreadCount(prev => Math.max(0, prev - (conv.unread_count || 0)));
      }
    } catch (error) {
      console.error("❌ Lỗi đánh dấu đã đọc:", error);
    }
  };

  useEffect(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
      isPollingActiveRef.current = false;
    }
    if (!selectedConversation) return;
    isPollingActiveRef.current = true;
    const fetchNewMessages = async () => {
      if (!isPollingActiveRef.current) return;
      try {
        const res = await fetch(
          `${API_BASE}/messages?conversation_id=${selectedConversation.id}&_sort=created_at&_order=asc`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data.length === 0) return;
        setMessages(prev => {
          const currentIds = prev.map(m => m.id);
          const newMessages = data.filter(m => !currentIds.includes(m.id));
          if (newMessages.length > 0) {
            return [...prev, ...newMessages].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          }
          if (prev.length === 0 && data.length > 0) return data;
          return prev;
        });
        if (data.length > 0) {
          const latestMsg = data[data.length - 1];
          setConversations(prev => prev.map(c => c.id === selectedConversation.id ? { ...c, last_message: latestMsg.content, last_message_time: latestMsg.created_at } : c));
        }
      } catch (error) {
        console.error("❌ Polling error:", error);
      }
    };
    fetchNewMessages();
    pollingRef.current = setInterval(fetchNewMessages, 3000);
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
        isPollingActiveRef.current = false;
      }
    };
  }, [selectedConversation]);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
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
      <div className={styles.container}>
        <StudentSidebar 
          studentId={user?.user_id || user?.id}
          unreadCount={unreadCount}
        />
        <div className={styles.messengerContainer}>
          <div className={styles.messengerWrapper}>
            <div className={styles.conversationListWrapper}>
              <ConversationList
                conversations={conversations}
                selectedId={selectedConversation?.id}
                onSelect={handleSelectConversation}
                currentUserId={user?.user_id || user?.id}
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
                  userName={user?.full_name?.split(' ').pop() || "bạn"}
                  unreadCount={unreadCount}
                  conversationCount={conversations.length}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MessengerPage() {
  return (
    <>
      <Header />
      <Suspense fallback={<div className={styles.loadingContainer}><div className={styles.loadingSpinner}></div><p>Đang tải...</p></div>}>
        <MessengerContent />
      </Suspense>
    </>
  );
}