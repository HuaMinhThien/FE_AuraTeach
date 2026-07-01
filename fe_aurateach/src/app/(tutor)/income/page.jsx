"use client";

import React from "react";
import styles from "./income.module.css";

export default function IncomePage() {
  const transactions = [
    {
      id: "tx-01",
      date: "24/05/2024",
      type: "EARNINGS",
      desc: "Học phí: Lớp UI Design Masterclass",
      amount: "+1.200.000 VND",
      status: "Hoàn tất",
      statusColor: "#16a34a"
    },
    {
      id: "tx-02",
      date: "22/05/2024",
      type: "WITHDRAWAL",
      desc: "Rút tiền về Vietcombank (***4567)",
      amount: "-5.000.000 VND",
      status: "Đang xử lý",
      statusColor: "#64748b"
    },
    {
      id: "tx-03",
      date: "20/05/2024",
      type: "EARNINGS",
      desc: "Học phí: Lớp React Native cơ bản",
      amount: "+850.000 VND",
      status: "Hoàn tất",
      statusColor: "#16a34a"
    },
    {
      id: "tx-04",
      date: "18/05/2024",
      type: "EARNINGS",
      desc: "Tiền thưởng: Instructor của tháng",
      amount: "+2.000.000 VND",
      status: "Hoàn tất",
      statusColor: "#16a34a"
    },
    {
      id: "tx-05",
      date: "15/05/2024",
      type: "EARNINGS",
      desc: "Học phí: Lớp UI Design Masterclass",
      amount: "+1.200.000 VND",
      status: "Hoàn tất",
      statusColor: "#16a34a"
    }
  ];

  return (
    <div className={styles.container}>
      
      {/* 1. KHU VỰC THỐNG KÊ SỐ DƯ TỔNG QUAN (TOP CARDS) */}
      <div className={styles.statsGrid}>
        <div className={styles.mainBalanceCard}>
          <span className={styles.cardLabel}>Tổng số dư hiện tại</span>
          <div className={styles.mainBalance}>24.500.000 VND</div>
          <span className={styles.cardTrend}>📈 +12.5% so với tháng trước</span>
        </div>

        <div className={styles.subStatCard}>
          <div>
            <div className={styles.cardIconWrapper} style={{ backgroundColor: "#ffedd5", color: "#c2410c" }}>⏳</div>
            <span className={styles.cardLabel}>Đang chờ duyệt</span>
            <div className={styles.subAmount}>4.200.000 VND</div>
          </div>
          <p className={styles.subFootnote}>Dự kiến thanh toán sau 3 ngày làm việc</p>
        </div>

        <div className={styles.subStatCard}>
          <div>
            <div className={styles.cardIconWrapper} style={{ backgroundColor: "#dbeafe", color: "#1e40af" }}>📅</div>
            <span className={styles.cardLabel}>Tổng thu nhập tháng này</span>
            <div className={styles.subAmount}>18.750.000 VND</div>
          </div>
          <div className={styles.subTrendUp}>⬆ Đạt 85% chỉ tiêu tháng</div>
        </div>
      </div>

      {/* 2. KHU VỰC BỐ CỤC CHÍNH 2 CỘT */}
      <div className={styles.mainLayout}>
        
        {/* CỘT TRÁI: BẢNG LỊCH SỬ GIAO DỊCH */}
        <div className={`${styles.sectionCard} ${styles.historyCard}`}>
          <div className={styles.sectionHeader}>
            <h2>Lịch sử giao dịch</h2>
            
          </div>

          <div className={styles.tableWrapper}>
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
                      <span className={`${styles.badge} ${tx.type === "EARNINGS" ? styles.badgeEarnings : styles.badgeWithdrawal}`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className={styles.txDesc}>{tx.desc}</td>
                    <td>
                      <span className={tx.type === "EARNINGS" ? styles.amountPlus : styles.amountMinus}>
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
          </div>

          <div className={styles.viewMoreRow}>
            <button className={styles.viewMoreBtn}>Xem thêm giao dịch</button>
          </div>
        </div>

        {/* CỘT PHẢI: FORM RÚT TIỀN NHANH & MẸO */}
        <div className={styles.rightSidebar}>
          
          <div className={`${styles.sectionCard} ${styles.withdrawCard}`}>
            <h2>Rút tiền</h2>
            
            <div className={styles.formGroup}>
              <label className={styles.cardLabel}>Số tiền muốn rút (VND)</label>
              <div className={styles.inputWrapper}>
                <input type="text" defaultValue="10000000" className={styles.withdrawInput} />
                <span className={styles.inputUnit}>VND</span>
              </div>
              <div className={styles.feeNotice}>Phí giao dịch: 22.000 VND</div>
            </div>

            <div className={styles.formGroup} style={{ marginTop: "16px" }}>
              <label className={styles.cardLabel}>Phương thức nhận tiền</label>
              
              <div className={styles.methodList}>
                {/* Ngân hàng đã chọn */}
                <div className={`${styles.methodItem} ${styles.methodActive}`}>
                  <div className={styles.methodLeft}>
                    <span className={styles.bankBadge}>VCB</span>
                    <div className={styles.methodInfo}>
                      <div>Vietcombank</div>
                      <div>**** 4567 • NGUYEN VAN A</div>
                    </div>
                  </div>
                  <div className={`${styles.radioCircle} ${styles.radioActive}`}></div>
                </div>

                {/* Ví Điện Tử MoMo */}
                <div className={styles.methodItem}>
                  <div className={styles.methodLeft}>
                    <span className={styles.momoBadge}>MOMO</span>
                    <div className={styles.methodInfo}>
                      <div>Ví MoMo</div>
                      <div>0901 *** 888</div>
                    </div>
                  </div>
                  <div className={styles.radioCircle}></div>
                </div>
              </div>
            </div>

            <button className={styles.submitWithdrawBtn}>Xác nhận rút tiền</button>
            
            <p className={styles.termText}>
              Bằng cách nhấn xác nhận, bạn đồng ý với <a href="#">Điều khoản rút tiền</a> của AuraTeach.
            </p>
          </div>

          {/* Hộp mẹo tăng thu nhập phía dưới */}
          <div className={styles.tipCard}>
            <div className={styles.tipIcon}>💡</div>
            <div className={styles.tipContent}>
              <h4>Mẹo tăng thu nhập</h4>
              <p>Các khóa học có bài tập thực hành thường mang lại doanh thu cao hơn 35% so với khóa học lý thuyết đơn thuần.</p>
              <a href="#" className={styles.tipLink}>Xem hướng dẫn tối ưu khóa học ➔</a>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}