"use client";

import React, { useState, useEffect } from 'react';

function TeacherSection() {
  const [categories, setCategories] = useState([]);
  const [teachers, setTeachers] = useState([]);
  
  // Lưu trạng thái theo tên môn học (String) để dễ lọc dữ liệu
  const [activeTab, setActiveTab] = useState('Tất cả');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSectionData = async () => {
        try {
            const [resCategories, resTeachers] = await Promise.all([
                fetch('http://localhost:3007/categories'),
                fetch('http://localhost:3007/teachers')
            ]);

            if (!resCategories.ok || !resTeachers.ok) {
                throw new Error('Lỗi khi gọi một trong hai endpoint');
            }

            const dataCategories = await resCategories.json();
            const dataTeachers = await resTeachers.json();

            setCategories(dataCategories);
            setTeachers(dataTeachers);
            } catch (error) {
                console.error('Lỗi gọi API tách biệt:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSectionData();
    }, []);

  // Lọc danh sách giảng viên dựa trên tên môn học đang chọn
  const filteredTeachers = activeTab === 'Tất cả'
    ? teachers
    : teachers.filter(item => item.subject === activeTab);

  if (loading) {
    return <div className="teacher-sec3" style={{ textAlign: 'center', padding: '20px' }}>Đang tải dữ liệu từ API...</div>;
  }

  return (
    <section className="teacher-sec3">
      <h2 className="teacher-sec3__title">Tìm Giảng Viên Theo Môn Học</h2>

      {/* SỬA TẠI ĐÂY: Render tab từ mảng Object mới */}
      <div className="teacher-sec3__tab-container">
        {categories.map((cat) => (
          <button
            key={cat.id} /* Dùng cat.id làm key */
            className={`teacher-sec3__tab-item ${activeTab === cat.name ? 'teacher-sec3__tab-item--active' : ''}`}
            onClick={() => setActiveTab(cat.name)} /* Kích hoạt theo cat.name */
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Grid danh sách các Card (Giữ nguyên) */}
      <div className="teacher-sec3__grid">
        {filteredTeachers.map((teacher) => (
          <div key={teacher.id} className="teacher-sec3__card">
            
            <div className="teacher-sec3__image-box">
              <img src={teacher.image} alt={teacher.title} />
              {teacher.badge && (
                <span className={`teacher-sec3__badge ${teacher.badge === 'Hot' ? 'teacher-sec3__badge--hot' : ''}`}>
                  {teacher.badge}
                </span>
              )}
            </div>

            <div className="teacher-sec3__content">
              <div className="teacher-sec3__sub-info">
                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" height="14" width="14" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                {teacher.tag}
              </div>

              <h3 className="teacher-sec3__card-title">{teacher.title}</h3>

              <div className="teacher-sec3__footer">
                <div>
                  <div className="teacher-sec3__price-label">Học phí từ</div>
                  <div className="teacher-sec3__price-value">{teacher.price}</div>
                </div>
                
                <button className="teacher-sec3__action-btn" title="Xem chi tiết">
                  <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" height="18" width="18" xmlns="http://www.w3.org/2000/svg"><path d="M11 2C6.03 2 2 6.03 2 11c0 2.82 1.3 5.34 3.33 6.99L3.74 20.26c-.38.39-.37 1.03.02 1.41.39.38 1.03.37 1.41-.02l2.27-2.31C8.79 19.74 9.87 20 11 20c4.97 0 9-4.03 9-9s-4.03-9-9-9zm0 16c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7zm2-10h-2v2H9v2h2v2h2v-2h2v-2h-2z"></path></svg>
                </button>
              </div>
            </div>

          </div>
        ))}
      </div>
    </section>
  );
}

export default TeacherSection;