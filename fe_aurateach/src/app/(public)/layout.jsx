// src/app/(public)/layout.jsx
import Header from "@/components/users/Header";
import Footer from "@/components/users/Footer";
import "../../css/student-style/main.css";   // Giữ style bạn đang dùng

export default function PublicLayout({ children }) {
  return (
    <>
      <Header />
      <main className="main-content">
        {children}
      </main>
      <Footer />
    </>
  );
}