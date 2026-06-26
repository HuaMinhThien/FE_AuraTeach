"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import "../../css/tutor-style/header.css"; 

export default function Header() {
    const [user, setUser] = useState(null);

    const getCookie = (name) => {
        if (typeof window === "undefined") return null;
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    };

    useEffect(() => {
        const checkUser = () => {
            const userCookie = getCookie("user_info");
            if (userCookie) {
                try {
                    const userData = JSON.parse(decodeURIComponent(userCookie));
                    setUser(userData);
                } catch (error) {
                    setUser(null);
                }
            } else {
                setUser(null);
            }
        };

        checkUser();
        const interval = setInterval(checkUser, 1000);
        return () => clearInterval(interval);
    }, []);

    const getValidAvatar = (avatar) => {
        if (!avatar) return "/img/default-avatar.png";
        if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
            return avatar;
        }
        if (avatar.startsWith('/')) {
            return avatar;
        }
        return "/img/default-avatar.png";
    };

    return (
        <>
            <header>
                <div className="icons">
                    <Image src="/img/icons/notificationn.png" alt="Notification" width={20} height={20} />
                </div>

                <div className="account-balance">
                    <p style={{color: "#d97706", background: "#fffbeb", padding: "4px 8px", borderRadius: "10px"}}>+ 54.590.000đ</p>
                </div>
                <hr />

                <div className="user-info">
                    <div className="avatar">
                        <Image
                            src={getValidAvatar(user?.avatar)}
                            alt="User Avatar"
                            width={40}
                            height={40}
                            style={{borderRadius: `50%`}}
                        />
                    </div>
                    <div className="user-details">
                        <p>{user?.name || "Gia sư"}</p> 
                    </div>
                </div>
            </header>
        </>
    );
}