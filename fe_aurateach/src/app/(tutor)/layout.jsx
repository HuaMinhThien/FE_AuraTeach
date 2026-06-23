import Sidebar from "@/components/tutors/Sidebar";
import "../../css/tutor-style/main.css";
import Header from "@/components/tutors/Header";

export default function RootLayout({ children }) {
  return (
    <div className="layout-tutor">
        
        <div className="container-center">
            <Sidebar />
            <div className="main-content">
                <Header />
                {children}
            </div>
        </div>

    </div>
  );
}