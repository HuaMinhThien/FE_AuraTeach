// src/app/(public)/(student-private)/reportTutor/page.jsx
"use client";

import { useState } from "react";
import styles from "./page.module.css";

export default function ReportTutorPage() {
  const [reportData, setReportData] = useState({
    tutorName: "Dr. Alexander Wright",
    sessionTime: "",
    reason: "",
    description: "",
    files: [],
    urgentIssue: false,
  });

  const [dragActive, setDragActive] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setReportData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e) => {
    setReportData((prev) => ({ ...prev, urgentIssue: e.target.checked }));
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    if (reportData.files.length + files.length <= 5) {
      setReportData((prev) => ({
        ...prev,
        files: [...prev.files, ...files],
      }));
    } else {
      alert("Tối đa 5 tệp");
    }
  };

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files);
    if (reportData.files.length + files.length <= 5) {
      setReportData((prev) => ({
        ...prev,
        files: [...prev.files, ...files],
      }));
    } else {
      alert("Tối đa 5 tệp");
    }
  };

  const removeFile = (index) => {
    setReportData((prev) => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Xử lý gửi báo cáo
    console.log("Report Data:", reportData);
  };

  const handleCancel = () => {
    // Quay lại trang trước
    window.history.back();
  };

  return (
    <div className={styles.container}>
      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <span>Học viên &gt; Báo cáo Gia sư</span>
      </div>

      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Báo cáo Gia sư</h1>
        <p className={styles.subtitle}>
          Chúng tôi cam kết xây dựng một môi trường học tập chất lượng và minh bạch. 
          Mọi phản hồi của bạn sẽ được bảo mật và xử lý nghiêm túc.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Tutor Name */}
        <div className={styles.formGroup}>
          <label className={styles.label}>Tên Gia sư</label>
          <input
            type="text"
            name="tutorName"
            value={reportData.tutorName}
            onChange={handleInputChange}
            className={styles.input}
            disabled
          />
        </div>

        {/* Session Time */}
        <div className={styles.formGroup}>
          <label className={styles.label}>Thời gian buổi học</label>
          <input
            type="datetime-local"
            name="sessionTime"
            value={reportData.sessionTime}
            onChange={handleInputChange}
            className={styles.input}
          />
        </div>

        {/* Reason */}
        <div className={styles.formGroup}>
          <label className={styles.label}>
            Lý do báo cáo <span className={styles.required}>*</span>
          </label>
          <select
            name="reason"
            value={reportData.reason}
            onChange={handleInputChange}
            className={styles.select}
            required
          >
            <option value="">Chọn lý do phù hợp</option>
            <option value="khong_chuyen_nghiep">Không chuyên nghiệp</option>
            <option value="cham_gio">Đi trễ / Vắng mặt</option>
            <option value="chat_luong_kem">Chất lượng giảng dạy kém</option>
            <option value="thai_do_khong_tot">Thái độ không tốt</option>
            <option value="vi_pham_hop_dong">Vi phạm hợp đồng</option>
            <option value="hanh_vi_khong_phu_hop">Hành vi không phù hợp</option>
            <option value="khac">Lý do khác</option>
          </select>
        </div>

        {/* Description */}
        <div className={styles.formGroup}>
          <label className={styles.label}>
            Mô tả chi tiết <span className={styles.required}>*</span>
          </label>
          <textarea
            name="description"
            value={reportData.description}
            onChange={handleInputChange}
            className={styles.textarea}
            placeholder="Vui lòng mô tả chi tiết sự việc để AuraTeach có thể hỗ trợ bạn tốt nhất..."
            rows={5}
            required
          />
        </div>

        {/* File Upload */}
        <div className={styles.formGroup}>
          <label className={styles.label}>
            Bằng chứng (Hình ảnh/Video)
          </label>
          <p className={styles.fileHint}>
            Đính kèm ảnh chụp màn hình tin nhắn, video buổi học hoặc tài liệu liên quan 
            (Tối đa 5 tệp, mỗi tệp dưới 10MB).
          </p>

          <div
            className={`${styles.dropZone} ${dragActive ? styles.dragActive : ""}`}
            onDragEnter={() => setDragActive(true)}
            onDragLeave={() => setDragActive(false)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
          >
            <div className={styles.dropContent}>
              <span className={styles.dropIcon}>📎</span>
              <p>Kéo thả tệp vào đây hoặc nhấn để chọn</p>
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileInput}
                className={styles.fileInput}
              />
            </div>
          </div>

          {/* File List */}
          {reportData.files.length > 0 && (
            <div className={styles.fileList}>
              {reportData.files.map((file, index) => (
                <div key={index} className={styles.fileItem}>
                  <span className={styles.fileName}>
                    📄 {file.name}
                    <span className={styles.fileSize}>
                      ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className={styles.removeFile}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Urgent Issue */}
        <div className={styles.formGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={reportData.urgentIssue}
              onChange={handleCheckboxChange}
              className={styles.checkbox}
            />
            <span className={styles.checkboxText}>
              Vấn đề khảo sát
            </span>
          </label>
          <p className={styles.checkboxHint}>
            Đánh dấu nếu vấn đề này ảnh hưởng nghiêm trọng đến an toàn hoặc tài chính của bạn.
          </p>
        </div>

        {/* Buttons */}
        <div className={styles.buttonGroup}>
          <button type="button" onClick={handleCancel} className={styles.cancelButton}>
            Hủy
          </button>
          <button type="submit" className={styles.submitButton}>
            Gửi báo cáo
          </button>
        </div>
      </form>
    </div>
  );
}