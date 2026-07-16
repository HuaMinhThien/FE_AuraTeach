"use client";

import React, { useState, useEffect } from "react";
import styles from "./TutorApproval.module.css";

export default function TutorApprovalPage() {
  const [pendingTutors, setPendingTutors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTutor, setSelectedTutor] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  // Load danh sách giảng viên chờ duyệt
  const loadPendingTutors = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin-tutor-approval/pending");
      const result = await response.json();
      if (result.success) {
        setPendingTutors(result.data);
      }
    } catch (error) {
      console.error("Lỗi tải danh sách:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPendingTutors();
  }, []);

  // Xem chi tiết
  const handleViewDetail = (tutor) => {
    setSelectedTutor(tutor);
  };

  // Chấp nhận duyệt
  const handleApprove = async (tutor) => {
    if (!window.confirm(`Bạn có chắc muốn duyệt hồ sơ của ${tutor.full_name}?`)) return;

    try {
      const response = await fetch("/api/admin-tutor-approval/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userId: tutor.user_id,
          tutorId: tutor.tutor_id 
        }),
      });
      const result = await response.json();
      if (result.success) {
        alert(`✅ Đã duyệt hồ sơ của ${tutor.full_name}. Giảng viên có thể đăng nhập ngay!`);
        loadPendingTutors();
        setSelectedTutor(null);
      } else {
        alert(result.message || "Có lỗi xảy ra");
      }
    } catch (error) {
      alert("Lỗi khi duyệt hồ sơ!");
    }
  };

  // Từ chối duyệt
  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert("Vui lòng nhập lý do từ chối");
      return;
    }

    try {
      const response = await fetch("/api/admin-tutor-approval/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userId: selectedTutor.user_id,
          tutorId: selectedTutor.tutor_id,
          reason: rejectReason 
        }),
      });
      const result = await response.json();
      if (result.success) {
        alert(`❌ Đã từ chối hồ sơ của ${selectedTutor.full_name}. Lý do: ${rejectReason}`);
        loadPendingTutors();
        setSelectedTutor(null);
        setShowRejectModal(false);
        setRejectReason("");
      } else {
        alert(result.message || "Có lỗi xảy ra");
      }
    } catch (error) {
      alert("Lỗi khi từ chối hồ sơ!");
    }
  };

  // Xóa hồ sơ đã từ chối
  const handleDelete = async (tutor) => {
    if (!window.confirm(`Bạn có chắc muốn xóa hồ sơ của ${tutor.full_name}?`)) return;

    try {
      const response = await fetch("/api/admin-tutor-approval/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userId: tutor.user_id,
          tutorId: tutor.tutor_id 
        }),
      });
      const result = await response.json();
      if (result.success) {
        alert("✅ Đã xóa hồ sơ!");
        loadPendingTutors();
      } else {
        alert(result.message || "Có lỗi xảy ra");
      }
    } catch (error) {
      alert("Lỗi khi xóa hồ sơ!");
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>📋 Xét duyệt giảng viên</h1>
        <p>Quản lý và phê duyệt hồ sơ đăng ký làm giảng viên</p>
        <span className={styles.badgePending}>{pendingTutors.length} hồ sơ chờ duyệt</span>
      </header>

      {isLoading ? (
        <div className={styles.loading}>Đang tải dữ liệu...</div>
      ) : pendingTutors.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>✅</div>
          <h3>Không có hồ sơ chờ duyệt</h3>
          <p>Tất cả giảng viên đã được xét duyệt</p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Họ tên</th>
                <th>Email</th>
                <th>Số điện thoại</th>
                <th>Lĩnh vực</th>
                <th>Ngày đăng ký</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {pendingTutors.map((tutor) => (
                <tr key={tutor.user_id} className={styles.tableRow}>
                  <td className={styles.boldText}>{tutor.full_name}</td>
                  <td>{tutor.email}</td>
                  <td>{tutor.phone}</td>
                  <td>
                    <span className={styles.badgeExpertise}>
                      {tutor.qualification || "Chưa cập nhật"}
                    </span>
                  </td>
                  <td>{new Date(tutor.created_at).toLocaleDateString("vi-VN")}</td>
                  <td>
                    <div className={styles.actionGroup}>
                      <button 
                        className={`${styles.btn} ${styles.btnInfo}`}
                        onClick={() => handleViewDetail(tutor)}
                      >
                        Chi tiết
                      </button>
                      <button 
                        className={`${styles.btn} ${styles.btnSuccess}`}
                        onClick={() => handleApprove(tutor)}
                      >
                        Duyệt
                      </button>
                      <button 
                        className={`${styles.btn} ${styles.btnDanger}`}
                        onClick={() => {
                          setSelectedTutor(tutor);
                          setShowRejectModal(true);
                          setRejectReason("");
                        }}
                      >
                        Từ chối
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal chi tiết */}
      {selectedTutor && !showRejectModal && (
        <div className={styles.modalOverlay} onClick={() => setSelectedTutor(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => setSelectedTutor(null)}>&times;</button>
            
            <div className={styles.modalHeader}>
              <h2>📄 Chi tiết hồ sơ</h2>
              <span className={styles.badgePending}>Chờ duyệt</span>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <label>Họ và tên</label>
                  <p>{selectedTutor.full_name}</p>
                </div>
                <div className={styles.infoItem}>
                  <label>Email</label>
                  <p>{selectedTutor.email}</p>
                </div>
                <div className={styles.infoItem}>
                  <label>Số điện thoại</label>
                  <p>{selectedTutor.phone}</p>
                </div>
                <div className={styles.infoItem}>
                  <label>Lĩnh vực chuyên môn</label>
                  <p>{selectedTutor.qualification || "Chưa cập nhật"}</p>
                </div>
                <div className={styles.infoItem}>
                  <label>CV / Portfolio</label>
                  {selectedTutor.cv_link ? (
                    <a href={selectedTutor.cv_link} target="_blank" rel="noopener noreferrer" className={styles.cvLink}>
                      📎 Xem CV
                    </a>
                  ) : (
                    <p className={styles.noData}>Chưa có CV</p>
                  )}
                </div>
                <div className={styles.infoItem}>
                  <label>Ngày đăng ký</label>
                  <p>{new Date(selectedTutor.created_at).toLocaleString("vi-VN")}</p>
                </div>
              </div>

              <div className={styles.modalActions}>
                <button 
                  className={`${styles.btn} ${styles.btnSuccess}`}
                  onClick={() => {
                    handleApprove(selectedTutor);
                  }}
                >
                  ✅ Chấp nhận
                </button>
                <button 
                  className={`${styles.btn} ${styles.btnDanger}`}
                  onClick={() => {
                    setShowRejectModal(true);
                  }}
                >
                  ❌ Từ chối
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal từ chối */}
      {showRejectModal && selectedTutor && (
        <div className={styles.modalOverlay} onClick={() => {
          setShowRejectModal(false);
          setRejectReason("");
        }}>
          <div className={`${styles.modalContent} ${styles.rejectModal}`} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => {
              setShowRejectModal(false);
              setRejectReason("");
            }}>&times;</button>
            
            <div className={styles.modalHeader}>
              <h2>❌ Từ chối hồ sơ</h2>
              <span className={styles.badgeRejected}>Từ chối</span>
            </div>

            <div className={styles.modalBody}>
              <p><strong>Giảng viên:</strong> {selectedTutor.full_name}</p>
              <p><strong>Email:</strong> {selectedTutor.email}</p>
              
              <div className={styles.rejectForm}>
                <label htmlFor="reason">Lý do từ chối <span className={styles.required}>*</span></label>
                <select 
                  id="reason"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className={styles.selectInput}
                >
                  <option value="">-- Chọn lý do --</option>
                  <option value="Không đủ bằng cấp/chứng chỉ theo yêu cầu">Không đủ bằng cấp/chứng chỉ theo yêu cầu</option>
                  <option value="Không phù hợp với lĩnh vực giảng dạy đăng ký">Không phù hợp với lĩnh vực giảng dạy đăng ký</option>
                  <option value="Thiếu kinh nghiệm giảng dạy">Thiếu kinh nghiệm giảng dạy</option>
                  <option value="Thông tin cá nhân không hợp lệ">Thông tin cá nhân không hợp lệ</option>
                  <option value="Không liên hệ được với ứng viên">Không liên hệ được với ứng viên</option>
                  <option value="CV/Portfolio không đáp ứng yêu cầu">CV/Portfolio không đáp ứng yêu cầu</option>
                  <option value="Lý do khác">Lý do khác</option>
                </select>

                {rejectReason === "Lý do khác" && (
                  <textarea
                    placeholder="Nhập lý do chi tiết..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className={styles.textareaInput}
                    rows={3}
                  />
                )}
              </div>

              <div className={styles.modalActions}>
                <button 
                  className={`${styles.btn} ${styles.btnDanger}`}
                  onClick={handleReject}
                  disabled={!rejectReason}
                >
                  Xác nhận từ chối
                </button>
                <button 
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason("");
                  }}
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}