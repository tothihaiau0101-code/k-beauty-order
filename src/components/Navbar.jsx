/**
 * Navbar Component with Language Toggle
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import i18n from '../i18n/i18n';
import LanguageToggle from './LanguageToggle';
import './Navbar.css';

function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check auth status
    const authStatus = localStorage.getItem('k-beauty-auth');
    setIsLoggedIn(!!authStatus);

    // Get cart count
    const cart = JSON.parse(localStorage.getItem('k-beauty-cart') || '[]');
    setCartCount(cart.reduce((sum, item) => sum + (item.quantity || 1), 0));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('k-beauty-auth');
    setIsLoggedIn(false);
    navigate('/');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <span className="logo-text">K-Beauty</span>
        </Link>

        {/* Desktop Navigation */}
        <ul className="navbar-menu">
          <li>
            <Link to="/" data-i18n="nav.home">Trang chủ</Link>
          </li>
          <li>
            <Link to="/products" data-i18n="nav.products">Sản phẩm</Link>
          </li>
          <li>
            <Link to="/about" data-i18n="nav.about">Về chúng tôi</Link>
          </li>
          <li>
            <Link to="/contact" data-i18n="nav.contact">Liên hệ</Link>
          </li>
        </ul>

        {/* Right Side Actions */}
        <div className="navbar-actions">
          {/* Language Toggle */}
          <LanguageToggle />

          {/* Cart */}
          <Link to="/cart" className="navbar-cart">
            <span className="cart-icon">🛒</span>
            {cartCount > 0 && (
              <span className="cart-count">{cartCount}</span>
            )}
            <span className="cart-label" data-i18n="nav.cart">Giỏ hàng</span>
          </Link>

          {/* Auth Buttons - Desktop */}
          <div className="navbar-auth desktop-only">
            {isLoggedIn ? (
              <>
                <Link to="/profile" className="btn btn-outline" data-i18n="nav.profile">
                  Hồ sơ
                </Link>
                <button onClick={handleLogout} className="btn btn-primary" data-i18n="nav.logout">
                  Đăng xuất
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-outline" data-i18n="nav.login">
                  Đăng nhập
                </Link>
                <Link to="/signup" className="btn btn-primary" data-i18n="nav.signup">
                  Đăng ký
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="navbar-toggle mobile-only"
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            <span className="toggle-icon">☰</span>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="navbar-mobile-menu">
          <ul className="mobile-menu-list">
            <li>
              <Link to="/" onClick={() => setIsMenuOpen(false)} data-i18n="nav.home">
                Trang chủ
              </Link>
            </li>
            <li>
              <Link to="/products" onClick={() => setIsMenuOpen(false)} data-i18n="nav.products">
                Sản phẩm
              </Link>
            </li>
            <li>
              <Link to="/about" onClick={() => setIsMenuOpen(false)} data-i18n="nav.about">
                Về chúng tôi
              </Link>
            </li>
            <li>
              <Link to="/contact" onClick={() => setIsMenuOpen(false)} data-i18n="nav.contact">
                Liên hệ
              </Link>
            </li>
            <li>
              <Link to="/orders" onClick={() => setIsMenuOpen(false)} data-i18n="nav.orders">
                Đơn hàng
              </Link>
            </li>
          </ul>
          
          {/* Mobile Auth */}
          <div className="mobile-auth">
            {isLoggedIn ? (
              <>
                <Link to="/profile" className="btn btn-outline" data-i18n="nav.profile">
                  Hồ sơ
                </Link>
                <button onClick={() => { handleLogout(); setIsMenuOpen(false); }} className="btn btn-primary" data-i18n="nav.logout">
                  Đăng xuất
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-outline" data-i18n="nav.login">
                  Đăng nhập
                </Link>
                <Link to="/signup" className="btn btn-primary" data-i18n="nav.signup">
                  Đăng ký
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
