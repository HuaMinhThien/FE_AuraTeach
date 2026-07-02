import Header from "@/components/users/Header";
import "../../css/student-style/main.css";
import Footer from "@/components/users/Footer";

export default function RootLayout({ children }) {
  return (
    <>
      <Header />
      

      {children}

      <Footer />
    </>
  );
}
