"use client";

import styles from "./page.module.css";
import Link from "next/link";
import { useState, useMemo, useEffect } from "react";

const quickFilters = ["Tất cả", "Toán", "Văn", "Anh", "Lý", "Hóa", "Sinh"];

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3.5l2.72 5.51 6.08.89-4.4 4.28 1.04 6.05L12 17.38l-5.44 2.85 1.04-6.05-4.4-4.28 6.08-.89L12 3.5z" />
    </svg>
  );
}

export default function TeacherListPage() {
  const [allTutors, setAllTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("Tất cả");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOption, setSortOption] = useState("newest");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const tutorsPerPage = 8;

  // Fetch dữ liệu từ API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tutorsRes, usersRes] = await Promise.all([
          fetch('http://localhost:8000/api/tutors'),
          fetch('http://localhost:8000/api/users')
        ]);
        
        if (!tutorsRes.ok || !usersRes.ok) {
          throw new Error('Không thể kết nối tới server API');
        }

        const tutorsData = await tutorsRes.json();
        const usersData = await usersRes.json();

        // Xử lý dữ liệu đề phòng API trả về dạng bọc object { success: true, data: [...] }
        const tutorsList = Array.isArray(tutorsData) ? tutorsData : (tutorsData.data || []);
        const usersList = Array.isArray(usersData) ? usersData : (usersData.data || []);

        const formattedTutors = tutorsList.map((tutor) => {
          const user = usersList.find(u => u.user_id === tutor.user_id);
          return {
            id: tutor.tutor_id,
            name: user?.full_name || "Gia sư AuraTeach",
            rating: parseFloat(tutor.rating) || 4.8,
            reviews: Math.floor(Math.random() * 120) + 45,
            location: "Hà Nội",
            desc: tutor.bio || "Gia sư giàu kinh nghiệm.",
            tags: ["Gia sư", tutor.qualification?.split(" - ")[0] || "Chuyên môn"],
            avatar: user?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
            qualification: tutor.qualification || "",
            createdAt: new Date(tutor.created_at || Date.now())
          };
        });

        setAllTutors(formattedTutors);
      } catch (error) {
        console.error("Lỗi khi fetch dữ liệu:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Lọc và sắp xếp
  const filteredAndSortedTutors = useMemo(() => {
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

    if (sortOption === "newest") {
      filtered = filtered.sort((a, b) => b.createdAt - a.createdAt);
    } else if (sortOption === "oldest") {
      filtered = filtered.sort((a, b) => a.createdAt - b.createdAt);
    }
    return filtered;
  }, [allTutors, searchTerm, activeFilter, sortOption]);

  const totalPages = Math.ceil(filteredAndSortedTutors.length / tutorsPerPage);
  const currentTutors = filteredAndSortedTutors.slice(
    (currentPage - 1) * tutorsPerPage,
    currentPage * tutorsPerPage
  );

  if (loading) return <div className={styles.teacherListPage} style={{padding: "100px", textAlign: "center"}}>Đang tải danh sách gia sư...</div>;

  return (
    <main className={styles.teacherListPage}>
      {/* Search Section */}
      <section className={`container-center ${styles.searchSection}`}>
        <div className={styles.searchCard}>
          <h1>Khám phá Gia sư tài năng</h1>
          <form className={styles.searchForm} onSubmit={(e) => e.preventDefault()}>
            <div className={styles.inputWrap}> {/* Đảm bảo class này vẫn tồn tại trong CSS */}
              <input
                type="text"
                placeholder="Tên gia sư, môn học..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <button type="submit">Tìm kiếm</button>
          </form>

          <div className={styles.quickFilter}>
            <span>Phổ biến:</span>
            <div>
              {quickFilters.map((item) => (
                <button
                  key={item}
                  className={activeFilter === item ? styles.activeFilter : ""}
                  onClick={() => { setActiveFilter(item); setCurrentPage(1); }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* List Section */}
      <section className={`container-center ${styles.listSection}`}>
        <div className={styles.listHead}>
          <h2>{filteredAndSortedTutors.length} gia sư phù hợp</h2>
          <div className={styles.sortWrapper}>
            <button className={styles.sortBtn} onClick={() => setIsSortOpen(!isSortOpen)}>
              {sortOption === "newest" ? "Mới nhất" : "Cũ nhất"} <span>▾</span>
            </button>
            {isSortOpen && (
              <div className={styles.sortDropdown}>
                <button onClick={() => { setSortOption("newest"); setIsSortOpen(false); }}>Mới nhất</button>
                <button onClick={() => { setSortOption("oldest"); setIsSortOpen(false); }}>Cũ nhất</button>
              </div>
            )}
          </div>
        </div>

        <div className={styles.grid}>
          {currentTutors.length > 0 ? (
            currentTutors.map((tutor) => (
              <article className={styles.card} key={tutor.id}>
                <div className={styles.cardTop}>
                  <img src={tutor.avatar} alt={tutor.name} onError={(e) => e.target.src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"} />
                  <div className={styles.rating}>
                    <span className={styles.star}><StarIcon /></span>
                    <span>{tutor.rating.toFixed(1)}</span>
                  </div>
                </div>
                <h3>{tutor.name}</h3>
                <p className={styles.desc}>{tutor.desc}</p>
                <div className={styles.tags}>{tutor.tags.map((tag, i) => <span key={i}>{tag}</span>)}</div>
                <Link href={`/tutorList/${tutor.id}`} className={styles.detailLink}>
                  <button className={styles.detailBtn}>Xem chi tiết</button>
                </Link>
              </article>
            ))
          ) : (
            <p style={{ gridColumn: '1 / -1', textAlign: 'center' }}>Không tìm thấy gia sư phù hợp.</p>
          )}
        </div>
      </section>
    </main>
  );
}