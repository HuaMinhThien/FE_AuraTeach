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
  const isFetchingRef = useRef(false);
  const lastMessageCountRef = useRef(0);

  useEffect(() => {
    const initPage = async () => {
      try {
        console.log("🚀 [DB DEBUG 1] Bắt đầu khởi tạo trang Messenger...");
        const currentUser = await authService.getCurrentUser();
        console.log("👤 [DB DEBUG 2] Thông tin User từ DB/Session:", currentUser);
        
        if (!currentUser) {
          router.push("/login");
          return;
        }
        setUser(currentUser);
        
        const userId = currentUser.user_id || currentUser.id;
        console.log("📡 [DB DEBUG 3] User ID sử dụng truy vấn:", userId);
        
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

  // 📡 Lấy danh sách hội thoại trực tiếp từ Database qua API
  const fetchConversationsFromDB = async (userId) => {
    try {
      console.log(`📡 [DB DEBUG 4] Gọi API lấy conversations với user_id = ${userId}`);
      const rawRes = await conversationService.getConversations(userId);
      console.log("📦 [DB DEBUG 5] Dữ liệu thô (Raw Response) từ DB:", rawRes);

      const convList = Array.isArray(rawRes) ? rawRes : (rawRes?.data || []);
      console.log("📋 [DB DEBUG 6] Mảng hội thoại sau khi trích xuất:", convList);

      if (convList.length === 0) {
        console.warn("⚠️ [DB WARNING] Database trả về mảng hội thoại rỗng (0 bản ghi).");
        setConversations([]);
        setUnreadCount(0);
        return;
      }

      // Chuẩn hóa id và participants (phòng trường hợp DB trả về chuỗi JSON string)
      const normalizedConvList = convList.map(conv => {
        // Nếu DB trả về mảng users chứa các object user/tutor, ta map lấy các ID của họ
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

      // Lấy danh sách gia sư từ DB để map ID tương ứng
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
      console.log("🔍 [DB DEBUG 7] Danh sách các ID của tôi dùng để đối chiếu participants:", myIds);

      const userConversations = normalizedConvList.filter(conv => {
        const matched = conv.participants.some(p => myIds.includes(p));
        if (!matched) {
          console.log(`ℹ️ [DB FILTER] Bỏ qua hội thoại ID ${conv.id} vì participants [${conv.participants}] không khớp với myIds`);
        }
        return matched;
      });
      console.log("📋 [DB DEBUG 8] Các hội thoại khớp với user:", userConversations);

      const totalUnread = userConversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
      setUnreadCount(totalUnread);

      const convWithUsers = await Promise.all(
        userConversations.map(async (conv) => {
          const otherParticipantId = conv.participants.find(p => !myIds.includes(p));
          let lookupUserId = tutorToUserMap[otherParticipantId] || otherParticipantId;
          
          try {
            // Lấy toàn bộ user hoặc danh sách user về
            const usersRes = await userService.getUsers();
            const users = Array.isArray(usersRes) ? usersRes : (usersRes?.data || []);
            
            // Tự lọc chính xác user khớp với lookupUserId hoặc khớp trong mảng users của conversation
            let matchedUser = users.find(u => (u.user_id === lookupUserId || u.id === lookupUserId));
            
            // Phòng hờ nếu API getUsers không trả về, ta lấy luôn từ mảng conv.users nếu có sẵn trong DB
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
      console.log("👥 [OTHER USER CHECK]", convWithUsers);
      console.log("✅ [DB DEBUG 9] Hoàn tất nạp dữ liệu hội thoại từ DB:", convWithUsers);
      setConversations(convWithUsers);
    } catch (error) {
      console.error("❌ [DB ERROR] Lỗi khi truy vấn conversations từ DB:", error);
      setConversations([]);
    }
  };

  const fetchMessagesFromDB = async (conversationId, resetOffset = true) => {
    if (!conversationId || isFetchingRef.current) return;
    isFetchingRef.current = true;
    
    try {
      console.log(`💬 [CHECK SENDER DEBUG 1] Đang tải tin nhắn cho conversation_id: ${conversationId}`);
      const data = await messageService.getMessages(conversationId);
      const msgList = Array.isArray(data) ? data : (data?.data || []);
      
      console.log(`💬 [CHECK SENDER DEBUG 2] Lấy được ${msgList.length} tin nhắn từ DB. Danh sách messages thô:`, msgList);

      const currentConv = conversations.find(c => (c.id === conversationId || c.conversation_id === conversationId));
      console.log(`👥 [CHECK SENDER DEBUG 3] Participants của cuộc trò chuyện này là:`, currentConv?.participants || currentConv?.users);
      console.log(`👤 [CHECK SENDER DEBUG 4] Current User ID của bạn hiện tại là:`, user?.user_id || user?.id);

      if (currentConv && currentConv.participants) {
        msgList.forEach((msg, index) => {
          const isSenderInConv = currentConv.participants.includes(msg.sender_id);
          console.log(`🔍 [CHECK SENDER DEBUG 5 - Tin nhắn #${index + 1}] ID: ${msg.id} | sender_id: "${msg.sender_id}" --> Có nằm trong participants không? 👉 ${isSenderInConv ? "✅ KHỚP" : "❌ LỆCH (Không có trong conversation)"}`);
        });
      }

      if (resetOffset) {
        setMessages(msgList);
      } else {
        setMessages(prev => [...prev, ...msgList]);
      }
      lastMessageCountRef.current = msgList.length;
    } catch (error) {
      console.error("❌ [DB ERROR] Lỗi lấy tin nhắn từ DB:", error);
    } finally {
      setHasMore(false);
      isFetchingRef.current = false;
    }
  };

  const sendMessage = async (content) => {
    if (!selectedConversation || !user || isSendingRef.current) return;
    if (!content.trim()) return;

    isSendingRef.current = true;
    setSending(true);
    
    try {
      const senderId = user.user_id || user.id;
      const receiverId = selectedConversation.other_user_id;
      const convId = selectedConversation.id || selectedConversation.conversation_id;

      const nowTime = new Date().toISOString().slice(0, 19).replace('T', ' ');

      const newMessageData = {
        message_id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        conversation_id: convId,
        sender_id: senderId,
        sender_role: user.role || "tutor",
        receiver_id: receiverId,
        receiver_role: selectedConversation.other_user?.role || "student",
        content: content.trim(),
        is_read: false,
        created_at: nowTime, // Chỉ giữ lại created_at (nếu bảng có cột này, nếu bảng báo lỗi không có created_at thì bạn xóa luôn dòng này)
      };

      console.log("📤 [DB DEBUG] Đang gửi tin nhắn lên Database...", newMessageData);
      const savedMsgRes = await messageService.sendMessage(newMessageData);
      const savedMsg = savedMsgRes?.data || savedMsgRes;

      if (savedMsg) {
        setMessages(prev => [...prev, savedMsg]);
        await messageService.updateConversation(convId, {
          last_message: content.trim(),
          last_message_time: nowTime,
        });
      }
    } catch (error) {
      console.error("❌ [DB ERROR] Lỗi gửi tin nhắn vào DB:", error);
      alert("Không thể gửi tin nhắn lên cơ sở dữ liệu.");
    } finally {
      setSending(false);
      isSendingRef.current = false;
    }
  };

  const handleSelectConversation = async (conversation) => {
    if (isFetchingRef.current) return;
    setSelectedConversation(conversation);
    setMessages([]);
    
    const convId = conversation.id || conversation.conversation_id;
    await fetchMessagesFromDB(convId, true);
  };

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