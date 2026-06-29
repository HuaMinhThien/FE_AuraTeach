// src/components/admin/Header.jsx
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminHeader() {
  const router = useRouter();

  const handleLogout = () => {
    // Xóa token
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    router.push('/login');
  };

  return (
    <header className="admin-header">
      <div className="admin-header-left">
        <h1>
          <Link href="/admin/dashboard">
            🏫 AuraTeach Admin
          </Link>
        </h1>
      </div>
      
      <div className="admin-header-right">
        <span>👑 Admin</span>
        <button onClick={handleLogout} className="logout-btn">
          Đăng xuất
        </button>
      </div>

      <style jsx>{`
        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 2rem;
          background: #1a1a2e;
          color: white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .admin-header-left h1 {
          font-size: 1.5rem;
          margin: 0;
        }
        .admin-header-left a {
          color: white;
          text-decoration: none;
        }
        .admin-header-right {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .logout-btn {
          padding: 0.5rem 1rem;
          background: #e94560;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: background 0.3s;
        }
        .logout-btn:hover {
          background: #c73e54;
        }
      `}</style>
    </header>
  );
}