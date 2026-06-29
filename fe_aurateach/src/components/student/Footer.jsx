// src/components/student/Footer.jsx
export default function StudentFooter() {
  return (
    <footer className="student-footer">
      <p>© 2026 AuraTeach - Nền tảng kết nối gia sư - học viên</p>
      <style jsx>{`
        .student-footer {
          text-align: center;
          padding: 1rem;
          background: #f8f9fa;
          border-top: 1px solid #e9ecef;
          color: #6c757d;
          font-size: 0.9rem;
        }
      `}</style>
    </footer>
  );
}