"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

function CoursesSection() {
  const [categories, setCategories] = useState([]);
  const [courses, setCourses] = useState([]);
  
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
              setCategories([{ id: 'All', name: 'Tất cả' }]);
              setCourses([]);
          } finally {
              setLoading(false);
          }
      };

      fetchSectionData();
  }, []);

  // Mỗi lần thay đổi danh mục (Tab môn học), reset số trang về lại trang 1
  const handleTabChange = (tabId) => {
    setActiveTabId(tabId);
    setCurrentPage(1); // 💡 Bắt buộc reset về trang 1 khi lọc danh mục mới
  };

  // 🌟 SỬA TẠI ĐÂY: Logic lọc an toàn, ép kiểu chuỗi để so sánh chính xác tuyệt đối
  const getFilteredCourses = () => {
    // Nếu chọn 'All' hoặc nút tương đương "Tất cả" (id là 1 hoặc '1' hoặc 'All')
    if (activeTabId === 'All' || String(activeTabId) === '1' || activeTabId === 'cat-01') {
      return courses;
    }
    
    // Ép toàn bộ kiểu dữ liệu về String để tránh lỗi lệch kiểu dữ liệu giữa Number và String từ DB
    return courses.filter(course => {
      const courseCatId = course.category_id ? String(course.category_id) : '';
      const selectedCatId = String(activeTabId);
      return courseCatId === selectedCatId;
    });
  };

  // Mảng dữ liệu sau khi lọc ĐÚNG danh mục
  const displayedFilteredCourses = getFilteredCourses();

  // 🌟 TÍNH TOÁN PHÂN TRANG: Dựa hoàn toàn trên mảng đã lọc chuẩn ở trên
  const totalPages = Math.ceil(displayedFilteredCourses.length / itemsPerPage);
  
  // Tính toán lại chỉ mục dựa trên mảng thực tế của trang hiện tại
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  
  // Trích xuất đúng số lượng phần tử hiển thị (tối đa 6 cái)
  const currentItems = displayedFilteredCourses.slice(indexOfFirstItem, indexOfLastItem);

  // Hàm xử lý điều hướng trang bằng mũi tên qua lại
  const goToPage = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  if (loading) {
    return (
      <div className="teacher-sec3" style={{ textAlign: 'center', padding: '60px', color: '#00236F', fontWeight: '600' }}>
        Đang tải danh sách khóa học từ hệ thống...
      </div>
    );
  }

  return (
    <section className="teacher-sec3">
      <h2 className="teacher-sec3__title">Khóa Học Nổi Bật</h2>

      {/* Thanh điều hướng Tab Danh Mục (Categories) */}
      <div className="teacher-sec3__tab-container">
        {categories
          .filter(cat => cat.name !== 'Tất cả' && String(cat.id) !== '1')
          .map((cat) => {
            // Lấy ID chuẩn của danh mục (hỗ trợ cả id hệ thống cũ và category_id hệ thống mới)
            const currentId = cat.category_id || cat.id;
            const isActive = String(activeTabId) === String(currentId);
            
            return (
              <button
                key={currentId} 
                className={`teacher-sec3__tab-item ${isActive ? 'teacher-sec3__tab-item--active' : ''}`}
                onClick={() => handleTabChange(currentId)} 
              >
                {cat.category_name || cat.name}
              </button>
            );
          })}
      </div>

      {/* Grid danh sách các Khóa học hiển thị chuẩn xác */}
      <div className="teacher-sec3__grid">
        {currentItems.length > 0 ? (
          currentItems.map((course) => (
            <div key={course.course_id || course.id} className="teacher-sec3__card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '24px', minHeight: '220px' }}>
              
              <div className="teacher-sec3__content" style={{ flex: 1, padding: 0 }}>
                {/* Thông tin luồng / nhãn phụ */}
                <div className="teacher-sec3__sub-info" style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" height="14" width="14" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                  </svg>
                  {course.flow || course.tag}
                </div>

                {/* Tiêu đề khóa học */}
                <h3 className="teacher-sec3__card-title" style={{ fontSize: '18px', margin: '0 0 10px 0', color: '#00236F' }}>
                  {course.title}
                </h3>
                
                {/* Mô tả chi tiết nội dung */}
                <p style={{ color: '#7A7C85', fontSize: '13px', margin: '0 0 20px 0', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {course.description || "Chương trình học chất lượng cao, bám sát cấu trúc đề thi và nâng cao tư duy logic hiệu quả."}
                </p>
              </div>

              {/* Phần thông tin chân trang: Học phí và nút chuyển trang */}
              <div className="teacher-sec3__footer" style={{ borderTop: '1px solid #F0F2F5', paddingTop: '16px', marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="teacher-sec3__price-label">Học phí từ</div>
                  <div className="teacher-sec3__price-value" style={{ fontSize: '18px', fontWeight: 'bold', color: '#00236F' }}>
                    {course.price_per_session || course.price}
                  </div>
                </div>
                
                {/* Điều hướng trang bằng Link */}
                <Link href={`/courses/${course.course_id || course.id}`} className="teacher-sec3__action-btn" title="Xem chi tiết khóa học" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                  <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" height="18" width="18" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11 2C6.03 2 2 6.03 2 11c0 2.82 1.3 5.34 3.33 6.99L3.74 20.26c-.38.39-.37 1.03.02 1.41.39.38 1.03.37 1.41-.02l2.27-2.31C8.79 19.74 9.87 20 11 20c4.97 0 9-4.03 9-9s-4.03-9-9-9zm0 16c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7zm2-10h-2v2H9v2h2v2h2v-2h2v-2h-2z"></path>
                  </svg>
                </Link>
              </div>

            </div>
          ))
        ) : (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#7A7C85', fontSize: '15px' }}>
            Hiện chưa có khóa học nào thuộc danh mục này được mở.
          </div>
        )}
      </div>

      {/* HỆ THỐNG ĐIỀU HƯỚNG PHÂN TRANG */}
      {totalPages > 1 && (
        <div className="teacher-sec3__pagination" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '40px' }}>
          
          <button 
            className="teacher-sec3__page-arrow"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '40px', height: '40px', borderRadius: '50%', border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF', color: '#444651', cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              opacity: currentPage === 1 ? 0.5 : 1, transition: 'all 0.2s ease'
            }}
          >
            <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" height="20" width="20" xmlns="http://www.w3.org/2000/svg">
              <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"></path>
            </svg>
          </button>

          {Array.from({ length: totalPages }, (_, index) => {
            const pageNum = index + 1;
            const isActive = currentPage === pageNum;
            return (
              <button
                key={pageNum}
                onClick={() => goToPage(pageNum)}
                className={`teacher-sec3__page-number ${isActive ? 'teacher-sec3__page-number--active' : ''}`}
                style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  border: isActive ? 'none' : '1px solid #CBD5E1',
                  backgroundColor: isActive ? '#00236F' : '#FFFFFF',
                  color: isActive ? '#FFFFFF' : '#444651',
                  fontWeight: '600', fontSize: '14px', cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {pageNum}
              </button>
            );
          })}

          <button 
            className="teacher-sec3__page-arrow"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '40px', height: '40px', borderRadius: '50%', border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF', color: '#444651', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              opacity: currentPage === totalPages ? 0.5 : 1, transition: 'all 0.2s ease'
            }}
          >
            <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" height="20" width="20" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"></path>
            </svg>
          </button>

        </div>
      )}
    </section>
  );
}

export default CoursesSection;