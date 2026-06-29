// src/app/(student)/layout.jsx
import Header from "@/components/users/Header";
import Footer from "@/components/users/Footer";

// Import tất cả CSS cần thiết cho Student
import "../../css/student-style/main.css";
import "../../css/student-style/header.css";
import "../../css/student-style/footer.css";
// Thêm các file css khác nếu cần
// import "../../css/student-style/home.css";
// import "../../css/student-style/search.css";

export default function StudentLayout({ children }) {
  return (
    <>
      <Header />
      <main className="student-main-content">
        {children}
      </main>
      <Footer />
    </>
  );
}