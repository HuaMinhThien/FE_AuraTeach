"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./AdminReports.module.css";

const API_BASE = "http://localhost:3007";

export default function AdminTutorReports() {
  const router = useRouter();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [adminNote, setAdminNote] = useState("");
  const [showModal, setShowModal] = useState(false);

  const statusOptions = [
    { value: "all", label: "Tất cả" },
    { value: "pending", label: "Chờ xử lý" },
    { value: "reviewing", label: "Đang xem xét" },
    { value: "resolved", label: "Đã giải quyết" },
    { value: "rejected", label: "Từ chối" },
  ];

  const statusColors = {
    pending: "#f59e0b",
    reviewing: "#3b82f6",
    resolved: "#22c55e",
    rejected: "#ef4444",
  };

  const statusLabels = {
    pending: "Chờ xử lý",
    reviewing: "Đang xem xét",
    resolved: "Đã giải quyết",
    rejected: "Từ chối",
  };

  useEffect(() => {
    fetchReports();
  }, [statusFilter]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const url = `/api/admin-tutor-reports${statusFilter !== "all" ? `?status=${statusFilter}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setReports(data.data);
      }
    } catch (error) {
      console.error("Lỗi tải báo cáo:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (reportId, newStatus) => {
    try {
      const res = await fetch(`/api/admin-tutor-reports/${reportId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, adminNote }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchReports();
        setShowModal(false);
        setSelectedReport(null);
        setAdminNote("");
        alert("✅ Cập nhật trạng thái thành công!");
      }
    } catch (error) {
      console.error("Lỗi cập nhật:", error);
      alert("❌ Có lỗi xảy ra");
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("vi-VN");
  };

  const getPendingCount = () => {
    return reports.filter((r) => r.status === "pending").length;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>📋 Báo cáo gia sư</h1>
          <p>Quản lý và xử lý báo cáo từ học viên</p>
        </div>
        <span className={styles.badgePending}>{getPendingCount()} chờ xử lý</span>
      </div>

      <div className={styles.filterBar}>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={styles.filterSelect}
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button className={styles.refreshBtn} onClick={fetchReports}>
          🔄 Làm mới
        </button>
      </div>

      {loading ? (
        <div className={styles.loading}>Đang tải dữ liệu...</div>
      ) : reports.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>✅</div>
          <h3>Không có báo cáo</h3>
          <p>Chưa có báo cáo nào từ học viên</p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>STT</th>
                <th>Học viên</th>
                <th>Gia sư</th>
                <th>Lớp học</th>
                <th>Lý do</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report, index) => (
                <tr key={report.id} className={styles.tableRow}>
                  <td>{index + 1}</td>
                  <td>{report.student?.full_name || "N/A"}</td>
                  <td>{report.tutor?.full_name || "N/A"}</td>
                  <td>{report.course?.title || "N/A"}</td>
                  <td>
                    <span className={styles.reasonBadge}>
                      {report.reason.length > 30
                        ? report.reason.slice(0, 30) + "..."
                        : report.reason}
                    </span>
                  </td>
                  <td>
                    <span
                      className={styles.statusBadge}
                      style={{
                        backgroundColor: statusColors[report.status] || "#6b7280",
                      }}
                    >
                      {statusLabels[report.status] || report.status}
                    </span>
                  </td>
                  <td>{formatDate(report.createdAt)}</td>
                  <td>
                    <button
                      className={`${styles.btn} ${styles.btnInfo}`}
                      onClick={() => {
                        setSelectedReport(report);
                        setShowModal(true);
                        setAdminNote(report.adminNote || "");
                      }}
                    >
                      Chi tiết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal chi tiết */}
      {showModal && selectedReport && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => setShowModal(false)}>
              ×
            </button>

            <h2>📄 Chi tiết báo cáo</h2>

            <div className={styles.modalBody}>
              <div className={styles.modalGrid}>
                <div className={styles.modalItem}>
                  <label>Học viên</label>
                  <p>{selectedReport.student?.full_name || "N/A"}</p>
                </div>
                <div className={styles.modalItem}>
                  <label>Email học viên</label>
                  <p>{selectedReport.student?.email || "N/A"}</p>
                </div>
                <div className={styles.modalItem}>
                  <label>Gia sư</label>
                  <p>{selectedReport.tutor?.full_name || "N/A"}</p>
                </div>
                <div className={styles.modalItem}>
                  <label>Email gia sư</label>
                  <p>{selectedReport.tutor?.email || "N/A"}</p>
                </div>
                <div className={styles.modalItem}>
                  <label>Lớp học</label>
                  <p>{selectedReport.course?.title || "N/A"}</p>
                </div>
                <div className={styles.modalItem}>
                  <label>Trạng thái</label>
                  <p>
                    <span
                      className={styles.statusBadge}
                      style={{
                        backgroundColor: statusColors[selectedReport.status] || "#6b7280",
                      }}
                    >
                      {statusLabels[selectedReport.status] || selectedReport.status}
                    </span>
                  </p>
                </div>
                <div className={styles.modalItem}>
                  <label>Lý do</label>
                  <p className={styles.reasonFull}>{selectedReport.reason}</p>
                </div>
                <div className={styles.modalItem}>
                  <label>Ngày tạo</label>
                  <p>{formatDate(selectedReport.createdAt)}</p>
                </div>
              </div>

              {selectedReport.description && (
                <div className={styles.modalItem}>
                  <label>Mô tả chi tiết</label>
                  <p className={styles.descriptionText}>{selectedReport.description}</p>
                </div>
              )}

              {selectedReport.evidence && selectedReport.evidence.length > 0 && (
                <div className={styles.modalItem}>
                  <label>Bằng chứng</label>
                  <div className={styles.evidenceGrid}>
                    {selectedReport.evidence.map((ev, idx) => (
                      <div key={idx} className={styles.evidenceItem}>
                        {ev.startsWith("data:image") ? (
                          <img src={ev} alt={`Bằng chứng ${idx + 1}`} />
                        ) : ev.startsWith("data:video") ? (
                          <video controls>
                            <source src={ev} />
                          </video>
                        ) : (
                          <a href={ev} target="_blank" rel="noopener noreferrer">
                            📎 Xem bằng chứng
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className={styles.modalItem}>
                <label>Ghi chú Admin</label>
                <textarea
                  className={styles.adminNoteInput}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Nhập ghi chú xử lý..."
                  rows={3}
                />
              </div>

              <div className={styles.modalActions}>
                {selectedReport.status !== "resolved" &&
                  selectedReport.status !== "rejected" && (
                    <>
                      <button
                        className={`${styles.btn} ${styles.btnSuccess}`}
                        onClick={() => handleUpdateStatus(selectedReport.id, "resolved")}
                      >
                        Xác nhận
                      </button>
                      
                    </>
                  )}
                
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}