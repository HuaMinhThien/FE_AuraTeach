"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

function CoursesSection() {
  const [categories, setCategories] = useState([]);
  const [courses, setCourses] = useState([]);
  
  // Mặc định tab ban đầu là 'All' (Tất cả)
  const [activeTabId, setActiveTabId] = useState('All');
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6; 

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

  // --- SỬA LOGIC LỌC: So sánh dựa trên category_name và trường category của khóa học ---
  // Cập nhật logic lọc filteredCourses trong file CoursesSection.jsx:

const filteredCourses = activeTabId === 'All'
  ? courses
  : courses.filter(course => course.category_id === activeTabId); 

  // Tính toán phân trang
  const totalPages = Math.ceil(filteredCourses.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredCourses.slice(indexOfFirstItem, indexOfLastItem);

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
            <h2 className="teacher-sec3__title">Danh Sách Lớp Học Gần Đây</h2>
            
          </div>

          {/* THANH TAB DANH MỤC */}
          <div className="teacher-sec3__tabs" style={{ display: 'flex', gap: '10px', marginBottom: '30px', flexWrap: 'wrap' }}>
            {/* Nút Tất cả */}
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

            {/* Duyệt qua danh mục động từ API */}
            {categories
              .filter(cat => cat.category_name !== 'Tất cả') // Tránh trùng lặp nút Tất cả nếu API có sẵn
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
                    {/* SỬA ĐỔI: Sử dụng cat.category_name thay cho cat.name cũ */}
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
            <div className="teacher-sec3__grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
              {currentItems.map((course) => (
                <div key={course.id || course.course_id} className="course-card" style={{ border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                  <img 
                    src={course.thumbnail || "/img/default-class-1.jpg"} 
                    alt={course.title} 
                    style={{ width: '100%', height: '180px', objectFit: 'cover' }}
                  />
                  <div style={{ padding: '20px' }}>
                    <span style={{ fontSize: '12px', background: '#E2E8F0', padding: '4px 8px', borderRadius: '4px', fontWeight: '600', color: '#4A5568' }}>
                      {course.category} - {course.level}
                    </span>
                    <h3 style={{ margin: '10px 0 5px 0', fontSize: '18px', color: '#1A202C' }}>{course.title}</h3>
                    <p style={{ fontSize: '14px', color: '#4A5568', height: '40px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{course.description}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #EDF2F7' }}>
                      <span style={{ fontWeight: 'bold', color: '#E28743' }}>{parseInt(course.hourly_rate).toLocaleString('vi-VN')} đ/h</span>
                      <span style={{ fontSize: '12px', color: '#718096' }}>Tối đa: {course.max_students} HS</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* PHÂN TRANG */}
          {totalPages > 1 && (
            <div className="teacher-sec3__pagination" style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '40px' }}>
              <button 
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid #CBD5E1', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}
              >
                &lt;
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => goToPage(pageNum)}
                  style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    border: currentPage === pageNum ? 'none' : '1px solid #CBD5E1',
                    backgroundColor: currentPage === pageNum ? '#00236F' : '#FFFFFF',
                    color: currentPage === pageNum ? '#FFFFFF' : '#444651',
                    fontWeight: '600', cursor: 'pointer'
                  }}
                >
                  {pageNum}
                </button>
              ))}

              <button 
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid #CBD5E1', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}
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