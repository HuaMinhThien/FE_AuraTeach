'use client';

import { useEffect, useState, useMemo } from 'react';
import styles from './admin-tutor-payout-requests.module.css';
import { adminService } from '@/services/adminService';

export default function AdminPayoutRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [adminId, setAdminId] = useState('admin_system');

  // Filter & Search states
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'approved', 'rejected'
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectingRequest, setRejectingRequest] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

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
    try {
      const enrichedRequests = await adminService.getPayoutRequests();
      setRequests(Array.isArray(enrichedRequests) ? enrichedRequests : (enrichedRequests?.data || []));
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

  // Xử lý Phê Duyệt
  const handleApprove = async (request) => {
    setProcessing(true);
    try {
      await adminService.updatePayoutRequestStatus({
        id: request.id,
        status: 'approved',
        processed_by: adminId,
      });

      setMessage({ type: 'success', text: `Đã duyệt thành công yêu cầu ${request.request_code || request.id}` });
      setSelectedRequest(null);
      fetchData();
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: error.message || 'Thao tác thất bại, vui lòng thử lại' });
    } finally {
      setProcessing(false);
    }
  };

  // Xử lý Từ Chối
  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('Vui lòng nhập lý do từ chối!');
      return;
    }

    setProcessing(true);
    try {
      await adminService.updatePayoutRequestStatus({
        id: rejectingRequest.id,
        status: 'rejected',
        rejection_reason: rejectReason,
        processed_by: adminId,
      });

      setMessage({ type: 'success', text: `Đã từ chối yêu cầu ${rejectingRequest.request_code || rejectingRequest.id} và hoàn lại tiền vào ví gia sư` });
      setRejectingRequest(null);
      setRejectReason('');
      fetchData();
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: error.message || 'Từ chối thất bại, vui lòng thử lại' });
    } finally {
      setProcessing(false);
    }
  };

  // Thống kê nhanh tổng quan toàn bộ data
  const stats = useMemo(() => {
    const pending = requests.filter(r => r.status === 'pending');
    const approved = requests.filter(r => r.status === 'approved');
    const rejected = requests.filter(r => r.status === 'rejected');
    const totalPendingAmount = pending.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    return {
      pendingCount: pending.length,
      approvedCount: approved.length,
      rejectedCount: rejected.length,
      totalPendingAmount,
    };
  }, [requests]);

  // Lọc và Tìm kiếm danh sách hiển thị
  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      // Bộ lọc theo tab trạng thái
      const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
      
      // Bộ lọc theo từ khóa tìm kiếm (Tên gia sư hoặc mã giao dịch)
      const query = searchTerm.toLowerCase().trim();
      const matchesSearch = 
        !query || 
        (req.tutor_name && req.tutor_name.toLowerCase().includes(query)) ||
        (req.request_code && req.request_code.toLowerCase().includes(query)) ||
        (String(req.id).toLowerCase().includes(query));

      return matchesStatus && matchesSearch;
    });
  }, [requests, statusFilter, searchTerm]);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Đang tải danh sách yêu cầu rút tiền...</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>💰 Duyệt yêu cầu rút tiền gia sư</h1>
          <p className={styles.subtitle}>Phê duyệt và chuyển khoản thanh toán thu nhập cho gia sư</p>
        </div>
        <button onClick={fetchData} className={styles.detailBtn} style={{ height: 'fit-content' }}>
          🔄 Làm mới
        </button>
      </header>

      {message && (
        <div className={`${styles.message} ${message.type === 'success' ? styles.messageSuccess : styles.messageError}`}>
          <span>{message.type === 'success' ? '✅' : '❌'}</span>
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
            <p className={styles.overviewValue}>{stats.pendingCount}</p>
          </div>
        </div>
        <div className={styles.overviewCard}>
          <span className={styles.overviewIcon}>💸</span>
          <div>
            <p className={styles.overviewLabel}>Tổng tiền chờ duyệt</p>
            <p className={styles.overviewValue}>{formatPrice(stats.totalPendingAmount)}</p>
            <p className={styles.overviewSub}>Cần giải ngân cho gia sư</p>
          </div>
        </div>
        <div className={styles.overviewCard}>
          <span className={styles.overviewIcon}>✅</span>
          <div>
            <p className={styles.overviewLabel}>Đã duyệt hoàn tất</p>
            <p className={styles.overviewValue}>{stats.approvedCount}</p>
          </div>
        </div>
      </div>

      {/* Khu vực Bảng danh sách & Bộ lọc */}
      <div className={styles.tableCard}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <h3>Danh sách yêu cầu rút tiền</h3>
          
          {/* Ô tìm kiếm nhanh */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="🔍 Tìm theo tên hoặc mã YC..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                fontSize: '13px',
                outline: 'none',
                minWidth: '240px'
              }}
            />
          </div>
        </div>

        {/* Tabs Lọc trạng thái */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #e5e7eb', paddingBottom: '12px' }}>
          {[
            { key: 'all', label: `Tất cả (${requests.length})` },
            { key: 'pending', label: `Chờ duyệt (${stats.pendingCount})` },
            { key: 'approved', label: `Đã duyệt (${stats.approvedCount})` },
            { key: 'rejected', label: `Từ chối (${stats.rejectedCount})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                border: 'none',
                backgroundColor: statusFilter === tab.key ? '#4f46e5' : '#f3f4f6',
                color: statusFilter === tab.key ? '#ffffff' : '#4b5563',
                transition: 'all 0.2s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

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
              {filteredRequests.map((req) => (
                <tr key={req.id}>
                  <td>
                    <div className={styles.tutorCell}>
                      <img
                        src={req.tutor_avatar || '/img/default-avatar.svg'}
                        alt={req.tutor_name || 'Gia sư'}
                        className={styles.tutorAvatar}
                        onError={(e) => { e.target.src = '/img/default-avatar.svg'; }}
                      />
                      <div>
                        <p className={styles.tutorName}>{req.tutor_name || 'Chưa cập nhật'}</p>
                        <p className={styles.requestCode}>{req.request_code || `#${req.id}`}</p>
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
                      <span className={`${styles.statusBadge} ${styles.statusRejected}`}>❌ Từ chối</span>
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

              {filteredRequests.length === 0 && (
                <tr>
                  <td colSpan={5} className={styles.emptyCell}>
                    Không tìm thấy yêu cầu rút tiền phù hợp
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
                  <span className={styles.infoValue}>{selectedRequest.request_code || `#${selectedRequest.id}`}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Gia sư:</span>
                  <span className={styles.infoValue}>{selectedRequest.tutor_name} ({selectedRequest.tutor_email || 'Không có email'})</span>
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
              <h3 style={{ color: '#dc2626' }}>❌ Từ chối yêu cầu rút tiền</h3>
              <button className={styles.modalClose} onClick={() => setRejectingRequest(null)}>✕</button>
            </div>

            <div className={styles.modalBody}>
              <p style={{ fontSize: '13px', margin: '0 0 12px 0', color: '#4b5563' }}>
                Từ chối yêu cầu <strong>{rejectingRequest.request_code || `#${rejectingRequest.id}`}</strong> của gia sư <strong>{rejectingRequest.tutor_name}</strong> ({formatPrice(rejectingRequest.amount)})
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
                {processing ? <span className={styles.spinner}></span> : '🚫 Xác nhận Từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}