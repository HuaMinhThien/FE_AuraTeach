"use client";

import React, { useState, useEffect } from 'react';

function ReviewSection() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviewsData = async () => {
      try {
        const [resReviews, resStudents, resUsers, resCourses] = await Promise.all([
          fetch('http://localhost:8000/api/reviews'),
          fetch('http://localhost:8000/api/students'),
          fetch('http://localhost:8000/api/users'),
          fetch('http://localhost:8000/api/courses')
        ]);

        if (!resReviews.ok || !resStudents.ok || !resUsers.ok || !resCourses.ok) {
          throw new Error('Không thể tải danh sách dữ liệu đánh giá');
        }

        const reviewsData = await resReviews.json();
        const studentsData = await resStudents.json();
        const usersData = await resUsers.json();
        const coursesData = await resCourses.json();
        
        if (Array.isArray(reviewsData)) {
          const highRatingReviews = reviewsData
            .filter(item => Number(item.rating) >= 4.5)
            .sort(() => 0.5 - Math.random())
            .slice(0, 4);

          const mergedReviews = highRatingReviews.map((review) => {
            const matchedStudent = studentsData.find(s => s.student_id === review.student_id) || {};
            const matchedUser = usersData.find(u => u.user_id === matchedStudent.user_id) || {};
            const matchedCourse = coursesData.find(c => c.course_id === review.course_id) || {};

            return {
              id: review.review_id,
              author: matchedUser.full_name || "Học viên ẩn danh",
              role: matchedCourse.title ? `Học viên lớp: ${matchedCourse.title}` : "Học viên AuraTeach",
              rating: review.rating,
              comment: review.comment
            };
          });

          setReviews(mergedReviews);
        } else {
          setReviews([]);
        }
      } catch (error) {
        console.error('Lỗi gọi API lọc review Section 7:', error);
        setReviews([]); 
      } finally {
        setLoading(false);
      }
    };

    fetchReviewsData();
  }, []);

  if (loading) {
    return (
      <div className="aurateach-sec7" style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>
        Đang tải đánh giá học viên...
      </div>
    );
  }

  return (
    <section className="container-center">
      <div className='aurateach-sec7'>
        <div className="aurateach-sec7__header">
          <h2 className="aurateach-sec7__title">Đánh giá từ học viên thực tế</h2>
          <p className="aurateach-sec7__desc">Lắng nghe những chia sẻ thực tế về hiệu quả học tập tại AuraTeach.</p>
        </div>

        <div className="aurateach-sec7__grid">
          {Array.isArray(reviews) && reviews.map((item) => (
            <div key={item.id} className="aurateach-sec7__card">
              
              <h3 className="aurateach-sec7__author">{item.author}</h3>
              <p className="aurateach-sec7__role">{item.role}</p>
              
              <div className="aurateach-sec7__rating">
                <div className="aurateach-sec7__stars">
                  {[...Array(5)].map((_, index) => (
                    <svg 
                      key={index} 
                      className="aurateach-sec7__star-icon" 
                      stroke="currentColor" 
                      fill={index < item.rating ? "currentColor" : "none"}
                      strokeWidth="2" 
                      viewBox="0 0 24 24" 
                      height="14" 
                      width="14" 
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path>
                    </svg>
                  ))}
                </div>
                <span className="aurateach-sec7__score">{Number(item.rating).toFixed(1)}</span>
              </div>

              <p className="aurateach-sec7__content">“{item.comment}”</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ReviewSection;