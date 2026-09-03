"use client";

import React, { useEffect, useState, useRef } from "react";
import styles from "./TutorProfile.module.css"; 
import { tutorService } from "@/services/tutorService";
import { userService } from "@/services/userService";
import { categoryService } from "@/services/categoryService";
import { uploadService } from "@/services/uploadService";
import apiClient from "@/services/apiClient";

const TIME_SLOT_OPTIONS = [
  "07:00 - 09:00",
  "09:00 - 11:00",
  "11:00 - 13:00",
  "13:00 - 15:00",
  "15:00 - 17:00",
  "17:00 - 19:00",
  "19:00 - 21:00",
  "21:00 - 23:00"
];

const DAY_OPTIONS = [
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
  "Chủ Nhật"
];

const getUserIdFromCookie = () => {
  try {
    const cookies = document.cookie.split("; ");
    const userInfoCookie = cookies.find((row) => row.startsWith("user_info="));
    if (userInfoCookie) {
      const cookieValue = userInfoCookie.split("=")[1];
      const decodedValue = decodeURIComponent(cookieValue);
      const userInfo = JSON.parse(decodedValue);
      return userInfo.user_id || null;
    }
  } catch (error) {
    console.error("Lỗi đọc cookie:", error);
  }
  return null;
};

const getCategoryName = (cat) => {
  if (typeof cat === "string") return cat.trim();
  return (cat.category_name || cat.name || "").trim();
};

