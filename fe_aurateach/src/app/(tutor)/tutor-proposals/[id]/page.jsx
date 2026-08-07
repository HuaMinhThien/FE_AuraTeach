"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import styles from "./page.module.css";

const API_BASE = "http://localhost:3007";

export default function TutorProposalDetail() {
  const router = useRouter();
  const params = useParams();
  const proposalId = params?.id;

  const [proposal, setProposal] = useState(null);
  const [course, setCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Lấy proposal
        const proposalRes = await fetch(`${API_BASE}/proposals?proposal_id=${proposalId}`);
        const proposals = await proposalRes.json();
        const proposalData = proposals[0];

        if (!proposalData) {
          setError("Không tìm thấy đề xuất");
          setLoading(false);
          return;
        }

        setProposal(proposalData);

        // Lấy course
        const courseRes = await fetch(`${API_BASE}/courses_draft?course_id=${proposalData.course_id}`);
        const courses = await courseRes.json();
        const courseData = courses[0];
        setCourse(courseData);

        // Lấy thông tin student
        const studentIds = proposalData.student_ids || [];
        const studentInfoPromises = studentIds.map(async (id) => {
          const userRes = await fetch(`${API_BASE}/users?user_id=${id}`);
          const users = await userRes.json();
          const user = users[0];
          const response = proposalData.student_responses?.[id];
          return {
            id,
            name: user?.full_name || "Chưa xác định",
            status: response?.status || null,
            at: response?.at || null,
            reason: response?.reason || null,
          };
        });

        const studentInfo = await Promise.all(studentInfoPromises);
        setStudents(studentInfo);

      } catch (error) {
        console.error("Lỗi tải dữ liệu:", error);
        setError("Không thể tải thông tin đề xuất");
      } finally {
        setLoading(false);
      }
    };

    if (proposalId) {
      fetchData();
    }
  }, [proposalId]);

  const handleResponse = async (response) => {
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const payload = { response };
      if (response === "rejected" && rejectReason.trim()) {
        payload.reason = rejectReason.trim();
      }

      const res = await fetch(`/api/tutor/proposals/${proposalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (result.success) {
        setSuccess(result.message);
        setTimeout(() => {
          router.push("/tutor-proposals");
        }, 1500);
      } else {
        setError(result.message || "Xử lý thất bại");
      }
    } catch (error) {
      setError("Lỗi kết nối server");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Đang tải...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  const isPending = proposal?.status === "pending";
  const isTutorApproved = proposal?.tutor_response === "approved";
  const isFullyApproved = proposal?.status === "fully_approved";
  const isCancelled = proposal?.status === "cancelled";

  const approvedStudents = students.filter(s => s.status === "approved");
  const rejectedStudents = students.filter(s => s.status === "rejected");
  const pendingStudents = students.filter(s => s.status === null);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={() => router.back()} className={styles.backBtn}>
          ← Quay lại
        </button>
        <h1>Chi tiết đề xuất</h1>
      </div>

      {success && <div className={styles.alertSuccess}>{success}</div>}
      {error && <div className={styles.alertError}>{error}</div>}

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>{course?.title || "Chưa xác định"}</h2>
          <span className={styles.statusBadge}>
            {isFullyApproved && "🎉 Đã tạo lớp"}
            {isTutorApproved && "✅ Đã đồng ý"}
            {isPending && "⏳ Chờ xác nhận"}
            {isCancelled && "❌ Đã hủy"}
          </span>
        </div>

        <div className={styles.courseInfo}>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>📅 Lịch học</span>
            <span>{course?.schedule_days?.join(", ")}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>⏰ Thời gian</span>
            <span>{course?.time_slot}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>💰 Học phí</span>
            <span>{course?.price_per_session?.toLocaleString()}đ/buổi</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>📝 Mô tả</span>
            <span>{course?.description || "Chưa có mô tả"}</span>
          </div>
        </div>

        <div className={styles.studentsSection}>
          <h3>👥 Học sinh</h3>
          <div className={styles.studentStats}>
            <span className={styles.studentStatApproved}>
              ✅ Đã đồng ý: {approvedStudents.length}
            </span>
            <span className={styles.studentStatPending}>
              ⏳ Chờ: {pendingStudents.length}
            </span>
            <span className={styles.studentStatRejected}>
              ❌ Từ chối: {rejectedStudents.length}
            </span>
            <span className={styles.studentStatMin}>
              Tối thiểu: {course?.min_students || 2}
            </span>
          </div>

          <div className={styles.studentList}>
            {students.map((student) => (
              <div key={student.id} className={styles.studentItem}>
                <span className={styles.studentName}>{student.name}</span>
                <span className={styles.studentStatus}>
                  {student.status === "approved" && "✅ Đã đồng ý"}
                  {student.status === "rejected" && "❌ Đã từ chối"}
                  {student.status === null && "⏳ Chờ xác nhận"}
                </span>
                {student.reason && (
                  <span className={styles.studentReason}>Lý do: {student.reason}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {isPending && (
          <div className={styles.actionSection}>
            <div className={styles.actionInfo}>
              <p>Bạn có đồng ý nhận lớp học này không?</p>
              {approvedStudents.length < (course?.min_students || 2) && (
                <p className={styles.warning}>
                  ⚠️ Hiện tại chỉ có {approvedStudents.length}/{course?.min_students || 2} học sinh đồng ý.
                  Cần đủ số lượng học sinh tối thiểu để tạo lớp.
                </p>
              )}
            </div>

            {pendingStudents.length > 0 && (
              <div className={styles.rejectReason}>
                <label>Lý do từ chối (nếu có)</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Nhập lý do từ chối..."
                  rows={3}
                />
              </div>
            )}

            <div className={styles.actionButtons}>
              <button
                className={styles.rejectBtn}
                onClick={() => handleResponse("rejected")}
                disabled={submitting}
              >
                ❌ Từ chối
              </button>
              <button
                className={styles.approveBtn}
                onClick={() => handleResponse("approved")}
                disabled={submitting}
              >
                {submitting ? "Đang xử lý..." : "✅ Đồng ý"}
              </button>
            </div>
          </div>
        )}

        {isTutorApproved && !isFullyApproved && (
          <div className={styles.waitingSection}>
            <p>⏳ Đang chờ học sinh xác nhận...</p>
            <p className={styles.waitingInfo}>
              Đã có {approvedStudents.length}/{course?.min_students || 2} học sinh đồng ý.
            </p>
          </div>
        )}

        {isFullyApproved && (
          <div className={styles.successSection}>
            <p>🎉 Lớp học đã được tạo thành công!</p>
            <button
              onClick={() => router.push("/classroom-management")}
              className={styles.goToClassBtn}
            >
              📚 Xem lớp học của tôi
            </button>
          </div>
        )}

        {isCancelled && (
          <div className={styles.cancelledSection}>
            <p>❌ Đề xuất đã bị hủy</p>
            {proposal?.tutor_reject_reason && (
              <p className={styles.rejectReasonText}>
                Lý do: {proposal.tutor_reject_reason}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}