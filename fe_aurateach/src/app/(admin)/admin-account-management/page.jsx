"use client"

import React, { useState, useEffect, useMemo } from 'react';
import styles from './AccountManager.module.css';

export default function AccountManager() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);

  // Hàm load dữ liệu ở ngoài (Phục vụ cho tính năng làm mới sau khi tương tác nút bấm)
  const loadDataFromServer = async () => {
    setIsLoading(true);
    try {
      const [studentRes, tutorRes] = await Promise.all([
        fetch('/api/admin-account-management/student-management'),
        fetch('/api/admin-account-management/tutor-management')
      ]);

      const studentsJson = await studentRes.json();
      const tutorsJson = await tutorRes.json();

      if (studentsJson.success && tutorsJson.success) {
        setUsers([...studentsJson.data, ...tutorsJson.data]);
      }
    } catch (error) {
      console.error("Lỗi kết nối API:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Khởi tạo dữ liệu ban đầu an toàn thông qua biến cờ hiệu cô lập
  useEffect(() => {
    let isMounted = true;

    const initializeData = async () => {
      try {
        const [studentRes, tutorRes] = await Promise.all([
          fetch('/api/admin-account-management/student-management'),
          fetch('/api/admin-account-management/tutor-management')
        ]);
        
        const studentsJson = await studentRes.json();
        const tutorsJson = await tutorRes.json();

        if (isMounted && studentsJson.success && tutorsJson.success) {
          setUsers([...studentsJson.data, ...tutorsJson.data]);
        }
      } catch (error) {
        console.error("Lỗi tải dữ liệu khởi tạo:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Bộ lọc Client-side tìm kiếm
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      if (user.role === 'tutor' && user.verification_status === 'pending') {
        return false;
      }

      const matchSearch = 
        (user.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (user.phone || '').includes(searchTerm) ||
        (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      
      const matchRole = roleFilter === 'all' ? true : user.role === roleFilter;
      const matchStatus = statusFilter === 'all' ? true : user.status === statusFilter;

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  // Kích hoạt cập nhật trạng thái Block qua API trung gian
  const handleToggleBlock = async (user) => {
    const nextStatus = user.status === 'active' ? 'banned' : 'active';
    if (!window.confirm(`Bạn muốn thay đổi trạng thái của ${user.full_name} thành ${nextStatus === 'banned' ? 'Khóa' : 'Mở khóa'}?`)) return;

    const endpoint = user.role === 'student' 
      ? '/api/admin-account-management/student-management'
      : '/api/admin-account-management/tutor-management';

    try {
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.user_id, status: nextStatus })
      });
      const result = await res.json();

      if (result.success) {
        alert(result.message);
        loadDataFromServer();
        if (selectedUser && selectedUser.user_id === user.user_id) {
          setSelectedUser(prev => ({ ...prev, status: nextStatus }));
        }
      }
    } catch (error) {
      alert("Lỗi thực thi API!");
    }
  };

  // Kích hoạt Duyệt hồ sơ Gia sư lên API trung gian
  const handleVerifyTutor = async (tutor) => {
    try {
      const res = await fetch('/api/admin-account-management/tutor-management', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tutorId: tutor.tutor_id, verificationStatus: 'Đã xác minh' })
      });
      const result = await res.json();

      if (result.success) {
        alert("Phê duyệt hồ sơ thành công!");
        loadDataFromServer();
        setSelectedUser(prev => ({ ...prev, verification_status: 'Đã xác minh' }));
      }
    } catch (error) {
      alert("Lỗi khi gửi yêu cầu duyệt!");
    }
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
        <div className={styles.noData}>Đang lấy dữ liệu thời gian thực từ JSON Server...</div>
      ) : (
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
                filteredUsers.map((user) => (
                  <tr key={user.user_id} className={styles.tableRow} onClick={() => setSelectedUser(user)}>
                    <td className={styles.boldText}>{user.full_name}</td>
                    <td>{user.email}</td>
                    <td>{user.phone}</td>
                    <td>
                      <span className={`${styles.badge} ${user.role === 'tutor' ? styles.badgeTutor : styles.badgeStudent}`}>
                        {user.role.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.status} ${user.status === 'active' ? styles.statusActive : styles.statusBanned}`}>
                        {user.status === 'active' ? 'Hoạt động' : 'Bị khóa'}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => handleToggleBlock(user)}
                        className={`${styles.btn} ${user.status === 'active' ? styles.btnDanger : styles.btnSuccess}`}
                      >
                        {user.status === 'active' ? 'Khóa' : 'Mở khóa'}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className={styles.noData}>Không tìm thấy tài khoản thích hợp.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal View Detail */}
      {selectedUser && (
        <div className={styles.modalOverlay} onClick={() => setSelectedUser(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => setSelectedUser(null)}>&times;</button>
            <div className={styles.modalHeader}>
              <h2>{selectedUser.full_name}</h2>
              <span className={`${styles.badge} ${selectedUser.role === 'tutor' ? styles.badgeTutor : styles.badgeStudent}`}>
                {selectedUser.role.toUpperCase()}
              </span>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.gridInfo}>
                <p><strong>Mã User:</strong> {selectedUser.user_id}</p>
                <p><strong>Email:</strong> {selectedUser.email}</p>
                <p><strong>Số điện thoại:</strong> {selectedUser.phone}</p>
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
                  <p><strong>Tình trạng kiểm duyệt hồ sơ:</strong> {selectedUser.verification_status}</p>

                  <div className={styles.financialBox}>
                    <p>💰 <strong>Số dư khả dụng:</strong> {selectedUser.available_balance?.toLocaleString()} đ</p>
                    <p>⏳ <strong>Đang đóng băng thanh toán:</strong> {selectedUser.pending_balance?.toLocaleString()} đ</p>
                  </div>

                  {selectedUser.verification_status !== 'Đã xác minh' && (
                    <button 
                      className={`${styles.btn} ${styles.btnSuccess}`} 
                      style={{ marginTop: '15px', width: '100%' }}
                      onClick={() => handleVerifyTutor(selectedUser)}
                    >
                      Duyệt Hồ Sơ Cho Gia Sư Này
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}