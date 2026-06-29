// src/components/admin/Footer.jsx
export default function AdminFooter() {
  return (
    <footer className="admin-footer">
      <p>© 2026 AuraTeach - Admin Dashboard</p>
      <style jsx>{`
        .admin-footer {
          text-align: center;
          padding: 1rem;
          background: #1a1a2e;
          color: #a8a8b3;
          border-top: 1px solid #2a2a4a;
        }
      `}</style>
    </footer>
  );
}