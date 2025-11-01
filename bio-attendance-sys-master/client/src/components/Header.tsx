import '../styles/Header.scss';
import logo from '../assets/1756882646835-removebg-preview.png';
import { Link, useLocation } from 'react-router-dom';
import useStore from '../store/store';
import { ViewIcon, CalendarIcon, InfoIcon, SettingsIcon, RepeatIcon, AtSignIcon, TimeIcon } from '@chakra-ui/icons';

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
                <ViewIcon className="nav-icon" /> Dashboard
              </Link>
            </li>
            <li className="nav-item">
              <Link to="/staff/manage/courses" className={`nav-link ${location.pathname === '/staff/manage/courses' ? 'active' : ''}`}>
                <CalendarIcon className="nav-icon" /> Section
              </Link>
            </li>
            <li className="nav-item">
              <Link to="/staff/manage/students" className={`nav-link ${location.pathname === '/staff/manage/students' ? 'active' : ''}`}>
                <AtSignIcon className="nav-icon" /> Students
              </Link>
            </li>
            <li className="nav-item">
              <Link to="/staff/manage/attendance" className={`nav-link ${location.pathname === '/staff/manage/attendance' ? 'active' : ''}`}>
                <TimeIcon className="nav-icon" /> Attendance
              </Link>
            </li>
            <li className="nav-item">
              <Link to="/staff/reports" className={`nav-link ${location.pathname === '/staff/reports' ? 'active' : ''}`}>
                <RepeatIcon className="nav-icon" /> Reports
              </Link>
            </li>
            <li className="nav-item">
              <Link to="/staff/help" className={`nav-link ${location.pathname === '/staff/help' ? 'active' : ''}`}>
                <InfoIcon className="nav-icon" /> Help
              </Link>
            </li>
            <li className="nav-item">
              <Link to="/staff/settings" className={`nav-link ${location.pathname === '/staff/settings' ? 'active' : ''}`}>
                <SettingsIcon className="nav-icon" /> Settings
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
};

export default Header;
