import React from 'react';

function Footer() {
  return (
    <footer className="aurateach-footer">
      <div className="aurateach-footer__container container-center">
        
        {/* Phần Menu trên chia cột */}
        <div className="aurateach-footer__row">
          
          {/* Cột 1: Giới thiệu thương hiệu */}
          <div className="aurateach-footer__brand-col">
            <h3 className="aurateach-footer__logo">AuraTeach</h3>
            <p className="aurateach-footer__brand-desc">
              Nền tảng kết nối gia sư và học viên uy tín hàng đầu Việt Nam.
            </p>
            <div className="aurateach-footer__socials">
              {/* Nút quả địa cầu / Website */}
              <button className="aurateach-footer__social-btn" title="Website">
                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" height="18" width="18" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>
              </button>
              {/* Nút Email */}
              <button className="aurateach-footer__social-btn" title="Liên hệ qua Email">
                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" height="18" width="18" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
              </button>
            </div>
          </div>

          {/* Cột 2: Dành cho học viên */}
          <div className="aurateach-footer__menu-col">
            <h4 className="aurateach-footer__menu-title">Dành cho học viên</h4>
            <ul className="aurateach-footer__menu-list">
              <li className="aurateach-footer__menu-item">
                <a href="#find-tutor" className="aurateach-footer__link">Tìm gia sư</a>
              </li>
              <li className="aurateach-footer__menu-item">
                <a href="#online-class" className="aurateach-footer__link">Lớp học trực tuyến</a>
              </li>
              <li className="aurateach-footer__menu-item">
                <a href="#learning-process" className="aurateach-footer__link">Quy trình học tập</a>
              </li>
            </ul>
          </div>

          {/* Cột 3: Dành cho gia sư */}
          <div className="aurateach-footer__menu-col">
            <h4 className="aurateach-footer__menu-title">Dành cho gia sư</h4>
            <ul className="aurateach-footer__menu-list">
              <li className="aurateach-footer__menu-item">
                <a href="#become-tutor" className="aurateach-footer__link">Trở thành gia sư</a>
              </li>
              <li className="aurateach-footer__menu-item">
                <a href="#commission-policy" className="aurateach-footer__link">Chính sách hoa hồng</a>
              </li>
              <li className="aurateach-footer__menu-item">
                <a href="#community" className="aurateach-footer__link">Cộng đồng gia sư</a>
              </li>
            </ul>
          </div>

          {/* Cột 4: Hỗ trợ */}
          <div className="aurateach-footer__menu-col">
            <h4 className="aurateach-footer__menu-title">Hỗ trợ</h4>
            <ul className="aurateach-footer__menu-list">
              <li className="aurateach-footer__menu-item">
                <a href="#help-center" className="aurateach-footer__link">Trung tâm trợ giúp</a>
              </li>
              <li className="aurateach-footer__menu-item">
                <a href="#terms" className="aurateach-footer__link">Điều khoản dịch vụ</a>
              </li>
              <li className="aurateach-footer__menu-item">
                <a href="#privacy" className="aurateach-footer__link">Chính sách bảo mật</a>
              </li>
            </ul>
          </div>

        </div>

        {/* Thanh chắn ngang */}
        <hr className="aurateach-footer__divider" />

        {/* Phần dưới cùng đáy Footer */}
        <div className="aurateach-footer__bottom">
          <p className="aurateach-footer__copyright">
            2024 AuraTeach. All rights reserved.
          </p>
          <div className="aurateach-footer__contacts-quick">
            <p className="aurateach-footer__contact-txt-item">
              Hotline: <span className="aurateach-footer__contact-bold">1900 1234</span>
            </p>
            <p className="aurateach-footer__contact-txt-item">
              Email: <span className="aurateach-footer__contact-bold">contact@aurateach.vn</span>
            </p>
          </div>
        </div>

      </div>
    </footer>
  );
}

export default Footer;