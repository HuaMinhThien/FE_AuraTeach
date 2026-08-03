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

  // 1. Lấy danh mục 1 lần khi load trang
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await categoryService.getCategories();
        const categoriesData = response.data || response; 
        setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      } catch (error) {
        console.error('Lỗi tải danh mục:', error);
        setCategories([]);
      }
    };
    fetchCategories();
  }, []);

  // 2. Lấy danh sách khóa học theo Tab và Phân trang từ Backend
  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      try {
        const params = {
          // Nếu là 'All' thì không truyền category_id để lấy tất cả
          category_id: activeTabId === 'All' ? 'all' : activeTabId,
          page: currentPage,
          per_page: 8,
          sort_by: 'current_students',
          direction: 'asc'
        };

        const res = await courseService.getCourses(params);

        if (Array.isArray(res)) {
            setCourses(res);
            setTotalPages(1);
        } else {
            const coursesList = res.data || [];
            setCourses(coursesList);
            
            const pages = res.last_page || res.meta?.last_page || 1;
            setTotalPages(pages);
        }
      } catch (error) {
        console.error('Lỗi tải danh sách lớp học:', error);
        setCourses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [activeTabId, currentPage]);

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
                // Lấy tên danh mục an toàn từ quan hệ category hoặc fallback sang text mặc định
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