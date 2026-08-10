"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Header from "@/components/users/Header";
import StudentSidebar from "@/components/users/StudentSidebar";
import { adminService } from "@/services/adminService"; // 🚀 Import service
import "./report.css";

export default function ReportTutorPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const tutorId = params.tutorId;
  const preSelectedCourseId = searchParams.get("courseId");

  const [tutor, setTutor] = useState(null);
  const [student, setStudent] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(preSelectedCourseId || "");
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);
  const hasLoggedAvatarError = useRef(false);
  const hasLoggedNoCourses = useRef(false);

  const reportReasons = [
    "Gia sư không đúng chuyên môn",
    "Gia sư không đến đúng giờ / hủy buổi học đột xuất",
    "Thái độ không chuyên nghiệp, thiếu tôn trọng học viên",
    "Nội dung giảng dạy không đúng cam kết",
    "Yêu cầu thanh toán ngoài nền tảng",
    "Hành vi không phù hợp",
    "Lý do khác",
  ];

  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);

        // Lấy thông tin user từ cookie (Logic này giữ nguyên vì thuộc về xử lý client-side)
        const getCookie = (name) => {
          const value = `; ${document.cookie}`;
          const parts = value.split(`; ${name}=`);
          if (parts.length === 2) return parts.pop().split(";").shift();
          return null;
        };
        const userCookie = getCookie("user_info");
        if (!userCookie) {
          router.push("/login");
          return;
        }
        const user = JSON.parse(decodeURIComponent(userCookie));
        setStudent(user);

        // 🚀 Gọi qua Service thay vì fetch trực tiếp
        const data = await adminService.getInitialReportData(tutorId, user.user_id || user.id);

        if (data.error) {
          setError(data.error);
        } else {
          setTutor(data.tutor);
          setCourses(data.courses);
        }
      } catch (err) {
        console.error("Lỗi khởi tạo dữ liệu:", err);
        setError("Không thể tải dữ liệu báo cáo.");
      } finally {
        setLoading(false);
      }
    };

    if (tutorId) initData();
  }, [tutorId, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      // Xử lý file sang Base64 hoặc FormData tùy theo cấu trúc của service
      const evidenceUrls = await Promise.all(
        evidenceFiles.map((file) => {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(file);
          });
        })
      );

      const reportData = {
        tutor_id: tutorId,
        student_id: student.user_id || student.id,
        course_id: selectedCourse,
        reason: reason === "Lý do khác" ? description : reason,
        description,
        evidence: evidenceUrls,
      };

      // 🚀 Sử dụng hoàn toàn service
      const result = await adminService.createReport(reportData);

      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.message || "Gửi báo cáo thất bại");
      }
    } catch (err) {
      setError("Có lỗi xảy ra khi gửi báo cáo.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAvatarError = (e) => {
    if (!hasLoggedAvatarError.current) {
      console.warn(`⚠️ Avatar không tìm thấy cho gia sư: ${tutor?.full_name || tutorId}`);
      hasLoggedAvatarError.current = true;
    }
    e.target.src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80";
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter((file) => {
      const isValidType = file.type.startsWith("image/") || file.type.startsWith("video/");
      const isValidSize = file.size <= 10 * 1024 * 1024;
      return isValidType && isValidSize;
    });

    if (validFiles.length !== files.length) {
      setError("Chỉ hỗ trợ file ảnh/video và dung lượng tối đa 10MB");
    }

    setEvidenceFiles((prev) => [...prev, ...validFiles]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index) => {
    setEvidenceFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setSelectedCourse("");
    setReason("");
    setDescription("");
    setEvidenceFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="report-loading">
          <div className="loading-spinner"></div>
          <p>Đang tải thông tin...</p>
        </div>
      </>
    );
  }

  if (success) {
    return (
      <>
        <Header />
        <div className="report-page">
          <div className="report-container">
            <StudentSidebar />
            <div className="report-content">
              <div className="report-success-container">
                <div className="report-success-icon">✅</div>
                <h2 className="report-success-title">Gửi báo cáo thành công!</h2>
                <p className="report-success-message">
                  Cảm ơn bạn đã gửi báo cáo. Admin sẽ xem xét và xử lý trong thời gian sớm nhất.
                </p>
                <div className="report-success-actions">
                  <button 
                    className="report-success-btn"
                    onClick={() => {
                      setSuccess(false);
                      resetForm();
                    }}
                  >
                    📝 Gửi báo cáo mới
                  </button>
                  <button 
                    className="report-success-btn report-success-btn-secondary"
                    onClick={() => router.push("/")}
                  >
                    🏠 Về trang chủ
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="report-page">
        <div className="report-container">
          <StudentSidebar />
          <div className="report-content">
            <div className="report-header">
              <h2>📋 Báo cáo gia sư</h2>
              <p>Gửi báo cáo để chúng tôi có thể xử lý kịp thời</p>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="report-card">
              <div className="report-tutor-info">
                <div className="tutor-avatar">
                  <img
                    src={tutor?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"}
                    alt={tutor?.full_name || "Gia sư"}
                    onError={handleAvatarError}
                  />
                </div>
                <div className="tutor-details">
                  <h3>{tutor?.full_name || "Không tìm thấy tên"}</h3>
                  <p>Email: {tutor?.email || "Chưa có email"}</p>
                  <p>Phone: {tutor?.phone || "Chưa cập nhật"}</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="report-form">
                <div className="form-group">
                  <label htmlFor="course">Chọn lớp học <span className="required">*</span></label>
                  <select
                    id="course"
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className="form-select"
                    required
                  >
                    <option value="">-- Chọn lớp học --</option>
                    {courses.map((course) => (
                      <option key={course.id || course.course_id} value={course.course_id}>
                        {course.title} - {course.level || "Không xác định"}
                      </option>
                    ))}
                  </select>
                  {courses.length === 0 && (
                    <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '8px' }}>
                      ⚠️ Bạn chưa đăng ký khóa học nào với gia sư này
                    </p>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="reason">Lý do báo cáo <span className="required">*</span></label>
                  <select
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="form-select"
                    required
                  >
                    <option value="">-- Chọn lý do --</option>
                    {reportReasons.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="description">Mô tả chi tiết</label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="form-textarea"
                    rows="5"
                    placeholder="Vui lòng mô tả chi tiết sự việc..."
                  />
                </div>

                <div className="form-group">
                  <label>Bằng chứng (hình ảnh / video)</label>
                  <div className="file-upload-area">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      onChange={handleFileUpload}
                      className="file-input"
                    />
                    <p>📎 Click để tải lên bằng chứng (ảnh hoặc video)</p>
                    <p className="file-hint">Hỗ trợ: JPG, PNG, GIF, MP4 (tối đa 10MB)</p>
                  </div>
                  {evidenceFiles.length > 0 && (
                    <div className="file-list">
                      {evidenceFiles.map((file, index) => (
                        <div key={index} className="file-item">
                          <span>
                            {file.type.startsWith("image/") ? "🖼️" : "🎬"} {file.name}
                          </span>
                          <button
                            type="button"
                            className="remove-file"
                            onClick={() => removeFile(index)}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="submit-btn"
                  disabled={submitting}
                >
                  {submitting ? " Đang gửi..." : "Gửi báo cáo"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}