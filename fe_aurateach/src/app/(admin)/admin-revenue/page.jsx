'use client';

import { useEffect, useState } from 'react';
import styles from './revenue.module.css';

const API_BASE = 'http://localhost:3007';

export default function AdminRevenuePage() {
  const [tutors, setTutors] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTutor, setSelectedTutor] = useState(null);
  const [releasing, setReleasing] = useState(false);
  const [releaseAmount, setReleaseAmount] = useState(0);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch tutors
      const tutorsRes = await fetch(`${API_BASE}/tutors`);
      const tutorsData = await tutorsRes.json();
      const tutorsList = Array.isArray(tutorsData) ? tutorsData : [];

      // Fetch payouts history
      const payoutsRes = await fetch(`${API_BASE}/payouts`);
      const payoutsData = await payoutsRes.json();
      const payoutsList = Array.isArray(payoutsData) ? payoutsData : [];

      // Fetch users to map tutor_id -> full_name
      const usersRes = await fetch(`${API_BASE}/users`);
      const usersData = await usersRes.json();
      const usersList = Array.isArray(usersData) ? usersData : [];

      // Enrich tutors with user info
      const enrichedTutors = tutorsList.map(tutor => {
        const user = usersList.find(u => u.user_id === tutor.user_id);
        return {
          ...tutor,
          full_name: user?.full_name || 'Gia sư',
          avatar: user?.avatar || '/img/default-avatar.svg',
        };
      });

      setTutors(enrichedTutors);
      setPayouts(payoutsList);
    } catch (error) {
      console.error('❌ Error:', error);
      setError('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    if (!price || isNaN(price)) return '0đ';
    return Number(price).toLocaleString('vi-VN') + 'đ';
  };

  const handleRelease = async (tutor) => {
    const amount = releaseAmount || tutor.pending_balance;
    if (amount <= 0) {
      setMessage({ type: 'error', text: 'Số tiền không hợp lệ' });
      return;
    }

    setReleasing(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/payouts/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tutorId: tutor.tutor_id,
          amount: amount,
          adminId: 'u-admin-1',
        }),
      });

      const result = await res.json();

      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        // Refresh
        fetchData();
        setSelectedTutor(null);
        setReleaseAmount(0);
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Lỗi kết nối server' });
    } finally {
      setReleasing(false);
    }
  };

  const getTutorPayouts = (tutorId) => {
    return payouts
      .filter(p => p.tutor_id === tutorId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Đang tải dữ liệu...</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>💰 Thu nhập & Ví</h1>
        <p className={styles.subtitle}>Quản lý số dư của gia sư và giải ngân</p>
      </header>

      {message && (
        <div className={`${styles.message} ${message.type === 'success' ? styles.messageSuccess : styles.messageError}`}>
          <span>{message.type === 'success' ? '✅' : '❌'}</span>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className={styles.messageClose}>✕</button>
        </div>
      )}

      {/* Tổng quan */}
        <div className={styles.overviewCards}>
          <div className={styles.overviewCard}>
            <span className={styles.overviewIcon}>👨‍🏫</span>
            <div>
              <p className={styles.overviewLabel}>Tổng gia sư</p>
              <p className={styles.overviewValue}>{tutors.length}</p>
            </div>
          </div>
          <div className={styles.overviewCard}>
            <span className={styles.overviewIcon}>⏳</span>
            <div>
              <p className={styles.overviewLabel}>Tổng chờ nhận (Pending)</p>
              <p className={styles.overviewValue}>
                {formatPrice(tutors.reduce((sum, t) => sum + (t.pending_balance || 0), 0))}
              </p>
              <p className={styles.overviewSub}>Chờ hoàn thành buổi học mới được giải ngân</p>
            </div>
          </div>
          <div className={styles.overviewCard}>
            <span className={styles.overviewIcon}>✅</span>
            <div>
              <p className={styles.overviewLabel}>Tổng khả dụng (Available)</p>
              <p className={styles.overviewValue}>
                {formatPrice(tutors.reduce((sum, t) => sum + (t.available_balance || 0), 0))}
              </p>
              <p className={styles.overviewSub}>Có thể yêu cầu rút tiền</p>
            </div>
          </div>
        </div>

      {/* Danh sách gia sư */}
      <div className={styles.tableCard}>
        <h3>Danh sách gia sư</h3>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Gia sư</th>
                <th>Số dư chờ (⏳)</th>
                <th>Số dư khả dụng (✅)</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {tutors.map(tutor => (
                <tr key={tutor.tutor_id || tutor.id}>
                  <td>
                    <div className={styles.tutorCell}>
                      <img 
                        src={tutor.avatar} 
                        alt={tutor.full_name}
                        className={styles.tutorAvatar}
                        onError={(e) => { e.target.src = '/img/default-avatar.svg' }}
                      />
                      <div>
                        <p className={styles.tutorName}>{tutor.full_name}</p>
                        <p className={styles.tutorId}>ID: {tutor.tutor_id}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={styles.pendingBadge}>
                      {formatPrice(tutor.pending_balance)}
                    </span>
                  </td>
                  <td>
                    <span className={styles.availableBadge}>
                      {formatPrice(tutor.available_balance)}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actionButtons}>
                      <button
                        className={styles.releaseBtn}
                        onClick={() => {
                          setSelectedTutor(selectedTutor?.tutor_id === tutor.tutor_id ? null : tutor);
                          setReleaseAmount(tutor.pending_balance || 0);
                          setMessage(null);
                        }}
                        disabled={!tutor.pending_balance || tutor.pending_balance <= 0}
                      >
                        💸 Giải ngân
                      </button>
                      <button
                        className={styles.historyBtn}
                        onClick={() => alert(`Lịch sử giao dịch:\n${getTutorPayouts(tutor.tutor_id).map(p => 
                          `- ${p.type === 'release' ? '💸 Giải ngân' : '💳 Rút tiền'}: ${formatPrice(p.amount)} (${p.status})`
                        ).join('\n') || 'Chưa có giao dịch'}`)}
                      >
                        📜 Lịch sử
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {tutors.length === 0 && (
                <tr>
                  <td colSpan={4} className={styles.emptyCell}>Chưa có gia sư nào</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal giải ngân */}
      {selectedTutor && (
        <div className={styles.modalOverlay} onClick={() => setSelectedTutor(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>💸 Giải ngân cho gia sư</h3>
              <button className={styles.modalClose} onClick={() => setSelectedTutor(null)}>✕</button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.modalTutorInfo}>
                <img 
                  src={selectedTutor.avatar} 
                  alt={selectedTutor.full_name}
                  className={styles.modalAvatar}
                  onError={(e) => { e.target.src = '/img/default-avatar.svg' }}
                />
                <div>
                  <p className={styles.modalTutorName}>{selectedTutor.full_name}</p>
                  <p className={styles.modalTutorId}>ID: {selectedTutor.tutor_id}</p>
                </div>
              </div>

              <div className={styles.balanceInfo}>
                <p>Số dư chờ hiện tại: <strong className={styles.pendingText}>{formatPrice(selectedTutor.pending_balance)}</strong></p>
              </div>

              <div className={styles.formGroup}>
                <label>Số tiền giải ngân</label>
                <div className={styles.inputGroup}>
                  <input
                    type="number"
                    className={styles.input}
                    value={releaseAmount}
                    onChange={(e) => setReleaseAmount(Number(e.target.value))}
                    max={selectedTutor.pending_balance}
                    min={0}
                    disabled={releasing}
                  />
                  <button
                    className={styles.maxBtn}
                    onClick={() => setReleaseAmount(selectedTutor.pending_balance || 0)}
                    disabled={releasing}
                  >
                    MAX
                  </button>
                </div>
                <p className={styles.inputHint}>
                  Số tiền sẽ chuyển từ ví chờ (⏳) sang ví khả dụng (✅) của gia sư
                </p>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setSelectedTutor(null)} disabled={releasing}>
                Hủy
              </button>
              <button
                className={styles.confirmBtn}
                onClick={() => handleRelease(selectedTutor)}
                disabled={releasing || !releaseAmount || releaseAmount <= 0}
              >
                {releasing ? (
                  <>
                    <span className={styles.spinner}></span>
                    Đang xử lý...
                  </>
                ) : (
                  `💸 Giải ngân ${formatPrice(releaseAmount)}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

