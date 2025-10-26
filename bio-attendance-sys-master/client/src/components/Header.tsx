import '../styles/Header.scss';
import logo from '../assets/1756882646835-removebg-preview.png';
import { Link, useLocation } from 'react-router-dom';
import useStore from '../store/store';

const Header = () => {
  const isAuthenticated = useStore.use.isAuthenticated();
  const location = useLocation();

  // Don't show navigation on login/register pages
  const hideNav = ['/staff/login', '/staff/register'].includes(location.pathname);

  return (
    <div className="main-header">
      <div className="header-content">
        <img src={logo} alt="FP Attendance System Logo" className="header-logo" />
        <div className="logo-section">
          <h1>FP Attendance System</h1>
          <p>Bula South Central Elementary School, 2025</p>
        </div>
      </div>

      {isAuthenticated && !hideNav && (
        <nav className="header-nav">
          <ul className="nav-list">
            <li className="nav-item">
              <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
                Dashboard
              </Link>
            </li>
            <li className="nav-item">
              <Link to="/staff/manage/students" className={`nav-link ${location.pathname === '/staff/manage/students' ? 'active' : ''}`}>
                Students
              </Link>
            </li>
            <li className="nav-item">
              <Link to="/staff/manage/attendance" className={`nav-link ${location.pathname === '/staff/manage/attendance' ? 'active' : ''}`}>
                Attendance
              </Link>
            </li>
            <li className="nav-item">
              <Link to="/staff/manage/courses" className={`nav-link ${location.pathname === '/staff/manage/courses' ? 'active' : ''}`}>
                Courses
              </Link>
            </li>
            <li className="nav-item">
              <Link to="/staff/reports" className={`nav-link ${location.pathname === '/staff/reports' ? 'active' : ''}`}>
                Reports
              </Link>
            </li>
            <li className="nav-item">
              <Link to="/staff/settings" className={`nav-link ${location.pathname === '/staff/settings' ? 'active' : ''}`}>
                Settings
              </Link>
            </li>
            <li className="nav-item">
              <Link to="/staff/help" className={`nav-link ${location.pathname === '/staff/help' ? 'active' : ''}`}>
                Help
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
};

export default Header;
