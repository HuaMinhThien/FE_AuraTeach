"use client";

import { useState } from "react";
import { FaStar, FaUserCircle, FaUserSecret } from "react-icons/fa";
import "../../css/student-style/bookingModal.css";
import "../../css/student-style/ratingModal.css";

export default function RatingModal({
  isOpen,
  onClose,
  onSubmit,
  courseTitle,
  tutorName,
  studentName,
}) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const ratingLabels = ["", "Tệ", "Không ổn", "Bình thường", "Tốt", "Tuyệt vời"];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      alert("Vui lòng chọn số sao đánh giá!");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({ rating, comment, isAnonymous });
    } catch (error) {
      console.error("Error submitting rating:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setRating(0);
    setHover(0);
    setComment("");
    setIsAnonymous(false);
    onClose();
  };

  return (
    <div className="booking-modal-overlay rating-modal-overlay">
      <div className="booking-modal rating-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="booking-modal-header">
          <h2 className="booking-modal-title">
            <span className="rating-modal-title-icon">⭐</span> Đánh giá gia sư
          </h2>
          <button className="booking-modal-close" onClick={handleClose} aria-label="Đóng">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="booking-modal-body">
          {/* Tutor info */}
          <div className="rating-tutor-info">
            <p className="rating-tutor-label">Bạn thấy chất lượng giảng dạy của</p>
            <h4 className="rating-tutor-name">{tutorName}</h4>
            <p className="rating-course-name">trong lớp &ldquo;{courseTitle}&rdquo; như thế nào?</p>
          </div>

          {/* Stars */}
          <div className="rating-stars-wrap">
            <div className="rating-stars-row">
              {[...Array(5)].map((_, index) => {
                const val = index + 1;
                return (
                  <label key={index} className="rating-star-label">
                    <input
                      type="radio"
                      name="rating"
                      value={val}
                      onClick={() => setRating(val)}
                      style={{ display: "none" }}
                    />
                    <FaStar
                      size={44}
                      className={`rating-star-icon ${val <= (hover || rating) ? "active" : ""}`}
                      onMouseEnter={() => setHover(val)}
                      onMouseLeave={() => setHover(0)}
                    />
                  </label>
                );
              })}
            </div>
            <p className="rating-label-text">
              {ratingLabels[hover || rating] || "Chọn số sao để đánh giá"}
            </p>
          </div>

          {/* Comment */}
          <div className="rating-comment-wrap">
            <label className="rating-comment-label">
              Nhận xét của bạn <span className="rating-optional">(không bắt buộc)</span>
            </label>
            <textarea
              className="rating-comment-textarea"
              placeholder="Chia sẻ trải nghiệm học tập của bạn cùng gia sư này..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
            />
          </div>

          {/* Anonymous toggle */}
          <div className="rating-identity-section">
            <p className="rating-identity-title">Đánh giá với tư cách:</p>
            <div className="rating-identity-options">
              {/* Tài khoản gốc */}
              <button
                type="button"
                className={`rating-identity-btn ${!isAnonymous ? "selected" : ""}`}
                onClick={() => setIsAnonymous(false)}
              >
                <span className="rating-identity-icon">
                  <FaUserCircle size={22} />
                </span>
                <span className="rating-identity-text">
                  <span className="rating-identity-main">
                    {studentName || "Tài khoản của bạn"}
                  </span>
                  <span className="rating-identity-sub">Hiển thị tên thật</span>
                </span>
                {!isAnonymous && <span className="rating-identity-check">✓</span>}
              </button>

              {/* Ẩn danh */}
              <button
                type="button"
                className={`rating-identity-btn anonymous ${isAnonymous ? "selected" : ""}`}
                onClick={() => setIsAnonymous(true)}
              >
                <span className="rating-identity-icon">
                  <FaUserSecret size={22} />
                </span>
                <span className="rating-identity-text">
                  <span className="rating-identity-main">Ẩn danh</span>
                  <span className="rating-identity-sub">Hiển thị "Học viên ẩn danh"</span>
                </span>
                {isAnonymous && <span className="rating-identity-check">✓</span>}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="booking-actions rating-actions">
            <button
              type="button"
              className="booking-cancel-btn"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="booking-confirm-btn rating-submit-btn"
              disabled={isSubmitting || rating === 0}
            >
              {isSubmitting ? (
                <>
                  <span className="booking-spinner" />
                  Đang gửi...
                </>
              ) : (
                "Gửi đánh giá"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
