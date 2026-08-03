import Header from "@/components/users/Header";
import "../../css/student-style/main.css";
import Footer from "@/components/users/Footer";
import { AuthProvider } from "@/context/AuthContext";
import Providers from "../providers";

export default function RootLayout({ children }) {
  return (
    <>
      <Providers>
        <AuthProvider>
          <Header />
          {children}
          <Footer />
        </AuthProvider>
      </Providers>
    </>
  );
}