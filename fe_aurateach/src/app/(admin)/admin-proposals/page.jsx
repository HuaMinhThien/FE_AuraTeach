"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./page.module.css";

const API_BASE = "http://localhost:3007";

export default function AdminProposals() {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchProposals();
  }, []);

  const fetchProposals = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/proposals`);
      const data = await res.json();
      
      // Enrich với thông tin tutor và student
      const enriched = await Promise.all(
        (data || []).map(async (proposal) => {
          // Lấy thông tin tutor
          const tutorRes = await fetch(`${API_BASE}/users?user_id=${proposal.tutor_id}`);
          const tutors = await tutorRes.json();
          const tutor = tutors[0];

          // Lấy thông tin course
          const courseRes = await fetch(`${API_BASE}/courses_draft?course_id=${proposal.course_id}`);
          const courses = await courseRes.json();
          const course = courses[0];

          // Đếm số student đã approved
          const approvedCount = Object.values(proposal.student_responses || {})
            .filter(s => s.status === "approved").length;
          const totalCount = proposal.student_ids?.length || 0;

          return {
            ...proposal,
            tutor_name: tutor?.full_name || "Chưa xác định",
            course_title: course?.title || "Chưa xác định",
            approved_count: approvedCount,
            total_students: totalCount,
            min_students: course?.min_students || 2,
          };
        })
      );

      // Sắp xếp mới nhất lên đầu
      enriched.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setProposals(enriched);
    } catch (error) {
      console.error("Lỗi tải đề xuất:", error);
      setError("Không thể tải danh sách đề xuất");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "pending": { label: "⏳ Chờ xác nhận", class: styles.statusPending },
      "tutor_approved": { label: "✅ Tutor đã đồng ý", class: styles.statusTutorApproved },
      "student_approved": { label: "✅ Student đã đồng ý", class: styles.statusStudentApproved },
      "fully_approved": { label: "🎉 Đã tạo lớp", class: styles.statusFullyApproved },
      "cancelled": { label: "❌ Đã hủy", class: styles.statusCancelled },
    };
    return statusMap[status] || { label: status, class: "" };
  };

  const getFilteredProposals = () => {
    if (filter === "all") return proposals;
    if (filter === "pending") return proposals.filter(p => p.status === "pending" || p.status === "tutor_approved" || p.status === "student_approved");
    if (filter === "approved") return proposals.filter(p => p.status === "fully_approved");
    if (filter === "cancelled") return proposals.filter(p => p.status === "cancelled");
    return proposals;
  };

  const filteredProposals = getFilteredProposals();

  const handleCancelProposal = async (proposalId) => {
    if (!confirm("Bạn có chắc muốn hủy đề xuất này?")) return;

    try {
      const response = await fetch(`/api/admin/proposals/${proposalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled", reason: "Admin hủy" }),
      });

      const result = await response.json();
      if (result.success) {
        alert("Đã hủy đề xuất");
        fetchProposals();
      } else {
        alert(result.message || "Hủy thất bại");
      }
    } catch (error) {
      alert("Lỗi kết nối server");
    }
  };

  if (loading) {
    return <div className={styles.loading}>Đang tải danh sách đề xuất...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>📋 Danh sách đề xuất</h1>
        <Link href="/admin-create-class" className={styles.createBtn}>
          ➕ Tạo lớp mới
        </Link>
      </div>

      <div className={styles.filterBar}>
        <button
          className={filter === "all" ? styles.activeFilter : ""}
          onClick={() => setFilter("all")}
        >
          Tất cả ({proposals.length})
        </button>
        <button
          className={filter === "pending" ? styles.activeFilter : ""}
          onClick={() => setFilter("pending")}
        >
          ⏳ Chờ xử lý ({proposals.filter(p => p.status === "pending" || p.status === "tutor_approved" || p.status === "student_approved").length})
        </button>
        <button
          className={filter === "approved" ? styles.activeFilter : ""}
          onClick={() => setFilter("approved")}
        >
          ✅ Đã duyệt ({proposals.filter(p => p.status === "fully_approved").length})
        </button>
        <button
          className={filter === "cancelled" ? styles.activeFilter : ""}
          onClick={() => setFilter("cancelled")}
        >
          ❌ Đã hủy ({proposals.filter(p => p.status === "cancelled").length})
        </button>
      </div>

      {filteredProposals.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>📭</span>
          <p>Chưa có đề xuất nào</p>
        </div>
      ) : (
        <div className={styles.proposalList}>
          {filteredProposals.map((proposal) => {
            const status = getStatusBadge(proposal.status);
            const isPending = proposal.status === "pending" || proposal.status === "tutor_approved" || proposal.status === "student_approved";

            return (
              <div key={proposal.proposal_id} className={styles.proposalCard}>
                <div className={styles.cardHeader}>
                  <div>
                    <h3 className={styles.courseTitle}>{proposal.course_title}</h3>
                    <p className={styles.tutorName}>👨‍🏫 {proposal.tutor_name}</p>
                  </div>
                  <span className={`${styles.statusBadge} ${status.class}`}>
                    {status.label}
                  </span>
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.cardStats}>
                    <div className={styles.stat}>
                      <span className={styles.statLabel}>Học sinh đã đồng ý</span>
                      <span className={styles.statValue}>
                        {proposal.approved_count}/{proposal.total_students}
                        <span className={styles.statMin}>(tối thiểu {proposal.min_students})</span>
                      </span>
                    </div>
                    <div className={styles.stat}>
                      <span className={styles.statLabel}>Ngày tạo</span>
                      <span className={styles.statValue}>
                        {new Date(proposal.created_at).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                    {proposal.expires_at && (
                      <div className={styles.stat}>
                        <span className={styles.statLabel}>Hết hạn</span>
                        <span className={styles.statValue}>
                          {new Date(proposal.expires_at).toLocaleDateString("vi-VN")}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className={styles.cardActions}>
                    <Link
                      href={`/admin-proposals/${proposal.proposal_id}`}
                      className={styles.viewBtn}
                    >
                      Xem chi tiết
                    </Link>
                    {isPending && (
                      <button
                        onClick={() => handleCancelProposal(proposal.proposal_id)}
                        className={styles.cancelBtn}
                      >
                        Hủy đề xuất
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}