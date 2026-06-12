"use client";
import Image from "next/image";
import Link from "next/link";
import SearchComponent from "./SearchInput";
import { useState } from "react";


export default function Headers() {

    const [activeNav, setActiveNav] = useState("home");
    const [activeBtn, setActiveBtn] = useState("login");

    return (
        <header>
            <div className="header">
                <div className="header-left">
                    <Link href="/" className="header-logo" style={{textDecoration: "none"}}>
                        <Image src="/img/logo-aurateach.png" alt="Logo" width={50} height={40} />  
                        <h1 style={{ textDecoration: "none" }}>AuraTeach</h1>
                    </Link>
                    <div className="header-nav">
                            {/* <Link href="/" className={`nav-item ${activeNav === "home" ? "active-nav" : ""}`} onClick={() => setActiveNav("home")}>
                                <span>Trang chủ</span>
                            </Link> */}
                        <Link href="/ProductList" className={`nav-item ${activeNav === "products" ? "active-nav" : ""}`} onClick={() => setActiveNav("products")}>
                            <span>Tìm gia sư</span>
                        </Link>
                        <Link href="/class-search" className={`nav-item ${activeNav === "classes" ? "active-nav" : ""}`} onClick={() => setActiveNav("classes")}>
                            <span>Tìm lớp học</span>
                        </Link>
                    </div>
                </div>

                {/* <input type="text" className="header-search" placeholder="Tìm kiếm gia sư, lớp học..." /> */}
                <SearchComponent />

                <div className="header-right">
                    <Link href="/login" className={`header-btn login-btn ${activeBtn === "login" ? "header-btn-active" : ""}`} onClick={() => setActiveBtn("login")}>
                        <span>Đăng nhập</span>
                    </Link>
                    <Link href="/register" className={`header-btn register-btn ${activeBtn === "register" ? "header-btn-active" : ""}`} onClick={() => setActiveBtn("register")}>
                        <span>Đăng ký</span>
                    </Link>
                </div>
            </div>
        </header>
    );
}