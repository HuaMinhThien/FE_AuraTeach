"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./page.module.css";

const API_BASE = "http://localhost:3007";

export default function TutorProposals() {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const getCurrentUser = () => {
      const getCookie = (name) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
      };
      const userCookie = getCookie("user_info");
      if (userCookie) {
        try {
          const user = JSON.parse(decodeURIComponent(userCookie));
          return user.user_id || user.id;
        } catch {
          return null;
        }
      }
      return null;
    };
    setUserId(getCurrentUser());
  }, []);

  useEffect(() => {
    if (!userId) return;

    const fetchProposals = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/proposals?tutor_id=${userId}`);
        const data = await res.json();

        // Enrich với thông tin course
        const enriched = await Promise.all(
          (data || []).map(async (proposal) => {
            const courseRes = await fetch(`${API_BASE}/courses_draft?course_id=${proposal.course_id}`);
            const courses = await courseRes.json();
            const course = courses[0];

            const approvedCount = Object.values(proposal.student_responses || {})
              .filter(s => s.status === "approved").length;
            const totalCount = proposal.student_ids?.length || 0;

            return {
              ...proposal,
              course_title: course?.title || "Chưa xác định",
              schedule_days: course?.schedule_days || [],
              time_slot: course?.time_slot || "",
              price_per_session: course?.price_per_session || 0,
              approved_count: approvedCount,
              total_students: totalCount,
              min_students: course?.min_students || 2,
            };
          })
        );

        enriched.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setProposals(enriched);
      } catch (error) {
        console.error("Lỗi tải đề xuất:", error);
        setError("Không thể tải danh sách đề xuất");
      } finally {
        setLoading(false);
      }
    };

    fetchProposals();
  }, [userId]);

  const getStatusBadge = (status) => {
    const statusMap = {
      "pending": { label: "⏳ Chờ xác nhận", class: styles.statusPending },
      "tutor_approved": { label: "✅ Đã đồng ý", class: styles.statusApproved },
      "fully_approved": { label: "🎉 Đã tạo lớp", class: styles.statusFullyApproved },
      "cancelled": { label: "❌ Đã hủy", class: styles.statusCancelled },
    };
    return statusMap[status] || { label: status, class: "" };
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
        <h1>📨 Đề xuất lớp học</h1>
        <p>Quản lý các đề xuất lớp học từ Admin</p>
      </div>

      {proposals.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>📭</span>
          <p>Chưa có đề xuất nào</p>
        </div>
      ) : (
        <div className={styles.proposalList}>
          {proposals.map((proposal) => {
            const status = getStatusBadge(proposal.status);
            const isPending = proposal.status === "pending";

            return (
              <div key={proposal.proposal_id} className={styles.proposalCard}>
                <div className={styles.cardHeader}>
                  <div>
                    <h3 className={styles.courseTitle}>{proposal.course_title}</h3>
                    <div className={styles.courseMeta}>
                      <span>📅 {proposal.schedule_days?.join(", ")}</span>
                      <span>⏰ {proposal.time_slot}</span>
                      <span>💰 {proposal.price_per_session?.toLocaleString()}đ/buổi</span>
                    </div>
                  </div>
                  <span className={`${styles.statusBadge} ${status.class}`}>
                    {status.label}
                  </span>
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.studentInfo}>
                    <span className={styles.studentLabel}>Học sinh đã đồng ý</span>
                    <span className={styles.studentCount}>
                      {proposal.approved_count}/{proposal.total_students}
                      <span className={styles.studentMin}>(tối thiểu {proposal.min_students})</span>
                    </span>
                  </div>
                  <div className={styles.cardActions}>
                    <Link
                      href={`/tutor-proposals/${proposal.proposal_id}`}
                      className={styles.viewBtn}
                    >
                      {isPending ? "Xem và xác nhận →" : "Xem chi tiết"}
                    </Link>
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