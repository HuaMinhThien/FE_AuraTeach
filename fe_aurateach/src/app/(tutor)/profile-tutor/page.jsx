"use client";

import React, { useEffect, useState } from "react";
import styles from "./TutorProfile.module.css"; 

const API_BASE = "http://localhost:3007";

// Danh sách cố định các khung giờ và thứ trong tuần
const TIME_SLOT_OPTIONS = [
  "07:00 - 09:00",
  "09:00 - 11:00",
  "11:00 - 13:00",
  "13:00 - 15:00",
  "15:00 - 17:00",
  "17:00 - 19:00",
  "19:00 - 21:00"
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

// ✅ HÀM LẤY TÊN CATEGORY
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
  
  // Trạng thái bật/tắt dropdowns
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isTimeSlotsDropdownOpen, setIsTimeSlotsDropdownOpen] = useState(false);
  const [isDaysDropdownOpen, setIsDaysDropdownOpen] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);

  // States quản lý trường chỉnh sửa
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

  // ✅ HÀM KIỂM TRA & TOGGLE CATEGORY
  const isCategorySelected = (catName) => {
    if (!catName) return false;
    const cleanCat = catName.toLowerCase().trim();
    return editFields.expertise.some(
      (item) => item.toLowerCase().trim() === cleanCat
    );
  };

  const handleToggleCategory = (catName) => {
    const cleanCatName = catName.trim();
    if (!cleanCatName) return;

    setEditFields((prev) => {
      const exists = isCategorySelected(cleanCatName);
      if (exists) {
        return {
          ...prev,
          expertise: prev.expertise.filter(
            (item) => item.toLowerCase().trim() !== cleanCatName.toLowerCase()
          ),
        };
      } else {
        return {
          ...prev,
          expertise: [...prev.expertise, cleanCatName],
        };
      }
    });
  };

  // ✅ HÀM KIỂM TRA & TOGGLE TIME SLOTS
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

  // ✅ HÀM XỬ LÝ UPLOAD HÌNH ẢNH BẰNG CẤP / CHỨNG CHỈ (FILE)
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
    const fetchData = async () => {
      const currentUserId = getUserIdFromCookie();
      
      if (!currentUserId) {
        setErrorMsg("Không tìm thấy thông tin đăng nhập.");
        setLoading(false);
        return;
      }

      try {
        const [users, tutors, catList] = await Promise.all([
          fetch(`${API_BASE}/users`).then((res) => res.json()),
          fetch(`${API_BASE}/tutors`).then((res) => res.json()),
          fetch(`${API_BASE}/categories`).then((res) => res.json()).catch(() => [])
        ]);

        setCategories(catList || []);

        const userObj = users.find((u) => u.user_id === currentUserId || u.id === currentUserId);
        const tutorObj = tutors.find((t) => t.user_id === currentUserId || t.id === currentUserId);

        if (userObj && tutorObj) {
          const mergedData = { ...userObj, ...tutorObj };
          setTutorData(mergedData);

          const expArray = mergedData.expertise 
            ? mergedData.expertise.split(",").map((i) => i.trim()).filter(Boolean)
            : [];

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

          setEditFields({
            phone: mergedData.phone || "",
            bio: mergedData.bio || "",
            experience: mergedData.experience || "",
            level: mergedData.level || "Giáo viên",
            cv_link: mergedData.cv_link || "",
            expertise: expArray,
            certificates: mergedData.certificates || [],
            available_days: daysArray,
            available_time_slots: timeSlotsArray
          });

          const currentTutorId = tutorObj.id || tutorObj.tutor_id;
          const checkRes = await fetch(`/api/admin-tutor-update-requests?tutor_id=${currentTutorId}`);
          const checkData = await checkRes.json();
          
          if (checkData.success && checkData.hasPending) {
            setHasPendingRequest(true);
          }
        } else {
          setErrorMsg("Không tìm thấy dữ liệu gia sư.");
        }
      } catch (err) {
        console.error(err);
        setErrorMsg("Lỗi kết nối server.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ✅ HÀM LƯU YÊU CẦU CHỈNH SỬA
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
        available_time_slots: tutorData.available_time_slots || ""
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
        available_time_slots: editFields.available_time_slots.join(", ")
      };

      const response = await fetch("/api/admin-tutor-update-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tutor_update_req_id: `req_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          tutor_id: tutorData.id || tutorData.tutor_id,
          old_data: oldPayload,
          new_data: newPayload
        })
      });

      const result = await response.json();

      if (result.success) {
        setIsEditing(false);
        setIsDropdownOpen(false);
        setIsTimeSlotsDropdownOpen(false);
        setIsDaysDropdownOpen(false);
        setHasPendingRequest(true);
        alert("✅ Yêu cầu chỉnh sửa hồ sơ đã gửi thành công! Vui lòng chờ Admin phê duyệt.");
      } else {
        alert(`❌ ${result.message || "Gửi yêu cầu thất bại, vui lòng thử lại"}`);
      }
    } catch (error) {
      console.error("Lỗi gửi yêu cầu cập nhật:", error);
      alert("Không thể kết nối đến máy chủ.");
    }
  };

  if (loading) return <div className={styles.loadingContainer}><div className={styles.spinner}></div></div>;
  if (errorMsg || !tutorData) return <div className={styles.errorContainer}>{errorMsg}</div>;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount || 0);
  };

  // Helper hiển thị danh sách thứ & thời gian rảnh dạng mảng hoặc chuỗi
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
          <button 
            className={styles.btnEdit} 
            disabled 
            style={{ opacity: 0.6, cursor: "not-allowed", backgroundColor: "#f59e0b", color: "#fff" }}
          >
            ⏳ Yêu cầu sửa đang chờ duyệt...
          </button>
        ) : !isEditing ? (
          <button className={styles.btnEdit} onClick={() => setIsEditing(true)}>
            ⚙️ Chỉnh sửa thông tin
          </button>
        ) : (
          <div className={styles.btnActionGroup}>
            <button className={styles.btnSave} onClick={handleSave}>💾 Gửi yêu cầu duyệt</button>
            <button className={styles.btnCancel} onClick={() => { 
              setIsEditing(false); 
              setIsDropdownOpen(false);
              setIsTimeSlotsDropdownOpen(false);
              setIsDaysDropdownOpen(false);
            }}>Hủy</button>
          </div>
        )}
      </div>

      {/* Header Card */}
      <div className={styles.headerCard}>
        <div className={styles.avatarWrapper}>
          <img
            src={tutorData.avatar || "/img/default-avatar.svg"}
            alt={tutorData.full_name}
            className={styles.avatar}
            onError={(e) => { e.target.src = "/img/default-avatar.svg"; }}
          />
          <span className={`${styles.statusBadge} ${tutorData.status === "active" ? styles.statusActive : styles.statusLocked}`}>
            {tutorData.status === "active" ? "Đang hoạt động" : "Tạm khóa"}
          </span>
        </div>

        <div className={styles.infoWrapper}>
          <div>
            <h1 className={styles.tutorName}>{tutorData.full_name}</h1>
          </div>

          <div className={styles.badgeGroup}>
            <span className={`${styles.badge} ${styles.badgeRating}`}>⭐ {tutorData.rating ?? "0"} Đánh giá</span>
            
            {/* Hiển thị & Chỉnh sửa Level */}
            {isEditing ? (
              <select
                className={styles.inputField}
                style={{ width: "130px", padding: "4px 8px" }}
                value={editFields.level}
                onChange={(e) => setEditFields({ ...editFields, level: e.target.value })}
              >
                <option value="Giáo viên">Giáo viên</option>
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
              ✔️ {tutorData.verification_status || "Chưa xác minh"}
            </span>
          </div>
        </div>
      </div>

      {/* Balance Cards */}
      <div className={styles.gridContainer}>
        <div className={styles.balanceCardMain}>
          <p className={styles.balanceLabelMain}>Số dư khả dụng</p>
          <div className={styles.balanceRow}>
            <p className={styles.balanceAmountMain}>{formatCurrency(tutorData.available_balance || 0)}</p>
            <button 
              className={styles.btnPayout}
              disabled={(tutorData.available_balance || 0) <= 0}
              style={{
                opacity: (tutorData.available_balance || 0) <= 0 ? 0.5 : 1,
                cursor: (tutorData.available_balance || 0) <= 0 ? 'not-allowed' : 'pointer'
              }}
            >
              {tutorData.available_balance > 0 ? "Rút tiền về ví" : "Chưa có tiền"}
            </button>
          </div>
        </div>

        <div className={styles.balanceCardSub}>
          <p className={styles.balanceLabelSub}>Số dư đang treo</p>
          <p className={styles.balanceAmountSub}>{formatCurrency(tutorData.pending_balance || 0)}</p>
        </div>

        <div className={styles.contactCard}>
          <div><span className={styles.contactLabel}>Email:</span> {tutorData.email}</div>
          <div>
            <span className={styles.contactLabel}>Hotline:</span>{" "}
            {isEditing ? (
              <input 
                type="text" 
                className={styles.inputField}
                value={editFields.phone}
                onChange={e => setEditFields({...editFields, phone: e.target.value})}
              />
            ) : (
              tutorData.phone || "Chưa cập nhật"
            )}
          </div>

          <div style={{ marginTop: "6px" }}>
            <span className={styles.contactLabel}>Link CV / Portfolio:</span>{" "}
            {isEditing ? (
              <input 
                type="url" 
                className={styles.inputField}
                value={editFields.cv_link}
                onChange={e => setEditFields({...editFields, cv_link: e.target.value})}
                placeholder="https://drive.google.com/..."
              />
            ) : tutorData.cv_link ? (
              <a href={tutorData.cv_link} target="_blank" rel="noreferrer" className={styles.cvLink}>
                📄 Xem CV
              </a>
            ) : (
              <span style={{ color: "#9ca3af" }}>Chưa cập nhật</span>
            )}
          </div>
        </div>
      </div>

      {/* KHỐI LĨNH VỰC CHUYÊN MÔN */}
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

      {/* KHỐI GIỚI THIỆU (BIO) */}
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

      {/* KHỐI HÌNH ẢNH BẰNG CẤP, CHỨNG CHỈ & GIẢI THƯỞNG */}
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
    </div>
  );
}