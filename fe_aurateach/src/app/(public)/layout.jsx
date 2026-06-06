import Headers from '@/components/users/Headers';
import '../../css/student-style/main.css';
import Footer from '@/components/users/Footer';

export default function RootLayout({ children }) {
  return (
    <>
      <Headers />

        {children}

      <Footer />
    </>
  );
}