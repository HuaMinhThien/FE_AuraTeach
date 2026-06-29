// src/components/admin/Sidebar.jsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminSidebar() {
  const pathname = usePathname();

  const menuItems = [
    { icon: '📊', label: 'Dashboard', path: '/admin/dashboard' },
    { icon: '👤', label: 'Quản lý người dùng', path: '/admin/users' },
    { icon: '📚', label: 'Quản lý lớp học', path: '/admin/classes' },
    { icon: '👨‍🏫', label: 'Quản lý gia sư', path: '/admin/tutors' },
    { icon: '📈', label: 'Báo cáo thống kê', path: '/admin/reports' },
  ];

  return (
    <aside className="admin-sidebar">
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={`sidebar-item ${pathname === item.path ? 'active' : ''}`}
          >
            <span className="icon">{item.icon}</span>
            <span className="label">{item.label}</span>
          </Link>
        ))}
      </nav>

      <style jsx>{`
        .admin-sidebar {
          width: 250px;
          min-height: 100vh;
          background: #16213e;
          padding: 2rem 0;
          position: sticky;
          top: 0;
          height: 100vh;
          overflow-y: auto;
        }
        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .sidebar-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 1.5rem;
          color: #a8a8b3;
          text-decoration: none;
          transition: all 0.3s;
          border-left: 3px solid transparent;
        }
        .sidebar-item:hover {
          background: rgba(255, 255, 255, 0.05);
          color: white;
        }
        .sidebar-item.active {
          background: rgba(233, 69, 96, 0.1);
          color: #e94560;
          border-left-color: #e94560;
        }
        .icon {
          font-size: 1.25rem;
        }
        .label {
          font-size: 0.9rem;
        }
      `}</style>
    </aside>
  );
}