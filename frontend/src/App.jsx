import React from "react";
import { Routes, Route, NavLink, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import About from "./pages/About";
import Sender from "./pages/Sender";
import Receiver from "./pages/Receiver";

const App = () => {
  const location = useLocation();
  const hideSender = location.pathname.startsWith("/receive");

  return (
    <div className="app-shell">
      <header className="navbar">
        <div className="navbar-brand">Setu Sharing</div>
        <nav className="nav-links">
          <NavLink className="nav-link" to="/" end>
            Home
          </NavLink>

          {!hideSender && (
            <NavLink className="nav-link" to="/sender">
              Sender
            </NavLink>
          )}

          <NavLink className="nav-link" to="/about">
            About
          </NavLink>
        </nav>
      </header>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/sender" element={<Sender />} />
          <Route path="/about" element={<About />} />
          <Route path="/receive" element={<Receiver />} />
          <Route path="/receive/:token" element={<Receiver />} />
        </Routes>
      </main>

      <footer className="footer">
        &copy; 2025 Setu Sharing Project. Engineered for Speed and Security. |{" "}
        <a href="#">Privacy Policy</a>
      </footer>
    </div>
  );
};

export default App;
