// src/app/(public)/tutorList/page.jsx
"use client";

import styles from "./page.module.css";
import Link from "next/link";
import { useState, useMemo } from "react";
import data from "../../api/data.json";

const quickFilters = ["Tất cả", "Toán", "Văn", "Anh", "Lý", "Hóa", "Sinh"];

// Thêm hàm helper để tạo dữ liệu ngẫu nhiên cho tutor
const getRandomDate = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

const allTutors = data.tutors.map((tutor) => {
  const user = data.users.find(u => u.user_id === tutor.user_id);
  
  let avatar = user?.avatar || "";
  if (!avatar || avatar === "") {
    avatar = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80";
  }

  // Tạo ngày tạo ngẫu nhiên cho tutor (trong vòng 1 năm qua)
  const createdAt = getRandomDate(
    new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
    new Date()
  );

  return {
    id: tutor.tutor_id,
    name: user?.full_name || "Gia sư AuraTeach",
    rating: tutor.rating || 4.8,
    reviews: Math.floor(Math.random() * 120) + 45,
    location: "Hà Nội",
    desc: tutor.bio.length > 135 ? tutor.bio.substring(0, 132) + "..." : tutor.bio,
    tags: ["Gia sư", tutor.qualification?.split(" - ")[1] || "Chuyên môn"].filter(Boolean),
    avatar: avatar,
    qualification: tutor.qualification || "",
    createdAt: createdAt, // Thêm ngày tạo
  };
});

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3.5l2.72 5.51 6.08.89-4.4 4.28 1.04 6.05L12 17.38l-5.44 2.85 1.04-6.05-4.4-4.28 6.08-.89L12 3.5z" />
    </svg>
  );
}

export default function TeacherListPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("Tất cả");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOption, setSortOption] = useState("newest"); // Thêm state cho sort
  const [isSortOpen, setIsSortOpen] = useState(false); // State cho dropdown
  const tutorsPerPage = 8;

  // Lọc và sắp xếp tutor
  const filteredAndSortedTutors = useMemo(() => {
    // Lọc trước
    let filtered = allTutors.filter((tutor) => {
      const matchesSearch = 
        tutor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tutor.desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tutor.qualification.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFilter = 
        activeFilter === "Tất cả" || 
        tutor.qualification.toLowerCase().includes(activeFilter.toLowerCase()) ||
        tutor.tags.some(tag => tag.toLowerCase().includes(activeFilter.toLowerCase()));

      return matchesSearch && matchesFilter;
    });

    // Sắp xếp sau
    if (sortOption === "newest") {
      filtered = filtered.sort((a, b) => b.createdAt - a.createdAt);
    } else if (sortOption === "oldest") {
      filtered = filtered.sort((a, b) => a.createdAt - b.createdAt);
    }

    return filtered;
  }, [searchTerm, activeFilter, sortOption]);

  // Phân trang
  const totalPages = Math.ceil(filteredAndSortedTutors.length / tutorsPerPage);
  const currentTutors = filteredAndSortedTutors.slice(
    (currentPage - 1) * tutorsPerPage,
    currentPage * tutorsPerPage
  );

  const handleSearch = (e) => {
    e.preventDefault();
  };

  // Hàm xử lý sort
  const handleSortChange = (option) => {
    setSortOption(option);
    setIsSortOpen(false);
    setCurrentPage(1);
  };

  return (
    <main className={styles.teacherListPage}>
      <section className={`container-center ${styles.searchSection}`}>
        <div className={styles.searchCard}>
          <h1>Khám phá Gia sư tài năng</h1>
          <p>
            Tìm kiếm người đồng hành hoàn hảo cho hành trình học tập của bạn. 
            Hàng ngàn gia sư chất lượng cao đã sẵn sàng hỗ trợ bạn.
          </p>

          <form className={styles.searchForm} onSubmit={handleSearch}>
            <div className={styles.inputWrap}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M21 21l-4.35-4.35m1.35-5.15a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                placeholder="Tên gia sư, môn học..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Tìm kiếm gia sư"
              />
            </div>
            <button type="submit">Tìm kiếm</button>
          </form>

          <div className={styles.quickFilter}>
            <span>Phổ biến:</span>
            <div>
              {quickFilters.map((item) => (
                <button
                  type="button"
                  key={item}
                  className={activeFilter === item ? styles.activeFilter : ""}
                  onClick={() => {
                    setActiveFilter(item);
                    setCurrentPage(1);
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={`container-center ${styles.listSection}`}>
        <div className={styles.listHead}>
          <h2>{filteredAndSortedTutors.length} gia sư phù hợp</h2>
          
          {/* Dropdown Sort */}
          <div className={styles.sortWrapper}>
            <button 
              type="button" 
              className={styles.sortBtn}
              onClick={() => setIsSortOpen(!isSortOpen)}
            >
              {sortOption === "newest" ? "Mới nhất" : "Cũ nhất"} 
              <span className={isSortOpen ? styles.arrowUp : styles.arrowDown}>▾</span>
            </button>
            
            {isSortOpen && (
              <div className={styles.sortDropdown}>
                <button 
                  className={sortOption === "newest" ? styles.activeSort : ""}
                  onClick={() => handleSortChange("newest")}
                >
                  Mới nhất
                </button>
                <button 
                  className={sortOption === "oldest" ? styles.activeSort : ""}
                  onClick={() => handleSortChange("oldest")}
                >
                  Cũ nhất
                </button>
              </div>
            )}
          </div>
        </div>

        <div className={styles.grid}>
          {currentTutors.length > 0 ? (
            currentTutors.map((tutor) => (
              <article className={styles.card} key={tutor.id}>
                <div className={styles.cardTop}>
                  <img 
                    src={tutor.avatar} 
                    alt={tutor.name}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80";
                    }}
                  />
                  <div className={styles.rating}>
                    <span className={styles.star}><StarIcon /></span>
                    <span>{tutor.rating.toFixed(1)}</span>
                    <small>({tutor.reviews})</small>
                  </div>
                </div>

                <h3>{tutor.name}</h3>
                <p className={styles.meta}>Gia sư tại {tutor.location}</p>
                <p className={styles.desc}>{tutor.desc}</p>

                <div className={styles.tags}>
                  {tutor.tags.map((tag, index) => (
                    <span key={index}>{tag}</span>
                  ))}
                </div>

                <Link href={`/tutorList/${tutor.id}`} className={styles.detailLink}>
                  <button type="button" className={styles.detailBtn}>
                    Xem chi tiết
                  </button>
                </Link>
              </article>
            ))
          ) : (
            <p style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#666' }}>
              Không tìm thấy gia sư nào phù hợp với từ khóa của bạn.
            </p>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Trước
            </button>
            
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  className={currentPage === pageNum ? styles.activePage : ""}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}

            {totalPages > 5 && <span>...</span>}

            <button 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Sau
            </button>
          </div>
        )}
      </section>
    </main>
  );
}