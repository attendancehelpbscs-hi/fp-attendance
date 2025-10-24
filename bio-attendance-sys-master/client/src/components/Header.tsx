import '../styles/Header.scss';
import logo from '../assets/1756882646835-removebg-preview.png';

const Header = () => {
  return (
    <div className="main-header">
      <div className="header-content">
        <img src={logo} alt="FP Attendance System Logo" className="header-logo" />
        <div className="logo-section">
          <h1>FP Attendance System</h1>
          <p>Bula South Central Elementary School, 2025</p>
        </div>
      </div>
    </div>
  );
};

export default Header;
