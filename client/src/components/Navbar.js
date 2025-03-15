import React from 'react';
import { Link } from 'react-router-dom';

function Navbar({ user, onLogout }) {
  return (
    <nav className="navbar navbar-expand-lg navbar-dark">
      <div className="container-fluid">
        <div className="d-flex">
          <Link className="navbar-brand" to="/dashboard">Dashboard</Link>
          <Link className="navbar-brand" to="/materials">Nhà kho</Link>
          <Link className="navbar-brand" to="/employees">Nhân viên</Link>
        </div>
        <div className="d-flex align-items-center">
          <span className="me-3">Hi, {user.username}</span>
          <div className="avatar me-3">{user.username.charAt(0).toUpperCase()}</div>
          <button 
            className="btn btn-outline-light btn-sm" 
            onClick={onLogout}
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;