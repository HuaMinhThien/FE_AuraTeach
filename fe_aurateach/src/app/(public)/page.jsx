import FeaturedTeachers from "@/components/users/FeaturedTeachers";
import HonoredSection from "@/components/users/HonoredSection";
import ReviewSection from "@/components/users/ReviewSection";
import StatsSection from "@/components/users/StatsSection";
import TeacherSection from "@/components/users/TeacherSection";



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

            <div className="section2 ">
                <StatsSection />
            </div>

            <div className="section3 container-center">
                <TeacherSection />
            </div>
            <div className="section4">
                <section className="why-aurateach container-center">
                    <div className="why-aurateach__header">
                        <h2 className="why-aurateach__title">Tại sao chọn AuraTeach?</h2>
                        <p className="why-aurateach__desc">
                        Chúng tôi cung cấp nền tảng kết nối hiệu quả và an toàn nhất cho hành trình học tập chuyên nghiệp của bạn.
                        </p>
                    </div>

                    <div className="why-aurateach__image-wrapper">
                        <img 
                        className="why-aurateach__img" 
                        src="img/banner/Gia sư và học viên trung học.png" 
                        alt="AuraTeach Banner" 
                        />
                    </div>

                    <div className="why-aurateach__grid">
                        
                        <div className="why-aurateach__item">
                        <div className="why-aurateach__icon-circle why-aurateach__icon-circle--verified">
                            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" height="20" width="20" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                        </div>
                        <h3 className="why-aurateach__item-title">Gia sư xác minh</h3>
                        <p className="why-aurateach__item-desc">Đội ngũ gia sư được kiểm định khắt khe về bằng cấp và kinh nghiệm thực tế.</p>
                        </div>

                        <div className="why-aurateach__item">
                        <div className="why-aurateach__icon-circle why-aurateach__icon-circle--payment">
                            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" height="20" width="20" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                        </div>
                        <h3 className="why-aurateach__item-title">Thanh toán trực tiếp</h3>
                        <p className="why-aurateach__item-desc">Gia sư và học viên tự do thỏa thuận phương thức thanh toán, không thông qua nền tảng.</p>
                        </div>

                        <div className="why-aurateach__item">
                        <div className="why-aurateach__icon-circle why-aurateach__icon-circle--time">
                            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" height="20" width="20" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </div>
                        <h3 className="why-aurateach__item-title">Linh hoạt thời gian</h3>
                        <p className="why-aurateach__item-desc">Học online hoặc offline, thời gian linh hoạt theo nhu cầu riêng của bạn.</p>
                        </div>

                        <div className="why-aurateach__item why-aurateach__item--bottom-row">
                        <div className="why-aurateach__icon-circle why-aurateach__icon-circle--rating">
                            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" height="20" width="20" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path></svg>
                        </div>
                        <h3 className="why-aurateach__item-title">Đánh giá minh bạch</h3>
                        <p className="why-aurateach__item-desc">Hệ thống đánh giá và phản hồi từ học viên thực tế giúp bạn chọn gia sư tốt nhất.</p>
                        </div>

                        <div className="why-aurateach__item why-aurateach__item--bottom-row">
                        <div className="why-aurateach__icon-circle why-aurateach__icon-circle--support">
                            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" height="20" width="20" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </div>
                        <h3 className="why-aurateach__item-title">Hỗ trợ 24/7</h3>
                        <p className="why-aurateach__item-desc">Đội ngũ hỗ trợ khách hàng luôn sẵn sàng giúp đỡ bạn bất cứ khi nào cần.</p>
                        </div>

                    </div>
                </section>
            </div>

            <div className="section5 container-center">
                <FeaturedTeachers />
            </div>

            <div className="section6 container-center">
                <HonoredSection />
            </div>

            <div className="section7 ">
                <ReviewSection />
            </div>
        </div>
    );
}