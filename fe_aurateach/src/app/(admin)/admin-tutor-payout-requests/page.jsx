'use client';

import { useEffect, useState, useMemo } from 'react';
import styles from './admin-tutor-payout-requests.module.css';
import { adminService } from '@/services/adminService';

export default function AdminPayoutRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [adminId, setAdminId] = useState('admin_system');
  const [processingId, setProcessingId] = useState(null); // Đã thêm state này

  // Filter & Search States
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [startDate, setStartDate] = useState('');

  useEffect(() => {
    try {
      const userSession = localStorage.getItem('user') || sessionStorage.getItem('user');
      if (userSession) {
        const parsedUser = JSON.parse(userSession);
        if (parsedUser?.user_id || parsedUser?.id) {
          setAdminId(parsedUser.user_id || parsedUser.id);
        }
      }
    } catch (err) {
      console.error('Không thể lấy thông tin Admin:', err);
    }

    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const data = await adminService.getTutorPayouts();
      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage({ type: 'error', text: `Không thể tải danh sách thanh toán lương: ${error.message || 'Lỗi kết nối server'}` });
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

  // Logic lọc danh sách theo Trạng thái, Tìm kiếm tên/mã và Ngày tháng
  const filteredRequests = requests.filter((req) => {
    if (searchTerm.trim() === '') return true;
    const term = searchTerm.toLowerCase();
    return (
      req.tutor_name?.toLowerCase().includes(term) ||
      req.tutor_email?.toLowerCase().includes(term)
    );
  });

  const handleConfirmPayment = async (item) => {
    const confirmMsg = `Bạn có chắc muốn xác nhận thanh toán lương cho gia sư "${item.tutor_name}" với số tiền ${formatPrice(item.total_amount || item.amount)} không?`;
    if (!window.confirm(confirmMsg)) return;
    
    setProcessingId(item.id || item.tutor_payout_id);
    try {
      await adminService.updatePayoutRequestStatus({
          id: item.id || item.tutor_payout_id,
          status: 'approved',
          processed_by: adminId,
      });
      setMessage({
        type: 'success',
        text: `Đã xác nhận thanh toán lương cho ${item.tutor_name} thành công!`,
      });
      fetchData();
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: error.message || 'Thao tác thất bại' });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Thanh toán lương gia sư</h1>
          <p className={styles.subtitle}>
            Xác nhận và chuyển khoản lương tháng cho gia sư
          </p>
        </div>
        <button onClick={fetchData} className={styles.detailBtn} style={{ height: 'fit-content' }}>
          🔄 Làm mới
        </button>
        <button
          onClick={async () => {
            const now = new Date();
            const month = now.getMonth() === 0 ? 12 : now.getMonth(); // tháng trước
            const year  = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
            if (!window.confirm(`Tạo phiếu lương tháng ${month}/${year} cho tất cả gia sư?`)) return;
            try {
              const res = await adminService.generatePayouts(month, year);
              setMessage({ type: 'success', text: res?.message || 'Đã tạo phiếu lương!' });
              fetchData();
            } catch (err) {
              setMessage({ type: 'error', text: err.message || 'Lỗi tạo phiếu lương' });
            }
          }}
          className={styles.detailBtn}
          style={{ height: 'fit-content', background: '#16a34a', color: '#fff', border: 'none' }}
        >
          💰 Tạo phiếu lương
        </button>
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

      {/* Khu vực Bảng danh sách & Bộ lọc */}
      <div className={styles.tableCard}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div className={styles.tableCardHeader}>
            <h3>Danh sách thanh toán lương tháng này</h3>
          </div>
          
          {/* Thanh Bộ Lọc & Tìm Kiếm */}
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
                        /* Đã đổi từ req sang item */
                        src={item.tutor_avatar || 'https://res.cloudinary.com/ghbrskob/image/upload/v1786662834/avatar-mac-dinh-cua-fb-4.webp'}
                        alt={item.tutor_name || 'Gia sư'}
                        className={styles.tutorAvatar}
                        onError={(e) => { e.target.src = 'https://res.cloudinary.com/ghbrskob/image/upload/v1786662834/avatar-mac-dinh-cua-fb-4.webp'; }}
                      />
                      <div>
                        <p className={styles.tutorName}>{item.tutor_name || 'Chưa cập nhật'}</p>
                        <p className={styles.requestCode}>{item.payout_req_id || item.tutor_payout_id || `#${item.id}`}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <strong style={{ color: '#16a34a', fontSize: '15px' }}>
                      {formatPrice(item.total_amount || item.amount)}
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
                  <td colSpan={5} className={styles.emptyCell}>
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