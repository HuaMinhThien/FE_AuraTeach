// src/components/student/Header.jsx
'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function StudentHeader() {
  const router = useRouter();

  const handleLogout = () => {
    document.cookie = 'user_info=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    document.cookie = 'role=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    router.push('/login');
  };

  return (
    <header className="student-header">
      <div className="header-left">
        <Link href="/student/dashboard">
          <h1>🎓 AuraTeach</h1>
        </Link>
      </div>
      <nav className="header-nav">
        <Link href="/student/classList">📚 Lớp học</Link>
        <Link href="/student/tutorList">👨‍🏫 Gia sư</Link>
        <Link href="/student/booking">📝 Đặt lịch</Link>
        <Link href="/student/my-classes">📖 Lớp của tôi</Link>
        <Link href="/student/profile">👤 Hồ sơ</Link>
        <button onClick={handleLogout} className="logout-btn">
          Đăng xuất
        </button>
      </nav>

      <style jsx>{`
        .student-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 2rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header-left h1 {
          margin: 0;
          font-size: 1.5rem;
        }
        .header-left a {
          color: white;
          text-decoration: none;
        }
        .header-nav {
          display: flex;
          gap: 1rem;
          align-items: center;
        }
        .header-nav a {
          color: white;
          text-decoration: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          transition: background 0.3s;
        }
        .header-nav a:hover {
          background: rgba(255,255,255,0.2);
        }
        .logout-btn {
          padding: 0.5rem 1.5rem;
          background: rgba(255,255,255,0.2);
          border: 1px solid rgba(255,255,255,0.3);
          color: white;
          border-radius: 4px;
          cursor: pointer;
          transition: background 0.3s;
        }
        .logout-btn:hover {
          background: rgba(255,255,255,0.3);
        }
      `}</style>
    </header>
  );
}