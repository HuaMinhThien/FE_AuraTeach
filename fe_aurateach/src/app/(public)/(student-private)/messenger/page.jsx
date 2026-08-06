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
        console.log("👤 DEBUG currentUser nhận được:", currentUser);
        
        if (!currentUser) {
          router.push("/login");
          return;
        }

        setUser(currentUser);
        
        // In ra tất cả các trường có thể chứa ID để kiểm tra xem tên trường thực tế là gì
        console.log("🔍 user_id:", currentUser.user_id);
        console.log("🔍 id:", currentUser.id);
        console.log("🔍 _id:", currentUser._id);
        
        const userId = currentUser.user_id || currentUser.id || currentUser._id;
        console.log("📡 Final userId được chọn để fetch:", userId);
        
        if (!userId) {
          setError("Không tìm thấy thông tin định danh người dùng (userId trống)");
          setLoading(false);
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

  useEffect(() => {
    if (conversations.length > 0 && conversationIdFromUrl && !hasUrlBeenHandledRef.current) {
      // 🛠️ Sửa c.id thành c.conversation_id || c.id
      const targetConv = conversations.find(c => (c.conversation_id || c.id) === conversationIdFromUrl);
      if (targetConv) {
        hasUrlBeenHandledRef.current = true;
        handleSelectConversation(targetConv);
      }
    }
  }, [conversations, conversationIdFromUrl]);

  const fetchConversations = async (userId) => {
    if (!userId) {
      console.error("❌ fetchConversations bị gọi nhưng userId đang trống!");
      return;
    }
    
    try {
      console.log("==========================================");
      console.log("🔍 [DEBUG START] Đang fetch conversations cho userId hiện tại:", userId);

      const allConversations = await conversationService.getConversations(userId);
      const convList = Array.isArray(allConversations) ? allConversations : (allConversations.data || []);
      console.log("📦 [DEBUG] Danh sách conversations thô nhận được từ API:", convList);
      
      if (convList.length === 0) {
        console.warn("⚠️ Mảng conversation trống!");
        setConversations([]);
        setUnreadCount(0);
        return;
      }

      // 1. Lấy danh sách gia sư để tạo bảng ánh xạ
      const allTutors = await tutorService.getTutors();
      const tutorsList = Array.isArray(allTutors) ? allTutors : (allTutors.data || []);
      
      const tutorToUserMap = {};
      const userToTutorMap = {};
      
      tutorsList.forEach(t => {
        const tId = t.tutor_id || t.id;
        const uId = t.user_id || t.account_id;
        if (tId && uId) {
          tutorToUserMap[tId] = uId;
          tutorToUserMap[String(tId)] = uId;
          userToTutorMap[uId] = tId;
        }
      });
      console.log("🗺️ [DEBUG] Bảng quy đổi tutorToUserMap:", tutorToUserMap);

      const userConversations = convList; 
      const totalUnread = userConversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
      setUnreadCount(totalUnread);

      const convWithUsers = await Promise.all(
        userConversations.map(async (conv) => {
          const convId = conv.conversation_id || conv.id;
          const participants = conv.users || conv.participants || [];
          
          console.log(`💬 [DEBUG] Đang xử lý hội thoại ID: [${convId}] với participants:`, participants);

          // 1. Tìm người đối diện: Ưu tiên tìm participant có user_id khác với userId hiện tại của bạn
          let otherParticipant = participants.find(p => {
            const pId = (typeof p === 'object' && p !== null) ? (p.user_id || p.id || p._id) : p;
            return String(pId) !== String(userId);
          });

          // Nếu lỡ không tìm thấy, lấy phần tử đầu tiên khác chính mình
          if (!otherParticipant && participants.length > 0) {
            otherParticipant = participants.find(p => {
              const pId = (typeof p === 'object' && p !== null) ? (p.user_id || p.id || p._id) : p;
              return String(pId) !== String(userId);
            }) || participants[0];
          }

          // Trích xuất ID và thông tin chi tiết từ participant đó
          let rawOtherId = (typeof otherParticipant === 'object' && otherParticipant !== null) 
            ? (otherParticipant.user_id || otherParticipant.id || otherParticipant._id) 
            : otherParticipant;

          let lookupUserId = tutorToUserMap[rawOtherId] || tutorToUserMap[String(rawOtherId)] || rawOtherId;

          // 2. LẤY TRỰC TIẾP THÔNG TIN TỪ OBJECT participant (Vì trong participants đã có sẵn thông tin chuẩn của gia sư test role tutor)
          let otherUser = null;
          if (typeof otherParticipant === 'object' && otherParticipant !== null) {
            otherUser = otherParticipant;
          } else {
            // Nếu participant chỉ lưu dạng ID string, mới đi gọi API lấy thông tin user
            try {
              let userRes = await userService.getUsers({ user_id: lookupUserId });
              let users = Array.isArray(userRes) ? userRes : (userRes.data || []);
              otherUser = users[0];
            } catch (err) {
              console.error(`❌ Lỗi fetch user:`, err);
            }
          }

          // Fallback an toàn nếu không có gì
          if (!otherUser) {
            otherUser = { 
              full_name: "Gia sư", 
              avatar: "/img/default-avatar.svg",
              role: "tutor"
            };
          }

          console.log(`✅ [SUCCESS] Đã map chính xác gia sư cho hội thoại [${convId}]:`, otherUser);

          return { ...conv, other_user: otherUser, other_user_id: lookupUserId };
        })
      );
      
      console.log("==========================================");
      console.log("🚀 [DEBUG END] convWithUsers hoàn chỉnh:", convWithUsers);
      setConversations(convWithUsers);
    } catch (error) {
      console.error("❌ Lỗi lấy danh sách hội thoại:", error);
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
      const data = await messageService.getMessages(conversationId);
      if (data && data.length > 0) {
        messagesToUse = data;
        saveMessagesToLocal(conversationId, data);
        lastMessageCountRef.current = data.length;
      }
    } catch (error) {
      console.error("❌ Lỗi lấy tin nhắn từ API:", error);
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
    const convId = selectedConversation.conversation_id || selectedConversation.id;
    await fetchMessages(convId, false);
  }, [selectedConversation, hasMore]);

  const sendMessage = async (content) => {
    if (!selectedConversation || !user) return;
    if (isSendingRef.current) return;

    const convId = selectedConversation.conversation_id || selectedConversation.id;
    if (!convId || convId === 'undefined') return;

    const isFile = typeof content === 'object' && content.file_data;
    if (!isFile && !content.trim()) return;

    isSendingRef.current = true;
    setSending(true);

    try {
      const senderId = user.user_id || user.id;
      const receiverId = selectedConversation.other_user_id;
      const newMessage = {
        message_id: isFile ? content.id : `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        conversation_id: convId,
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
        saveMessagesToLocal(convId, updated);
        return updated;
      });

      const savedMsg = await messageService.sendMessage(newMessage);
      
      setMessages(prev => {
        const updated = prev.map(m => m.message_id === newMessage.message_id || m.id === newMessage.id ? (savedMsg || newMessage) : m);
        saveMessagesToLocal(convId, updated);
        return updated;
      });

      await messageService.updateConversation(convId, {
        last_message: isFile ? `📎 ${content.file_name}` : content.trim(),
        last_message_time: new Date().toISOString(),
        unread_count: 1,
      });

    } catch (error) {
      console.error("Lỗi gửi tin nhắn:", error);
      alert("Không thể gửi tin nhắn. Vui lòng thử lại.");
    } finally {
      setSending(false);
      isSendingRef.current = false;
    }
  };

  const handleSelectConversation = async (conversation) => {
    const convId = conversation.conversation_id || conversation.id;
    setSelectedConversation(conversation);
    setOffset(0);
    setHasMore(true);
    setMessages([]);
    isInitialLoadRef.current = true;
    lastMessageCountRef.current = 0;

    if (convId && convId !== 'undefined') {
      await markAsRead(convId);
      await fetchMessages(convId, true);
    }
  };

  const markAsRead = async (conversationId) => {
    try {
      // Đảm bảo conversationId không bị undefined
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

  useEffect(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
      isPollingActiveRef.current = false;
    }
    if (!selectedConversation) {
      console.log("⏸️ [POLLING] Chưa chọn conversation nào, bỏ qua polling.");
      return;
    }

    // Bóc tách ID cẩn thận và in ra log để kiểm tra
    const convId = selectedConversation.conversation_id || selectedConversation.id;
    console.log("🎯 [POLLING SETUP] selectedConversation hiện tại:", selectedConversation);
    console.log("🎯 [POLLING SETUP] convId rút ra được:", convId);

    if (!convId || convId === 'undefined') {
      console.warn("⚠️ [POLLING WARNING] convId không hợp lệ, hủy kích hoạt polling!");
      return;
    }

    isPollingActiveRef.current = true;
    const fetchNewMessages = async () => {
      if (!isPollingActiveRef.current) return;
      try {
        console.log(`🔄 [POLLING RUNNING] Đang gọi getMessages cho convId = ${convId}`);
        const data = await messageService.getMessages(convId);
        if (!data || data.length === 0) return;

        setMessages(prev => {
          const currentIds = prev.map(m => m.id || m.message_id);
          const newMessages = data.filter(m => !currentIds.includes(m.id || m.message_id));
          if (newMessages.length > 0) {
            return [...prev, ...newMessages].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          }
          if (prev.length === 0 && data.length > 0) return data;
          return prev;
        });

        if (data.length > 0) {
          const latestMsg = data[data.length - 1];
          setConversations(prev => prev.map(c => ((c.conversation_id || c.id) === convId) ? { ...c, last_message: latestMsg.content, last_message_time: latestMsg.created_at } : c));
        }
      } catch (error) {
        console.error("❌ [POLLING ERROR] Lỗi khi fetch tin nhắn mới:", error);
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