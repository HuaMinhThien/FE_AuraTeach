'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import courseService from '@/services/courseService';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function ClassListPage() {
  const router = useRouter();
  
  // State cho dữ liệu từ API
  const [courses, setCourses] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State cho filter và pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [priceRange, setPriceRange] = useState('all');
  const [sortOption, setSortOption] = useState('students-asc');
  const [currentPage, setCurrentPage] = useState(1);
  
  const itemsPerPage = 8; // 2 hàng x 4 cột

  // Fetch dữ liệu từ API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [resCourses, resTutors, resUsers, resCategories] = await Promise.all([
          courseService.getAll({ limit: 'all' }),
          courseService.getTutors(),
          courseService.getUsers(),
          courseService.getCategories()
        ]);

        // Hứng linh hoạt dù API trả về mảng trực tiếp hay bọc trong object { data: [...] }
        const extractData = (res) => {
          if (Array.isArray(res)) return res;
          if (res && Array.isArray(res.data)) return res.data;
          if (res && Array.isArray(res.courses)) return res.courses;
          return [];
        };

        setCourses(extractData(resCourses));
        setTutors(extractData(resTutors));
        setUsers(extractData(resUsers));
        setCategories(extractData(resCategories));
        
      } catch (error) {
        console.error('Lỗi khi tải dữ liệu:', error);
        setError('Không thể kết nối đến hệ thống.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Parse giá - FIX: Xử lý an toàn cho mọi loại dữ liệu
  const parsePrice = useCallback((priceStr) => {
    if (priceStr === undefined || priceStr === null || priceStr === '') {
      return 0;
    }
    // Nếu là number, chuyển thành string
    const str = String(priceStr);
    // Lấy tất cả số từ string
    const numbers = str.replace(/[^0-9]/g, '');
    return parseInt(numbers) || 0;
  }, []);

  // Lấy giá trị an toàn
  const getSafePrice = useCallback((course) => {
    const price = course?.hourly_rate || course?.price_per_session || 0;
    return typeof price === 'number' ? price : parsePrice(price);
  }, [parsePrice]);

  // Kết hợp dữ liệu
  const coursesWithDetails = useMemo(() => {
    const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiByeD0iMjQiIGZpbGw9IiNFNUU3RUIiLz4KPHBhdGggZD0iTTE2IDE4QzE2IDE1LjI0IDguMjQgMTIgMTIgMTJDMTEuNTUyIDIxIDIwIDM2IDI0IDM2QzI4IDM2IDM2LjQ0OCAyMSAzNiAxMkMyOS43NiAxMiAyNCAxNS4yNCAyNCAxOFoiIGZpbGw9IiM5Q0FGRjYiLz48L3N2Zz4=';

    return courses.map(course => {
      const tutor = tutors.find(t => t.tutor_id === course.tutor_id);
      const user = tutor ? users.find(u => u.user_id === tutor.user_id) : null;

      return {
        ...course,
        tutor_name: user?.full_name || 'Gia sư AuraTeach',
        tutor_avatar: (user?.avatar && user.avatar !== '/img/tutors/default.png') 
          ? user.avatar 
          : defaultAvatar,
        experience: tutor?.Experience || 'Chưa cập nhật',
        students_count: course.current_students || course.students_count || 0,
        category_name: categories.find(c => c.category_id === course.category_id)?.category_name || 'Chưa phân loại',
        // Thêm trường price_number để sử dụng cho filter
        price_number: getSafePrice(course),
      };
    });
  }, [courses, tutors, users, categories, getSafePrice]);

  // Lọc và sắp xếp
  const filteredCourses = useMemo(() => {
    let result = [...coursesWithDetails];

    // Tìm kiếm
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(course =>
        course.title.toLowerCase().includes(term) ||
        course.tutor_name.toLowerCase().includes(term) ||
        course.category_name.toLowerCase().includes(term)
      );
    }

    // Lọc theo danh mục
    if (selectedCategory !== 'Tất cả') {
      const category = categories.find(c => c.category_name === selectedCategory);
      if (category) {
        result = result.filter(course => course.category_id === category.category_id);
      }
    }

    // Lọc theo giá - SỬ DỤNG price_number đã được tính sẵn
    if (priceRange !== 'all') {
      result = result.filter(course => {
        const priceNum = course.price_number || 0;
        if (priceRange === 'under200') return priceNum < 200000;
        if (priceRange === '200-300') return priceNum >= 200000 && priceNum <= 300000;
        if (priceRange === 'over300') return priceNum > 300000;
        return true;
      });
    }

    // Sắp xếp - SỬ DỤNG price_number đã được tính sẵn
    if (sortOption === 'students-asc') {
      result = [...result].sort((a, b) => (a.students_count || 0) - (b.students_count || 0));
    } else if (sortOption === 'students-desc') {
      result = [...result].sort((a, b) => (b.students_count || 0) - (a.students_count || 0));
    } else if (sortOption === 'price-low') {
      result = [...result].sort((a, b) => (a.price_number || 0) - (b.price_number || 0));
    } else if (sortOption === 'price-high') {
      result = [...result].sort((a, b) => (b.price_number || 0) - (a.price_number || 0));
    }

    return result;
  }, [coursesWithDetails, searchTerm, selectedCategory, priceRange, sortOption, categories]);

  // Phân trang
  const totalPages = Math.ceil(filteredCourses.length / itemsPerPage) || 1;
  const paginatedCourses = useMemo(() => {
    return filteredCourses.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredCourses, currentPage]);

  // Điều hướng đến trang chi tiết
  const handleCardClick = useCallback((course) => {
    router.push(`/classList/${course.course_id}`);
  }, [router]);

  // Xử lý lỗi ảnh
  const handleImageError = useCallback((e) => {
    const img = e.target;
    const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiByeD0iMjQiIGZpbGw9IiNFNUU3RUIiLz4KPHBhdGggZD0iTTE2IDE4QzE2IDE1LjI0IDguMjQgMTIgMTIgMTJDMTEuNTUyIDIxIDIwIDM2IDI0IDM2QzI4IDM2IDM2LjQ0OCAyMSAzNiAxMkMyOS43NiAxMiAyNCAxNS4yNCAyNCAxOFoiIGZpbGw9IiM5Q0FGRjYiLz48L3N2Zz4=';
    
    if (img.src !== defaultAvatar) {
      img.src = defaultAvatar;
      img.onerror = null;
    }
  }, []);

  // Handlers
  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  }, []);

  const handlePriceChange = useCallback((e) => {
    setPriceRange(e.target.value);
    setCurrentPage(1);
  }, []);

  const handleSortChange = useCallback((e) => {
    setSortOption(e.target.value);
    setCurrentPage(1);
  }, []);

  const handleCategoryClick = useCallback((categoryName) => {
    setSelectedCategory(categoryName);
    setCurrentPage(1);
  }, []);

  // Format giá an toàn
  const formatPrice = useCallback((price) => {
    if (price === undefined || price === null || price === '') return '0';
    const num = typeof price === 'number' ? price : parsePrice(price);
    return num.toLocaleString('vi-VN');
  }, [parsePrice]);

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
          {categories.map(cat => (
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
                      {formatPrice(course.hourly_rate || course.price_per_session)} đ/h
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