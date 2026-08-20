'use client';

import { useEffect, useState } from 'react';
import styles from './admin-tutor-payout-requests.module.css';

const API_ROUTE = '/api/admin-tutor-payout-requests';

const getCookie = (name) => {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const rawVal = parts.pop().split(';').shift();
    try {
      return JSON.parse(decodeURIComponent(rawVal));
    } catch (e) {
      console.error('Lỗi khi parse cookie:', e);
      return null;
    }
  }
  return null;
};

export default function AdminPayoutRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [adminId, setAdminId] = useState('admin_system');
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    try {
      const userInfo = getCookie('user_info');
      if (userInfo && (userInfo.user_id || userInfo.id)) {
        setAdminId(userInfo.user_id || userInfo.id);
      }
    } catch (err) {
      console.error('Không thể lấy thông tin Admin từ cookie:', err);
    }

    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_ROUTE);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage({ type: 'error', text: 'Không thể tải danh sách thanh toán lương' });
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    if (!price || isNaN(price)) return '0đ';
    return Number(price).toLocaleString('vi-VN') + 'đ';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '---';
    return new Date(dateString).toLocaleString('vi-VN');
  };

  // Xác nhận thanh toán lương
  const handleConfirmPayment = async (item) => {
    const confirmMsg = `Bạn có chắc muốn xác nhận thanh toán lương cho gia sư "${item.tutor_name}" với số tiền ${formatPrice(item.total_amount)} không?`;

    if (!window.confirm(confirmMsg)) return;

    setProcessingId(item.id || item.tutor_payout_id);
    try {
      const res = await fetch(API_ROUTE, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          status: 'approved',
          processed_by: adminId,
        }),
      });

      if (res.ok) {
        setMessage({
          type: 'success',
          text: `Đã xác nhận thanh toán lương cho ${item.tutor_name} thành công!`,
        });
        fetchData();
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.message || 'Thao tác thất bại' });
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Lỗi kết nối máy chủ' });
    } finally {
      setProcessingId(null);
    }
  };

  // Lọc theo tên gia sư
  const filteredRequests = requests.filter((req) => {
    if (searchTerm.trim() === '') return true;
    const term = searchTerm.toLowerCase();
    return (
      req.tutor_name?.toLowerCase().includes(term) ||
      req.tutor_email?.toLowerCase().includes(term)
    );
  });

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Đang tải danh sách thanh toán lương...</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Thanh toán lương gia sư</h1>
        <p className={styles.subtitle}>
          Xác nhận và chuyển khoản lương tháng cho gia sư
        </p>
      </header>

      {message && (
        <div
          className={`${styles.message} ${
            message.type === 'success' ? styles.messageSuccess : styles.messageError
          }`}
        >
          <span>{message.type === 'success' ? '✅' : '❌'}</span>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className={styles.messageClose}>
            ✕
          </button>
        </div>
      )}

      {/* Bảng danh sách */}
      <div className={styles.tableCard}>
        <div className={styles.tableCardHeader}>
          <h3>Danh sách thanh toán lương tháng này</h3>

          <div className={styles.filterBar}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Tìm theo tên gia sư..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Gia sư</th>
                <th>Tiền lương tháng này</th>
                <th>Tổng số buổi dạy</th>
                <th>Tài khoản ngân hàng</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((item) => (
                <tr key={item.id || item.tutor_payout_id}>
                  <td>
                    <div className={styles.tutorCell}>
                      <img
                        src={item.tutor_avatar}
                        alt={item.tutor_name}
                        className={styles.tutorAvatar}
                        onError={(e) => {
                          e.target.src = '/img/default-avatar.svg';
                        }}
                      />
                      <div>
                        <p className={styles.tutorName}>{item.tutor_name}</p>
                        <p className={styles.requestCode}>{item.tutor_email}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <strong style={{ color: '#16a34a', fontSize: '15px' }}>
                      {formatPrice(item.total_amount)}
                    </strong>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{item.total_sessions || 0}</span> buổi
                  </td>
                  <td>
                    <div style={{ fontSize: '13px', lineHeight: 1.5 }}>
                      <div style={{ fontWeight: 600 }}>{item.bank_name}</div>
                      <div style={{ color: '#4f46e5', letterSpacing: '0.5px' }}>
                        {item.account_number}
                      </div>
                      <div style={{ color: '#6b7280' }}>{item.account_holder_name}</div>
                    </div>
                  </td>
                  <td>
                    <button
                      className={styles.approveBtn}
                      onClick={() => handleConfirmPayment(item)}
                      disabled={processingId === (item.id || item.tutor_payout_id)}
                      style={{ padding: '8px 16px' }}
                    >
                      {processingId === (item.id || item.tutor_payout_id) ? (
                        <span className={styles.spinner}></span>
                      ) : (
                        ' Xác nhận thanh toán'
                      )}
                    </button>
                  </td>
                </tr>
              ))}

              {filteredRequests.length === 0 && (
                <tr>
                  <td colSpan={6} className={styles.emptyCell}>
                    Không có phiếu lương nào đang chờ thanh toán
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}