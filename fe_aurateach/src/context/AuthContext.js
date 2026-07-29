"use client";
import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Kiểm tra thông tin user từ cookie hoặc localStorage khi tải trang
    const storedUser = localStorage.getItem('user_info');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = (userData, token) => {
    setUser(userData);
    localStorage.setItem('user_info', JSON.stringify(userData));
    document.cookie = `token=${token}; path=/; max-age=86400`; // Lưu token 1 ngày
    
    // Điều hướng dựa vào role
    if (userData.role === 'admin') router.push('/admin/dashboard');
    else if (userData.role === 'tutor') router.push('/teacher/dashboard');
    else router.push('/');
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user_info');
    document.cookie = 'token=; path=/; max-age=0';
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);