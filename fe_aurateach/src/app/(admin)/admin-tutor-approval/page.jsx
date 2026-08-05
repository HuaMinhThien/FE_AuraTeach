"use client";

import React, { useState, useEffect } from "react";
import styles from "./TutorApproval.module.css";
import { adminService } from "@/services/adminService";

export default function TutorApprovalPage() {
  const [activeTab, setActiveTab] = useState("pending_tutors"); // "pending_tutors" | "update_requests"
  const [pendingTutors, setPendingTutors] = useState([]);
  const [updateRequests, setUpdateRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // States quản lý modal & thao tác
  const [selectedTutor, setSelectedTutor] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  // Hàm tải dữ liệu chung dùng adminService
  const loadData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === "pending_tutors") {
        const result = await adminService.getPendingTutors();
        if (result?.success) {
          setPendingTutors(result.data || []);
        }
      } else {
        const result = await adminService.getUpdateRequests();
        setUpdateRequests(result?.data || result || []);
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
          const result = await adminService.getPendingTutors();
          if (!ignore && result?.success) {
            setPendingTutors(result.data || []);
          }
        } else {
          const result = await adminService.getUpdateRequests();
          if (!ignore) {
            setUpdateRequests(result?.data || result || []);
          }
        }
      } catch (error) {
        console.error("Lỗi tải dữ liệu:", error);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    fetchData();

    return () => {
      ignore = true; // Ngăn chặn race-condition khi chuyển tab nhanh
    };
  }, [activeTab]);

  // Xử lý Duyệt Gia Sư Mới
  const handleApproveTutor = async (tutor) => {
    if (!window.confirm(`Bạn có chắc muốn duyệt hồ sơ của ${tutor.full_name}?`)) return;

    try {
      const result = await adminService.approveTutor(tutor.user_id, tutor.tutor_id);
      if (result?.success) {
        alert(`✅ Đã duyệt hồ sơ của ${tutor.full_name}.`);
        loadData();
        setSelectedTutor(null);
      } else {
        alert(result?.message || "Có lỗi xảy ra");
      }
    } catch (error) {
      alert(error?.message || "Lỗi khi duyệt hồ sơ!");
    }
  };

  // Xử lý Từ chối Gia Sư Mới
  const handleRejectTutor = async () => {
    if (!rejectReason.trim()) {
      alert("Vui lòng nhập lý do từ chối");
      return;
    }

    try {
      const result = await adminService.rejectTutor(
        selectedTutor.user_id,
        selectedTutor.tutor_id,
        rejectReason
      );
      if (result?.success) {
        alert(`❌ Đã từ chối hồ sơ của ${selectedTutor.full_name}.`);
        loadData();
        setSelectedTutor(null);
        setShowRejectModal(false);
        setRejectReason("");
      } else {
        alert(result?.message || "Có lỗi xảy ra");
      }
    } catch (error) {
      alert(error?.message || "Lỗi khi từ chối hồ sơ!");
    }
  };

  // Xử lý Duyệt/Từ chối Yêu cầu Cập nhật Thông tin
  const handleProcessUpdateRequest = async (reqId, status) => {
    const actionText = status === "approved" ? "duyệt" : "từ chối";
    if (!window.confirm(`Bạn có chắc muốn ${actionText} yêu cầu thay đổi này?`)) return;

    try {
      const result = await adminService.sendUpdateEvaluationRequest(reqId, {
        status,
        reject_reason: status === "rejected" ? rejectReason : null,
      });
      if (result?.success) {
        alert(`✅ Đã ${actionText} yêu cầu cập nhật thành công!`);
        loadData();
        setSelectedRequest(null);
      } else {
        alert(result?.message || "Thao tác thất bại");
      }
    } catch (error) {
      alert(error?.message || "Có lỗi xảy ra khi xử lý yêu cầu!");
    }
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
                      <tr key={tutor.user_id || tutor.id} className={styles.tableRow}>
                        <td className={styles.boldText}>{tutor.full_name}</td>
                        <td>{tutor.email}</td>
                        <td>{tutor.phone}</td>
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
                          <span className={styles.badgeExpertise}>
                            {req.new_data?.expertise || req.expertise || "N/A"}
                          </span>
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
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => setSelectedTutor(null)}>
              &times;
            </button>

            <div className={styles.modalHeader}>
              <h2>📄 Chi Tiết Hồ Sơ Đăng Ký Gia Sư</h2>
            </div>

            <div className={styles.modalBody}>
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

      {/* ================= MODAL NHẬP LÝ DO TỪ CHỐI GIA SƯ MỚI ================= */}
      {selectedTutor && showRejectModal && (
        <div className={styles.modalOverlay} onClick={() => setShowRejectModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => setShowRejectModal(false)}>
              &times;
            </button>
            <div className={styles.modalHeader}>
              <h2>❌ Từ Chối Hồ Sơ: {selectedTutor.full_name}</h2>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.infoItem}>
                <label>Vui lòng nhập lý do từ chối (Gửi thông báo đến gia sư):</label>
                <textarea
                  className={styles.textarea}
                  rows={4}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Nhập lý do chi tiết..."
                />
              </div>
              <div className={styles.modalActions} style={{ marginTop: "20px" }}>
                <button
                  className={`${styles.btn} ${styles.btnDanger}`}
                  onClick={handleRejectTutor}
                >
                  Xác nhận Từ chối
                </button>
                <button
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  onClick={() => setShowRejectModal(false)}
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL ĐỐI CHIẾU DỮ LIỆU CŨ VS MỚI ================= */}
      {selectedRequest && (
        <div className={styles.modalOverlay} onClick={() => setSelectedRequest(null)}>
          <div className={`${styles.modalContent} ${styles.compareModal}`} onClick={(e) => e.stopPropagation()}>
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
                    <p className={selectedRequest.old_data?.phone !== selectedRequest.new_data?.phone ? styles.changedText : ""}>
                      {selectedRequest.old_data?.phone}
                    </p>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Chuyên môn / Lĩnh vực</label>
                    <p className={selectedRequest.old_data?.expertise !== selectedRequest.new_data?.expertise ? styles.changedText : ""}>
                      {selectedRequest.old_data?.expertise}
                    </p>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Kinh nghiệm</label>
                    <p className={selectedRequest.old_data?.experience !== selectedRequest.new_data?.experience ? styles.changedText : ""}>
                      {selectedRequest.old_data?.experience}
                    </p>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Giới thiệu (Bio)</label>
                    <div className={`${styles.bioBox} ${selectedRequest.old_data?.bio !== selectedRequest.new_data?.bio ? styles.changedText : ""}`}>
                      {selectedRequest.old_data?.bio}
                    </div>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Link CV</label>
                    <a href={selectedRequest.old_data?.cv_link} target="_blank" rel="noreferrer" className={styles.cvLink}>
                      Xem CV cũ
                    </a>
                  </div>
                </div>

                {/* Cột dữ liệu MỚI */}
                <div className={styles.compareColNew}>
                  <h3 className={styles.colTitleNew}>Dữ Liệu Mới (Cần Duyệt)</h3>
                  <div className={styles.infoItem}>
                    <label>Số điện thoại</label>
                    <p className={selectedRequest.old_data?.phone !== selectedRequest.new_data?.phone ? styles.highlightNew : ""}>
                      {selectedRequest.new_data?.phone}
                    </p>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Chuyên môn / Lĩnh vực</label>
                    <p className={selectedRequest.old_data?.expertise !== selectedRequest.new_data?.expertise ? styles.highlightNew : ""}>
                      {selectedRequest.new_data?.expertise}
                    </p>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Kinh nghiệm</label>
                    <p className={selectedRequest.old_data?.experience !== selectedRequest.new_data?.experience ? styles.highlightNew : ""}>
                      {selectedRequest.new_data?.experience}
                    </p>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Giới thiệu (Bio)</label>
                    <div className={`${styles.bioBox} ${selectedRequest.old_data?.bio !== selectedRequest.new_data?.bio ? styles.highlightNew : ""}`}>
                      {selectedRequest.new_data?.bio}
                    </div>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Link CV</label>
                    <a href={selectedRequest.new_data?.cv_link} target="_blank" rel="noreferrer" className={styles.cvLink}>
                      Xem CV mới
                    </a>
                  </div>
                </div>
              </div>

              {/* Thao tác Duyệt / Từ chối yêu cầu cập nhật */}
              <div className={styles.modalActions} style={{ marginTop: "20px" }}>
                <button
                  className={`${styles.btn} ${styles.btnSuccess}`}
                  onClick={() => handleProcessUpdateRequest(selectedRequest.id, "approved")}
                >
                  ✅ Phê duyệt thay đổi
                </button>
                <button
                  className={`${styles.btn} ${styles.btnDanger}`}
                  onClick={() => {
                    const reason = prompt("Nhập lý do từ chối yêu cầu thay đổi:");
                    if (reason !== null) {
                      setRejectReason(reason);
                      handleProcessUpdateRequest(selectedRequest.id, "rejected");
                    }
                  }}
                >
                  ❌ Từ chối thay đổi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}