'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function ClassListPage() {
  const router = useRouter();

  // 1. Khởi tạo state là null hoặc mảng rỗng thay vì dữ liệu tĩnh
  const [data, setData] = useState({ courses: [], tutors: [], users: [], categories: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [priceRange, setPriceRange] = useState('all');
  const [sortOption, setSortOption] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  
  const itemsPerPage = 12;

  // 2. Fetch dữ liệu từ Laravel API
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Đảm bảo URL chính xác với cấu hình Laravel của bạn
        const [coursesRes, tutorsRes, usersRes, catsRes] = await Promise.all([
          fetch('http://localhost:8000/api/courses'),
          fetch('http://localhost:8000/api/tutors'),
          fetch('http://localhost:8000/api/users'),
          fetch('http://localhost:8000/api/categories'),
        ]);

        if (!coursesRes.ok) throw new Error("Không thể tải danh sách lớp học");

        const courses = await coursesRes.json();
        const tutors = await tutorsRes.json();
        const users = await usersRes.json();
        const categories = await catsRes.json();

        setData({ courses, tutors, users, categories });
      } catch (error) {
        console.error("Lỗi khi fetch dữ liệu:", error);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const parsePrice = useCallback((priceStr) => {
    return parseInt(String(priceStr).replace(/[^0-9]/g, '')) || 0;
  }, []);

  // 3. Kết hợp dữ liệu từ state data (đã fetch về)
  const coursesWithDetails = useMemo(() => {
    if (loading || !data.courses) return [];
    
    const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiByeD0iMjQiIGZpbGw9IiNFNUU3RUIiLz4KPHBhdGggZD0iTTE2IDE4QzE2IDE1LjI0IDguMjQgMTIgMTIgMTJDMTEuNTUyIDIxIDIwIDM2IDI0IDM2QzI4IDM2IDM2LjQ0OCAyMSAzNiAxMkMyOS43NiAxMiAyNCAxNS4yNCAyNCAxOFoiIGZpbGw9IiM5Q0FGRjYiLz48L3N2Zz4=';

    return data.courses.map(course => {
      const tutor = data.tutors.find(t => t.tutor_id === course.tutor_id);
      const user = tutor ? data.users.find(u => u.user_id === tutor.user_id) : null;

      return {
        ...course,
        tutor_name: user?.full_name || 'Gia sư AuraTeach',
        tutor_avatar: (user?.avatar && user.avatar !== '/img/tutors/default.png') 
          ? user.avatar 
          : defaultAvatar,
        experience: tutor?.Experience || 'Chưa cập nhật',
      };
    });
  }, [data, loading]);

  // Logic lọc và sắp xếp (giữ nguyên logic cũ của bạn)
  const filteredCourses = useMemo(() => {
    let result = [...coursesWithDetails];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(course =>
        course.title.toLowerCase().includes(term) ||
        course.tutor_name.toLowerCase().includes(term)
      );
    }

    if (selectedCategory !== 'Tất cả') {
      const category = data.categories.find(c => c.category_name === selectedCategory);
      if (category) {
        result = result.filter(course => course.category_id === category.category_id);
      }
    }

    if (priceRange !== 'all') {
      result = result.filter(course => {
        const priceNum = parsePrice(course.price_per_session);
        if (priceRange === 'under200') return priceNum < 200000;
        if (priceRange === '200-300') return priceNum >= 200000 && priceNum <= 300000;
        if (priceRange === 'over300') return priceNum > 300000;
        return true;
      });
    }

    if (sortOption === 'price-low') {
      result.sort((a, b) => parsePrice(a.price_per_session) - parsePrice(b.price_per_session));
    } else if (sortOption === 'price-high') {
      result.sort((a, b) => parsePrice(b.price_per_session) - parsePrice(a.price_per_session));
    }

    return result;
  }, [coursesWithDetails, searchTerm, selectedCategory, priceRange, sortOption, parsePrice, data.categories]);

  // ... (Giữ nguyên các hàm xử lý sự kiện như cũ: handleCardClick, handleSearchChange, v.v.)
  const handleCardClick = useCallback((course) => { router.push(`/classList/${course.course_id}`); }, [router]);
  const handleImageError = useCallback((e) => { e.target.src = 'data:image/svg+xml;base64,...'; }, []);
  const handleSearchChange = (e) => { setSearchTerm(e.target.value); setCurrentPage(1); };
  const handlePriceChange = (e) => { setPriceRange(e.target.value); setCurrentPage(1); };
  const handleSortChange = (e) => { setSortOption(e.target.value); setCurrentPage(1); };
  const handleCategoryClick = (name) => { setSelectedCategory(name); setCurrentPage(1); };

  // Phân trang
  const totalPages = Math.ceil(filteredCourses.length / itemsPerPage);
  const paginatedCourses = filteredCourses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Hiển thị loading
  if (loading) {
    return (
      <div className={styles.container}>
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontSize: '24px', marginBottom: '16px' }}>⏳</div>
          <div style={{ fontSize: '18px', color: '#666' }}>Đang tải danh sách lớp học...</div>
        </div>
      </div>
    );
  }

  // Hiển thị lỗi
  if (error) {
    return (
      <div className={styles.container}>
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>😅</div>
          <div style={{ fontSize: '20px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>
            Không thể tải dữ liệu
          </div>
          <div style={{ fontSize: '16px', color: '#666', marginBottom: '24px' }}>{error}</div>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 32px',
              backgroundColor: '#2c5bf2',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* HERO SECTION */}
      <section className={styles.heroSection}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Tìm gia sư hỗ trợ ôn tập &<br />
            giải đáp bài tập (Cấp 1, 2, 3)
          </h1>
          <p className={styles.heroSubtitle}>
            Kết nối với các chuyên gia để ôn lại bài cũ, sửa bài tập và học theo giá linh hoạt.
          </p>

          <div className={styles.heroTags}>
            <span className={styles.tag}>✅ Gia sư xác thực</span>
            <span className={styles.tag}>👥 Học nhóm nhỏ</span>
          </div>

          <div className={styles.heroButtons}>
            <button className={styles.heroBtnPrimary}>Tìm gia sư ngay</button>
          </div>
        </div>

        <div className={styles.heroImageWrapper}>
          <img 
            src="https://image.plo.vn/w1000/Uploaded/2026/vrwqqxjwp/2021_09_13/hoc-online_opku.jpeg.webp" 
            alt="Gia sư hỗ trợ học online" 
            className={styles.heroImage}
          />
          <div className={styles.badge}>2.5k+<br />HỌC VIÊN ĐĂNG KÝ</div>
        </div>
      </section>

      {/* FILTER SECTION */}
      <section className={styles.filterSection}>
        <div className={styles.filterLeft}>
          <input
            type="text"
            placeholder="Tìm môn học hoặc gia sư..."
            value={searchTerm}
            onChange={handleSearchChange}
            className={styles.searchInput}
          />

          <select 
            value={priceRange} 
            onChange={handlePriceChange}
            className={styles.filterDropdown}
          >
            <option value="all">Mức phí</option>
            <option value="under200">Dưới 200k</option>
            <option value="200-300">200k - 300k</option>
            <option value="over300">Trên 300k</option>
          </select>

          <select 
            value={sortOption} 
            onChange={handleSortChange}
            className={styles.filterDropdown}
          >
            <option value="students-asc">Học viên tăng dần</option>
            <option value="students-desc">Học viên giảm dần</option>
            <option value="price-low">Giá tăng dần</option>
            <option value="price-high">Giá giảm dần</option>
          </select>
        </div>

        <div className={styles.filterRight}>
          <button
            className={`${styles.filterTag} ${selectedCategory === 'Tất cả' ? styles.active : ''}`}
            onClick={() => handleCategoryClick('Tất cả')}
          >
            Tất cả
          </button>
          {data.categories.map(cat => (
            <button
              key={cat.category_id}
              className={`${styles.filterTag} ${selectedCategory === cat.category_name ? styles.active : ''}`}
              onClick={() => handleCategoryClick(cat.category_name)}
            >
              {cat.category_name}
            </button>
          ))}
        </div>
      </section>

      {/* LIST SECTION */}
      <section className={styles.listSection}>
        <div className={styles.listHeader}>
          <div>
            <h2 className={styles.listTitle}>Danh Sách Lớp Học</h2>
            <p className={styles.listCount}>
              Tìm thấy <strong>{filteredCourses.length}</strong> lớp học phù hợp
            </p>
          </div>
        </div>

        <div className={styles.tutorGrid}>
          {paginatedCourses.length > 0 ? (
            paginatedCourses.map((course) => (
              <div 
                key={course.course_id} 
                className={styles.tutorCard}
                onClick={() => handleCardClick(course)}
              >
                <div className={styles.cardImage}>
                  <img 
                    src={course.thumbnail || "/img/default-class-1.jpg"} 
                    alt={course.title}
                    className={styles.cardThumbnail}
                    onError={(e) => {
                      e.target.src = "/img/default-class-1.jpg";
                    }}
                  />
                  <span className={styles.cardBadge}>
                    {course.category_name} - {course.level || 'N/A'}
                  </span>
                </div>

                <h3 className={styles.tutorSubject}>{course.title}</h3>

                <div className={styles.tutorInfo}>
                  <div className={styles.tutorAvatar}>
                    <img 
                      src={course.tutor_avatar} 
                      alt={course.tutor_name}
                      width={40}
                      height={40}
                      onError={handleImageError}
                    />
                  </div>
                  <div className={styles.tutorDetails}>
                    <p className={styles.tutorName}>{course.tutor_name}</p>
                    <p className={styles.tutorStats}>
                      {course.experience}
                    </p>
                  </div>
                </div>

                <p className={styles.cardDescription}>{course.description}</p>

                <div className={styles.tutorFooter}>
                  <div className={styles.tutorPrice}>
                    <span className={styles.priceLabel}>HỌC PHÍ THEO GIỜ</span>
                    <span className={styles.priceValue}>
                      {parseInt(course.hourly_rate || course.price_per_session || 0).toLocaleString('vi-VN')} đ/h
                    </span>
                  </div>
                  <div className={styles.studentCount}>
                    <span>👥 {course.current_students || 0}/{course.max_students || 0} HS</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
              <div style={{ fontSize: '18px', color: '#666' }}>
                Không tìm thấy lớp học nào phù hợp với tiêu chí tìm kiếm.
              </div>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button 
              className={styles.pageBtn}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              ‹
            </button>
            
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  className={`${styles.pageBtn} ${currentPage === pageNum ? styles.active : ''}`}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}

            {totalPages > 5 && currentPage < totalPages - 2 && (
              <span className={styles.pageDots}>...</span>
            )}

            {totalPages > 5 && currentPage < totalPages - 2 && (
              <button
                className={styles.pageBtn}
                onClick={() => setCurrentPage(totalPages)}
              >
                {totalPages}
              </button>
            )}

            <button 
              className={styles.pageBtn}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              ›
            </button>
          </div>
        )}
      </section>

      {/* CTA SECTION */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaContent}>
          <h2 className={styles.ctaTitle}>Bạn là giáo viên hoặc sinh viên giỏi?</h2>
          <p className={styles.ctaSubtitle}>
            Gia nhập đội ngũ gia sư tại AuraTeach để chia sẻ kiến thức các môn học phổ thông<br />
            (Cấp 1, 2, 3) và tạo thêm thu nhập linh hoạt ngay hôm nay.
          </p>
          <div className={styles.ctaButtons}>
            <button className={styles.ctaPrimary}>Đăng ký làm Gia sư</button>
            <button className={styles.ctaSecondary}>Tìm hiểu thêm</button>
          </div>
        </div>
      </section>
    </div>
  );
}