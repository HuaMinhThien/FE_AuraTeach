// src/components/student/Sidebar.jsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function StudentSidebar() {
  const pathname = usePathname();

  const menuItems = [
    { icon: '📊', label: 'Dashboard', path: '/student/dashboard' },
    { icon: '📚', label: 'Lớp học', path: '/student/classList' },
    { icon: '👨‍🏫', label: 'Gia sư', path: '/student/tutorList' },
    { icon: '📝', label: 'Đặt lịch', path: '/student/booking' },
    { icon: '📖', label: 'Lớp của tôi', path: '/student/my-classes' },
    { icon: '👤', label: 'Hồ sơ', path: '/student/profile' },
    { icon: '⚠️', label: 'Báo cáo gia sư', path: '/student/reportTutor' },
  ];

  return (
    <aside className="student-sidebar">
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={`sidebar-item ${pathname === item.path || pathname.startsWith(item.path + '/') ? 'active' : ''}`}
          >
            <span className="icon">{item.icon}</span>
            <span className="label">{item.label}</span>
          </Link>
        ))}
      </nav>

      <style jsx>{`
        .student-sidebar {
          width: 250px;
          min-height: calc(100vh - 70px);
          background: #f8f9fa;
          padding: 1.5rem 0;
          border-right: 1px solid #e9ecef;
          position: sticky;
          top: 70px;
          height: calc(100vh - 70px);
          overflow-y: auto;
        }
        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .sidebar-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 1.5rem;
          color: #495057;
          text-decoration: none;
          transition: all 0.3s;
          border-left: 3px solid transparent;
          font-size: 0.95rem;
        }
        .sidebar-item:hover {
          background: #e9ecef;
          color: #212529;
        }
        .sidebar-item.active {
          background: #e7f3ff;
          color: #667eea;
          border-left-color: #667eea;
          font-weight: 500;
        }
        .icon {
          font-size: 1.25rem;
          width: 24px;
        }
        .label {
          flex: 1;
        }
      `}</style>
    </aside>
  );
}