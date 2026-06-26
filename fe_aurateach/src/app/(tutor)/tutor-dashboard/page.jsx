"use client";

import Tutor_sec1 from "./_component/Tutor_sec1";
import Tutor_sec2 from "./_component/Tutor_sec2";
import Tutor_sec3 from "./_component/Tutor_sec3";
import Tutor_sec4 from "./_component/Tutor_sec4";



export default function TutorDashboardPage() {
  
  /*  ĐÓN DATA TỪ API SAU NÀY:
    const [apiData, setApiData] = useState(null);
    useEffect(() => {
       fetch('/api/tutor/dashboard').then(res => res.json()).then(data => setApiData(data))
    }, []);
  */

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", width: "100%", marginTop: "80px" }}>
      
      {/* SECTION 1: Lời chào và Thống kê thẻ số đầu trang */}
      <Tutor_sec1 tutorName="Thien day ne" statsData={null} />

      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "2fr 1fr", 
        gap: "24px",
        width: "100%"
      }}>
        {/* SECTION 2: Danh sách lớp học sắp tới */}
        <Tutor_sec2 classesData={null} />

        {/* SECTION 3: Nhật ký hoạt động tương tác mới */}
        <Tutor_sec3 activitiesData={null} />
      </div>

      {/* SECTION 4: Biểu đồ thống kê cột tăng trưởng thu nhập */}
      <Tutor_sec4 chartData={null} />

    </div>
  );
}