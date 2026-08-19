"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/users/Header.jsx";
import StudentSidebar from "@/components/users/StudentSidebar.jsx";
import ConversationList from "./_components/ConversationList";
import ChatWindow from "./_components/ChatWindow";
import WelcomeBanner from "./_components/WelcomeBanner";
import { authService } from "@/services/authService";
import { userService } from "@/services/userService";
import { tutorService } from "@/services/tutorService";
import { conversationService } from "@/services/conversationService";
import { messageService } from "@/services/messageService";
import { uploadService } from "@/services/uploadService";
import styles from "./page.module.css";

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
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const pollingRef = useRef(null);
  const isInitialLoadRef = useRef(true);
  const isSendingRef = useRef(false);
  const isPollingActiveRef = useRef(false);
  const hasUrlBeenHandledRef = useRef(false);

  // 🛠️ Lưu trữ cache local an toàn
  const saveMessagesToLocal = useCallback((conversationId, msgs) => {
    try {
      localStorage.setItem(`messages_${conversationId}`, JSON.stringify(msgs));
    } catch (e) {
      console.warn("⚠️ Cannot save to localStorage:", e);
    }
  }, []);

  const loadMessagesFromLocal = useCallback((conversationId) => {
    try {
      const saved = localStorage.getItem(`messages_${conversationId}`);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  }, []);

  // 🚀 Khởi tạo dữ liệu người dùng & danh sách hội thoại
  useEffect(() => {
    const initPage = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        if (!currentUser) {
          router.push("/login");
          return;
        }

        setUser(currentUser);
        const userId = currentUser.user_id || currentUser.id || currentUser._id;
        
        if (!userId) {
          setError("Không tìm thấy thông tin định danh người dùng (userId trống)");
          return;
        }
        
        await fetchConversations(userId);
      } catch (err) {
        console.error("❌ Lỗi ngoại lệ:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    initPage();
  }, [router]);

  const fetchConversations = async (userId) => {
    if (!userId) return;
    
    try {
      const [allConversations, allTutors] = await Promise.all([
        conversationService.getConversations(userId),
        tutorService.getTutors()
      ]);

      const convList = Array.isArray(allConversations) ? allConversations : (allConversations?.data || []);
      if (convList.length === 0) {
        setConversations([]);
        setUnreadCount(0);
        return;
      }

      const tutorsList = Array.isArray(allTutors) ? allTutors : (allTutors?.data || []);
      const tutorToUserMap = {};
      tutorsList.forEach(t => {
        const tId = t.tutor_id || t.id;
        const uId = t.user_id || t.account_id;
        if (tId && uId) {
          tutorToUserMap[tId] = uId;
          tutorToUserMap[String(tId)] = uId;
        }
      });

      setUnreadCount(convList.reduce((sum, conv) => sum + (conv.unread_count || 0), 0));

      const convWithUsers = await Promise.all(
        convList.map(async (conv) => {
          const participants = conv.users || conv.participants || [];
          let otherParticipant = participants.find(p => {
            const pId = (typeof p === 'object' && p !== null) ? (p.user_id || p.id || p._id) : p;
            return String(pId) !== String(userId);
          }) || participants[0];

          let rawOtherId = (typeof otherParticipant === 'object' && otherParticipant !== null) 
            ? (otherParticipant.user_id || otherParticipant.id || otherParticipant._id) 
            : otherParticipant;

          let lookupUserId = tutorToUserMap[rawOtherId] || tutorToUserMap[String(rawOtherId)] || rawOtherId;

          let otherUser = typeof otherParticipant === 'object' && otherParticipant !== null ? otherParticipant : null;
          if (!otherUser) {
            try {
              let userRes = await userService.getUsers({ user_id: lookupUserId });
              let users = Array.isArray(userRes) ? userRes : (userRes?.data || []);
              otherUser = users[0];
            } catch (err) {
              console.error(`❌ Lỗi fetch user:`, err);
            }
          }

          return { 
            ...conv, 
            other_user: otherUser || { full_name: "Gia sư", avatar: "/img/default-avatar.svg", role: "tutor" }, 
            other_user_id: lookupUserId 
          };
        })
      );
      
      setConversations(convWithUsers);
    } catch (error) {
      console.error("❌ Lỗi lấy danh sách hội thoại:", error);
      setConversations([]);
    }
  };

  // 🔗 Xử lý điều hướng mở sẵn conversation từ URL params
  useEffect(() => {
    if (conversations.length > 0 && conversationIdFromUrl && !hasUrlBeenHandledRef.current) {
      const targetConv = conversations.find(c => (c.conversation_id || c.id) === conversationIdFromUrl);
      if (targetConv) {
        hasUrlBeenHandledRef.current = true;
        handleSelectConversation(targetConv);
      }
    }
  }, [conversations, conversationIdFromUrl]);

  const fetchMessages = async (conversationId) => {
    if (!conversationId) return;
    try {
      const data = await messageService.getMessages(conversationId);
      const msgList = Array.isArray(data) ? data : (data?.data || []);
      if (msgList.length > 0) {
        setMessages(msgList);
        saveMessagesToLocal(conversationId, msgList);
      } else {
        const localMessages = loadMessagesFromLocal(conversationId);
        setMessages(localMessages || []);
      }
    } catch (error) {
      console.error("❌ Lỗi lấy tin nhắn:", error);
      setMessages(loadMessagesFromLocal(conversationId) || []);
    }
  };

  // 📤 Gửi tin nhắn hoặc tệp tin tối ưu
  const sendMessage = async (content) => {
    const isFile = content !== null && typeof content === 'object';
    if (!isFile && (!content || !content.trim())) return;
    if (isFile && !content.name && !content.rawFile) return;
    if (!selectedConversation || !user || isSendingRef.current) return;

    const convId = selectedConversation.conversation_id || selectedConversation.id;
    if (!convId || convId === 'undefined') return;

    isSendingRef.current = true;
    setSending(true);

    const senderId = user.user_id || user.id;
    const receiverId = selectedConversation.other_user_id;

    try {
      let messageContentText = "";
      let finalFileUrl = null;

      if (isFile) {
        // 🚀 Sử dụng trực tiếp rawFile hoặc tạo lại từ dữ liệu an toàn
        const fileToUpload = content.rawFile || new File([content.rawFile], content.name, { type: content.type });

        const uploadRes = await uploadService.uploadFile(fileToUpload, "chat");
        if (!uploadRes?.url) throw new Error("Không nhận được URL từ server upload");

        finalFileUrl = uploadRes.url;
        messageContentText = finalFileUrl; 
      } else {
        messageContentText = content.trim();
      }

      const tempMessageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const nowTime = new Date().toISOString();

      const newMessage = {
        message_id: tempMessageId,
        id: tempMessageId,
        conversation_id: convId,
        sender_id: senderId,
        sender_role: user.role || "student",
        receiver_id: receiverId,
        receiver_role: selectedConversation.other_user?.role || "tutor",
        content: messageContentText,
        created_at: nowTime,
        is_read: true,
      };

      // 1. Cập nhật UI ngay lập tức
      setMessages(prev => {
        const updated = [...prev, newMessage];
        saveMessagesToLocal(convId, updated);
        return updated;
      });

      // 2. Gửi API ngầm lên Database
      const savedMsgRes = await messageService.sendMessage(newMessage);
      const savedMsg = savedMsgRes?.data || savedMsgRes;

      if (savedMsg) {
        setMessages(prev => {
          const updated = prev.map(m => (m.message_id === tempMessageId || m.id === tempMessageId) ? savedMsg : m);
          saveMessagesToLocal(convId, updated);
          return updated;
        });
      }

      // 3. Cập nhật thông tin đoạn hội thoại
      const previewText = isFile ? "[Hình ảnh]" : messageContentText;
        await messageService.updateConversation(convId, {
          last_message: previewText,
          last_message_time: nowTime,
          increment_unread_for: receiverId, // 👈 Báo backend tăng unread cho người nhận
        });

        setConversations(prev => prev.map(c => {
          if ((c.conversation_id || c.id) === convId) {
            return { ...c, last_message: previewText, last_message_time: nowTime };
          }
          return c;
        }));

    } catch (error) {
      console.error("❌ Lỗi gửi tin nhắn/file trên production:", error);
      alert("Gửi tin nhắn hoặc file thất bại, vui lòng kiểm tra lại kết nối!");
    } finally {
      setSending(false);
      isSendingRef.current = false;
    }
  };

  const markAsRead = async (conversationId) => {
    try {
      if (!conversationId || conversationId === 'undefined') return;
      await messageService.updateConversation(conversationId, { unread_count: 0 });
      setConversations(prev => prev.map(conv => ((conv.conversation_id || conv.id) === conversationId) ? { ...conv, unread_count: 0 } : conv));
      
      const conv = conversations.find(c => (c.conversation_id || c.id) === conversationId);
      if (conv) {
        setUnreadCount(prev => Math.max(0, prev - (conv.unread_count || 0)));
      }
    } catch (error) {
      console.error("❌ Lỗi đánh dấu đã đọc:", error);
    }
  };

  const handleSelectConversation = async (conversation) => {
    const convId = conversation.conversation_id || conversation.id;
    setSelectedConversation(conversation);
    setMessages([]);
    isInitialLoadRef.current = true;

    if (convId && convId !== 'undefined') {
      await markAsRead(convId);
      await fetchMessages(convId);
    }
  };

  // 🔄 Polling đồng bộ tin nhắn ngầm (đã tối ưu cleanup)
  useEffect(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (!selectedConversation) return;

    const convId = selectedConversation.conversation_id || selectedConversation.id;
    if (!convId || convId === 'undefined') return;

    isPollingActiveRef.current = true;
    const fetchNewMessages = async () => {
      if (!isPollingActiveRef.current) return;
      try {
        const data = await messageService.getMessages(convId);
        const msgList = Array.isArray(data) ? data : (data?.data || []);
        if (msgList.length === 0) return;

        setMessages(prev => {
          const currentIds = new Set(prev.map(m => m.id || m.message_id));
          const newMessages = msgList.filter(m => !currentIds.has(m.id || m.message_id));
          if (newMessages.length > 0) {
            const updated = [...prev, ...newMessages].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            saveMessagesToLocal(convId, updated);
            return updated;
          }
          return prev;
        });
      } catch (error) {
        console.error("❌ [POLLING ERROR]:", error);
      }
    };

    pollingRef.current = setInterval(fetchNewMessages, 3000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      isPollingActiveRef.current = false;
    };
  }, [selectedConversation, saveMessagesToLocal]);

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
                selectedId={selectedConversation?.conversation_id || selectedConversation?.id}
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
                  onLoadMore={() => {}}
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