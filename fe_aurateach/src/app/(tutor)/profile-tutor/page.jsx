"use client";

import React, { useEffect, useState } from "react";
import styles from "./TutorProfile.module.css"; 

const API_BASE = "http://localhost:3007";

const getUserIdFromCookie = () => {
  try {
    const cookies = document.cookie.split("; ");
    const userInfoCookie = cookies.find((row) => row.startsWith("user_info="));
    if (userInfoCookie) {
      const cookieValue = userInfoCookie.split("=")[1];
      const decodedValue = decodeURIComponent(cookieValue);
      const userInfo = JSON.parse(decodedValue);
      return userInfo.user_id || userInfo.id || null;
    }
  } catch (error) {
    console.error("Lỗi đọc cookie:", error);
  }
  return null;
};

export default function TutorProfile() {
  const [tutorData, setTutorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  
  const [isEditing, setIsEditing] = useState(false);
  const [editFields, setEditFields] = useState({
    phone: "",
    bio: "",
    qualification: ""
  });

  useEffect(() => {
    const currentUserId = getUserIdFromCookie();
    if (!currentUserId) {
      setErrorMsg("Không tìm thấy thông tin đăng nhập.");
      setLoading(false);
      return;
    }

    Promise.all([
      fetch(`${API_BASE}/users`).then((res) => res.json()),
      fetch(`${API_BASE}/tutors`).then((res) => res.json())
    ])
      .then(([users, tutors]) => {
        const userObj = users.find((u) => u.user_id === currentUserId);
        const tutorObj = tutors.find((t) => t.user_id === currentUserId);

        if (userObj && tutorObj) {
          const mergedData = { ...userObj, ...tutorObj };
          setTutorData(mergedData);
          setEditFields({
            phone: mergedData.phone || "",
            bio: mergedData.bio || "",
            qualification: mergedData.qualification || ""
          });
        } else {
          setErrorMsg("Không tìm thấy dữ liệu gia sư.");
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setErrorMsg("Lỗi kết nối server.");
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    try {
      // Cập nhật users
      await fetch(`${API_BASE}/users/${tutorData.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: editFields.phone })
      });

      // Cập nhật tutors
      await fetch(`${API_BASE}/tutors/${tutorData.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          bio: editFields.bio,
          qualification: editFields.qualification
        })
      });

      setTutorData(prev => ({ ...prev, ...editFields }));
      setIsEditing(false);
      alert("Cập nhật hồ sơ cá nhân thành công!");
    } catch (error) {
      console.error("Lỗi cập nhật hồ sơ:", error);
      alert("Không thể lưu thay đổi.");
    }
  };

  if (loading) return <div className={styles.loadingContainer}><div className={styles.spinner}></div></div>;
  if (errorMsg || !tutorData) return <div className={styles.errorContainer}>{errorMsg}</div>;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount || 0);
  };

  return (
    <div className={styles.profileContainer}>
      <div className={styles.pageHeaderActions}>
        <h2>Hồ sơ cá nhân</h2>
        {!isEditing ? (
          <button className={styles.btnEdit} onClick={() => setIsEditing(true)}>
            ⚙️ Chỉnh sửa thông tin
          </button>
        ) : (
          <div className={styles.btnActionGroup}>
            <button className={styles.btnSave} onClick={handleSave}>💾 Lưu thay đổi</button>
            <button className={styles.btnCancel} onClick={() => setIsEditing(false)}>Hủy</button>
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
            {isEditing ? (
              <input 
                type="text" 
                className={styles.inputField}
                value={editFields.qualification}
                onChange={e => setEditFields({...editFields, qualification: e.target.value})}
              />
            ) : (
              <p className={styles.tutorQual}>{tutorData.qualification || "Chưa cập nhật"}</p>
            )}
          </div>

          <div className={styles.badgeGroup}>
            <span className={`${styles.badge} ${styles.badgeRating}`}>⭐ {tutorData.rating ?? "0"} Đánh giá</span>
            <span className={`${styles.badge} ${styles.badgeExp}`}>💼 {tutorData.Experience || "Chưa cập nhật"}</span>
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
        </div>
      </div>

      {/* Bio */}
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
    </div>
  );
}