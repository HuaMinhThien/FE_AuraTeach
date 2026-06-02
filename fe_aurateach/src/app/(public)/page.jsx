import StatsSection from "@/components/users/StatsSection";

export default function Home() {
    return (
        <div className="home">
            <div className="section1 container-center">
                <section className="hero-section">
                    <div className="hero-container">
                        
                        <div className="hero-content">
                        <h1 className="hero-title">Định Hình Tương Lai Cùng AuraTeach</h1>
                        <p className="hero-desc">
                            Kết nối với đội ngũ gia sư giỏi, tâm huyết cho các cấp học 1, 2, 3. 
                            Xây dựng nền tảng kiến thức vững chắc cho hành trình học tập của con em bạn.
                        </p>
                        <div className="hero-buttons">
                            <a href="#" className="btn-primary">Tìm Gia Sư Ngay</a>
                            <a href="#" className="btn-secondary">
                            <svg className="icon-play" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M8 5V19L19 12L8 5Z" fill="currentColor"/>
                            </svg>
                            Xem video giới thiệu
                            </a>
                        </div>
                        </div>

                        <div className="hero-media">
                        <div className="video-wrapper">
                            <img src="https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=1000" alt="AuraTeach Classroom" className="video-banner" />
                            
                            <button className="play-trigger" aria-label="Play video">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M8 5V19L19 12L8 5Z" fill="currentColor"/>
                            </svg>
                            </button>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon">
                                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 3L1 9L12 15L21 10.09V17H23V9L12 3Z" fill="currentColor"/>
                                    <path d="M3.8 12.3V16C3.8 17.66 7.47 19 12 19C16.53 19 20.2 17.66 20.2 16V12.3L12 16.78L3.8 12.3Z" fill="currentColor"/>
                                </svg>
                            </div>
                            <div className="stat-info">
                                <span className="stat-number">95%</span>
                                <span className="stat-label">Học sinh tiến bộ vượt bậc</span>
                            </div>
                        </div>
                        </div>

                    </div>
                </section>
            </div>

            <div className="section2">
                <StatsSection />
            </div>
        </div>
    );
}