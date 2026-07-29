"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import ConversationList from "@/app/(public)/(student-private)/messenger/_components/ConversationList";
import ChatWindow from "@/app/(public)/(student-private)/messenger/_components/ChatWindow";
import WelcomeBanner from "@/app/(public)/(student-private)/messenger/_components/WelcomeBanner";
import authService from "@/services/authService";
import styles from "./page.module.css";

const API_BASE = "http://localhost:3007";

export default function TutorMessengerPage() {
  const router = useRouter();
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
  const isFetchingRef = useRef(false);
  const lastMessageCountRef = useRef(0);

  useEffect(() => {
    const initPage = async () => {
      try {
        console.log("🚀 [Tutor] START INIT MESSENGER");
        const currentUser = await authService.getCurrentUser();
        console.log("👤 [Tutor] Current user:", currentUser);
        
        if (!currentUser) {
          router.push("/login");
          return;
        }
        setUser(currentUser);
        
        const userId = currentUser.user_id || currentUser.id;
        console.log("📡 [Tutor] User ID:", userId);
        
        if (!userId) {
          setError("Không tìm thấy thông tin người dùng");
          setLoading(false);
          return;
        }
        
        await fetchConversations(userId);
      } catch (error) {
        console.error("❌ [Tutor] Lỗi tải messenger:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    initPage();

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
        isPollingActiveRef.current = false;
      }
    };
  }, [router]);

  // ✅ KHÔNG auto-select khi vào từ sidebar - WelcomeBanner sẽ hiển thị
  // Chỉ chọn conversation khi người dùng click vào 1 conversation trong danh sách
  // Hoặc khi có conversationId từ URL (từ trang tutor detail -> "Liên hệ")

  const fetchConversations = async (userId) => {
    try {
      console.log(`📡 [Tutor] Fetching conversations for: ${userId}`);
      const res = await fetch(`${API_BASE}/conversations`);
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const allConversations = await res.json();
      console.log("📋 [Tutor] All conversations:", allConversations);

      if (!Array.isArray(allConversations)) {
        setConversations([]);
        return;
      }

      // ✅ Lấy danh sách tutors để map tutor_id -> user_id và user_id -> tutor_id
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
      console.log("🗺️ [Tutor] Tutor-to-User map:", tutorToUserMap);
      console.log("🗺️ [Tutor] User-to-Tutor map:", userToTutorMap);

      // ✅ Lọc conversations: match userId hoặc tutor_id
      const myIds = [userId];
      if (userToTutorMap[userId]) {
        myIds.push(userToTutorMap[userId]);
      }
      console.log(`🔍 [Tutor] My IDs to match:`, myIds);

      const userConversations = allConversations.filter(conv => {
        if (!conv.participants) return false;
        return conv.participants.some(p => myIds.includes(p));
      });
      console.log(`📋 [Tutor] User conversations:`, userConversations);

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
          console.log(`🔍 [Tutor] Other participant ID: ${otherParticipantId}`);
          
          let lookupUserId = otherParticipantId;
          if (tutorToUserMap[otherParticipantId]) {
            lookupUserId = tutorToUserMap[otherParticipantId];
            console.log(`🔁 [Tutor] Mapped tutor_id ${otherParticipantId} -> user_id ${lookupUserId}`);
          }
          
          try {
            const userRes = await fetch(`${API_BASE}/users?user_id=${lookupUserId}`);
            const users = await userRes.json();
            const otherUser = users[0] || { 
              full_name: "Người dùng", 
              avatar: "/img/default-avatar.svg",
              role: "student"
            };
            console.log(`👤 [Tutor] Other user found:`, otherUser);
            return {
              ...conv,
              other_user: otherUser,
              other_user_id: lookupUserId,
            };
          } catch (err) {
            console.error(`❌ [Tutor] Error fetching user ${lookupUserId}:`, err);
            return {
              ...conv,
              other_user: { 
                full_name: "Người dùng", 
                avatar: "/img/default-avatar.svg",
                role: "student"
              },
              other_user_id: lookupUserId,
            };
          }
        })
      );

      console.log("✅ [Tutor] Setting conversations:", convWithUsers);
      setConversations(convWithUsers);
    } catch (error) {
      console.error("❌ [Tutor] Lỗi lấy danh sách hội thoại:", error);
      setConversations([]);
    }
  };

  // ✅ Hàm lưu messages vào localStorage
  const saveMessagesToLocal = (conversationId, msgs) => {
    try {
      if (!conversationId || !msgs) return;
      const key = `messages_${conversationId}`;
      localStorage.setItem(key, JSON.stringify(msgs));
      console.log(`💾 [Tutor] Saved ${msgs.length} messages to localStorage key: ${key}`);
    } catch (e) {
      console.warn("⚠️ [Tutor] Cannot save to localStorage:", e);
    }
  };

  // ✅ Hàm đọc messages từ localStorage
  const loadMessagesFromLocal = (conversationId) => {
    try {
      if (!conversationId) return null;
      const key = `messages_${conversationId}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log(`📂 [Tutor] Loaded ${parsed.length} messages from localStorage key: ${key}`);
        return parsed;
      }
      console.log(`📂 [Tutor] No messages in localStorage for key: ${key}`);
      return null;
    } catch (e) {
      console.warn("⚠️ [Tutor] Cannot load from localStorage:", e);
      return null;
    }
  };

  const fetchMessages = async (conversationId, resetOffset = true) => {
    if (!conversationId || isFetchingRef.current) return;
    isFetchingRef.current = true;
    
    let messagesToUse = null;
    
    try {
      const res = await fetch(
        `${API_BASE}/messages?conversation_id=${conversationId}&_sort=created_at&_order=asc`
      );
      const data = await res.json();
      console.log(`📋 [Tutor] Fetched ${data.length} messages from server for conversation ${conversationId}`);

      if (data && data.length > 0) {
        messagesToUse = data;
        saveMessagesToLocal(conversationId, data);
        lastMessageCountRef.current = data.length; // ✅ Cập nhật counter
      }
    } catch (error) {
      console.error("❌ [Tutor] Lỗi lấy tin nhắn:", error);
    }
    
    // ✅ Fallback localStorage nếu API rỗng
    if (!messagesToUse || messagesToUse.length === 0) {
      const localMessages = loadMessagesFromLocal(conversationId);
      if (localMessages && localMessages.length > 0) {
        console.log(`📋 [Tutor] Fallback to localStorage: ${localMessages.length} messages`);
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
    
    isFetchingRef.current = false;
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
        sender_role: user.role || "tutor",
        receiver_id: receiverId,
        receiver_role: selectedConversation.other_user?.role || "student",
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

      console.log("📤 [Tutor] Sending message:", newMessage);

      // ✅ Lưu optimistic vào localStorage NGAY LẬP TỨC
      setMessages(prev => {
        const updated = [...prev, newMessage];
        saveMessagesToLocal(selectedConversation.id, updated);
        return updated;
      });

      // ✅ Gửi lên server
      const res = await fetch(`${API_BASE}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMessage),
      });

      if (res.ok) {
        const savedMsg = await res.json();
        console.log("✅ [Tutor] Message saved to server:", savedMsg);

        setMessages(prev => {
          const updated = prev.map(m => 
            m.id === newMessage.id ? savedMsg : m
          );
          saveMessagesToLocal(selectedConversation.id, updated);
          return updated;
        });
        
        // ✅ Cập nhật conversation: last_message + tăng unread_count cho người nhận
        await fetch(`${API_BASE}/conversations/${selectedConversation.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            last_message: isFile ? `📎 ${content.file_name}` : content.trim(),
            last_message_time: new Date().toISOString(),
            unread_count: 1, // ✅ Set = 1 để báo hiệu có tin nhắn mới cho người nhận
          }),
        });
      } else {
        const errorText = await res.text();
        console.error("❌ [Tutor] API Error:", errorText);
        console.log("✅ [Tutor] Message kept in localStorage despite API error");
      }

    } catch (error) {
      console.error("❌ [Tutor] Lỗi gửi tin nhắn:", error);
      alert("Không thể gửi tin nhắn. Vui lòng thử lại.");
    } finally {
      setSending(false);
      isSendingRef.current = false;
    }
  };

  const handleSelectConversation = async (conversation) => {
    if (isFetchingRef.current) return;
    
    setSelectedConversation(conversation);
    setOffset(0);
    setHasMore(true);
    setMessages([]);
    isInitialLoadRef.current = true;
    lastMessageCountRef.current = 0; // ✅ Reset counter khi chọn conversation mới
    
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
      
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, unread_count: 0 } 
            : conv
        )
      );
      
      const conv = conversations.find(c => c.id === conversationId);
      if (conv) {
        setUnreadCount(prev => Math.max(0, prev - (conv.unread_count || 0)));
      }
    } catch (error) {
      console.error("❌ [Tutor] Lỗi đánh dấu đã đọc:", error);
    }
  };

  // ✅ POLLING - Cập nhật tin nhắn mới (không bị chặn bởi isFetchingRef)
  useEffect(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
      isPollingActiveRef.current = false;
    }

    if (!selectedConversation) {
      console.log("⏹️ [Tutor] No conversation selected, stop polling");
      return;
    }

    console.log(`🔄 [Tutor] Start polling for: ${selectedConversation.id}`);
    isPollingActiveRef.current = true;

    const fetchNewMessages = async () => {
      if (!isPollingActiveRef.current) return;
      
      try {
        const res = await fetch(
          `${API_BASE}/messages?conversation_id=${selectedConversation.id}&_sort=created_at&_order=asc`
        );
        
        if (!res.ok) return;
        
        const data = await res.json();
        
        // ✅ Dùng lastMessageCountRef để phát hiện tin nhắn mới (không dùng isFetchingRef)
        if (data.length > 0 && data.length !== lastMessageCountRef.current) {
          lastMessageCountRef.current = data.length;
          
          setMessages(prev => {
            const currentIds = prev.map(m => m.id);
            const newMessages = data.filter(m => !currentIds.includes(m.id));
            
            if (newMessages.length > 0) {
              console.log(`📩 [Tutor] Polling - Found ${newMessages.length} new messages`);
              
              const allMessages = [...prev, ...newMessages]
                .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
              
              saveMessagesToLocal(selectedConversation.id, allMessages);
              return allMessages;
            }
            
            if (prev.length === 0 && data.length > 0) {
              saveMessagesToLocal(selectedConversation.id, data);
              return data;
            }
            
            return prev;
          });

          const latestMsg = data[data.length - 1];
          setConversations(prev => 
            prev.map(c => 
              c.id === selectedConversation.id 
                ? { 
                    ...c, 
                    last_message: latestMsg.content,
                    last_message_time: latestMsg.created_at
                  } 
                : c
            )
          );
        }
      } catch (error) {
        console.error("❌ [Tutor] Polling error:", error);
      }
    };

    fetchNewMessages();
    pollingRef.current = setInterval(fetchNewMessages, 3000);

    return () => {
      if (pollingRef.current) {
        console.log(`⏹️ [Tutor] Stop polling for: ${selectedConversation.id}`);
        clearInterval(pollingRef.current);
        pollingRef.current = null;
        isPollingActiveRef.current = false;
      }
    };
  }, [selectedConversation]);

  // ✅ Cleanup khi unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
        isPollingActiveRef.current = false;
      }
    };
  }, []);

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
  );
}

