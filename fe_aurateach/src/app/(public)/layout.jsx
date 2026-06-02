import Headers from '@/components/users/Headers';
import '../../css/student-style/main.css';

export default function RootLayout({ children }) {
  return (
    <>
      <Headers />

        {children}

      
    </>
  );
}