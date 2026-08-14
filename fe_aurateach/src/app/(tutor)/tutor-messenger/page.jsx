"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import ConversationList from "@/app/(public)/(student-private)/messenger/_components/ConversationList";
import ChatWindow from "@/app/(public)/(student-private)/messenger/_components/ChatWindow";
import WelcomeBanner from "@/app/(public)/(student-private)/messenger/_components/WelcomeBanner";
import { authService } from "@/services/authService";
import { conversationService } from "@/services/conversationService";
import { messageService } from "@/services/messageService";
import { tutorService } from "@/services/tutorService";
import { userService } from "@/services/userService";
import styles from "./page.module.css";

export default function TutorMessengerPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const pollingRef = useRef(null);
  const isInitialLoadRef = useRef(true);
  const isSendingRef = useRef(false);
  const isPollingActiveRef = useRef(false);
  const lastMessageCountRef = useRef(0);

  useEffect(() => {
    const initPage = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        if (!currentUser) {
          router.push("/login");
          return;
        }
        setUser(currentUser);
        
        const userId = currentUser.user_id || currentUser.id;
        if (!userId) {
          setError("Không tìm thấy mã định danh người dùng từ Database.");
          setLoading(false);
          return;
        }
        
        await fetchConversationsFromDB(userId);
      } catch (err) {
        console.error("❌ [DB ERROR] Lỗi khởi tạo:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    initPage();
    return () => stopPolling();
  }, [router]);

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
      isPollingActiveRef.current = false;
    }
  };

  const saveMessagesToLocal = (conversationId, msgs) => {
    try {
      localStorage.setItem(`tutor_messages_${conversationId}`, JSON.stringify(msgs));
    } catch (e) {
      console.warn("⚠️ Cannot save to localStorage:", e);
    }
  };

  const loadMessagesFromLocal = (conversationId) => {
    try {
      const saved = localStorage.getItem(`tutor_messages_${conversationId}`);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  };

  const fetchConversationsFromDB = async (userId) => {
    try {
      const rawRes = await conversationService.getConversations(userId);
      const convList = Array.isArray(rawRes) ? rawRes : (rawRes?.data || []);

      if (convList.length === 0) {
        setConversations([]);
        setUnreadCount(0);
        return;
      }

      const normalizedConvList = convList.map(conv => {
        let participantIds = conv.participants;
        if (!participantIds && Array.isArray(conv.users)) {
          participantIds = conv.users.map(u => u.user_id || u.id || u.tutor_id);
        }
        if (typeof participantIds === 'string') {
          try {
            participantIds = JSON.parse(participantIds);
          } catch (e) {
            participantIds = [];
          }
        }
        return {
          ...conv,
          id: conv.id || conv.conversation_id,
          participants: Array.isArray(participantIds) ? participantIds : []
        };
      });

      const allTutorsRes = await tutorService.getTutors();
      const tutorsList = Array.isArray(allTutorsRes) ? allTutorsRes : (allTutorsRes?.data || []);
      
      const tutorToUserMap = {};
      const userToTutorMap = {};
      tutorsList.forEach(t => {
        if (t.tutor_id && t.user_id) {
          tutorToUserMap[t.tutor_id] = t.user_id;
          userToTutorMap[t.user_id] = t.tutor_id;
        }
      });

      const myIds = [userId];
      if (userToTutorMap[userId]) myIds.push(userToTutorMap[userId]);

      const userConversations = normalizedConvList.filter(conv => conv.participants.some(p => myIds.includes(p)));
      const totalUnread = userConversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
      setUnreadCount(totalUnread);

      const convWithUsers = await Promise.all(
        userConversations.map(async (conv) => {
          const otherParticipantId = conv.participants.find(p => !myIds.includes(p));
          let lookupUserId = tutorToUserMap[otherParticipantId] || otherParticipantId;
          
          try {
            const usersRes = await userService.getUsers();
            const users = Array.isArray(usersRes) ? usersRes : (usersRes?.data || []);
            let matchedUser = users.find(u => (u.user_id === lookupUserId || u.id === lookupUserId));
            
            if (!matchedUser && Array.isArray(conv.users)) {
              matchedUser = conv.users.find(u => (u.user_id === lookupUserId || u.id === lookupUserId || u.tutor_id === lookupUserId));
            }

            const otherUser = matchedUser || { 
              full_name: "Học viên", 
              avatar: "/img/default-avatar.svg",
              role: "student"
            };
            
            return { ...conv, other_user: otherUser, other_user_id: lookupUserId };
          } catch {
            return {
              ...conv,
              other_user: { full_name: "Học viên", avatar: "/img/default-avatar.svg", role: "student" },
              other_user_id: lookupUserId,
            };
          }
        })
      );
      
      setConversations(convWithUsers);
    } catch (error) {
      console.error("❌ [DB ERROR] Lỗi khi truy vấn conversations từ DB:", error);
      setConversations([]);
    }
  };

  const fetchMessagesFromDB = async (conversationId, resetOffset = true) => {
    if (!conversationId) return;
    
    let messagesToUse = null;
    try {
      const data = await messageService.getMessages(conversationId);
      const msgList = Array.isArray(data) ? data : (data?.data || []);
      if (msgList && msgList.length > 0) {
        messagesToUse = msgList;
        saveMessagesToLocal(conversationId, msgList);
        lastMessageCountRef.current = msgList.length;
      }
    } catch (error) {
      console.error("❌ [DB ERROR] Lỗi lấy tin nhắn từ API:", error);
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
      } else {
        setMessages(prev => [...prev, ...messagesToUse]);
      }
    } else {
      if (resetOffset) setMessages([]);
    }
    setHasMore(false);
  };

  // 🚀 TỐI ƯU HÓA: Gửi tin nhắn và file trực tiếp dưới dạng URL Cloudinary vào content
  const sendMessage = async (content) => {
    if (!selectedConversation || !user || isSendingRef.current) return;
    
    const isFile = typeof content === 'object' && content.file_data;
    if (!isFile && (!content || !content.trim())) return;

    isSendingRef.current = true;
    setSending(true);
    
    try {
      const senderId = user.user_id || user.id;
      const receiverId = selectedConversation.other_user_id;
      const convId = selectedConversation.id || selectedConversation.conversation_id;
      const nowTime = new Date().toISOString();
      
      // 🛠️ QUAN TRỌNG: Nếu là file (ảnh/video), lưu trực tiếp URL vào content để FE tự động nhận diện hiển thị
      const messageContentText = isFile ? content.file_data : content.trim();
      const tempMessageId = isFile ? content.id : `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      const newMessage = {
        message_id: tempMessageId,
        id: tempMessageId,
        conversation_id: convId,
        sender_id: senderId,
        sender_role: user.role || "tutor",
        receiver_id: receiverId,
        receiver_role: selectedConversation.other_user?.role || "student",
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

      // 2. Gửi API ngầm lên Server
      const savedMsgRes = await messageService.sendMessage(newMessage);
      const savedMsg = savedMsgRes?.data || savedMsgRes;

      if (savedMsg) {
        setMessages(prev => {
          const updated = prev.map(m => (m.message_id === tempMessageId || m.id === tempMessageId) ? (savedMsg.data || savedMsg) : m);
          saveMessagesToLocal(convId, updated);
          return updated;
        });
      }

      // 3. Cập nhật trạng thái hội thoại
      const previewText = isFile ? "[Hình ảnh]" : messageContentText;
      await messageService.updateConversation(convId, {
        last_message: previewText,
        last_message_time: nowTime,
        unread_count: 0,
      });

      setConversations(prev => prev.map(c => {
        if ((c.id || c.conversation_id) === convId) {
          return { ...c, last_message: previewText, last_message_time: nowTime, unread_count: 0 };
        }
        return c;
      }));

    } catch (error) {
      console.error("❌ [DB ERROR] Lỗi gửi tin nhắn vào DB:", error);
    } finally {
      setSending(false);
      isSendingRef.current = false;
    }
  };

  const markAsRead = async (conversationId) => {
    try {
      if (!conversationId) return;
      await messageService.updateConversation(conversationId, { unread_count: 0 });
      setConversations(prev => prev.map(conv => ((conv.id || conv.conversation_id) === conversationId) ? { ...conv, unread_count: 0 } : conv));
      
      const conv = conversations.find(c => (c.id || c.conversation_id) === conversationId);
      if (conv) {
        setUnreadCount(prev => Math.max(0, prev - (conv.unread_count || 0)));
      }
    } catch (error) {
      console.error("❌ Lỗi đánh dấu đã đọc:", error);
    }
  };

  const handleSelectConversation = async (conversation) => {
    setSelectedConversation(conversation);
    setMessages([]);
    isInitialLoadRef.current = true;
    
    const convId = conversation.id || conversation.conversation_id;
    await markAsRead(convId);
    await fetchMessagesFromDB(convId, true);
  };

  // 🔄 Polling tự động làm mới tin nhắn ngầm mỗi 3 giây
  useEffect(() => {
    stopPolling();
    if (!selectedConversation) return;

    const convId = selectedConversation.id || selectedConversation.conversation_id;
    if (!convId) return;

    isPollingActiveRef.current = true;
    const fetchNewMessages = async () => {
      if (!isPollingActiveRef.current) return;
      try {
        const data = await messageService.getMessages(convId);
        const msgList = Array.isArray(data) ? data : (data?.data || []);
        if (!msgList || msgList.length === 0) return;

        setMessages(prev => {
          const currentIds = prev.map(m => m.id || m.message_id);
          const newMessages = msgList.filter(m => !currentIds.includes(m.id || m.message_id));
          if (newMessages.length > 0) {
            return [...prev, ...newMessages].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          }
          if (prev.length === 0 && msgList.length > 0) return msgList;
          return prev;
        });

        if (msgList.length > 0) {
          const latestMsg = msgList[msgList.length - 1];
          const isImg = latestMsg.content && latestMsg.content.includes('http');
          const previewText = isImg ? "[Hình ảnh]" : latestMsg.content;
          setConversations(prev => prev.map(c => ((c.id || c.conversation_id) === convId) ? { ...c, last_message: previewText, last_message_time: latestMsg.created_at } : c));
        }
      } catch (error) {
        console.error("❌ [POLLING ERROR] Lỗi khi fetch tin nhắn mới:", error);
      }
    };

    pollingRef.current = setInterval(fetchNewMessages, 3000);
    return () => stopPolling();
  }, [selectedConversation]);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Đang kết nối cơ sở dữ liệu và tải tin nhắn...</p>
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
              selectedId={selectedConversation?.id || selectedConversation?.conversation_id}
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
  );
}