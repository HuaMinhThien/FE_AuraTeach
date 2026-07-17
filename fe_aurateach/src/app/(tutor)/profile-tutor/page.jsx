"use client";

import React, { useEffect, useState } from "react";
import styles from "./TutorProfile.module.css"; 
import tutorService from "@/services/tutorService";
import authService from "@/services/authService";

export default function TutorProfile() {
  const [tutorData, setTutorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  
  // Trạng thái bật/tắt chế độ chỉnh sửa hồ sơ cá nhân
  const [isEditing, setIsEditing] = useState(false);
  const [editFields, setEditFields] = useState({
    phone: "",
    bio: "",
    qualification: ""
  });

  useEffect(() => {
    const initPage = async () => {
      try {
        setLoading(true);
        // Lấy trực tiếp thông tin user từ authService thay vì tự tách cookie thủ công
        const user = await authService.getCurrentUser();
        const currentUserId = user?.id || user?.user_id;

        if (!currentUserId) {
          setErrorMsg("Không tìm thấy thông tin đăng nhập.");
          return;
        }

        const mergedData = await tutorService.getProfileByUserId(currentUserId);
        
        setTutorData(mergedData);
        setEditFields({
          phone: mergedData.phone || "",
          bio: mergedData.bio || "",
          qualification: mergedData.qualification || ""
        });
      } catch (error) {
        console.error(error);
        setErrorMsg(error.message || "Không tìm thấy dữ liệu gia sư hoặc lỗi kết nối.");
      } finally {
        setLoading(false);
      }
    };

    initPage();
  }, []);

  // Hàm xử lý Lưu thông tin sau khi gia sư chỉnh sửa
  const handleSave = async () => {
    // Ưu tiên lấy tutor_id, nếu không có thì lấy id hoặc user_id từ state đã merge
    const tutorId = tutorData?.tutor_id || tutorData?.id || tutorData?.user_id;

    if (!tutorId) {
      alert("Không tìm thấy mã định danh gia sư (ID đang bị trống). Vui lòng thử tải lại trang!");
      return;
    }

    try {
      // Truyền đúng tutorId thay vì bị undefined
      await tutorService.updateTutorProfile(tutorId, editFields);

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
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
  };

  return (
    <div className={styles.profileContainer}>
      {/* Tiêu đề trang quản lý và nút Chỉnh sửa */}
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

      {/* Khối Thông Tin Đầu Trang */}
      <div className={styles.headerCard}>
        <div className={styles.avatarWrapper}>
          <img
            src={tutorData.avatar || ""}
            alt={tutorData.full_name}
            className={styles.avatar}
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
              <p className={styles.tutorQual}>{tutorData.qualification}</p>
            )}
          </div>

          <div className={styles.badgeGroup}>
            <span className={`${styles.badge} ${styles.badgeRating}`}>⭐ {tutorData.rating ?? "0"} Đánh giá</span>
            <span className={`${styles.badge} ${styles.badgeExp}`}>💼 {tutorData.Experience || "Chưa cập nhật"}</span>
            <span className={`${styles.badge} ${tutorData.verification_status === "Đã xác minh" ? styles.badgeVerifyVerified : styles.badgeVerifyPending}`}>
              ✔️ {tutorData.verification_status}
            </span>
          </div>
        </div>
      </div>

      {/* Grid Số Dư & Liên Hệ */}
      <div className={styles.gridContainer}>
        <div className={styles.balanceCardMain}>
          <p className={styles.balanceLabelMain}>Số dư khả dụng</p>
          <div className={styles.balanceRow}>
            <p className={styles.balanceAmountMain}>{formatCurrency(tutorData.available_balance || 0)}</p>
            <button className={styles.btnPayout}>Rút tiền về ví</button>
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
              tutorData.phone
            )}
          </div>
        </div>
      </div>

      {/* Khối Giới Thiệu (Bio) */}
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