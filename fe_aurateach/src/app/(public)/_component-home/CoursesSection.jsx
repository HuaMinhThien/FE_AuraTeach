"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { courseService } from '@/services/courseService';
import { categoryService } from '@/services/categoryService';

function CoursesSection() {
  const [categories, setCategories] = useState([]);
  const [courses, setCourses] = useState([]);
  
  const [activeTabId, setActiveTabId] = useState('All');
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // 🚀 Gộp chung việc tải Danh mục và Khóa học vào 1 useEffect duy nhất
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Gọi song song cả 2 API để tối ưu tốc độ tải trang
        const [catResponse, courseResponse] = await Promise.all([
          categoryService.getCategories().catch(() => []),
          courseService.getCourses({
            category_id: activeTabId === 'All' ? 'all' : activeTabId,
            page: currentPage,
            per_page: 8,
            sort_by: 'current_students',
            direction: 'asc'
          }).catch(() => [])
        ]);

        // 1. Xử lý dữ liệu danh mục (chỉ cần lấy 1 lần hoặc cập nhật lại nếu muốn)
        const categoriesData = Array.isArray(catResponse) ? catResponse : (catResponse.data || []);
        setCategories(categoriesData);

        // 2. Xử lý dữ liệu khóa học & phân trang theo Tab / Page hiện tại
        if (Array.isArray(courseResponse)) {
          setCourses(courseResponse);
          setTotalPages(1);
        } else {
          setCourses(courseResponse.data || []);
          setTotalPages(courseResponse.last_page || courseResponse.meta?.last_page || 1);
        }

      } catch (error) {
        console.error('Lỗi tải dữ liệu trang:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTabId, currentPage]); // Sẽ tự động chạy lại khi người dùng đổi tab hoặc chuyển trang

  const goToPage = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  if (loading && courses.length === 0) {
    return <div style={{textAlign: 'center', padding: '40px'}}>Đang tải danh sách lớp học...</div>;
  }

  return (
    <section className="teacher-sec3">
      <div className="teacher-container">
        <div className="teacher-sec3__wrap">
          <div className="teacher-sec3__heading">
            <h2 className="teacher-sec3__title">Danh Sách Lớp Học Đề Cử</h2>
          </div>

          {/* THANH TAB DANH MỤC */}
          <div className="teacher-sec3__tabs" style={{ display: 'flex', gap: '10px', marginBottom: '30px', flexWrap: 'wrap' }}>
            <button
              onClick={() => { setActiveTabId('All'); setCurrentPage(1); }}
              style={{
                padding: '10px 20px', borderRadius: '20px', border: '1px solid #00236F',
                backgroundColor: activeTabId === 'All' ? '#00236F' : '#FFFFFF',
                color: activeTabId === 'All' ? '#FFFFFF' : '#00236F',
                cursor: 'pointer', fontWeight: '500'
              }}
            >
              Tất cả
            </button>

            {categories
              .filter(cat => cat.category_name !== 'Tất cả')
              .map((cat) => {
                const catId = cat.category_id || cat.id;
                const isActive = activeTabId === catId;
                return (
                  <button
                    key={catId}
                    onClick={() => { setActiveTabId(catId); setCurrentPage(1); }}
                    style={{
                      padding: '10px 20px', borderRadius: '20px', border: '1px solid #00236F',
                      backgroundColor: isActive ? '#00236F' : '#FFFFFF',
                      color: isActive ? '#FFFFFF' : '#00236F',
                      cursor: 'pointer', fontWeight: '500'
                    }}
                  >
                    {cat.category_name}
                  </button>
                );
              })}
          </div>

          {/* DANH SÁCH LỚP HỌC */}
          {courses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              Không có lớp học nào thuộc danh mục này.
            </div>
          ) : (
            <div className="teacher-sec3__grid">
              {courses.map((course) => {
                const categoryName = course.category?.category_name || 'Chưa phân loại';

                return (
                  <Link 
                    key={course.id || course.course_id} 
                    href={`/classList/${course.course_id || course.id}`}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <div className="course-card">
                      <img 
                        src={course.thumbnail || "/img/default-class-1.jpg"} 
                        alt={course.title} 
                      />
                      <div className="course-card__content">
                        <span className="course-card__tag">
                          {categoryName} - {course.level || 'N/A'}
                        </span>
                        <h3 className="course-card__title">{course.title}</h3>
                        <p className="course-card__description">{course.description}</p>
                        <div className="course-card__footer">
                          <div className="course-card__price">
                            <span className="course-card__price-value">{parseInt(course.hourly_rate || 0).toLocaleString('vi-VN')}đ / buổi</span>
                          </div>
                          <div className="course-card__students">
                            <span>👨‍🎓 {course.current_students || course.students_count || 0}/{course.max_students} HS</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* PHÂN TRANG */}
          {totalPages > 1 && (
            <div className="teacher-sec3__pagination">
              <button 
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="pagination-btn"
              >
                &lt;
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => goToPage(pageNum)}
                  className={`pagination-btn ${currentPage === pageNum ? 'active' : ''}`}
                >
                  {pageNum}
                </button>
              ))}

              <button 
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="pagination-btn"
              >
                &gt;
              </button>
            </div>
          )}

        </div>
      </div>
    </section>
  );
}

export default CoursesSection;