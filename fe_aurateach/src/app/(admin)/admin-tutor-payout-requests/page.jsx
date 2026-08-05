'use client';

import { useEffect, useState } from 'react';
import styles from './admin-tutor-payout-requests.module.css';

const API_ROUTE = '/api/admin-tutor-payout-requests';

// Hàm helper để lấy cookie theo tên
const getCookie = (name) => {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const rawVal = parts.pop().split(';').shift();
    try {
      // Decode chuỗi %7B%22user_id... thành JSON hợp lệ
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

  // Modal states
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectingRequest, setRejectingRequest] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // Lấy thông tin Admin đăng nhập từ cookie `user_info`
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
      
      const enrichedRequests = await res.json();
      setRequests(enrichedRequests);
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage({ type: 'error', text: 'Không thể tải danh sách yêu cầu rút tiền' });
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

  // Xử lý Phê Duyệt thành công
  const handleApprove = async (request) => {
    setProcessing(true);
    try {
      const res = await fetch(API_ROUTE, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: request.id,
          status: 'approved',
          processed_by: adminId, 
        }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: `Đã duyệt thành công yêu cầu ${request.request_code}` });
        setSelectedRequest(null);
        fetchData();
      } else {
        setMessage({ type: 'error', text: 'Thao tác thất bại, vui lòng thử lại' });
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Lỗi kết nối máy chủ' });
    } finally {
      setProcessing(false);
    }
  };

  // Xử lý Từ Chối kèm lý do & hoàn tiền lại ví
  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('Vui lòng nhập lý do từ chối!');
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch(API_ROUTE, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: rejectingRequest.id,
          status: 'rejected',
          rejection_reason: rejectReason,
          processed_by: adminId, 
        }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: `Đã từ chối yêu cầu ${rejectingRequest.request_code} và hoàn lại tiền vào ví gia sư` });
        setRejectingRequest(null);
        setRejectReason('');
        fetchData();
      } else {
        setMessage({ type: 'error', text: 'Từ chối thất bại, vui lòng thử lại' });
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Lỗi kết nối máy chủ' });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Đang tải danh sách yêu cầu rút tiền...</p>
      </div>
    );
  }

  // Thống kê
  const pendingRequests = requests.filter(r => r.status === 'pending');
  const totalPendingAmount = pendingRequests.reduce((sum, r) => sum + (r.amount || 0), 0);
  const approvedRequests = requests.filter(r => r.status === 'approved');

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>💰 Duyệt yêu cầu rút tiền gia sư</h1>
        <p className={styles.subtitle}>Phê duyệt và chuyển khoản thanh toán thu nhập cho gia sư</p>
      </header>

      {message && (
        <div className={`${styles.message} ${message.type === 'success' ? styles.messageSuccess : styles.messageError}`}>
          <span>{message.type === 'success' ? '✅' : ''}</span>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className={styles.messageClose}>✕</button>
        </div>
      )}

      {/* Thống kê nhanh */}
      <div className={styles.overviewCards}>
        <div className={styles.overviewCard}>
          <span className={styles.overviewIcon}>⏳</span>
          <div>
            <p className={styles.overviewLabel}>Yêu cầu chờ duyệt</p>
            <p className={styles.overviewValue}>{pendingRequests.length}</p>
          </div>
        </div>
        <div className={styles.overviewCard}>
          <span className={styles.overviewIcon}>💸</span>
          <div>
            <p className={styles.overviewLabel}>Tổng tiền chờ duyệt</p>
            <p className={styles.overviewValue}>{formatPrice(totalPendingAmount)}</p>
            <p className={styles.overviewSub}>Cần giải ngân cho gia sư</p>
          </div>
        </div>
        <div className={styles.overviewCard}>
          <span className={styles.overviewIcon}>✅</span>
          <div>
            <p className={styles.overviewLabel}>Đã duyệt hoàn tất</p>
            <p className={styles.overviewValue}>{approvedRequests.length}</p>
          </div>
        </div>
      </div>

      {/* Bảng danh sách yêu cầu rút tiền */}
      <div className={styles.tableCard}>
        <h3>Danh sách yêu cầu rút tiền</h3>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Mã YC / Gia sư</th>
                <th>Số tiền rút</th>
                <th>Thời gian gửi</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id}>
                  <td>
                    <div className={styles.tutorCell}>
                      <img
                        src={req.tutor_avatar}
                        alt={req.tutor_name}
                        className={styles.tutorAvatar}
                        onError={(e) => { e.target.src = '/img/default-avatar.svg'; }}
                      />
                      <div>
                        <p className={styles.tutorName}>{req.tutor_name}</p>
                        <p className={styles.requestCode}>{req.request_code}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <strong style={{ color: '#16a34a', fontSize: '14px' }}>
                      {formatPrice(req.amount)}
                    </strong>
                  </td>
                  <td>{formatDate(req.created_at)}</td>
                  <td>
                    {req.status === 'pending' && (
                      <span className={`${styles.statusBadge} ${styles.statusPending}`}>⏳ Chờ duyệt</span>
                    )}
                    {req.status === 'approved' && (
                      <span className={`${styles.statusBadge} ${styles.statusApproved}`}>✅ Đã duyệt</span>
                    )}
                    {req.status === 'rejected' && (
                      <span className={`${styles.statusBadge} ${styles.statusRejected}`}> Từ chối</span>
                    )}
                  </td>
                  <td>
                    <div className={styles.actionButtons}>
                      <button
                        className={styles.detailBtn}
                        onClick={() => setSelectedRequest(req)}
                      >
                        Chi tiết
                      </button>
                      <button
                        className={styles.rejectBtn}
                        onClick={() => {
                          setRejectingRequest(req);
                          setRejectReason('');
                        }}
                        disabled={req.status !== 'pending'}
                      >
                         Từ chối
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {requests.length === 0 && (
                <tr>
                  <td colSpan={5} className={styles.emptyCell}>
                    Chưa có yêu cầu rút tiền nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CHI TIẾT VÀ PHÊ DUYỆT */}
      {selectedRequest && (
        <div className={styles.modalOverlay} onClick={() => setSelectedRequest(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Chi tiết yêu cầu rút tiền</h3>
              <button className={styles.modalClose} onClick={() => setSelectedRequest(null)}>✕</button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.infoGrid}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Mã yêu cầu:</span>
                  <span className={styles.infoValue}>{selectedRequest.request_code}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Gia sư:</span>
                  <span className={styles.infoValue}>{selectedRequest.tutor_name} ({selectedRequest.tutor_email})</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Số tiền rút:</span>
                  <span className={styles.infoValue} style={{ color: '#16a34a', fontSize: '16px' }}>
                    {formatPrice(selectedRequest.amount)}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Số dư ví khả dụng hiện tại:</span>
                  <span className={styles.infoValue}>{formatPrice(selectedRequest.available_balance)}</span>
                </div>

                <div className={styles.bankHighlight}>
                  <p style={{ margin: '0 0 8px 0', fontWeight: 600, color: '#1a1a2e', fontSize: '13px' }}>
                    💳 Thông tin ngân hàng nhận tiền:
                  </p>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Ngân hàng:</span>
                    <span className={styles.infoValue}>{selectedRequest.bank_name} ({selectedRequest.bank_code})</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Số tài khoản:</span>
                    <span className={styles.infoValue} style={{ letterSpacing: '1px', color: '#4f46e5' }}>
                      {selectedRequest.account_number}
                    </span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Chủ tài khoản:</span>
                    <span className={styles.infoValue}>{selectedRequest.account_holder_name}</span>
                  </div>
                </div>

                {selectedRequest.status === 'rejected' && selectedRequest.rejection_reason && (
                  <div className={styles.infoRow} style={{ color: '#dc2626' }}>
                    <span className={styles.infoLabel}>Lý do từ chối:</span>
                    <span className={styles.infoValue}>{selectedRequest.rejection_reason}</span>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setSelectedRequest(null)} disabled={processing}>
                Đóng
              </button>
              {selectedRequest.status === 'pending' && (
                <button
                  className={styles.approveBtn}
                  onClick={() => handleApprove(selectedRequest)}
                  disabled={processing}
                >
                  {processing ? <span className={styles.spinner}></span> : '✅ Xác nhận Duyệt'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL TỪ CHỐI (KÈM LÝ DO) */}
      {rejectingRequest && (
        <div className={styles.modalOverlay} onClick={() => setRejectingRequest(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 style={{ color: '#dc2626' }}> Từ chối yêu cầu rút tiền</h3>
              <button className={styles.modalClose} onClick={() => setRejectingRequest(null)}>✕</button>
            </div>

            <div className={styles.modalBody}>
              <p style={{ fontSize: '13px', margin: '0 0 12px 0', color: '#4b5563' }}>
                Từ chối yêu cầu <strong>{rejectingRequest.request_code}</strong> của gia sư <strong>{rejectingRequest.tutor_name}</strong> ({formatPrice(rejectingRequest.amount)})
              </p>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                  Lý do từ chối <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  className={styles.textarea}
                  placeholder="Nhập lý do từ chối (VD: Sai thông tin số tài khoản, tên không khớp,...)"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  disabled={processing}
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setRejectingRequest(null)} disabled={processing}>
                Hủy
              </button>
              <button
                className={styles.confirmRejectBtn}
                onClick={handleReject}
                disabled={processing || !rejectReason.trim()}
              >
                {processing ? <span className={styles.spinner}></span> : ' Xác nhận Từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}