"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

function CoursesSection() {
  const [categories, setCategories] = useState([]);
  const [courses, setCourses] = useState([]);
  
  const [activeTabId, setActiveTabId] = useState('All');
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8; // 2 hàng x 4 lớp = 8 lớp/trang

  useEffect(() => {
      const fetchSectionData = async () => {
          try {
              const [resCategories, resCourses] = await Promise.all([
                  fetch('http://localhost:3007/categories'),
                  fetch('http://localhost:3007/courses')
              ]);

              if (!resCategories.ok || !resCourses.ok) {
                  throw new Error(`Lỗi kết nối hệ thống!`);
              }

              const dataCategories = await resCategories.json();
              const dataCourses = await resCourses.json();

              setCategories(Array.isArray(dataCategories) ? dataCategories : []);
              setCourses(Array.isArray(dataCourses) ? dataCourses : []);
              setActiveTabId('All');
          } catch (error) {
              console.error('Lỗi gọi API trong CoursesSection:', error);
              setCategories([{ category_id: 'All', category_name: 'Tất cả' }]);
              setCourses([]);
          } finally {
              setLoading(false);
          }
      };
      fetchSectionData();
  }, []);

  // --- LOGIC LỌC: Lọc theo category_id ---
  const filteredCourses = activeTabId === 'All'
      ? courses
      : courses.filter(course => course.category_id === activeTabId);

  // --- SẮP XẾP: Từ ít học viên nhất đến nhiều học viên nhất ---
  const sortedCourses = [...filteredCourses].sort((a, b) => {
      const studentsA = a.current_students || a.students_count || 0;
      const studentsB = b.current_students || b.students_count || 0;
      return studentsA - studentsB;
  });

  // Tính toán phân trang
  const totalPages = Math.ceil(sortedCourses.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedCourses.slice(indexOfFirstItem, indexOfLastItem);

  const goToPage = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  if (loading) {
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
          {currentItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              Không có lớp học nào thuộc danh mục này.
            </div>
          ) : (
            <div className="teacher-sec3__grid">
              {currentItems.map((course) => (
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
                        {course.category} - {course.level}
                      </span>
                      <h3 className="course-card__title">{course.title}</h3>
                      <p className="course-card__description">{course.description}</p>
                      <div className="course-card__footer">
                        <div className="course-card__price">
                          <span className="course-card__price-value">{parseInt(course.hourly_rate).toLocaleString('vi-VN')} đ/h</span>
                        </div>
                        <div className="course-card__students">
                          <span>👨‍🎓 {course.current_students || course.students_count || 0}/{course.max_students} HS</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
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