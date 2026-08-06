"use client";

import React, { useState, useEffect } from "react";
import styles from "./TutorApproval.module.css";

export default function TutorApprovalPage() {
  const [activeTab, setActiveTab] = useState("pending_tutors"); // "pending_tutors" | "update_requests"
  const [pendingTutors, setPendingTutors] = useState([]);
  const [updateRequests, setUpdateRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // States cho modal
  const [selectedTutor, setSelectedTutor] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  // Load danh sách dữ liệu
  const loadData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === "pending_tutors") {
        const response = await fetch("/api/admin-tutor-approval/pending");
        const result = await response.json();
        if (result.success) setPendingTutors(result.data || []);
      } else {
        const response = await fetch("http://localhost:3007/tutor_update_requests?status=pending");
        const data = await response.json();
        setUpdateRequests(data || []);
      }
    } catch (error) {
      console.error("Lỗi tải dữ liệu:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    
    async function fetchData() {
      setIsLoading(true);
      try {
        if (activeTab === "pending_tutors") {
          const response = await fetch("/api/admin-tutor-approval/pending");
          const result = await response.json();
          if (!ignore && result.success) setPendingTutors(result.data || []);
        } else {
          const response = await fetch("http://localhost:3007/tutor_update_requests?status=pending");
          const data = await response.json();
          if (!ignore) setUpdateRequests(data || []);
        }
      } catch (error) {
        console.error("Lỗi tải dữ liệu:", error);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    fetchData();

    return () => {
      ignore = true; // Chống race-condition khi switch tab nhanh
    };
  }, [activeTab]);

  // Xử lý Duyệt Gia Sư Mới
  const handleApproveTutor = async (tutor) => {
    if (!window.confirm(`Bạn có chắc muốn duyệt hồ sơ của ${tutor.full_name}?`)) return;

    try {
      const response = await fetch("/api/admin-tutor-approval/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: tutor.user_id, tutorId: tutor.tutor_id }),
      });
      const result = await response.json();
      if (result.success) {
        alert(`✅ Đã duyệt hồ sơ của ${tutor.full_name}.`);
        loadData();
        setSelectedTutor(null);
      } else {
        alert(result.message || "Có lỗi xảy ra");
      }
    } catch (error) {
      alert("Lỗi khi duyệt hồ sơ!");
    }
  };

  // Xử lý Từ chối Gia Sư Mới
  const handleRejectTutor = async () => {
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
          reason: rejectReason,
        }),
      });
      const result = await response.json();
      if (result.success) {
        alert(`❌ Đã từ chối hồ sơ của ${selectedTutor.full_name}.`);
        loadData();
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

  // Xử lý Duyệt/Từ chối Yêu cầu Cập nhật Thông tin
  const handleProcessUpdateRequest = async (reqId, status) => {
    const actionText = status === "approved" ? "duyệt" : "từ chối";
    if (!window.confirm(`Bạn có chắc muốn ${actionText} yêu cầu thay đổi này?`)) return;

    try {
      const response = await fetch(`/api/admin-tutor-update-requests/${reqId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reject_reason: status === "rejected" ? rejectReason : null }),
      });
      const result = await response.json();
      if (result.success) {
        alert(`✅ Đã ${actionText} yêu cầu cập nhật thành công!`);
        await loadData();
        setSelectedRequest(null);
        setShowRejectModal(false);
      } else {
        alert(result.message || "Thao tác thất bại");
      }
    } catch (error) {
      alert("Có lỗi xảy ra khi xử lý yêu cầu!");
    }
  };

  // Helper hiển thị danh sách hình ảnh/bằng cấp
  const renderCertificates = (certs) => {
    if (!certs || !Array.isArray(certs) || certs.length === 0) {
      return <p style={{ color: "#94a3b8", fontSize: "13px" }}>Không có hình ảnh/bằng cấp đi kèm.</p>;
    }
    return (
      <div className={styles.certGrid}>
        {certs.map((cert, index) => (
          <a key={index} href={cert} target="_blank" rel="noreferrer">
            <img src={cert} alt={`Bằng cấp ${index + 1}`} className={styles.certImage} />
          </a>
        ))}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1>Quản lý Xét duyệt Gia sư</h1>
          <p>Phê duyệt hồ sơ đăng ký mới và các yêu cầu chỉnh sửa thông tin gia sư</p>
        </div>

        {/* Tab Switcher */}
        <div className={styles.tabContainer}>
          <button
            className={`${styles.tabBtn} ${activeTab === "pending_tutors" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("pending_tutors")}
          >
            Hồ sơ đăng ký mới
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === "update_requests" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("update_requests")}
          >
            Yêu cầu sửa thông tin ({updateRequests.length})
          </button>
        </div>
      </header>

      {/* Hiển thị danh sách theo Tab */}
      {isLoading ? (
        <div className={styles.loading}>Đang tải dữ liệu...</div>
      ) : (
        <div>
          {activeTab === "pending_tutors" ? (
            /* --- BẢNG DÂN SÁCH ĐĂNG KÝ MỚI --- */
            pendingTutors.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>✅</div>
                <h3>Không có hồ sơ chờ duyệt</h3>
              </div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Ảnh</th>
                      <th>Họ tên</th>
                      <th>Email</th>
                      <th>Số điện thoại</th>
                      <th>Trình độ</th>
                      <th>Lĩnh vực</th>
                      <th>Ngày đăng ký</th>
                      <th>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingTutors.map((tutor) => (
                      <tr key={tutor.user_id} className={styles.tableRow}>
                        <td>
                          <img
                            src={tutor.avatar || "/img/avt/avt.jpg"}
                            alt={tutor.full_name}
                            className={styles.tableAvatar}
                          />
                        </td>
                        <td className={styles.boldText}>{tutor.full_name}</td>
                        <td>{tutor.email}</td>
                        <td>{tutor.phone}</td>
                        <td>
                          <span className={styles.badgeLevel}>{tutor.level || "Chưa chọn"}</span>
                        </td>
                        <td>
                          <span className={styles.badgeExpertise}>
                            {tutor.expertise || "Chưa cập nhật"}
                          </span>
                        </td>
                        <td>{new Date(tutor.created_at).toLocaleDateString("vi-VN")}</td>
                        <td>
                          <div className={styles.actionGroup}>
                            <button
                              className={`${styles.btn} ${styles.btnInfo}`}
                              onClick={() => {
                                setSelectedTutor(tutor);
                                setShowRejectModal(false);
                              }}
                            >
                              Chi tiết
                            </button>
                            <button
                              className={`${styles.btn} ${styles.btnSuccess}`}
                              onClick={() => handleApproveTutor(tutor)}
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
            )
          ) : (
            /* --- BẢNG YÊU CẦU CẬP NHẬT THÔNG TIN --- */
            updateRequests.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📝</div>
                <h3>Không có yêu cầu thay đổi thông tin nào</h3>
              </div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Mã Yêu Cầu</th>
                      <th>Gia sư (ID)</th>
                      <th>Lĩnh vực mới</th>
                      <th>Trình độ mới</th>
                      <th>Thời gian yêu cầu</th>
                      <th>Trạng thái</th>
                      <th>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {updateRequests.map((req) => (
                      <tr key={req.id} className={styles.tableRow}>
                        <td className={styles.boldText}>#{req.id}</td>
                        <td>{req.tutor_id}</td>
                        <td>
                          <span className={styles.badgeExpertise}>{req.new_data?.expertise}</span>
                        </td>
                        <td>
                          <span className={styles.badgeLevel}>{req.new_data?.level || "Không đổi"}</span>
                        </td>
                        <td>{new Date(req.created_at).toLocaleString("vi-VN")}</td>
                        <td>
                          <span className={styles.badgePending}>Chờ duyệt</span>
                        </td>
                        <td>
                          <div className={styles.actionGroup}>
                            <button
                              className={`${styles.btn} ${styles.btnInfo}`}
                              onClick={() => setSelectedRequest(req)}
                            >
                              Đối chiếu Cũ/Mới
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      )}

      {/* ================= MODAL XEM CHI TIẾT HỒ SƠ ĐĂNG KÝ MỚI ================= */}
      {selectedTutor && !showRejectModal && (
        <div className={styles.modalOverlay} onClick={() => setSelectedTutor(null)}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <button className={styles.closeBtn} onClick={() => setSelectedTutor(null)}>
              &times;
            </button>

            <div className={styles.modalHeader}>
              <h2>📄 Chi Tiết Hồ Sơ Đăng Ký Gia Sư</h2>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.infoItem} style={{ textAlign: "center", marginBottom: "16px" }}>
                <img
                  src={selectedTutor.avatar || "/img/avt/avt.jpg"}
                  alt={selectedTutor.full_name}
                  className={styles.modalAvatar}
                />
              </div>
              <div className={styles.infoItem}>
                <label>Họ và tên:</label>
                <p className={styles.boldText}>{selectedTutor.full_name}</p>
              </div>
              <div className={styles.infoItem}>
                <label>Email:</label>
                <p>{selectedTutor.email}</p>
              </div>
              <div className={styles.infoItem}>
                <label>Số điện thoại:</label>
                <p>{selectedTutor.phone}</p>
              </div>
              <div className={styles.infoItem}>
                <label>Cấp bậc / Trình độ:</label>
                <p className={styles.badgeLevel}>{selectedTutor.level || "Chưa cập nhật"}</p>
              </div>
              <div className={styles.infoItem}>
                <label>Lĩnh vực / Chuyên môn:</label>
                <p className={styles.badgeExpertise}>{selectedTutor.expertise || "Chưa cập nhật"}</p>
              </div>
              <div className={styles.infoItem}>
                <label>Kinh nghiệm giảng dạy:</label>
                <p>{selectedTutor.experience || "Chưa cập nhật"}</p>
              </div>
              <div className={styles.infoItem}>
                <label>Giới thiệu bản thân (Bio):</label>
                <div className={styles.bioBox}>
                  {selectedTutor.bio || "Không có thông tin giới thiệu."}
                </div>
              </div>
              {selectedTutor.cv_link && (
                <div className={styles.infoItem}>
                  <label>Hồ sơ năng lực / CV:</label>
                  <a
                    href={selectedTutor.cv_link}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.cvLink}
                  >
                    🔗 Xem File CV / Bằng Cấp
                  </a>
                </div>
              )}

              <div className={styles.modalActions} style={{ marginTop: "20px" }}>
                <button
                  className={`${styles.btn} ${styles.btnSuccess}`}
                  onClick={() => handleApproveTutor(selectedTutor)}
                >
                  Duyệt hồ sơ này
                </button>
                <button
                  className={`${styles.btn} ${styles.btnDanger}`}
                  onClick={() => setShowRejectModal(true)}
                >
                  Từ chối
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL ĐỐI CHIẾU DỮ LIỆU CỦ VS MỚI ================= */}
      {selectedRequest && (
        <div className={styles.modalOverlay} onClick={() => setSelectedRequest(null)}>
          <div
            className={`${styles.modalContent} ${styles.compareModal}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button className={styles.closeBtn} onClick={() => setSelectedRequest(null)}>
              &times;
            </button>

            <div className={styles.modalHeader}>
              <h2>🔄 Đối Chiếu Thay Đổi Thông Tin (ID: #{selectedRequest.id})</h2>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.compareGrid}>
                {/* Cột dữ liệu CŨ */}
                <div className={styles.compareColOld}>
                  <h3 className={styles.colTitleOld}>Dữ Liệu Cũ</h3>
                  <div className={styles.infoItem}>
                    <label>Số điện thoại</label>
                    <p
                      className={
                        selectedRequest.old_data?.phone !== selectedRequest.new_data?.phone
                          ? styles.changedText
                          : ""
                      }
                    >
                      {selectedRequest.old_data?.phone}
                    </p>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Trình độ (Level)</label>
                    <p
                      className={
                        selectedRequest.old_data?.level !== selectedRequest.new_data?.level
                          ? styles.changedText
                          : ""
                      }
                    >
                      {selectedRequest.old_data?.level || "Chưa có"}
                    </p>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Chuyên môn / Lĩnh vực</label>
                    <p
                      className={
                        selectedRequest.old_data?.expertise !== selectedRequest.new_data?.expertise
                          ? styles.changedText
                          : ""
                      }
                    >
                      {selectedRequest.old_data?.expertise}
                    </p>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Kinh nghiệm</label>
                    <p
                      className={
                        selectedRequest.old_data?.experience !==
                        selectedRequest.new_data?.experience
                          ? styles.changedText
                          : ""
                      }
                    >
                      {selectedRequest.old_data?.experience}
                    </p>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Giới thiệu (Bio)</label>
                    <div
                      className={`${styles.bioBox} ${
                        selectedRequest.old_data?.bio !== selectedRequest.new_data?.bio
                          ? styles.changedText
                          : ""
                      }`}
                    >
                      {selectedRequest.old_data?.bio}
                    </div>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Link CV</label>
                    <a
                      href={selectedRequest.old_data?.cv_link}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.cvLink}
                    >
                      Xem CV cũ
                    </a>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Hình ảnh / Chứng chỉ đính kèm cũ</label>
                    {renderCertificates(selectedRequest.old_data?.certificates)}
                  </div>
                </div>

                {/* Cột dữ liệu MỚI */}
                <div className={styles.compareColNew}>
                  <h3 className={styles.colTitleNew}>Dữ Liệu Mới (Cần Duyệt)</h3>
                  <div className={styles.infoItem}>
                    <label>Số điện thoại</label>
                    <p
                      className={
                        selectedRequest.old_data?.phone !== selectedRequest.new_data?.phone
                          ? styles.highlightNew
                          : ""
                      }
                    >
                      {selectedRequest.new_data?.phone}
                    </p>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Trình độ (Level)</label>
                    <p
                      className={
                        selectedRequest.old_data?.level !== selectedRequest.new_data?.level
                          ? styles.highlightNew
                          : ""
                      }
                    >
                      {selectedRequest.new_data?.level || "Chưa có"}
                    </p>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Chuyên môn / Lĩnh vực</label>
                    <p
                      className={
                        selectedRequest.old_data?.expertise !== selectedRequest.new_data?.expertise
                          ? styles.highlightNew
                          : ""
                      }
                    >
                      {selectedRequest.new_data?.expertise}
                    </p>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Kinh nghiệm</label>
                    <p
                      className={
                        selectedRequest.old_data?.experience !==
                        selectedRequest.new_data?.experience
                          ? styles.highlightNew
                          : ""
                      }
                    >
                      {selectedRequest.new_data?.experience}
                    </p>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Giới thiệu (Bio)</label>
                    <div
                      className={`${styles.bioBox} ${
                        selectedRequest.old_data?.bio !== selectedRequest.new_data?.bio
                          ? styles.highlightNew
                          : ""
                      }`}
                    >
                      {selectedRequest.new_data?.bio}
                    </div>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Link CV</label>
                    <a
                      href={selectedRequest.new_data?.cv_link}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.cvLink}
                    >
                      Xem CV mới
                    </a>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Hình ảnh / Chứng chỉ đính kèm mới</label>
                    {renderCertificates(selectedRequest.new_data?.certificates)}
                  </div>
                </div>
              </div>

              {/* Thao tác phê duyệt thay đổi */}
              <div className={styles.modalActions}>
                <button
                  className={`${styles.btn} ${styles.btnSuccess}`}
                  onClick={() => handleProcessUpdateRequest(selectedRequest.id, "approved")}
                >
                  Đồng ý cập nhật
                </button>
                <button
                  className={`${styles.btn} ${styles.btnDanger}`}
                  onClick={() => handleProcessUpdateRequest(selectedRequest.id, "rejected")}
                >
                  Từ chối cập nhật
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal từ chối đăng ký mới */}
      {showRejectModal && selectedTutor && (
        <div className={styles.modalOverlay} onClick={() => setShowRejectModal(false)}>
          <div
            className={`${styles.modalContent} ${styles.rejectModal}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button className={styles.closeBtn} onClick={() => setShowRejectModal(false)}>
              &times;
            </button>
            <div className={styles.modalHeader}>
              <h2>❌ Từ chối hồ sơ</h2>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.rejectForm}>
                <label>Lý do từ chối</label>
                <select
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className={styles.selectInput}
                >
                  <option value="">-- Chọn lý do --</option>
                  <option value="Không đủ bằng cấp/chứng chỉ">Không đủ bằng cấp/chứng chỉ</option>
                  <option value="Thông tin cá nhân không hợp lệ">Thông tin cá nhân không hợp lệ</option>
                  <option value="Lý do khác">Lý do khác</option>
                </select>
              </div>
              <div className={styles.modalActions}>
                <button
                  className={`${styles.btn} ${styles.btnDanger}`}
                  onClick={handleRejectTutor}
                  disabled={!rejectReason}
                >
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}