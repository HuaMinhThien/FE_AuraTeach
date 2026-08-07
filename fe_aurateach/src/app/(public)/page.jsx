import FeaturedTutors from "./_component-home/FeaturedTutors";
import HonoredSection from "@/app/(public)/_component-home/HonoredSection";
import ReviewSection from "@/app/(public)/_component-home/ReviewSection";
import StatsSection from "@/app/(public)/_component-home/StatsSection";
import Image from "next/image";
import CoursesSection from "@/app/(public)/_component-home/CoursesSection";



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
                            <a href="/ProductList" className="btn-primary">Tìm Gia Sư Ngay</a>                          
                        </div>
                        </div>

                        <div className="hero-media">
                        <div className="video-wrapper">
                            <img src="https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=1000" alt="AuraTeach Classroom" className="video-banner" />
                            
                            
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
                <CoursesSection />
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
                                <Image src="/img/icons/security.png" alt="Verified Tutors" width={20} height={20} />
                            </div>
                            <h3 className="why-aurateach__item-title">Gia sư xác minh</h3>
                            <p className="why-aurateach__item-desc">Đội ngũ gia sư được kiểm định khắt khe về bằng cấp và kinh nghiệm thực tế.</p>
                        </div>

                        <div className="why-aurateach__item">
                            <div className="why-aurateach__icon-circle why-aurateach__icon-circle--payment">
                                <Image src="/img/icons/payment.png" alt="Direct Payment" width={20} height={20} />
                            </div>
                            <h3 className="why-aurateach__item-title">Thanh toán trực tiếp</h3>
                            <p className="why-aurateach__item-desc">Gia sư và học viên tự do thỏa thuận phương thức thanh toán, không thông qua nền tảng.</p>
                        </div>

                        <div className="why-aurateach__item">
                            <div className="why-aurateach__icon-circle why-aurateach__icon-circle--time">
                                <Image src="/img/icons/glock.png" alt="Flexible Scheduling" width={20} height={20} />
                            </div>
                            <h3 className="why-aurateach__item-title">Linh hoạt thời gian</h3>
                            <p className="why-aurateach__item-desc">Học online hoặc offline, thời gian linh hoạt theo nhu cầu riêng của bạn.</p>
                        </div>

                        <div className="why-aurateach__item why-aurateach__item--bottom-row">
                            <div className="why-aurateach__icon-circle why-aurateach__icon-circle--rating">
                                <Image src="/img/icons/star-purple.png" alt="Transparent Reviews" width={20} height={20} />
                            </div>
                            <h3 className="why-aurateach__item-title">Đánh giá minh bạch</h3>
                            <p className="why-aurateach__item-desc">Hệ thống đánh giá và phản hồi từ học viên thực tế giúp bạn chọn gia sư tốt nhất.</p>
                        </div>

                        <div className="why-aurateach__item why-aurateach__item--bottom-row">
                            <div className="why-aurateach__icon-circle why-aurateach__icon-circle--support">
                                <Image src="/img/icons/cskh.png" alt="24/7 Support" width={20} height={20} />
                            </div>
                            <h3 className="why-aurateach__item-title">Hỗ trợ 24/7</h3>
                            <p className="why-aurateach__item-desc">Đội ngũ hỗ trợ khách hàng luôn sẵn sàng giúp đỡ bạn bất cứ khi nào cần.</p>
                        </div>

                    </div>
                </section>
            </div>

            <div className="section5 container-center">
                <FeaturedTutors />
            </div>

            {/* <div className="section6 container-center">
                <HonoredSection />
            </div> */}

            <div className="section7 ">
                <ReviewSection />
            </div>
        </div>
    );
}