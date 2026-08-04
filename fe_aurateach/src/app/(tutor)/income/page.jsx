'use client';

import React, { useState, useEffect } from 'react';
import styles from './income.module.css';

export default function TutorRevenuePage() {
  const [loading, setLoading] = useState(true);
  const [tutorData, setTutorData] = useState(null);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [payoutRequests, setPayoutRequests] = useState([]);

  // Form rút tiền State
  const [selectedBankId, setSelectedBankId] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState(false);

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
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  };

  useEffect(() => {
    fetchPageData();
    fetchVietQrBanks();
  }, []);

  // 1. Tải dữ liệu trang qua API Route trung gian
  const fetchPageData = async () => {
    try {
      setLoading(true);
      const userCookie = getCookie('user_info');
      if (!userCookie) {
        setLoading(false);
        return;
      }

      // Giải mã URI nếu cookie bị mã hóa URL (URL-encoded)
      let rawCookie = userCookie;
      try {
        rawCookie = decodeURIComponent(userCookie);
      } catch (e) {
        console.warn('Lỗi decodeURIComponent cookie:', e);
      }

      const userData = JSON.parse(rawCookie);
      const userId = userData.user_id || userData.id;

      if (!userId) {
        console.error('Không tìm thấy userId trong cookie');
        setLoading(false);
        return;
      }

      const res = await fetch(`/api/tutor-payout-requests?user_id=${userId}`);
      const result = await res.json();

      if (result.success && result.data?.tutor) {
        setTutorData(result.data.tutor);
        const banks = result.data.bankAccounts || [];
        setBankAccounts(banks);
        setPayoutRequests(result.data.payoutRequests || []);

        // Tự động chọn ngân hàng mặc định
        const defaultBank = banks.find((b) => b.is_default) || banks[0];
        if (defaultBank) {
          setSelectedBankId(defaultBank.bank_account_id);
        }
      } else {
        console.error('API Error:', result.message);
        setTutorData(null);
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

  // 3. Xử lý Thêm Ngân Hàng Mới
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
      const res = await fetch('/api/tutor-payout-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_bank_account',
          tutor_id: tutorData.tutor_id,
          bank_name: bankName,
          bank_code: newBankCode,
          account_number: newAccountNumber,
          account_holder_name: newAccountHolder,
          is_default: newIsDefault,
        }),
      });

      const result = await res.json();

      if (result.success) {
        alert('Đã thêm tài khoản ngân hàng thành công!');
        setShowAddBankModal(false);
        setNewBankCode('');
        setNewAccountNumber('');
        setNewAccountHolder('');
        setNewIsDefault(false);
        setBankSearchKeyword('');

        // Tải lại dữ liệu
        await fetchPageData();
      } else {
        alert(result.message || 'Lỗi thêm ngân hàng');
      }
    } catch (error) {
      console.error('Lỗi tạo ngân hàng:', error);
      alert('Có lỗi xảy ra khi tạo ngân hàng');
    } finally {
      setIsSubmittingBank(false);
    }
  };

  // 4. Xử lý Gửi Yêu Cầu Rút Tiền
  const handleWithdrawSubmit = async () => {
    const amount = Number(withdrawAmount);
    const available = tutorData?.available_balance || 0;

    if (!selectedBankId) {
      alert('Vui lòng chọn hoặc thêm một tài khoản ngân hàng nhận tiền!');
      return;
    }

    if (!amount || amount <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ muốn rút!');
      return;
    }

    if (amount > available) {
      alert(`Số tiền muốn rút vượt quá số dư khả dụng (${available.toLocaleString('vi-VN')} VND)!`);
      return;
    }

    try {
      setIsSubmittingWithdraw(true);
      const res = await fetch('/api/tutor-payout-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_payout_request',
          tutor_id: tutorData.tutor_id,
          bank_account_id: selectedBankId,
          amount: amount,
        }),
      });

      const result = await res.json();

      if (result.success) {
        alert(`Gửi yêu cầu rút ${amount.toLocaleString('vi-VN')} VNĐ thành công! Vui lòng chờ Admin duyệt.`);
        setWithdrawAmount('');
        await fetchPageData();
      } else {
        alert(result.message || 'Lỗi khi gửi yêu cầu rút tiền');
      }
    } catch (error) {
      console.error('Lỗi khi gửi yêu cầu rút tiền:', error);
      alert('Có lỗi xảy ra khi gửi yêu cầu');
    } finally {
      setIsSubmittingWithdraw(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
  };

  const selectedBankInfo = bankAccounts.find((b) => b.bank_account_id === selectedBankId);

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
        <p style={{ padding: '40px', textAlign: 'center' }}>Không tìm thấy thông tin Gia Sư</p>
      </div>
    );
  }

  const availableBalance = tutorData.available_balance || 0;
  const pendingBalance = tutorData.pending_balance || 0;
  const totalIncome = availableBalance + pendingBalance;

  return (
    <div className={styles.container}>
      {/* SECTION BÊN TRÊN: TỔNG QUAN SỐ DƯ */}
      <div className={styles.statsGrid}>
        <div className={styles.mainBalanceCard}>
          <span className={styles.cardLabel} style={{color: "#86efac"}}>TỔNG THU NHẬP HIỆN TẠI</span>
          <div className={styles.mainBalance}>{formatCurrency(totalIncome)}</div>
          <span className={styles.cardTrend}>
            {pendingBalance > 0
              ? `⏳ ${formatCurrency(pendingBalance)} đang nằm ở ví chờ`
              : '✅ Số dư đã sẵn sàng'}
          </span>
        </div>

        <div className={styles.subStatCard}>
          <div>
            <div className={styles.cardIconWrapper} style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>
              ⏳
            </div>
            <span className={styles.cardLabel}>Tiền trong ví chờ</span>
            <div className={styles.subAmount}>{formatCurrency(pendingBalance)}</div>
          </div>
          <p className={styles.subFootnote}>Tiền sẽ chuyển sang Ví khả dụng sau 24 tiếng kể từ khi xác nhận buổi học</p>
        </div>

        <div className={styles.subStatCard}>
          <div>
            <div className={styles.cardIconWrapper} style={{ backgroundColor: '#dcfce7', color: '#15803d' }}>
              💳
            </div>
            <span className={styles.cardLabel}>Tiền trong ví khả dụng</span>
            <div className={styles.subAmount}>{formatCurrency(availableBalance)}</div>
          </div>
          <div className={styles.subTrendUp}>
            <span>💸 Số tiền tối đa có thể rút ngay</span>
          </div>
        </div>
      </div>

      {/* SECTION BÊN DƯỚI: LAYOUT 2 CỘT */}
      <div className={styles.mainLayout}>
        {/* BÊN TRÁI: LỊCH SỬ CÁC YÊU CẦU RÚT TIỀN */}
        <div className={`${styles.sectionCard} ${styles.historyCard}`}>
          <div className={styles.sectionHeader}>
            <h2>Lịch sử yêu cầu rút tiền</h2>
          </div>

          <div className={styles.tableWrapper}>
            {payoutRequests.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                Chưa có yêu cầu rút tiền nào
              </div>
            ) : (
              <table className={styles.txTable}>
                <thead>
                  <tr>
                    <th>Mã đơn</th>
                    <th>Ngày yêu cầu</th>
                    <th>Số tiền rút</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {payoutRequests.map((req) => {
                    let statusLabel = 'Chờ duyệt';
                    let statusClass = styles.statusPending;
                    let dotColor = '#d97706';

                    if (req.status === 'approved') {
                      statusLabel = 'Đã duyệt';
                      statusClass = styles.statusApproved;
                      dotColor = '#16a34a';
                    } else if (req.status === 'rejected') {
                      statusLabel = 'Từ chối';
                      statusClass = styles.statusRejected;
                      dotColor = '#dc2626';
                    }

                    return (
                      <tr key={req.payout_req_id || req.id}>
                        <td>
                          <span className={styles.requestCode}>{req.request_code}</span>
                        </td>
                        <td>{new Date(req.created_at).toLocaleDateString('vi-VN')}</td>
                        <td>
                          <span className={styles.amountMinus}>
                            -{req.amount?.toLocaleString('vi-VN')} VND
                          </span>
                        </td>
                        <td>
                          <div className={`${styles.statusWrapper} ${statusClass}`}>
                            <span className={styles.statusDot} style={{ backgroundColor: dotColor }}></span>
                            {statusLabel}
                          </div>
                          {req.status === 'rejected' && req.rejection_reason && (
                            <div className={styles.rejectionNote}>Lý do: {req.rejection_reason}</div>
                          )}
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
            <h2>Rút tiền về ngân hàng</h2>

            {/* Ô điền số tiền muốn rút */}
            <div className={styles.formGroup}>
              <label className={styles.cardLabel}>Số tiền muốn rút (VND)</label>
              <div className={styles.inputWrapper}>
                <input
                  type="number"
                  placeholder="Nhập số tiền..."
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className={styles.withdrawInput}
                />
                <span className={styles.inputUnit}>VND</span>
              </div>
              <div className={styles.feeNotice}>
                Số dư khả dụng: <strong>{formatCurrency(availableBalance)}</strong>
              </div>
            </div>

            {/* Danh sách ngân hàng đã tạo & Nút (+) thêm mới */}
            <div className={styles.formGroup} style={{ marginTop: '16px' }}>
              <label className={styles.cardLabel}>Chọn ngân hàng nhận tiền</label>

              <div className={styles.methodList}>
                {bankAccounts.map((bank) => {
                  const isSelected = selectedBankId === bank.bank_account_id;
                  return (
                    <div
                      key={bank.bank_account_id || bank.id}
                      className={`${styles.methodItem} ${isSelected ? styles.methodActive : ''}`}
                      onClick={() => setSelectedBankId(bank.bank_account_id)}
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
                      <div className={`${styles.radioCircle} ${isSelected ? styles.radioActive : ''}`}></div>
                    </div>
                  );
                })}

                {/* Ô CÓ DẤU (+) ĐỂ TẠO BANK ACCOUNT MỚI */}
                <div className={styles.addBankBtnItem} onClick={() => setShowAddBankModal(true)}>
                  <span className={styles.plusIcon}>+</span>
                  <span>Thêm tài khoản ngân hàng mới</span>
                </div>
              </div>
            </div>

            {/* Hiển thị thông tin chi tiết ngân hàng đang chọn */}
            {selectedBankInfo && (
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', fontSize: '13px', marginTop: '12px', border: '1px solid #e2e8f0' }}>
                <p style={{ margin: '0 0 4px 0' }}><strong>Tên ngân hàng:</strong> {selectedBankInfo.bank_name}</p>
                <p style={{ margin: '0 0 4px 0' }}><strong>Số tài khoản:</strong> {selectedBankInfo.account_number}</p>
                <p style={{ margin: 0 }}><strong>Chủ tài khoản:</strong> {selectedBankInfo.account_holder_name}</p>
              </div>
            )}

            <button
              className={styles.submitWithdrawBtn}
              onClick={handleWithdrawSubmit}
              disabled={isSubmittingWithdraw || availableBalance <= 0}
              style={{
                opacity: availableBalance <= 0 || isSubmittingWithdraw ? 0.6 : 1,
                cursor: availableBalance <= 0 || isSubmittingWithdraw ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmittingWithdraw ? 'Đang xử lý...' : ' Gửi yêu cầu rút tiền'}
            </button>

            <p className={styles.termText}>
              Bằng cách nhấn gửi yêu cầu, bạn đồng ý với <a href="#">Điều khoản rút tiền</a> của AuraTeach.
            </p>
          </div>

          {/* Tip Card */}
          <div className={styles.tipCard}>
            <div className={styles.tipIcon}>💡</div>
            <div className={styles.tipContent}>
              <h4>Mẹo rút tiền nhanh</h4>
              <p>Hãy đảm bảo Tên chủ tài khoản ngân hàng trùng khớp hoàn toàn với thông tin cá nhân để đơn rút được duyệt tự động nhanh chóng.</p>
            </div>
          </div>
        </div>
      </div>

      {/* POPUP MODAL TẠO BANK ACCOUNT MỚI */}
      {showAddBankModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAddBankModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Thêm tài khoản ngân hàng</h3>
              <button className={styles.closeBtn} onClick={() => setShowAddBankModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleAddBankSubmit} className={styles.bankForm}>
              {/* CHỌN NGÂN HÀNG CÓ LOGO VÀ TÌM KIẾM */}
              <div className={styles.formGroup}>
                <label className={styles.cardLabel}>Chọn ngân hàng *</label>

                <input
                  type="text"
                  placeholder=" Tìm theo tên hoặc mã ngân hàng (MB, VCB, VPBank)..."
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
                        className={`${styles.bankOptionCard} ${isSelected ? styles.bankOptionSelected : ''}`}
                        onClick={() => setNewBankCode(b.code)}
                      >
                        <div className={styles.bankLogoWrapper}>
                          {b.logo ? (
                            <img src={b.logo} alt={b.shortName || b.code} className={styles.bankLogoImg} />
                          ) : (
                            <span className={styles.bankBadge}>{b.code}</span>
                          )}
                        </div>
                        <div className={styles.bankOptionInfo}>
                          <div className={styles.bankShortName}>{b.shortName || b.code}</div>
                          <div className={styles.bankFullName}>{b.name}</div>
                        </div>
                        {isSelected && <span className={styles.checkIcon}>✓</span>}
                      </div>
                    );
                  })}
                  {filteredVietQrBanks.length === 0 && (
                    <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
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
                <label className={styles.cardLabel}>Tên chủ tài khoản (Viết hoa không dấu) *</label>
                <input
                  type="text"
                  placeholder="Ví dụ: HUA MINH THIEN"
                  value={newAccountHolder}
                  onChange={(e) => setNewAccountHolder(e.target.value.toUpperCase())}
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
                <button type="button" className={styles.cancelBtn} onClick={() => setShowAddBankModal(false)}>
                  Hủy
                </button>
                <button type="submit" className={styles.saveBankBtn} disabled={isSubmittingBank || !newBankCode}>
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