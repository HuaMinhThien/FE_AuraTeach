'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminService } from '@/services/adminService';
import styles from './AdminContentManagement.module.css';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=80';
const DEFAULT_THUMB = '/img/class/default-class-1.jpg';

// ── Tab IDs ──────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'tutors',  label: 'Gia sư nổi bật',    section: 'featured_tutors' },
  { id: 'reviews', label: 'Đánh giá nổi bật', section: 'featured_reviews' },
  { id: 'courses', label: 'Lớp học đề cử',    section: 'featured_courses' },
];

// ── Star renderer ─────────────────────────────────────────────────────────────
function Stars({ rating }) {
  return (
    <span className={styles.itemMeta}>
      ★ {Number(rating).toFixed(1)}
    </span>
  );
}

// ── Generic item card ─────────────────────────────────────────────────────────
function ItemCard({ item, isSelected, onAdd, onRemove, order }) {
  return (
    <div className={`${styles.itemCard} ${isSelected ? styles.itemCardSelected : ''}`}>
      {isSelected && <span className={styles.orderBadge}>{order}</span>}

      {item.thumb_type === 'rect' ? (
        <img
          src={item.thumb || DEFAULT_THUMB}
          alt={item.name}
          className={styles.itemThumbRect}
          onError={(e) => { e.target.src = DEFAULT_THUMB; }}
        />
      ) : (
        <img
          src={item.thumb || DEFAULT_AVATAR}
          alt={item.name}
          className={styles.itemThumb}
          onError={(e) => { e.target.src = DEFAULT_AVATAR; }}
        />
      )}

      <div className={styles.itemInfo}>
        <p className={styles.itemName}>{item.name}</p>
        <p className={styles.itemSub}>{item.sub}</p>
      </div>

      {item.rating != null && <Stars rating={item.rating} />}

      {isSelected ? (
        <button className={styles.removeBtn} onClick={() => onRemove(item.id)}>
          Bỏ chọn
        </button>
      ) : (
        <button className={styles.addBtn} onClick={() => onAdd(item.id)}>
          + Thêm
        </button>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminContentManagementPage() {
  const [activeTab, setActiveTab] = useState('tutors');
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState(null); // { type: 'success'|'error', msg }

  // Raw data pools
  const [allTutors,  setAllTutors]  = useState([]);
  const [allReviews, setAllReviews] = useState([]);
  const [allCourses, setAllCourses] = useState([]);

  // Per-section state
  const [tutorConfig,  setTutorConfig]  = useState({ enabled: true, display_count: 4, tutor_ids: [] });
  const [reviewConfig, setReviewConfig] = useState({ enabled: true, display_count: 4, review_ids: [] });
  const [courseConfig, setCourseConfig] = useState({ enabled: true, display_count: 8, course_ids: [] });

  // Search filters
  const [searchTutor,  setSearchTutor]  = useState('');
  const [searchReview, setSearchReview] = useState('');
  const [searchCourse, setSearchCourse] = useState('');

  // ── Load data ───────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.getContentManagementData();
      if (!res.success || !res.data) throw new Error('Không tải được dữ liệu');

      const { tutors, reviews, courses, config } = res.data;

      setAllTutors(tutors);
      setAllReviews(reviews);
      setAllCourses(courses);

      if (config) {
        if (config.featured_tutors)  setTutorConfig(config.featured_tutors);
        if (config.featured_reviews) setReviewConfig(config.featured_reviews);
        if (config.featured_courses) setCourseConfig(config.featured_courses);
      }
    } catch (err) {
      showToast('error', 'Không thể tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Toast ───────────────────────────────────────────────────────────────────
  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Save handler ────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const tab = TABS.find(t => t.id === activeTab);
      let payload;
      if (activeTab === 'tutors')  payload = tutorConfig;
      if (activeTab === 'reviews') payload = reviewConfig;
      if (activeTab === 'courses') payload = courseConfig;

      const res = await adminService.updateFeaturedContent(tab.section, payload);
      if (!res.success) throw new Error(res.message || 'Lưu thất bại');
      showToast('success', 'Đã lưu cấu hình thành công!');
    } catch (err) {
      showToast('error', err.message || 'Có lỗi xảy ra khi lưu.');
    } finally {
      setSaving(false);
    }
  };

  // ── Generic add / remove helpers ────────────────────────────────────────────
  const makeAdder = (config, setConfig, idKey) => (id) => {
    setConfig(prev => ({
      ...prev,
      [idKey]: [...(prev[idKey] || []), id],
    }));
  };

  const makeRemover = (config, setConfig, idKey) => (id) => {
    setConfig(prev => ({
      ...prev,
      [idKey]: (prev[idKey] || []).filter(x => x !== id),
    }));
  };

  const makeToggle = (setConfig) => (val) => {
    setConfig(prev => ({ ...prev, enabled: val }));
  };

  const makeCountChange = (setConfig) => (val) => {
    const n = Math.max(1, parseInt(val) || 1);
    setConfig(prev => ({ ...prev, display_count: n }));
  };

  // Helpers per section
  const addTutor    = makeAdder(tutorConfig, setTutorConfig, 'tutor_ids');
  const removeTutor = makeRemover(tutorConfig, setTutorConfig, 'tutor_ids');

  const addReview    = makeAdder(reviewConfig, setReviewConfig, 'review_ids');
  const removeReview = makeRemover(reviewConfig, setReviewConfig, 'review_ids');

  const addCourse    = makeAdder(courseConfig, setCourseConfig, 'course_ids');
  const removeCourse = makeRemover(courseConfig, setCourseConfig, 'course_ids');

  // ── Render helpers ───────────────────────────────────────────────────────────

  function renderSectionHeader(title, desc, config, setConfig, idKey) {
    const ids   = config[idKey] || [];
    const total = ids.length;
    return (
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>
          <h2>{title}</h2>
          <p>{desc} — Đang chọn <strong>{total}</strong> mục, hiển thị <strong>{config.display_count}</strong></p>
        </div>
        <div className={styles.sectionControls}>
          <label className={styles.toggleWrapper}>
            <input
              type="checkbox"
              className={styles.toggleInput}
              checked={!!config.enabled}
              onChange={e => makeToggle(setConfig)(e.target.checked)}
            />
            {config.enabled ? 'Đang hiển thị' : 'Đang ẩn'}
          </label>
          <label className={styles.countWrapper}>
            Hiển thị
            <input
              type="number"
              min={1}
              max={20}
              className={styles.countInput}
              value={config.display_count}
              onChange={e => makeCountChange(setConfig)(e.target.value)}
            />
            mục
          </label>
          <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>
    );
  }

  // ── TAB: TUTORS ──────────────────────────────────────────────────────────────
  function renderTutorsTab() {
    const selected = tutorConfig.tutor_ids || [];
    const filtered = allTutors
      .filter(t => !selected.includes(t.tutor_id))
      .filter(t => t.name.toLowerCase().includes(searchTutor.toLowerCase()) ||
                   t.expertise.toLowerCase().includes(searchTutor.toLowerCase()));

    const selectedItems = selected
      .map((id, idx) => {
        const t = allTutors.find(x => x.tutor_id === id);
        return t ? { ...t, _order: idx + 1 } : null;
      })
      .filter(Boolean);

    const toCard = (t) => ({
      id: t.tutor_id,
      name: t.name,
      sub: t.expertise || 'Chưa cập nhật',
      thumb: t.avatar,
      thumb_type: 'circle',
      rating: t.rating,
    });

    return (
      <>
        {renderSectionHeader(
          'Gia sư nổi bật',
          'Chọn gia sư muốn hiển thị tại trang home',
          tutorConfig, setTutorConfig, 'tutor_ids'
        )}

        <div className={styles.twoCol}>
          {/* Pool */}
          <div className={styles.colBox}>
            <span className={styles.colLabel}>Tất cả gia sư ({filtered.length})</span>
            <input
              className={styles.searchInput}
              placeholder="Tìm theo tên hoặc chuyên môn..."
              value={searchTutor}
              onChange={e => setSearchTutor(e.target.value)}
            />
            <div className={styles.itemList}>
              {filtered.length === 0 && (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}></div>
                  Không tìm thấy gia sư phù hợp
                </div>
              )}
              {filtered.map(t => (
                <ItemCard
                  key={t.tutor_id}
                  item={toCard(t)}
                  isSelected={false}
                  onAdd={addTutor}
                  onRemove={removeTutor}
                />
              ))}
            </div>
          </div>

          {/* Selected */}
          <div className={styles.colBox}>
            <span className={styles.colLabel}>Đã chọn ({selectedItems.length})</span>
            <div className={styles.itemList}>
              {selectedItems.length === 0 && (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}></div>
                  Chưa chọn gia sư nào
                </div>
              )}
              {selectedItems.map((t) => (
                <ItemCard
                  key={t.tutor_id}
                  item={toCard(t)}
                  isSelected={true}
                  order={t._order}
                  onAdd={addTutor}
                  onRemove={removeTutor}
                />
              ))}
            </div>
          </div>
        </div>

        {tutorConfig.updated_at && (
          <p className={styles.updatedAt}>
            Cập nhật lần cuối: {new Date(tutorConfig.updated_at).toLocaleString('vi-VN')}
          </p>
        )}
      </>
    );
  }

  // ── TAB: REVIEWS ────────────────────────────────────────────────────────────
  function renderReviewsTab() {
    const selected = reviewConfig.review_ids || [];
    const filtered = allReviews
      .filter(r => !selected.includes(r.review_id))
      .filter(r =>
        r.author.toLowerCase().includes(searchReview.toLowerCase()) ||
        r.comment.toLowerCase().includes(searchReview.toLowerCase()) ||
        r.course_title.toLowerCase().includes(searchReview.toLowerCase())
      );

    const selectedItems = selected
      .map((id, idx) => {
        const r = allReviews.find(x => x.review_id === id);
        return r ? { ...r, _order: idx + 1 } : null;
      })
      .filter(Boolean);

    const toCard = (r) => ({
      id: r.review_id,
      name: r.author,
      sub: `${r.course_title} · "${r.comment.slice(0, 60)}${r.comment.length > 60 ? '...' : ''}"`,
      thumb: null,
      thumb_type: 'circle',
      rating: r.rating,
    });

    return (
      <>
        {renderSectionHeader(
          'Đánh giá nổi bật',
          'Chọn đánh giá muốn hiển thị tại trang home',
          reviewConfig, setReviewConfig, 'review_ids'
        )}

        <div className={styles.twoCol}>
          <div className={styles.colBox}>
            <span className={styles.colLabel}>Tất cả đánh giá ({filtered.length})</span>
            <input
              className={styles.searchInput}
              placeholder="Tìm theo tên học viên, lớp hoặc nội dung..."
              value={searchReview}
              onChange={e => setSearchReview(e.target.value)}
            />
            <div className={styles.itemList}>
              {filtered.length === 0 && (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}></div>
                  Không tìm thấy đánh giá phù hợp
                </div>
              )}
              {filtered.map(r => (
                <ItemCard
                  key={r.review_id}
                  item={toCard(r)}
                  isSelected={false}
                  onAdd={addReview}
                  onRemove={removeReview}
                />
              ))}
            </div>
          </div>

          <div className={styles.colBox}>
            <span className={styles.colLabel}>Đã chọn ({selectedItems.length})</span>
            <div className={styles.itemList}>
              {selectedItems.length === 0 && (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}></div>
                  Chưa chọn đánh giá nào
                </div>
              )}
              {selectedItems.map((r) => (
                <ItemCard
                  key={r.review_id}
                  item={toCard(r)}
                  isSelected={true}
                  order={r._order}
                  onAdd={addReview}
                  onRemove={removeReview}
                />
              ))}
            </div>
          </div>
        </div>

        {reviewConfig.updated_at && (
          <p className={styles.updatedAt}>
            Cập nhật lần cuối: {new Date(reviewConfig.updated_at).toLocaleString('vi-VN')}
          </p>
        )}
      </>
    );
  }

  // ── TAB: COURSES ────────────────────────────────────────────────────────────
  function renderCoursesTab() {
    const selected = courseConfig.course_ids || [];
    const filtered = allCourses
      .filter(c => !selected.includes(c.course_id))
      .filter(c =>
        (c.title || '').toLowerCase().includes(searchCourse.toLowerCase())
      );

    const selectedItems = selected
      .map((id, idx) => {
        const c = allCourses.find(x => x.course_id === id);
        return c ? { ...c, _order: idx + 1 } : null;
      })
      .filter(Boolean);

    const toCard = (c) => ({
      id: c.course_id,
      name: c.title || 'Lớp học',
      sub: `${c.level || ''} · ${c.status === 'active' ? 'Đang mở' : c.status || ''}`,
      thumb: c.thumbnail,
      thumb_type: 'rect',
      rating: null,
    });

    return (
      <>
        {renderSectionHeader(
          '📚 Lớp học đề cử',
          'Chọn lớp học muốn hiển thị tại trang home',
          courseConfig, setCourseConfig, 'course_ids'
        )}

        <div className={styles.twoCol}>
          <div className={styles.colBox}>
            <span className={styles.colLabel}>Tất cả lớp học ({filtered.length})</span>
            <input
              className={styles.searchInput}
              placeholder="Tìm theo tên lớp học..."
              value={searchCourse}
              onChange={e => setSearchCourse(e.target.value)}
            />
            <div className={styles.itemList}>
              {filtered.length === 0 && (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}></div>
                  Không tìm thấy lớp học phù hợp
                </div>
              )}
              {filtered.map(c => (
                <ItemCard
                  key={c.course_id}
                  item={toCard(c)}
                  isSelected={false}
                  onAdd={addCourse}
                  onRemove={removeCourse}
                />
              ))}
            </div>
          </div>

          <div className={styles.colBox}>
            <span className={styles.colLabel}>Đã chọn ({selectedItems.length})</span>
            <div className={styles.itemList}>
              {selectedItems.length === 0 && (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}></div>
                  Chưa chọn lớp học nào
                </div>
              )}
              {selectedItems.map((c) => (
                <ItemCard
                  key={c.course_id}
                  item={toCard(c)}
                  isSelected={true}
                  order={c._order}
                  onAdd={addCourse}
                  onRemove={removeCourse}
                />
              ))}
            </div>
          </div>
        </div>

        {courseConfig.updated_at && (
          <p className={styles.updatedAt}>
            Cập nhật lần cuối: {new Date(courseConfig.updated_at).toLocaleString('vi-VN')}
          </p>
        )}
      </>
    );
  }

  // ── RENDER ────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          Đang tải dữ liệu...
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Quản lý nội dung trang home</h1>
        <p>Chọn gia sư, đánh giá và lớp học muốn hiển thị nổi bật trên trang chủ</p>
      </div>

      {toast && (
        <div className={`${styles.toast} ${toast.type === 'success' ? styles.toastSuccess : styles.toastError}`}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
        </div>
      )}

      {/* Tab Bar */}
      <div className={styles.tabBar}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`${styles.tabBtn} ${activeTab === tab.id ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className={styles.sectionPanel}>
        {activeTab === 'tutors'  && renderTutorsTab()}
        {activeTab === 'reviews' && renderReviewsTab()}
        {activeTab === 'courses' && renderCoursesTab()}
      </div>
    </div>
  );
}