export default function TutorProfile() {
  const [tutorData, setTutorData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [pendingRequestData, setPendingRequestData] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isTimeSlotsDropdownOpen, setIsTimeSlotsDropdownOpen] = useState(false);
  const [isDaysDropdownOpen, setIsDaysDropdownOpen] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showChangesModal, setShowChangesModal] = useState(false);
  const [editFields, setEditFields] = useState({
    phone: "",
    bio: "",
    experience: "",
    level: "Giáo viên",
    cv_link: "",
    expertise: [],
    certificates: [],
    available_days: [],
    available_time_slots: []
  });

  const [newCertUrl, setNewCertUrl] = useState("");

  const [acceptSuggested, setAcceptSuggested] = useState(true);
  const [toggleLoading, setToggleLoading] = useState(false);
  // Snapshot editFields tại thời điểm bắt đầu chỉnh sửa — dùng để so sánh "đã thay đổi"
  const [originalFields, setOriginalFields] = useState(null);

  const isCategorySelected = (catName) => {
    if (!catName) return false;
    const cleanCat = catName.toLowerCase().trim();
    // Đảm bảo expertise luôn là array trước khi .some()
    const expertiseArr = Array.isArray(editFields.expertise)
      ? editFields.expertise
      : typeof editFields.expertise === "string"
        ? editFields.expertise.split(",").map((i) => i.trim()).filter(Boolean)
        : [];
    return expertiseArr.some(
      (item) => item.toLowerCase().trim() === cleanCat
    );
  };

  const handleToggleCategory = (catName) => {
    const cleanCatName = catName.trim();
    if (!cleanCatName) return;

    setEditFields((prev) => {
      // Đảm bảo expertise luôn là array
      const prevExpertise = Array.isArray(prev.expertise)
        ? prev.expertise
        : typeof prev.expertise === "string"
          ? prev.expertise.split(",").map((i) => i.trim()).filter(Boolean)
          : [];

      const exists = prevExpertise.some(
        (item) => item.toLowerCase().trim() === cleanCatName.toLowerCase()
      );

      if (exists) {
        return {
          ...prev,
          expertise: prevExpertise.filter(
            (item) => item.toLowerCase().trim() !== cleanCatName.toLowerCase()
          ),
        };
      } else {
        return {
          ...prev,
          expertise: [...prevExpertise, cleanCatName],
        };
      }
    });
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploadingAvatar(true);
      // Gọi uploadService với folder 'avatars'
      const res = await uploadService.uploadFile(file, "avatars");
      
      // Tùy thuộc vào cấu trúc trả về của API upload (ví dụ: res.url hoặc res.data.url)
      const avatarUrl = res.url || res.data?.url || res.data;

      // Cập nhật vào editFields để chuẩn bị gửi lưu/duyệt
      setEditFields((prev) => ({
        ...prev,
        avatar: avatarUrl,
      }));

      // Nếu bạn muốn hiển thị trực tiếp luôn trên giao diện tạm thời
      setTutorData((prev) => ({
        ...prev,
        avatar: avatarUrl,
      }));

      alert("✅ Tải ảnh đại diện thành công!");
    } catch (error) {
      console.error("Lỗi upload avatar:", error);
      alert("❌ Tải ảnh đại diện thất bại. Vui lòng thử lại.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const isTimeSlotSelected = (slot) => {
    return editFields.available_time_slots.includes(slot);
  };

  const handleToggleTimeSlot = (slot) => {
    setEditFields((prev) => {
      const exists = isTimeSlotSelected(slot);
      if (exists) {
        return {
          ...prev,
          available_time_slots: prev.available_time_slots.filter((item) => item !== slot)
        };
      } else {
        return {
          ...prev,
          available_time_slots: [...prev.available_time_slots, slot]
        };
      }
    });
  };

  // ✅ HÀM KIỂM TRA & TOGGLE DAYS
  const isDaySelected = (day) => {
    return editFields.available_days.includes(day);
  };

  const handleToggleDay = (day) => {
    setEditFields((prev) => {
      const exists = isDaySelected(day);
      if (exists) {
        return {
          ...prev,
          available_days: prev.available_days.filter((item) => item !== day)
        };
      } else {
        return {
          ...prev,
          available_days: [...prev.available_days, day]
        };
      }
    });
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditFields((prev) => ({
          ...prev,
          certificates: [...prev.certificates, reader.result]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  // ✅ HÀM THÊM BẰNG CẤP BẰNG URL
  const handleAddCertUrl = () => {
    if (!newCertUrl.trim()) return;
    setEditFields((prev) => ({
      ...prev,
      certificates: [...prev.certificates, newCertUrl.trim()]
    }));
    setNewCertUrl("");
  };

  // ✅ HÀM XÓA ẢNH BẰNG CẤP KHI ĐANG CHỈNH SỬA
  const handleRemoveCert = (index) => {
    setEditFields((prev) => ({
      ...prev,
      certificates: prev.certificates.filter((_, idx) => idx !== index)
    }));
  };

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      const currentUserId = getUserIdFromCookie();
      
      if (!currentUserId) {
        if (isMounted) {
          setErrorMsg("Không tìm thấy thông tin đăng nhập.");
          setLoading(false);
        }
        return;
      }

      try {
        const [userRes, tutorByUserRes, catRes] = await Promise.all([
          userService.getUsers(),
          // Dùng getByUserId thay vì getTutors() để tránh bị filter bởi classSessions
          apiClient.get(`/tutors/user/${currentUserId}`),
          categoryService.getCategories().catch(() => [])
        ]);

        if (!isMounted) return;

        const users = userRes.data || userRes;
        // BE trả về { success, data: [tutor, ...] } — apiClient đã parse JSON nên lấy thẳng
        const tutorList = tutorByUserRes?.data || tutorByUserRes || [];
        const catList = catRes.data || catRes;

        setCategories(catList || []);

        const userObj = Array.isArray(users)
          ? users.find((u) => u.user_id === currentUserId || u.id === currentUserId)
          : null;
        const tutorObj = Array.isArray(tutorList) ? tutorList[0] : tutorList;

        if (userObj && tutorObj) {
          const mergedData = { ...userObj, ...tutorObj };
          
          if (isMounted) {
            setTutorData(mergedData);
            // receive_suggestions trong DB là varchar(50) lưu string 'true'/'false'
            // handle thêm '1'/1/true để tương thích data cũ
            const rawSuggestions = mergedData.receive_suggestions;
            setAcceptSuggested(
              rawSuggestions === true || rawSuggestions === 'true' || rawSuggestions === 1 || rawSuggestions === '1'
            );

            const expArray = mergedData.expertise 
              ? mergedData.expertise.split(",").map((i) => i.trim()).filter(Boolean)
              : [];

            // Map expertise cũ về đúng tên category trong danh sách
            // (tránh trường hợp DB lưu "Toán học" nhưng category API trả về "Toán")
            const normalizeExpertise = (rawArr, catList) => {
              return rawArr.map((item) => {
                const lowerItem = item.toLowerCase();
                // Tìm category khớp chính xác trước
                const exact = catList.find(
                  (c) => getCategoryName(c).toLowerCase() === lowerItem
                );
                if (exact) return getCategoryName(exact);
                // Nếu không khớp chính xác, tìm category mà tên nằm trong item hoặc item nằm trong tên
                const partial = catList.find((c) => {
                  const cn = getCategoryName(c).toLowerCase();
                  return lowerItem.includes(cn) || cn.includes(lowerItem);
                });
                return partial ? getCategoryName(partial) : item; // giữ nguyên nếu không tìm được
              });
            };

            const mappedExpArray = normalizeExpertise(expArray, catList || []);

            console.log("🔍 [expertise] raw từ DB:", mergedData.expertise);
            console.log("🔍 [expertise] parsed array:", expArray);
            console.log("🔍 [expertise] after mapping:", mappedExpArray);
            console.log("🔍 [categories] list tên:", (catList || []).map(c => getCategoryName(c)));

            const daysArray = mergedData.available_days
              ? (Array.isArray(mergedData.available_days) 
                  ? mergedData.available_days 
                  : mergedData.available_days.split(",").map((i) => i.trim()).filter(Boolean))
              : [];

            const timeSlotsArray = mergedData.available_time_slots
              ? (Array.isArray(mergedData.available_time_slots)
                  ? mergedData.available_time_slots
                  : mergedData.available_time_slots.split(",").map((i) => i.trim()).filter(Boolean))
              : [];

          const initialFields = {
              phone: mergedData.phone || "",
              bio: mergedData.bio || "",
              experience: mergedData.experience || "",
              level: mergedData.level || "Giáo viên",
              cv_link: mergedData.cv_link || "",
              avatar: mergedData.avatar || "",
              expertise: mappedExpArray,
              certificates: mergedData.certificates || [],
              available_days: daysArray,
              available_time_slots: timeSlotsArray
            };

            setEditFields(initialFields);
          }

          const currentTutorId = tutorObj.id || tutorObj.tutor_id;

          if (currentTutorId) {
            try {
              const checkData = await tutorService.checkPendingUpdate(currentTutorId);
              console.log("🔍 [checkPendingUpdate] response:", checkData);
              
              // BE trả về: { success, hasPending, data: <object|null> }
              if (isMounted && checkData?.success && checkData?.hasPending) {
                setHasPendingRequest(true);
              }

              // BE trả về pending request trong key "data" (single object, không phải array)
              if (checkData?.data) {
                setPendingRequestData(checkData.data);
              }

            } catch (apiErr) {
              console.error("Lỗi gọi API check pending requests:", apiErr);
            }
          }
        } else {
          if (isMounted) setErrorMsg("Không tìm thấy dữ liệu gia sư.");
        }
      } catch (err) {
        console.error(err);
        if (isMounted) setErrorMsg("Lỗi kết nối server.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggleSuggestions = async () => {
    if (toggleLoading) return;
    const newValue = !acceptSuggested; 
    setToggleLoading(true);

    try {
        const currentUserId = getUserIdFromCookie();
        console.log("🔍 [toggleSuggestions] userId gửi lên:", currentUserId, "| newValue:", newValue);
        const result = await tutorService.toggleSuggestions(currentUserId, newValue);

        console.log("🔍 Kiểm tra log API:", result);

        // apiClient là fetch thuần — trả về thẳng JSON, không bọc thêm lớp .data
        // BE trả về: { success: true, message: "...", receive_suggestions: false }
        const isSuccess = result?.success === true || result?.message?.includes("thành công");

        if (isSuccess) {
            // receive_suggestions nằm thẳng trong result, không nằm trong result.data
            const finalValue = result?.receive_suggestions !== undefined
                ? result.receive_suggestions
                : newValue;

            setAcceptSuggested(finalValue);
            console.log("✅ Cập nhật state thành công:", finalValue);
        } else {
            const msg = result?.message || "Không thể cập nhật trạng thái.";
            alert("❌ Lỗi: " + msg);
        }
    } catch (err) {
        console.error("Lỗi:", err);
        alert("Không thể kết nối đến máy chủ.");
    } finally {
        setToggleLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const oldPayload = {
        phone: tutorData.phone || "",
        bio: tutorData.bio || "",
        experience: tutorData.experience || "",
        level: tutorData.level || "Giáo viên",
        cv_link: tutorData.cv_link || "",
        expertise: tutorData.expertise || "",
        certificates: tutorData.certificates || [],
        available_days: tutorData.available_days || "",
        available_time_slots: tutorData.available_time_slots || "",
        avatar: tutorData.avatar || "",
      };

      const newPayload = {
        phone: editFields.phone,
        bio: editFields.bio,
        experience: editFields.experience,
        level: editFields.level,
        cv_link: editFields.cv_link,
        expertise: editFields.expertise.join(", "),
        certificates: editFields.certificates,
        available_days: editFields.available_days.join(", "),
        available_time_slots: editFields.available_time_slots.join(", "),
        avatar: editFields.avatar,
      };

      const tutorId = tutorData.id || tutorData.tutor_id;
      if (!tutorId) {
        alert("❌ Không tìm thấy ID gia sư để gửi yêu cầu.");
        return;
      }

      // 🛠️ Đổi sang dùng tutorService thay vì adminService
      const result = await tutorService.sendUpdateEvaluationRequest({
        tutor_update_req_id: `req_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        tutor_id: tutorId,
        old_data: oldPayload,
        new_data: newPayload
      });

      console.log("Response từ server:", result);

      setIsEditing(false);
      setIsDropdownOpen(false);
      setHasPendingRequest(true);
      setIsTimeSlotsDropdownOpen(false);
      setIsDaysDropdownOpen(false);
      alert("✅ Yêu cầu chỉnh sửa hồ sơ đã gửi thành công! Vui lòng chờ Admin phê duyệt.");

    } catch (error) {
      console.error("Lỗi gửi yêu cầu cập nhật:", error);
      alert(error.response?.data?.message || "❌ Gửi yêu cầu thất bại do lỗi kết nối hoặc máy chủ.");
    }
  };

  if (loading) return <div className={styles.loadingContainer}><div className={styles.spinner}></div></div>;
  if (errorMsg || !tutorData) return <div className={styles.errorContainer}>{errorMsg}</div>;

  // Khi đang edit: so sánh originalFields (snapshot lúc bắt đầu) vs editFields (hiện tại)
  // Khi có pendingRequest: dùng old_data/new_data từ server
  const compareOld = originalFields || {
    phone: "",
    level: "Giáo viên",
    experience: "",
    cv_link: "",
    expertise: "",
    bio: "",
    certificates: []
  };

  const activeOldData = pendingRequestData?.old_data || {
    phone: compareOld.phone || "",
    level: compareOld.level || "Giáo viên",
    experience: compareOld.experience || "",
    cv_link: compareOld.cv_link || "",
    expertise: Array.isArray(compareOld.expertise)
      ? compareOld.expertise.join(", ")
      : (compareOld.expertise || ""),
    bio: compareOld.bio || "",
    certificates: compareOld.certificates || []
  };

  const activeNewData = pendingRequestData?.new_data || {
    phone: editFields.phone,
    level: editFields.level,
    experience: editFields.experience,
    cv_link: editFields.cv_link,
    expertise: editFields.expertise.join(", "),
    bio: editFields.bio,
    certificates: editFields.certificates
  };

  const parseCertCount = (certs) => {
    if (Array.isArray(certs)) return certs.length;
    if (typeof certs === "string") {
      try { return JSON.parse(certs).length; } catch { return 0; }
    }
    return 0;
  };

  const changesList = [
    { 
      label: "Số điện thoại", 
      oldVal: activeOldData.phone || "Chưa cập nhật", 
      newVal: activeNewData.phone || "Chưa cập nhật", 
      isChanged: activeOldData.phone !== activeNewData.phone 
    },
    { 
      label: "Trình độ", 
      oldVal: activeOldData.level || "Giáo viên", 
      newVal: activeNewData.level, 
      isChanged: activeOldData.level !== activeNewData.level 
    },
    { 
      label: "Kinh nghiệm", 
      oldVal: activeOldData.experience || "Chưa cập nhật", 
      newVal: activeNewData.experience || "Chưa cập nhật", 
      isChanged: activeOldData.experience !== activeNewData.experience 
    },
    { 
      label: "Link CV / Portfolio", 
      oldVal: activeOldData.cv_link || "Chưa cập nhật", 
      newVal: activeNewData.cv_link || "Chưa cập nhật", 
      isChanged: activeOldData.cv_link !== activeNewData.cv_link 
    },
    { 
      label: "Lĩnh vực chuyên môn", 
      oldVal: activeOldData.expertise || "Chưa cập nhật", 
      newVal: activeNewData.expertise || "Chưa cập nhật", 
      isChanged: activeOldData.expertise !== activeNewData.expertise 
    },
    { 
      label: "Giới thiệu bản thân", 
      oldVal: activeOldData.bio || "Chưa cập nhật", 
      newVal: activeNewData.bio || "Chưa cập nhật", 
      isChanged: activeOldData.bio !== activeNewData.bio 
    },
    { 
      label: "Bằng cấp & Chứng chỉ", 
      oldVal: `${parseCertCount(activeOldData.certificates)} hình ảnh`, 
      newVal: `${parseCertCount(activeNewData.certificates)} hình ảnh`, 
      isChanged: JSON.stringify(activeOldData.certificates) !== JSON.stringify(activeNewData.certificates) 
    }
  ];

  const hasAnyChange = changesList.some((item) => item.isChanged);

  const renderListTags = (data, emptyMessage) => {
    if (!data || (Array.isArray(data) && data.length === 0)) {
      return <p className={styles.bioContent}>{emptyMessage}</p>;
    }
    const list = Array.isArray(data) ? data : data.split(",").map((item) => item.trim());
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
        {list.map((item, idx) => (
          <span key={idx} className={styles.tagBadge}>
            {item}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className={styles.profileContainer}>
      <div className={styles.pageHeaderActions}>
        <h2>Hồ sơ cá nhân</h2>
        
        {hasPendingRequest ? (
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button 
              className={styles.btnEdit} 
              disabled 
              style={{ opacity: 0.85, cursor: "not-allowed", backgroundColor: "#f59e0b", color: "#fff" }}
            >
              ⏳ Đang chờ duyệt yêu cầu sửa...
            </button>
            {/* Nút xem lại thông tin đã sửa khi đang chờ duyệt */}
            <button 
              type="button" 
              className={styles.btnSave}
              style={{ backgroundColor: "#2563eb", color: "#fff" }}
              onClick={() => setShowChangesModal(true)}
            >
              👁️ Xem thông tin đã sửa
            </button>
          </div>
        ) : !isEditing ? (
          <button className={styles.btnEdit} onClick={() => { setIsEditing(true); setOriginalFields({...editFields}); }}>
            ⚙️ Chỉnh sửa thông tin
          </button>
        ) : (
          <div className={styles.btnActionGroup} style={{ display: "flex", gap: "8px" }}>
            {/* Nút xem trước thông tin đã thay đổi khi đang edit */}
            <button 
              type="button" 
              className={styles.btnSave}
              style={{ backgroundColor: "#2563eb", color: "#fff" }}
              onClick={() => setShowChangesModal(true)}
            >
              👁️ Xem thay đổi
            </button>
            <button className={styles.btnSave} onClick={handleSave}>💾 Gửi yêu cầu duyệt</button>
            <button className={styles.btnCancel} onClick={() => { setIsEditing(false); setIsDropdownOpen(false); setShowChangesModal(false); setOriginalFields(null); }}>Hủy</button>
            {/*<button className={styles.btnCancel} onClick={() => { 
              setIsEditing(false); 
              setIsDropdownOpen(false);
              setShowChangesModal(false);
              setIsTimeSlotsDropdownOpen(false);
              setIsDaysDropdownOpen(false);
              setOriginalFields(null);
            }}></button>*/}
          </div>
        )}
      </div>

      <div className={styles.suggestionToggleCard}>
        <div className={styles.suggestionToggleLeft}>
          <span className={styles.suggestionToggleIcon}></span>
          <div>
            <p className={styles.suggestionToggleTitle}>Nhận lớp đề xuất từ Admin</p>
            <p className={styles.suggestionToggleDesc}>
              {acceptSuggested
                ? "Đang bật — Admin có thể đề xuất lớp học phù hợp cho bạn."
                : "Đã tắt — Bạn sẽ không nhận đề xuất lớp học từ Admin."}
            </p>
          </div>
        </div>
        <button
          className={`${styles.toggleSwitch} ${acceptSuggested ? styles.toggleOn : styles.toggleOff}`}
          onClick={handleToggleSuggestions}
          disabled={toggleLoading}
          aria-label={acceptSuggested ? "Tắt nhận lớp đề xuất" : "Bật nhận lớp đề xuất"}
          title={acceptSuggested ? "Nhấn để tắt" : "Nhấn để bật"}
        >
          <span className={styles.toggleThumb}></span>
        </button>
      </div>

      {/* Header Card */}
      <div className={styles.headerCard}>
        <div className={styles.avatarWrapper} style={{ position: "relative" }}>
          <img
            src={isEditing ? (editFields.avatar || tutorData.avatar || "/img/avt/avt.jpg") : (tutorData.avatar || "/img/avt/avt.jpg")}
            alt={tutorData.full_name}
            className={styles.avatar}
            onError={(e) => { e.target.src = "/img/default-avatar.svg"; }}
          />

          {/* Nút đổi avatar chỉ hiện khi đang ở chế độ chỉnh sửa */}
          {isEditing && (
            <label style={{
              position: "absolute",
              bottom: "5px",
              right: "5px",
              background: "#0284c7",
              color: "#fff",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
            }} title="Đổi ảnh đại diện">
              {uploadingAvatar ? "⏳" : "📷"}
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: "none" }}
                disabled={uploadingAvatar}
              />
            </label>
          )}

          <span className={`${styles.statusBadge} ${tutorData.status === "active" ? styles.statusActive : styles.statusLocked}`}>
            {tutorData.status === "active" ? "Đang hoạt động" : "Tạm khóa"}
          </span>
        </div>

        <div className={styles.infoWrapper}>
          <div>
            <h1 className={styles.tutorName}>{tutorData.full_name}</h1>
          </div>

          <div className={styles.badgeGroup}>
            <span className={`${styles.badge} ${styles.badgeRating}`}><img src="/img/icons/star.png" alt="star" className={styles.badgeIcon} /> {tutorData.rating ?? "0"} Đánh giá</span>
            {isEditing ? (
              <select
                className={styles.inputField}
                style={{ width: "130px", padding: "4px 8px" }}
                value={editFields.level}
                onChange={(e) => setEditFields({ ...editFields, level: e.target.value })}
              >
                <option value="Giáo viên">Giáo viên</option>
                <option value="Sinh viên">Sinh viên</option>
              </select>
            ) : (
              <span className={`${styles.badge} ${styles.badgeLevel}`}>
                🎓 {tutorData.level || "Giáo viên"}
              </span>
            )}

            {isEditing ? (
              <input 
                type="text" 
                className={styles.inputField}
                style={{ width: "170px", padding: "4px 8px" }}
                value={editFields.experience}
                onChange={e => setEditFields({...editFields, experience: e.target.value})}
                placeholder="VD: 3 năm kinh nghiệm"
              />
            ) : (
              <span className={`${styles.badge} ${styles.badgeExp}`}>
                💼 {tutorData.experience || "Chưa cập nhật kinh nghiệm"}
              </span>
            )}

            <span className={`${styles.badge} ${tutorData.verification_status === "Đã xác minh" || tutorData.verification_status === "approved" ? styles.badgeVerifyVerified : styles.badgeVerifyPending}`}>
              <img src="/img/icons/security.png" alt="xác minh" className={styles.badgeIcon} /> {tutorData.verification_status || "Chưa xác minh"}
            </span>
          </div>
          {/* 3 THÔNG TIN EMAIL, SỐ ĐIỆN THOẠI, LINK CV */}
          <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.95rem", color: "#334155" }}>
            <div>
              <span className={styles.contactLabel} style={{ fontWeight: "600" }}>✉️ Email:</span> {tutorData.email}
            </div>
           <div>
              <span className={styles.contactLabel} style={{ fontWeight: "600" }}>📞 Số điện thoại:</span>{" "}
              {isEditing ? (
                <input 
                  type="text" 
                  className={styles.inputField}
                  style={{ padding: "4px 8px", width: "200px" }}
                  value={editFields.phone}
                  onChange={e => setEditFields({...editFields, phone: e.target.value})}
                />
              ) : (
                tutorData.phone || "Chưa cập nhật"
              )}
            </div>
            <div>
              <span className={styles.contactLabel} style={{ fontWeight: "600" }}>📄 Link CV / Portfolio:</span>{" "}
              {isEditing ? (
                <input 
                  type="url" 
                  className={styles.inputField}
                  style={{ padding: "4px 8px", width: "280px" }}
                  value={editFields.cv_link}
                  onChange={e => setEditFields({...editFields, cv_link: e.target.value})}
                  placeholder="https://drive.google.com/..."
                />
              ) : tutorData.cv_link ? (
                <a href={tutorData.cv_link} target="_blank" rel="noreferrer" className={styles.cvLink} style={{ color: "#2563eb", textDecoration: "underline" }}>
                  Xem CV
                </a>
              ) : (
                <span style={{ color: "#9ca3af" }}>Chưa cập nhật</span>
              )}
            </div>            
          </div>
        </div>
      </div>

      {/* LĨNH VỰC CHUYÊN MÔN */}
      <div className={styles.bioCard} style={{ marginBottom: "1.5rem" }}>
        <h3 className={styles.bioTitle}>Lĩnh vực chuyên môn <span style={{ color: "red" }}>*</span></h3>
        
        {isEditing ? (
          <div style={{ marginTop: "12px", position: "relative" }}>
            <div 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={styles.dropdownTrigger}
            >
              <span style={{ color: editFields.expertise.length > 0 ? "#1e293b" : "#64748b", fontSize: "0.95rem" }}>
                {editFields.expertise.length > 0 
                  ? editFields.expertise.join(", ") 
                  : "Chọn lĩnh vực chuyên môn"}
              </span>
              <span style={{ fontSize: "0.8rem", color: "#64748b" }}>▼</span>
            </div>

            {isDropdownOpen && (
              <div className={styles.dropdownBox}>
                <div style={{ fontWeight: "600", fontSize: "0.95rem", color: "#1e293b", marginBottom: "16px" }}>
                  Chọn lĩnh vực
                </div>

                <div className={styles.checkboxGridTwoCols}>
                  {categories.map((cat, idx) => {
                    const catName = getCategoryName(cat);
                    if (!catName) return null;
                    const checked = isCategorySelected(catName);

                    return (
                      <label key={cat.id || idx} className={styles.checkboxLabel}>
                        <input 
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleCategory(catName)}
                          className={styles.checkboxInput}
                        />
                        <span>{catName}</span>
                      </label>
                    );
                  })}
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(false)}
                    className={styles.btnCloseDropdown}
                  >
                    Đóng
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          renderListTags(tutorData.expertise, "Chưa cập nhật lĩnh vực chuyên môn.")
        )}
      </div>

      {/* KHỐI CÁC THỨ TRỐNG TRONG TUẦN */}
      <div className={styles.bioCard} style={{ marginBottom: "1.5rem" }}>
        <h3 className={styles.bioTitle}>Thứ trống trong tuần</h3>
        
        {isEditing ? (
          <div style={{ marginTop: "12px", position: "relative" }}>
            <div 
              onClick={() => setIsDaysDropdownOpen(!isDaysDropdownOpen)}
              className={styles.dropdownTrigger}
            >
              <span style={{ color: editFields.available_days.length > 0 ? "#1e293b" : "#64748b", fontSize: "0.95rem" }}>
                {editFields.available_days.length > 0 
                  ? editFields.available_days.join(", ") 
                  : "Chọn các thứ rảnh trong tuần"}
              </span>
              <span style={{ fontSize: "0.8rem", color: "#64748b" }}>▼</span>
            </div>

            {isDaysDropdownOpen && (
              <div className={styles.dropdownBox}>
                <div style={{ fontWeight: "600", fontSize: "0.95rem", color: "#1e293b", marginBottom: "16px" }}>
                  Chọn thứ trống
                </div>

                <div className={styles.checkboxGridTwoCols}>
                  {DAY_OPTIONS.map((day, idx) => {
                    const checked = isDaySelected(day);
                    return (
                      <label key={idx} className={styles.checkboxLabel}>
                        <input 
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleDay(day)}
                          className={styles.checkboxInput}
                        />
                        <span>{day}</span>
                      </label>
                    );
                  })}
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
                  <button
                    type="button"
                    onClick={() => setIsDaysDropdownOpen(false)}
                    className={styles.btnCloseDropdown}
                  >
                    Đóng
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          renderListTags(tutorData.available_days, "Chưa cập nhật thứ trống trong tuần.")
        )}
      </div>

      {/* KHỐI KHUNG GIỜ RẢNH */}
      <div className={styles.bioCard} style={{ marginBottom: "1.5rem" }}>
        <h3 className={styles.bioTitle}>Khung giờ rảnh</h3>
        
        {isEditing ? (
          <div style={{ marginTop: "12px", position: "relative" }}>
            <div 
              onClick={() => setIsTimeSlotsDropdownOpen(!isTimeSlotsDropdownOpen)}
              className={styles.dropdownTrigger}
            >
              <span style={{ color: editFields.available_time_slots.length > 0 ? "#1e293b" : "#64748b", fontSize: "0.95rem" }}>
                {editFields.available_time_slots.length > 0 
                  ? editFields.available_time_slots.join(", ") 
                  : "Chọn khung giờ rảnh"}
              </span>
              <span style={{ fontSize: "0.8rem", color: "#64748b" }}>▼</span>
            </div>

            {isTimeSlotsDropdownOpen && (
              <div className={styles.dropdownBox}>
                <div style={{ fontWeight: "600", fontSize: "0.95rem", color: "#1e293b", marginBottom: "16px" }}>
                  Chọn khung giờ rảnh
                </div>

                <div className={styles.checkboxGridTwoCols}>
                  {TIME_SLOT_OPTIONS.map((slot, idx) => {
                    const checked = isTimeSlotSelected(slot);
                    return (
                      <label key={idx} className={styles.checkboxLabel}>
                        <input 
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleTimeSlot(slot)}
                          className={styles.checkboxInput}
                        />
                        <span>{slot}</span>
                      </label>
                    );
                  })}
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
                  <button
                    type="button"
                    onClick={() => setIsTimeSlotsDropdownOpen(false)}
                    className={styles.btnCloseDropdown}
                  >
                    Đóng
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          renderListTags(tutorData.available_time_slots, "Chưa cập nhật khung giờ rảnh.")
        )}
      </div>

      {/* GIỚI THIỆU BẢN THÂN */}
      <div className={styles.bioCard}>
        <h3 className={styles.bioTitle}>Giới thiệu bản thân</h3>
        {isEditing ? (
          <textarea 
            className={styles.textareaField}
            rows={4}
            value={editFields.bio}
            onChange={e => setEditFields({...editFields, bio: e.target.value})}
          />
        ) : (
          <p className={styles.bioContent}>
            {tutorData.bio || "Gia sư chưa cập nhật thông tin giới thiệu chi tiết."}
          </p>
        )}
      </div>
            <div className={styles.bioCard} style={{ marginBottom: "1.5rem", marginTop: "1.5rem" }}>
        <h3 className={styles.bioTitle}>Bằng cấp, chứng chỉ & Giải thưởng (Show cho học sinh)</h3>

        {isEditing ? (
          <div>
            <div className={styles.certUploadSection}>
              <div className={styles.uploadGroup}>
                <label className={styles.uploadBtn}>
                  📁 Chọn ảnh tải lên từ máy
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileUpload}
                    style={{ display: "none" }}
                  />
                </label>
              </div>

              <div className={styles.urlUploadGroup}>
                <input
                  type="text"
                  className={styles.inputField}
                  placeholder="Hoặc dán Link URL hình ảnh bằng cấp..."
                  value={newCertUrl}
                  onChange={(e) => setNewCertUrl(e.target.value)}
                />
                <button
                  type="button"
                  className={styles.btnAddUrl}
                  onClick={handleAddCertUrl}
                >
                Thêm Link
                </button>
              </div>
            </div>

            {/* Danh sách ảnh bằng cấp đang sửa */}
            <div className={styles.certGrid}>
              {editFields.certificates.map((cert, index) => (
                <div key={index} className={styles.certItem}>
                  <img src={cert} alt={`Cert ${index}`} className={styles.certImage} />
                  <button
                    type="button"
                    className={styles.btnDeleteCert}
                    onClick={() => handleRemoveCert(index)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.certGrid}>
            {tutorData.certificates && tutorData.certificates.length > 0 ? (
              tutorData.certificates.map((cert, index) => (
                <div key={index} className={styles.certItem}>
                  <a href={cert} target="_blank" rel="noreferrer">
                    <img src={cert} alt={`Bằng cấp ${index + 1}`} className={styles.certImage} />
                  </a>
                </div>
              ))
            ) : (
              <p className={styles.bioContent}>Gia sư chưa tải lên hình ảnh bằng cấp hoặc chứng chỉ.</p>
            )}
          </div>
        )}
      </div>
      {showChangesModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(15, 23, 42, 0.65)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
          padding: "16px"
        }}>
          <div style={{
            backgroundColor: "#ffffff",
            borderRadius: "16px",
            width: "100%",
            maxWidth: "650px",
            maxHeight: "85vh",
            overflowY: "auto",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            padding: "24px"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "1.25rem", color: "#1e293b" }}>
                🔍 {hasPendingRequest ? "Thông tin yêu cầu sửa đang chờ duyệt" : "Thông tin chỉnh sửa"}
              </h3>
              <button 
                onClick={() => setShowChangesModal(false)}
                style={{ border: "none", background: "none", fontSize: "1.2rem", cursor: "pointer", color: "#64748b" }}
              >
                ✕
              </button>
            </div>

            {!hasAnyChange ? (
              <div style={{ padding: "24px 0", textAlign: "center", color: "#64748b" }}>
                Chưa có thông tin nào được thay đổi.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {changesList.map((item, index) => (
                  <div 
                    key={index}
                    style={{
                      padding: "12px 16px",
                      borderRadius: "8px",
                      border: item.isChanged ? "2px solid #2563eb" : "1px solid #e2e8f0",
                      backgroundColor: item.isChanged ? "#eff6ff" : "#ffffff",
                      transition: "all 0.2s"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span style={{ fontWeight: "600", color: item.isChanged ? "#1e40af" : "#475569" }}>
                        {item.label}
                      </span>
                      {item.isChanged && (
                        <span style={{ fontSize: "0.75rem", backgroundColor: "#2563eb", color: "#ffffff", padding: "2px 8px", borderRadius: "12px", fontWeight: "600" }}>
                          Đã thay đổi
                        </span>
                      )}
                    </div>

                    {item.isChanged ? (
                      <div style={{ fontSize: "0.9rem", display: "flex", flexDirection: "column", gap: "4px" }}>
                        <div style={{ color: "#64748b", textDecoration: "line-through" }}>
                          <strong>Cũ:</strong> {item.oldVal}
                        </div>
                        <div style={{ color: "#1d4ed8", fontWeight: "500" }}>
                          <strong>Mới:</strong> {item.newVal}
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: "0.9rem", color: "#64748b" }}>
                        {item.newVal}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setShowChangesModal(false)}
                style={{
                  padding: "8px 24px",
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}      
    </div>
  );
}