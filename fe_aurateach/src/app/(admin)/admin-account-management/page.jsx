"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import styles from './AccountManager.module.css';
import { adminService } from '@/services/adminService';

export default function AccountManager() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  
  // States quản lý phân trang với giá trị mặc định an toàn
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);

  // Hàm load dữ liệu từ API dựa trên trang hiện tại
  const loadDataFromServer = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const res = await adminService.getAllAccounts({ page });
      
      const list = Array.isArray(res) ? res : (res?.data || []);
      setUsers(list);

      // Nếu API trả về mảng, ta giả lập thông tin phân trang dựa trên số lượng thực tế
      // (Ví dụ tổng số tài khoản là 25, mỗi trang 10 items thì last_page sẽ là 3)
      const totalItems = res?.total || 25; // Thay số 25 bằng tổng số thực tế nếu API có trả về, hoặc ước lượng
      const perPage = 10;
      const lastPage = Math.ceil(totalItems / perPage);

      setPagination({
        current_page: page,
        last_page: lastPage > 0 ? lastPage : 1,
        per_page: perPage,
        total: totalItems,
      });

    } catch (error) {
      console.error("Lỗi kết nối API:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDataFromServer(currentPage);
  }, [loadDataFromServer, currentPage]);

  // Bộ lọc Client-side tìm kiếm và phân loại vai trò/trạng thái
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchSearch = 
        (user.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (user.phone || '').includes(searchTerm) ||
        (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      
      const matchRole = roleFilter === 'all' ? true : user.role === roleFilter;
      const matchStatus = statusFilter === 'all' ? true : user.status === statusFilter;

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  // Xử lý khóa hoặc mở khóa tài khoản
  const handleToggleBlock = async (user) => {
    const userId = user.user_id || user.id;
    const nextStatus = user.status === 'active' ? 'banned' : 'active';
    
    if (!window.confirm(`Bạn có chắc muốn ${nextStatus === 'banned' ? 'KHÓA' : 'MỞ KHÓA'} tài khoản ${user.full_name}?`)) {
      return;
    }

    setUpdatingId(userId);
    try {
      const result = await adminService.updateAccountStatus(userId, nextStatus);

      if (result && result.success !== false) {
        setUsers(prevUsers => 
          prevUsers.map(u => (u.user_id === userId || u.id === userId) ? { ...u, status: nextStatus } : u)
        );
        
        if (selectedUser && (selectedUser.user_id === userId || selectedUser.id === userId)) {
          setSelectedUser(prev => ({ ...prev, status: nextStatus }));
        }

        alert(result.message || "Cập nhật trạng thái thành công!");
      } else {
        alert(result?.message || "Cập nhật thất bại!");
      }
    } catch (error) {
      console.error("Lỗi khi cập nhật trạng thái:", error);
      alert("Đã xảy ra lỗi kết nối khi cập nhật trạng thái!");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleVerifyTutor = async (user) => {
    alert(`Tính năng duyệt cho tài khoản: ${user.full_name}`);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Trang Quản Lý Tài Khoản</h1>
      </header>

      {/* Tìm kiếm & Lọc */}
      <div className={styles.filterBar}>
        <input 
          type="text" 
          placeholder="Tìm kiếm theo tên, sđt, email..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={styles.selectInput}>
          <option value="all">Tất cả vai trò</option>
          <option value="student">Học viên</option>
          <option value="tutor">Gia sư</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={styles.selectInput}>
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Hoạt động</option>
          <option value="banned">Bị khóa</option>
        </select>
      </div>

      {/* Bảng kết quả */}
      {isLoading ? (
        <div className={styles.noData}>Đang lấy dữ liệu từ hệ thống...</div>
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Họ tên</th>
                  <th>Email</th>
                  <th>Số điện thoại</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user, index) => {
                    const currentId = user.user_id || user.id;
                    const isUpdating = updatingId === currentId;

                    return (
                      <tr key={currentId || index} className={styles.tableRow} onClick={() => setSelectedUser(user)}>
                        <td className={styles.boldText}>{user.full_name}</td>
                        <td>{user.email}</td>
                        <td>{user.phone || 'Chưa có'}</td>
                        <td>
                          <span className={`${styles.badge} ${user.role === 'tutor' ? styles.badgeTutor : styles.badgeStudent}`}>
                            {user.role ? user.role.toUpperCase() : 'USER'}
                          </span>
                        </td>
                        <td>
                          <span className={`${styles.status} ${user.status === 'active' ? styles.statusActive : styles.statusBanned}`}>
                            {user.status === 'active' ? 'Hoạt động' : 'Bị khóa'}
                          </span>
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <button 
                            disabled={isUpdating}
                            onClick={() => handleToggleBlock(user)}
                            className={`${styles.btn} ${user.status === 'active' ? styles.btnDanger : styles.btnSuccess}`}
                            style={{ opacity: isUpdating ? 0.6 : 1, cursor: isUpdating ? 'not-allowed' : 'pointer' }}
                          >
                            {isUpdating ? 'Đang xử lý...' : (user.status === 'active' ? 'Khóa' : 'Mở khóa')}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className={styles.noData}>Không tìm thấy tài khoản thích hợp.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* THANH PHÂN TRANG (PAGINATION CONTROLS) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', padding: '0 10px' }}>
            <div>
              Trang <strong>{pagination.current_page}</strong> / {pagination.last_page} (Tổng số: {pagination.total} tài khoản)
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className={styles.btn} 
                disabled={pagination.current_page <= 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                style={{ opacity: pagination.current_page <= 1 ? 0.5 : 1, cursor: pagination.current_page <= 1 ? 'not-allowed' : 'pointer' }}
              >
                &laquo; Trang trước
              </button>

              {/* Render danh sách các nút số trang */}
              {[...Array(pagination.last_page || 1)].map((_, idx) => {
                const pageNum = idx + 1;
                const isCurrent = pageNum === pagination.current_page;

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={styles.btn}
                    style={{
                      backgroundColor: isCurrent ? '#007bff' : '#f8f9fa',
                      color: isCurrent ? '#fff' : '#333',
                      border: '1px solid #ccc',
                      fontWeight: isCurrent ? 'bold' : 'normal'
                    }}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button 
                className={styles.btn} 
                disabled={pagination.current_page >= pagination.last_page}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.last_page))}
                style={{ opacity: pagination.current_page >= pagination.last_page ? 0.5 : 1, cursor: pagination.current_page >= pagination.last_page ? 'not-allowed' : 'pointer' }}
              >
                Trang sau &raquo;
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal View Detail */}
      {selectedUser && (
        <div className={styles.modalOverlay} onClick={() => setSelectedUser(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => setSelectedUser(null)}>&times;</button>
            <div className={styles.modalHeader}>
              <h2>{selectedUser.full_name}</h2>
              <span className={`${styles.badge} ${selectedUser.role === 'tutor' ? styles.badgeTutor : styles.badgeStudent}`}>
                {selectedUser.role ? selectedUser.role.toUpperCase() : 'USER'}
              </span>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.gridInfo}>
                <p><strong>Mã User:</strong> {selectedUser.user_id || selectedUser.id}</p>
                <p><strong>Email:</strong> {selectedUser.email}</p>
                <p><strong>Số điện thoại:</strong> {selectedUser.phone || 'Chưa cập nhật'}</p>
                <p><strong>Trạng thái hệ thống:</strong> {selectedUser.status === 'active' ? 'Hoạt động' : 'Bị khóa'}</p>
              </div>

              {selectedUser.role === 'student' && (
                <div className={styles.roleSpecificBox}>
                  <h3>Hồ Sơ Học Viên</h3>
                  <p><strong>Trường học:</strong> {selectedUser.school_name || 'Chưa cập nhật'}</p>
                  <p><strong>Khối lớp:</strong> Khối {selectedUser.grade || 'Chưa cập nhật'}</p>
                </div>
              )}

              {selectedUser.role === 'tutor' && (
                <div className={styles.roleSpecificBox}>
                  <h3>Hồ Sơ Gia Sư</h3>
                  <p><strong>Trình độ bằng cấp:</strong> {selectedUser.qualification || 'Chưa cập nhật'}</p>
                  <p><strong>Kinh nghiệm giảng dạy:</strong> {selectedUser.experience || 'Chưa cập nhật'}</p>
                  <p><strong>Tình trạng kiểm duyệt hồ sơ:</strong> {selectedUser.verification_status || 'Chưa cập nhật'}</p>

                  <div className={styles.financialBox}>
                    <p>💰 <strong>Số dư khả dụng:</strong> {selectedUser.available_balance?.toLocaleString() || 0} đ</p>
                    <p>⏳ <strong>Đang đóng băng thanh toán:</strong> {selectedUser.pending_balance?.toLocaleString() || 0} đ</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}