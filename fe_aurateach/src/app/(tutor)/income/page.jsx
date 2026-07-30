"use client";

import React, { useState, useEffect } from "react";
import styles from "./income.module.css";

const API_BASE = "http://localhost:3007";

export default function IncomePage() {
  const [tutorData, setTutorData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  const getCookie = (name) => {
    if (typeof window === "undefined") return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const userCookie = getCookie("user_info");
        if (!userCookie) {
          setLoading(false);
          return;
        }

        const userData = JSON.parse(decodeURIComponent(userCookie));
        const userId = userData.user_id || userData.id;
        setUserId(userId);

        // Lấy dữ liệu từ JSON Server
        const [tutorsRes, bookingsRes, usersRes, coursesRes] = await Promise.all([
          fetch(`${API_BASE}/tutors?user_id=${userId}`),
          fetch(`${API_BASE}/bookings`),
          fetch(`${API_BASE}/users`),
          fetch(`${API_BASE}/courses`)
        ]);

        const tutors = await tutorsRes.json();
        const bookings = await bookingsRes.json();
        const users = await usersRes.json();
        const courses = await coursesRes.json();

        // Tìm tutor
        const tutor = tutors[0];
        if (!tutor) {
          setLoading(false);
          return;
        }

        setTutorData(tutor);

        // Lấy tất cả booking của tutor
        const tutorBookings = bookings.filter(b => 
          b.tutor_id === tutor.tutor_id && 
          (b.status === "confirmed" || b.status === "paid")
        );

        // Tạo danh sách giao dịch từ booking
        const txList = tutorBookings.map(b => {
          const course = courses.find(c => c.course_id === b.course_id);
          const student = users.find(u => u.user_id === b.student_id);
          const amount = b.payment_amount || 0;
          const tutorEarning = Math.round(amount * 0.61); // Phí sàn 39%

          return {
            id: b.booking_id,
            date: new Date(b.created_at).toLocaleDateString("vi-VN"),
            type: "EARNINGS",
            desc: `Học phí: ${course?.title || "Khóa học"} - ${student?.full_name || "Học viên"}`,
            amount: `+${tutorEarning.toLocaleString("vi-VN")} VND`,
            status: b.status === "confirmed" ? "Hoàn tất" : "Đang xử lý",
            statusColor: b.status === "confirmed" ? "#16a34a" : "#64748b"
          };
        });

        // Sắp xếp mới nhất lên đầu
        txList.sort((a, b) => {
          const dateA = new Date(a.date.split('/').reverse().join('/'));
          const dateB = new Date(b.date.split('/').reverse().join('/'));
          return dateB - dateA;
        });

        setTransactions(txList);

      } catch (error) {
        console.error("❌ Lỗi fetch income data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount || 0);
  };

  if (loading) {
    return <div className={styles.loadingContainer}><div className={styles.loadingSpinner}></div><p>Đang tải dữ liệu...</p></div>;
  }

  if (!tutorData) {
    return <div className={styles.container}><p style={{ padding: '40px', textAlign: 'center' }}>Không tìm thấy thông tin gia sư</p></div>;
  }

  const availableBalance = tutorData.available_balance || 0;
  const pendingBalance = tutorData.pending_balance || 0;
  const totalEarnings = tutorData.total_earnings || 0;
  const totalIncome = availableBalance + pendingBalance;

  return (
    <div className={styles.container}>
      
      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.mainBalanceCard}>
          <span className={styles.cardLabel}>Tổng số dư hiện tại</span>
          <div className={styles.mainBalance}>{formatCurrency(totalIncome)}</div>
          <span className={styles.cardTrend}>
            {pendingBalance > 0 
              ? `⏳ ${formatCurrency(pendingBalance)} đang chờ duyệt` 
              : totalEarnings > 0 ? "✅ Đã nhận đủ" : "Chưa có thu nhập"}
          </span>
        </div>

        <div className={styles.subStatCard}>
          <div>
            <div className={styles.cardIconWrapper} style={{ backgroundColor: "#ffedd5", color: "#c2410c" }}>⏳</div>
            <span className={styles.cardLabel}>Đang chờ duyệt</span>
            <div className={styles.subAmount}>{formatCurrency(pendingBalance)}</div>
          </div>
          <p className={styles.subFootnote}>Dự kiến thanh toán sau khi hoàn thành buổi học</p>
        </div>

        <div className={styles.subStatCard}>
          <div>
            <div className={styles.cardIconWrapper} style={{ backgroundColor: "#dbeafe", color: "#1e40af" }}>📅</div>
            <span className={styles.cardLabel}>Tổng thu nhập đã nhận</span>
            <div className={styles.subAmount}>{formatCurrency(totalEarnings)}</div>
          </div>
          <div className={styles.subTrendUp}>
            {totalEarnings > 0 ? `💰 Từ ${transactions.length} lớp học` : "Chưa có thu nhập"}
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className={styles.mainLayout}>
        
        {/* Transaction History */}
        <div className={`${styles.sectionCard} ${styles.historyCard}`}>
          <div className={styles.sectionHeader}>
            <h2>Lịch sử giao dịch</h2>
          </div>

          <div className={styles.tableWrapper}>
            {transactions.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                Chưa có giao dịch nào
              </div>
            ) : (
              <table className={styles.txTable}>
                <thead>
                  <tr>
                    <th>Ngày</th>
                    <th>Loại giao dịch</th>
                    <th>Mô tả</th>
                    <th>Số tiền</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td>{tx.date}</td>
                      <td>
                        <span className={`${styles.badge} ${styles.badgeEarnings}`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className={styles.txDesc}>{tx.desc}</td>
                      <td>
                        <span className={styles.amountPlus}>
                          {tx.amount}
                        </span>
                      </td>
                      <td>
                        <div className={styles.statusWrapper}>
                          <span className={styles.statusDot} style={{ backgroundColor: tx.statusColor }}></span>
                          {tx.status}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Sidebar - Withdraw */}
        <div className={styles.rightSidebar}>
          
          <div className={`${styles.sectionCard} ${styles.withdrawCard}`}>
            <h2>Rút tiền</h2>
            
            <div className={styles.formGroup}>
              <label className={styles.cardLabel}>Số tiền muốn rút (VND)</label>
              <div className={styles.inputWrapper}>
                <input 
                  type="text" 
                  defaultValue={availableBalance > 0 ? availableBalance : 0} 
                  className={styles.withdrawInput} 
                  readOnly
                />
                <span className={styles.inputUnit}>VND</span>
              </div>
              <div className={styles.feeNotice}>Số dư khả dụng: {formatCurrency(availableBalance)}</div>
            </div>

            <div className={styles.formGroup} style={{ marginTop: "16px" }}>
              <label className={styles.cardLabel}>Phương thức nhận tiền</label>
              
              <div className={styles.methodList}>
                <div className={`${styles.methodItem} ${styles.methodActive}`}>
                  <div className={styles.methodLeft}>
                    <span className={styles.bankBadge}>VCB</span>
                    <div className={styles.methodInfo}>
                      <div>Vietcombank</div>
                      <div>**** 4567 • {tutorData.full_name || "Gia sư"}</div>
                    </div>
                  </div>
                  <div className={`${styles.radioCircle} ${styles.radioActive}`}></div>
                </div>

                <div className={styles.methodItem}>
                  <div className={styles.methodLeft}>
                    <span className={styles.momoBadge}>MOMO</span>
                    <div className={styles.methodInfo}>
                      <div>Ví MoMo</div>
                      <div>{tutorData.phone || "Chưa cập nhật"}</div>
                    </div>
                  </div>
                  <div className={styles.radioCircle}></div>
                </div>
              </div>
            </div>

            <button 
              className={styles.submitWithdrawBtn}
              disabled={availableBalance <= 0}
              style={{
                opacity: availableBalance <= 0 ? 0.5 : 1,
                cursor: availableBalance <= 0 ? 'not-allowed' : 'pointer'
              }}
            >
              {availableBalance <= 0 ? "💳 Chưa có tiền để rút" : "💸 Xác nhận rút tiền"}
            </button>
            
            <p className={styles.termText}>
              Bằng cách nhấn xác nhận, bạn đồng ý với <a href="#">Điều khoản rút tiền</a> của AuraTeach.
            </p>
          </div>

          {/* Tip Card */}
          <div className={styles.tipCard}>
            <div className={styles.tipIcon}>💡</div>
            <div className={styles.tipContent}>
              <h4>Mẹo tăng thu nhập</h4>
              <p>
                {transactions.length > 0 
                  ? `Bạn đã có ${transactions.length} giao dịch thành công. Hãy duy trì chất lượng giảng dạy để nhận thêm học viên mới!`
                  : "Hãy tạo lớp học và bắt đầu nhận học viên để có thu nhập!"}
              </p>
              <a href="/classroom-management/create" className={styles.tipLink}>
                {transactions.length > 0 ? "📚 Tạo lớp học mới ➔" : "🚀 Bắt đầu ngay ➔"}
              </a>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}