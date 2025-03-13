import React from 'react';
import { Link } from 'react-router-dom';

function Navbar({ user }) {
  return (
    <nav className="navbar navbar-expand-lg navbar-dark">
      <div className="container-fluid">
        <div className="d-flex">
          <Link className="navbar-brand" to="/dashboard">Dashboard</Link>
          <Link className="navbar-brand" to="/materials">Nhà kho</Link>
          <Link className="navbar-brand" to="/employees">Nhân viên</Link>
        </div>
        <div className="d-flex align-items-center">
          <span>Hi, {user.username}</span>
          <div className="avatar">{user.username.charAt(0).toUpperCase()}</div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;