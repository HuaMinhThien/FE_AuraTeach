import { NextResponse } from "next/server";

const API_BASE = "http://localhost:3007";

// POST: Gửi đánh giá mới
export async function POST(request) {
  try {
    const body = await request.json();
    const { studentId, tutorId, courseId, rating, comment, isAnonymous } = body;

    // 1. Kiểm tra thông tin bắt buộc
    if (!studentId || !tutorId || !courseId || !rating) {
      return NextResponse.json(
        { success: false, message: "Thiếu thông tin đánh giá bắt buộc" },
        { status: 400 }
      );
    }

    // 2. Kiểm tra xem học viên đã đánh giá khóa học này chưa
    const existingReviewsRes = await fetch(`${API_BASE}/reviews?student_id=${studentId}&course_id=${courseId}`, { cache: "no-store" });
    const existingReviews = await existingReviewsRes.json();
    
    if (existingReviews.length > 0) {
      return NextResponse.json(
        { success: false, message: "Bạn đã đánh giá khóa học này rồi" },
        { status: 400 }
      );
    }

    // 3. Tạo review mới
    const newReview = {
      review_id: `rev-${Date.now()}`,
      student_id: studentId,
      tutor_id: tutorId,
      course_id: courseId,
      rating: Number(rating),
      comment: comment || "",
      is_anonymous: isAnonymous === true,
      created_at: new Date().toISOString()
    };

    const createRes = await fetch(`${API_BASE}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newReview)
    });

    if (!createRes.ok) {
      throw new Error("Không thể lưu đánh giá");
    }

    // 4. Cập nhật rating trung bình cho Tutor
    // Lấy tất cả reviews của tutor này
    const allTutorReviewsRes = await fetch(`${API_BASE}/reviews?tutor_id=${tutorId}`, { cache: "no-store" });
    const allTutorReviews = await allTutorReviewsRes.json();
    
    const totalRating = allTutorReviews.reduce((sum, rev) => sum + rev.rating, 0);
    const avgRating = Number((totalRating / allTutorReviews.length).toFixed(1));

    // Lấy ID của record tutor trong DB (khác với tutor_id)
    const tutorRecordRes = await fetch(`${API_BASE}/tutors?tutor_id=${tutorId}`, { cache: "no-store" });
    const tutorRecords = await tutorRecordRes.json();
    
    if (tutorRecords.length > 0) {
      const tutorRecord = tutorRecords[0];
      await fetch(`${API_BASE}/tutors/${tutorRecord.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: avgRating })
      });
    }

    return NextResponse.json({
      success: true,
      message: "Đánh giá thành công!",
      data: newReview
    });

  } catch (error) {
    console.error("Lỗi POST /api/reviews:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi server khi lưu đánh giá" },
      { status: 500 }
    );
  }
}

// GET: Lấy danh sách đánh giá
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tutorId = searchParams.get("tutorId");
    const courseId = searchParams.get("courseId");

    let url = `${API_BASE}/reviews`;
    if (tutorId) url += `?tutor_id=${tutorId}`;
    else if (courseId) url += `?course_id=${courseId}`;

    const res = await fetch(url, { cache: "no-store" });
    const reviews = await res.json();

    return NextResponse.json({
      success: true,
      data: reviews
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Lỗi server khi lấy đánh giá" },
      { status: 500 }
    );
  }
}
