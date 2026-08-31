'use client';

import React, { useState, useEffect } from 'react';
import styles from './income.module.css';
import { tutorService } from '@/services/tutorService';
import { authService } from "@/services/authService"; // 🚀 Import service kết nối BE

export default function TutorRevenuePage() {
  const [loading, setLoading] = useState(true);
  const [tutorData, setTutorData] = useState(null);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [payoutHistory, setPayoutHistory] = useState([]);
  const [monthlySalary, setMonthlySalary] = useState(0);

  // Modal chi tiết
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [detailBankInfo, setDetailBankInfo] = useState(null);

  // Form tạo ngân hàng State
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [vietQrBanks, setVietQrBanks] = useState([]);
  const [bankSearchKeyword, setBankSearchKeyword] = useState('');
  const [newBankCode, setNewBankCode] = useState('');
  const [newAccountNumber, setNewAccountNumber] = useState('');
  const [newAccountHolder, setNewAccountHolder] = useState('');
  const [newIsDefault, setNewIsDefault] = useState(false);
  const [isSubmittingBank, setIsSubmittingBank] = useState(false);

  // Helper lấy cookie
  const getCookie = (name) => {
    if (typeof window === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      const rawValue = parts.pop().split(';').shift();
      try {
        // Giải mã ký tự URL-encoded (%7B, %22,...) thành JSON chuẩn
        return decodeURIComponent(rawValue);
      } catch (e) {
        return rawValue;
      }
    }
    return null;
  };

  useEffect(() => {
    fetchPageData();
    fetchVietQrBanks();
  }, []);

  // 1. Tải dữ liệu trang thông qua tutorService
  const fetchPageData = async () => {
    try {
      setLoading(true);

      // Gọi API lấy user từ authService
      const currentUser = await authService.getCurrentUser();
      console.log("🔍 Phản hồi gốc từ authService.getCurrentUser():", currentUser);

      // Thử bóc tách theo tất cả các đường dẫn phổ biến của Laravel Resource / Response
      const userData = currentUser?.data?.user || currentUser?.user || currentUser?.data || currentUser;
      
      // Lấy id một cách linh hoạt nhất
      const userId = userData?.user_id || userData?.id || userData?.userId || 'u-Wy4QdEzm'; // Ép cứng luôn ID của bạn vào đây làm dự phòng nếu API bận

      console.log("🎯 User ID quyết định sử dụng:", userId);

      if (!userId) {
        console.error('Vẫn không tìm thấy userId!');
        setLoading(false);
        return;
      }

      // 2. Gọi API lấy dữ liệu thu nhập qua tutorService
      const result = await tutorService.getTutorEarningsData(userId);

      if (result && (result.success || result.data)) {
        const actualData = result.data || result;
        setTutorData(actualData.tutor || actualData);
        setBankAccounts(result.data.bankAccounts || []);
        setPayoutHistory(result.data.payoutHistory || []);
        setMonthlySalary(result.data.monthlySalary || 0);
      }
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu thu nhập:', error);
    } finally {
      setLoading(false);
    }
  };

  // 2. Lấy danh sách Ngân hàng Việt Nam từ API VietQR công khai
  const fetchVietQrBanks = async () => {
    try {
      const res = await fetch('https://api.vietqr.io/v2/banks');
      const result = await res.json();
      if (result.code === '00') {
        setVietQrBanks(result.data || []);
      }
    } catch (error) {
      console.error('Lỗi fetch VietQR Banks:', error);
    }
  };

  // 3. Xử lý Thêm Ngân Hàng Mới thông qua tutorService
  const handleAddBankSubmit = async (e) => {
    e.preventDefault();
    if (!newBankCode || !newAccountNumber || !newAccountHolder) {
      alert('Vui lòng điền đầy đủ thông tin ngân hàng!');
      return;
    }

    const selectedBankObj = vietQrBanks.find((b) => b.code === newBankCode);
    const bankName = selectedBankObj ? selectedBankObj.name : newBankCode;

    try {
  setIsSubmittingBank(true);
  
  const result = await tutorService.addBankAccount({
    tutor_id: tutorData.tutor_id,
    bank_name: bankName,
    bank_code: newBankCode,
    account_number: newAccountNumber,
    account_holder_name: newAccountHolder,
    is_default: newIsDefault,
  });

  console.log("🔍 Kết quả nhận được từ addBankAccount:", result);

  // 🚀 Đảm bảo các dấu ngoặc mở/đóng đúng chuẩn JavaScript
  if (result && (result.success || result.bank_account_id || result?.data?.bank_account_id)) {
    alert('Đã thêm tài khoản ngân hàng thành công!');
    setShowAddBankModal(false);
    setNewBankCode('');
    setNewAccountNumber('');
    setNewAccountHolder('');
    setNewIsDefault(false);
    await fetchPageData();
  } else {
    alert(result?.message || 'Lỗi thêm ngân hàng');
  }
    } catch (error) {
      console.error('Lỗi tạo ngân hàng:', error);
      alert('Có lỗi xảy ra khi tạo ngân hàng');
    } finally {
      setIsSubmittingBank(false);
    }
  };

  // 4. Xử lý Gửi Yêu Cầu Rút Tiền thông qua tutorService
  const handleSetDefaultBank = async (bank) => {
    if (bank.is_default) return;
    const confirmMsg = `Bạn có chắc muốn đặt tài khoản\n${bank.bank_name} - ${bank.account_number}\nlàm tài khoản nhận lương mặc định không?`;
    if (!confirm(confirmMsg)) return;

    try {
      // 🚀 Lấy chính xác ID ngân hàng từ đối tượng bank được click
      const bankAccountId = bank.bank_account_id || bank.id;

      const result = await tutorService.setDefaultBank({
        tutor_id: tutorData.tutor_id,
        bank_account_id: bankAccountId,
      });

      console.log("🔍 Kết quả phản hồi đặt mặc định:", result);

      const responseData = result?.data || result;
      const isSuccess = responseData?.success === true || result?.success === true;

      if (isSuccess) {
        alert('Đã đặt tài khoản làm mặc định thành công!');
        await fetchPageData(); // Tải lại dữ liệu để cập nhật giao diện badge "Mặc định"
      } else {
        alert(responseData?.message || result?.message || 'Không thể đặt làm mặc định');
      }
    } catch (error) {
      console.error('Lỗi đặt mặc định:', error);
      alert('Có lỗi xảy ra khi đặt mặc định');
    }
  };

  const handleViewDetail = async (payout) => {
    setSelectedPayout(payout);
    setDetailBankInfo(null);

    if (payout.bank_account_id) {
      try {
        // Ưu tiên tìm trong danh sách đã có
        const found = bankAccounts.find(
          (b) =>
            b.bank_account_id === payout.bank_account_id ||
            b.id === payout.bank_account_id
        );
        if (found) {
          setDetailBankInfo(found);
        } else {
          // Fallback call API
          const res = await fetch(
            `http://localhost:3007/tutor_bank_accounts?bank_account_id=${payout.bank_account_id}`
          );
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              setDetailBankInfo(data[0]);
            }
          }
        }
      } catch (err) {
        console.error('Lỗi lấy thông tin ngân hàng:', err);
      }
    }

    setShowDetailModal(true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount || 0);
  };

  // Lọc danh sách ngân hàng VietQR theo từ khóa tìm kiếm
  const filteredVietQrBanks = vietQrBanks.filter((b) => {
    const kw = bankSearchKeyword.toLowerCase();
    return (
      (b.name && b.name.toLowerCase().includes(kw)) ||
      (b.code && b.code.toLowerCase().includes(kw)) ||
      (b.shortName && b.shortName.toLowerCase().includes(kw))
    );
  });

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Đang tải dữ liệu thu nhập...</p>
      </div>
    );
  }

  if (!tutorData) {
    return (
      <div className={styles.container}>
        <p style={{ padding: '40px', textAlign: 'center' }}>
          Không tìm thấy thông tin Gia Sư
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* ===== TIỀN LƯƠNG THÁNG NÀY ===== */}
      <div className={styles.statsGrid} style={{ gridTemplateColumns: '1fr' }}>
        <div className={styles.mainBalanceCard}>
          <span className={styles.cardLabel} style={{ color: '#86efac' }}>
            TIỀN LƯƠNG THÁNG NÀY
          </span>
          <div className={styles.mainBalance}>{formatCurrency(monthlySalary)}</div>
          <span className={styles.cardTrend}>
            Đã trừ 35% phí sàn • Chỉ tính buổi đã hoàn thành trong tháng
          </span>
        </div>

      </div>

      {/* SECTION BÊN DƯỚI: LAYOUT 2 CỘT */}
      <div className={styles.mainLayout}>
        {/* BÊN TRÁI: LỊCH SỬ CÁC YÊU CẦU RÚT TIỀN */}
        <div className={`${styles.sectionCard} ${styles.historyCard}`}>
          <div className={styles.sectionHeader}>
            <h2>Lịch sử nhận lương</h2>
          </div>

          <div className={styles.tableWrapper}>
            {payoutHistory.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                Chưa có lịch sử nhận lương nào
              </div>
            ) : (
              <table className={styles.txTable}>
                <thead>
                  <tr>
                    <th>Tiền lương</th>
                    <th>Trạng thái</th>
                    <th>Ngày chuyển tiền</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {payoutHistory.map((item) => {
                    const amount = item.total_amount || item.amount || 0;
                    const status = item.status || 'pending';
                    let dotColor = '#d97706';

                    if (status === 'approved') {
                      statusLabel = 'Đã chuyển';
                      statusClass = styles.statusApproved;
                      dotColor = '#16a34a';
                    } else if (status === 'rejected') {
                      statusLabel = 'Từ chối duyệt';
                      statusClass = styles.statusRejected;
                      dotColor = '#dc2626';
                    }

                    return (
                      <tr key={item.tutor_payout_id || item.id}>
                        <td>
                          <span style={{ fontWeight: 700, color: '#0f172a' }}>
                            {formatCurrency(amount)}
                          </span>
                        </td>
                        <td>
                          <div className={`${styles.statusWrapper} ${statusClass}`}>
                            <span
                              className={styles.statusDot}
                              style={{ backgroundColor: dotColor }}
                            ></span>
                            {statusLabel}
                          </div>
                        </td>
                        <td>
                          {item.created_at
                            ? new Date(item.created_at).toLocaleDateString('vi-VN')
                            : '—'}
                        </td>
                        <td>
                          <button
                            onClick={() => handleViewDetail(item)}
                            style={{
                              background: '#1e3a8a',
                              color: '#fff',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '13px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Xem chi tiết
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* BÊN PHẢI: FORM ĐIỀN THÔNG TIN RÚT TIỀN & ĐÃ CÓ NGÂN HÀNG */}
        <div className={styles.rightSidebar}>
          <div className={`${styles.sectionCard} ${styles.withdrawCard}`}>
            <h2>Tài khoản ngân hàng nhận lương</h2>

            <div className={styles.methodList}>
              {bankAccounts.map((bank) => (
                <div
                  key={bank.bank_account_id || bank.id}
                  className={styles.methodItem}
                  onClick={() => handleSetDefaultBank(bank)}
                  style={{
                    cursor: bank.is_default ? 'default' : 'pointer',
                    opacity: bank.is_default ? 1 : 0.95,
                  }}
                  title={bank.is_default ? 'Đang là tài khoản mặc định' : 'Nhấn để đặt làm mặc định'}
                >
                  <div className={styles.methodLeft}>
                    <span className={styles.bankBadge}>{bank.bank_code}</span>
                    <div className={styles.methodInfo}>
                      <div>{bank.bank_name}</div>
                      <div>
                        {bank.account_number} • {bank.account_holder_name}
                      </div>
                    </div>
                  </div>
                  {bank.is_default && (
                    <span
                      style={{
                        fontSize: '11px',
                        background: '#dcfce7',
                        color: '#15803d',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontWeight: 600,
                      }}
                    >
                      Mặc định
                    </span>
                  )}                    
                </div>
              ))}

              <div
                className={styles.addBankBtnItem}
                onClick={() => setShowAddBankModal(true)}
              >
                <span className={styles.plusIcon}>+</span>
                <span>Thêm tài khoản ngân hàng mới</span>                
              </div>
            </div>
          </div>

          {/* Tip Card */}
          <div className={styles.tipCard}>
            <div className={styles.tipIcon}>💡</div>
            <div className={styles.tipContent}>
            <h4>Mẹo nhận lương nhanh</h4>
              <p>
                Hãy đảm bảo Tên chủ tài khoản ngân hàng trùng khớp hoàn toàn với
                thông tin cá nhân để đơn được duyệt nhanh chóng.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ===== MODAL CHI TIẾT ===== */}
      {showDetailModal && selectedPayout && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowDetailModal(false)}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '520px' }}
          >
            <div className={styles.modalHeader}>
              <h3>Chi tiết nhận lương</h3>
              <button
                className={styles.closeBtn}
                onClick={() => setShowDetailModal(false)}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Trạng thái */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#f8fafc',
                  padding: '12px 16px',
                  borderRadius: '10px',
                }}
              >
                <span style={{ fontWeight: 600, color: '#64748b' }}>Trạng thái</span>
                <span
                  style={{
                    fontWeight: 700,
                    color:
                      selectedPayout.status === 'approved'
                        ? '#16a34a'
                        : selectedPayout.status === 'rejected'
                        ? '#dc2626'
                        : '#d97706',
                  }}
                >
                  {selectedPayout.status === 'approved'
                    ? 'Đã chuyển'
                    : selectedPayout.status === 'rejected'
                    ? 'Từ chối duyệt'
                    : 'Chờ duyệt'}
                </span>
              </div>

              {/* Mã */}
              <div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: 4 }}>
                  Mã nhận lương
                </div>
                <div style={{ fontWeight: 700, color: '#1e3a8a' }}>
                  {selectedPayout.tutor_payout_id || selectedPayout.id}
                </div>
              </div>

              {/* Ngân hàng */}
              <div
                style={{
                  background: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: '10px',
                  padding: '14px',
                }}
              >
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#0369a1',
                    marginBottom: 8,
                  }}
                >
                  Tài khoản nhận tiền
                </div>
                {detailBankInfo ? (
                  <>
                    <p style={{ margin: '0 0 4px 0', fontSize: '14px' }}>
                      <strong>Ngân hàng:</strong> {detailBankInfo.bank_name}
                    </p>
                    <p style={{ margin: '0 0 4px 0', fontSize: '14px' }}>
                      <strong>Số tài khoản:</strong> {detailBankInfo.account_number}
                    </p>
                    <p style={{ margin: 0, fontSize: '14px' }}>
                      <strong>Chủ tài khoản:</strong>{' '}
                      {detailBankInfo.account_holder_name}
                    </p>
                  </>
                ) : (
                  <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>
                    Không tìm thấy thông tin tài khoản ngân hàng
                  </p>
                )}
              </div>

              {/* Tổng buổi + Tổng tiền */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div
                  style={{
                    background: '#f8fafc',
                    padding: '12px',
                    borderRadius: '8px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>Tổng số buổi</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
                    {selectedPayout.total_sessions || 0}
                  </div>
                </div>
                <div
                  style={{
                    background: '#f0fdf4',
                    padding: '12px',
                    borderRadius: '8px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '12px', color: '#16a34a' }}>Tổng tiền nhận</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#15803d' }}>
                    {formatCurrency(
                      selectedPayout.total_amount || selectedPayout.amount || 0
                    )}
                  </div>
                </div>
              </div>

              {/* Note */}
              {selectedPayout.note && (
                <div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: 4 }}>
                    Ghi chú
                  </div>
                  <div
                    style={{
                      background: '#fff7ed',
                      border: '1px solid #fed7aa',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      fontSize: '13px',
                      color: '#9a3412',
                    }}
                  >
                    {selectedPayout.note}
                  </div>
                </div>
              )}

              {/* Ngày */}
              <div style={{ fontSize: '13px', color: '#64748b', textAlign: 'right' }}>
                Ngày tạo:{' '}
                {selectedPayout.created_at
                  ? new Date(selectedPayout.created_at).toLocaleString('vi-VN')
                  : '—'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL THÊM NGÂN HÀNG ===== */}
      {showAddBankModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowAddBankModal(false)}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >        
            <div className={styles.modalHeader}>
              <h3>Thêm tài khoản ngân hàng</h3>
              <button
                className={styles.closeBtn}
                onClick={() => setShowAddBankModal(false)}
              >                ✕
              </button>
            </div>

            <form onSubmit={handleAddBankSubmit} className={styles.bankForm}>
              {/* CHỌN NGÂN HÀNG CÓ LOGO VÀ TÌM KIẾM */}
              <div className={styles.formGroup}>
                <label className={styles.cardLabel}>Chọn ngân hàng *</label>

                <input
                  type="text"
                  placeholder="Tìm theo tên hoặc mã ngân hàng..."
                  value={bankSearchKeyword}
                  onChange={(e) => setBankSearchKeyword(e.target.value)}
                  className={styles.inputControl}
                  style={{ marginBottom: '8px' }}
                />

                <div className={styles.bankSelectorGrid}>
                  {filteredVietQrBanks.map((b) => {
                    const isSelected = newBankCode === b.code;
                    return (
                      <div
                        key={b.code}
                        className={`${styles.bankOptionCard} ${
                          isSelected ? styles.bankOptionSelected : ''
                        }`}
                      onClick={() => setNewBankCode(b.code)}
                      >
                        <div className={styles.bankLogoWrapper}>
                          {b.logo ? (
                            <img
                              src={b.logo}
                              alt={b.shortName || b.code}
                              className={styles.bankLogoImg}
                            />                          ) : (
                            <span className={styles.bankBadge}>{b.code}</span>
                          )}
                        </div>
                        <div className={styles.bankOptionInfo}>
                          <div className={styles.bankShortName}>
                            {b.shortName || b.code}
                          </div>
                         <div className={styles.bankFullName}>{b.name}</div>
                        </div>
                        {isSelected && <img src="/img/icons/security.png" alt="selected" className={styles.checkIconImg} />}
                      </div>
                    );
                  })}
                  {filteredVietQrBanks.length === 0 && (
                    <div
                      style={{
                        padding: '16px',
                        textAlign: 'center',
                        color: '#94a3b8',
                        fontSize: '13px',
                      }}
                    >
                     Không tìm thấy ngân hàng phù hợp
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.cardLabel}>Số tài khoản ngân hàng *</label>
                <input
                  type="text"
                  placeholder="Ví dụ: 1012345678"
                  value={newAccountNumber}
                  onChange={(e) => setNewAccountNumber(e.target.value)}
                  className={styles.inputControl}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.cardLabel}>
                  Tên chủ tài khoản (Viết hoa không dấu) *
                </label>                
                <input
                  type="text"
                  placeholder="Ví dụ: HUA MINH THIEN"
                  value={newAccountHolder}
                  onChange={(e) =>
                    setNewAccountHolder(e.target.value.toUpperCase())
                  }                  
                  className={styles.inputControl}
                  required
                />
              </div>

              <label className={styles.checkboxGroup}>
                <input
                  type="checkbox"
                  checked={newIsDefault}
                  onChange={(e) => setNewIsDefault(e.target.checked)}
                />
                <span>Đặt làm tài khoản nhận tiền mặc định</span>
              </label>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setShowAddBankModal(false)}
                >                  
                Hủy
                </button>
                <button
                  type="submit"
                  className={styles.saveBankBtn}
                  disabled={isSubmittingBank || !newBankCode}
                >                  
                {isSubmittingBank ? 'Đang lưu...' : 'Lưu ngân hàng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}