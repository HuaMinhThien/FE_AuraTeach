import Image from "next/image";
import Link from "next/link";
import SearchComponent from "./SearchInput";


export default function Headers() {
    return (
        <header>
            <div className="header">
                <div className="header-left">
                    <div className="header-logo">
                        <Image src="/img/logo-aurateach.png" alt="Logo" width={50} height={40} />  
                        <h1>AuraTeach</h1>
                    </div>
                    <div className="header-nav">
                        <Link href="/" className="nav-item active-nav">
                            <span>Trang chủ</span>
                        </Link>
                        <Link href="/ProductList" className="nav-item">
                            <span>Tìm gia sư</span>
                        </Link>
                        <Link href="/class-search" className="nav-item">
                            <span>Tìm lớp học</span>
                        </Link>
                    </div>
                </div>

                {/* <input type="text" className="header-search" placeholder="Tìm kiếm gia sư, lớp học..." /> */}
                <SearchComponent />

                <div className="header-right">
                    <Link href="/login" className="header-btn login-btn">
                        <span>Đăng nhập</span>
                    </Link>
                    <Link href="/register" className="header-btn header-btn-active register-btn">
                        <span>Đăng ký</span>
                    </Link>
                </div>
            </div>
        </header>
    );
}