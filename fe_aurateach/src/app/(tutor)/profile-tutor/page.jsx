"use client";

import React, { useEffect, useState } from "react";
import styles from "./TutorProfile.module.css"; 

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

export default function TutorProfile() {
  const [tutorData, setTutorData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  
  // Trạng thái kiểm tra xem gia sư có yêu cầu chưa được duyệt hay không
  const [hasPendingRequest, setHasPendingRequest] = useState(false);

  // Trạng thái bật/tắt bảng chọn Category
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Trạng thái bật/tắt chế độ chỉnh sửa hồ sơ
  const [isEditing, setIsEditing] = useState(false);
  const [editFields, setEditFields] = useState({
    phone: "",
    bio: "",
    experience: "",
    cv_link: "",
    expertise: []
  });

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
          fetch("http://localhost:3007/users").then((res) => res.json()),
          fetch("http://localhost:3007/tutors").then((res) => res.json()),
          fetch("http://localhost:3007/categories").then((res) => res.json()).catch(() => [])
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

          setEditFields({
            phone: mergedData.phone || "",
            bio: mergedData.bio || "",
            experience: mergedData.experience || "",
            cv_link: mergedData.cv_link || "",
            expertise: expArray
          });

          // GOI API KIỂM TRA XEM GIA SƯ ĐÃ CÓ YÊU CẦU CHỜ DUYỆT CHƯA
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

  const getCategoryName = (cat) => {
    if (typeof cat === "string") return cat.trim();
    return (cat.category_name || cat.name || "").trim();
  };

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

  const handleSave = async () => {
    try {
      const oldPayload = {
        phone: tutorData.phone || "",
        bio: tutorData.bio || "",
        experience: tutorData.experience || "",
        cv_link: tutorData.cv_link || "",
        expertise: tutorData.expertise || ""
      };

      const newPayload = {
        phone: editFields.phone,
        bio: editFields.bio,
        experience: editFields.experience,
        cv_link: editFields.cv_link,
        expertise: editFields.expertise.join(", ")
      };

      const response = await fetch("/api/admin-tutor-update-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tutor_id: tutorData.id || tutorData.tutor_id,
          old_data: oldPayload,
          new_data: newPayload
        })
      });

      const result = await response.json();

      if (result.success) {
        setIsEditing(false);
        setIsDropdownOpen(false);
        setHasPendingRequest(true); // Đánh dấu đã gửi yêu cầu chờ duyệt
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
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
  };

  return (
    <div className={styles.profileContainer}>
      {/* Tiêu đề trang quản lý và nút Chỉnh sửa */}
      <div className={styles.pageHeaderActions}>
        <h2>Hồ sơ cá nhân</h2>
        
        {/* NẾU ĐÃ CÓ YÊU CẦU CHỜ DUYỆT THÌ DISABLE NÚT SỬA */}
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
            <button className={styles.btnCancel} onClick={() => { setIsEditing(false); setIsDropdownOpen(false); }}>Hủy</button>
          </div>
        )}
      </div>

      {/* Khối Thông Tin Đầu Trang */}
      <div className={styles.headerCard}>
        <div className={styles.avatarWrapper}>
          <img
            src={tutorData.avatar}
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
          </div>

          <div className={styles.badgeGroup}>
            <span className={`${styles.badge} ${styles.badgeRating}`}>⭐ {tutorData.rating ?? "0"} Đánh giá</span>
            
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

            <span className={`${styles.badge} ${tutorData.verification_status === "approved" ? styles.badgeVerifyVerified : styles.badgeVerifyPending}`}>
              ✔️ {tutorData.verification_status === "approved" ? "Đã xác minh" : "Chưa xác minh"}
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
              style={{
                border: "1px solid #3b82f6",
                borderRadius: "8px",
                padding: "12px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
                backgroundColor: "#ffffff",
                boxShadow: "0 0 0 1px #3b82f6"
              }}
            >
              <span style={{ color: editFields.expertise.length > 0 ? "#1e293b" : "#64748b", fontSize: "0.95rem" }}>
                {editFields.expertise.length > 0 
                  ? editFields.expertise.join(", ") 
                  : "Chọn lĩnh vực chuyên môn"}
              </span>
              <span style={{ fontSize: "0.8rem", color: "#64748b" }}>▲</span>
            </div>

            {isDropdownOpen && (
              <div 
                style={{
                  marginTop: "12px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "16px",
                  backgroundColor: "#f8fafc",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)"
                }}
              >
                <div style={{ fontWeight: "600", fontSize: "0.95rem", color: "#1e293b", marginBottom: "16px" }}>
                  Chọn lĩnh vực
                </div>

                <div 
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: "12px 24px",
                    maxHeight: "260px",
                    overflowY: "auto",
                    paddingRight: "8px"
                  }}
                >
                  {categories.map((cat, idx) => {
                    const catName = getCategoryName(cat);
                    if (!catName) return null;
                    const checked = isCategorySelected(catName);

                    return (
                      <label 
                        key={cat.id || idx}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          cursor: "pointer",
                          fontSize: "0.9rem",
                          color: "#334155",
                          userSelect: "none"
                        }}
                      >
                        <input 
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleCategory(catName)}
                          style={{
                            width: "16px",
                            height: "16px",
                            accentColor: "#2563eb",
                            cursor: "pointer"
                          }}
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
                    style={{
                      padding: "6px 20px",
                      backgroundColor: "#e2e8f0",
                      color: "#475569",
                      border: "none",
                      borderRadius: "6px",
                      fontWeight: "500",
                      fontSize: "0.85rem",
                      cursor: "pointer"
                    }}
                  >
                    Đóng
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
            {tutorData.expertise ? (
              tutorData.expertise.split(",").map((exp, idx) => (
                <span 
                  key={idx} 
                  style={{
                    backgroundColor: "#eff6ff",
                    color: "#1d4ed8",
                    padding: "4px 12px",
                    borderRadius: "6px",
                    fontSize: "0.85rem",
                    fontWeight: "500"
                  }}
                >
                  {exp.trim()}
                </span>
              ))
            ) : (
              <p className={styles.bioContent}>Chưa cập nhật lĩnh vực chuyên môn.</p>
            )}
          </div>
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
    </div>
  );
}