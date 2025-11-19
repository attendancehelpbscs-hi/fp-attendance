import '../styles/Header.scss';
import logo from '../assets/1756882646835-removebg-preview.png';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useStore from '../store/store';
import { LayoutDashboard, Users, Fingerprint, CalendarCheck, ChartNoAxesCombined, MessageCircleQuestion, Settings, CircleUserRound, ChevronDown } from 'lucide-react';
import { Menu, MenuButton, MenuList, MenuItem, Button, Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton, useDisclosure, Alert, AlertIcon, AlertTitle, AlertDescription, Box } from '@chakra-ui/react';
import { toast } from 'react-hot-toast';

const Header = () => {
  const isAuthenticated = useStore.use.isAuthenticated();
  const location = useLocation();
  const navigate = useNavigate();
  const logoutStaff = useStore.use.logoutStaff();
  const staffInfo = useStore.use.staffInfo();
  const { isOpen: isLogoutOpen, onOpen: onLogoutOpen, onClose: onLogoutClose } = useDisclosure();

  // Don't show navigation on login/register pages
  const hideNav = ['/staff/login', '/staff/register'].includes(location.pathname);

  const handleLogout = async () => {
    try {
      // Call the logout API to log the event
      const response = await fetch('http://localhost:5005/api/auth/staff/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${useStore.getState().tokens?.accessToken}`,
        },
        body: JSON.stringify({
          staff_id: staffInfo?.id || undefined,
        }),
      });

      if (response.ok) {
        logoutStaff();
        toast.success('Logged out successfully');
        // Always redirect to login page after logout
        navigate('/staff/login', { replace: true });
      } else {
        toast.error('Logout failed');
      }
    } catch (error) {
      console.error('Logout error:', error);
      logoutStaff(); // Still logout locally even if API call fails
      toast.success('Logged out successfully');
      // Always redirect to login page after logout
      navigate('/staff/login', { replace: true });
    }
  };

  return (
    <div className="main-header">
      <div className="header-content">
        <div className="logo-and-text">
          <Link to="/">
            <img src={logo} alt="FP Attendance System Logo" className="header-logo" />
          </Link>
          <div className="logo-section">
            <h1>Fingerprint-Based Attendance Monitoring System</h1>
            <p>Bula South Central Elementary School</p>
          </div>
        </div>
        {isAuthenticated && !hideNav && (
          <Menu>
            <MenuButton as={Button} bg="transparent" color="white" _hover={{ background: 'rgba(255, 255, 255, 0.1)' }} p={2}>
              <CircleUserRound className="nav-icon" />
            </MenuButton>
            <MenuList>
              <MenuItem as={Link} to="/staff/profile" color="black">
                Profile
              </MenuItem>
              <MenuItem as={Button} bg="#D7263D" color="white" _hover={{ bg: "#B91C1C" }} mt={3} onClick={onLogoutOpen}>Logout</MenuItem>
            </MenuList>
          </Menu>
        )}
      </div>

      {isAuthenticated && !hideNav && (
        <nav className="header-nav">
          <ul className="nav-list">
            <li className="nav-item">
              <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
                <LayoutDashboard className="nav-icon" /> Dashboard
              </Link>
            </li>
            <li className="nav-item">
              <Menu>
                <MenuButton as={Button} bg="transparent" color="gray.400" _hover={{ background: 'rgba(255, 255, 255, 0.1)' }} p={2} rightIcon={<ChevronDown />} className={`nav-link ${location.pathname.startsWith('/staff/manage/students') || location.pathname.startsWith('/staff/manage/courses') ? 'active' : ''}`}>
                  <Users className="nav-icon" /> Management
                </MenuButton>
                <MenuList>
                  <MenuItem as={Link} to="/staff/manage/courses" color="black" py={3}>Section Management</MenuItem>
                  <MenuItem as={Link} to="/staff/manage/students" color="black" py={3}>Students List</MenuItem>
                </MenuList>
              </Menu>
            </li>
            <li className="nav-item">
              <Link to="/staff/fingerprint-enrollment" className={`nav-link ${location.pathname === '/staff/fingerprint-enrollment' ? 'active' : ''}`}>
                <Fingerprint className="nav-icon" /> Enrollment
              </Link>
            </li>
            <li className="nav-item">
              <Link to="/staff/manage/attendance/kiosk" className={`nav-link ${location.pathname.startsWith('/staff/manage/attendance') ? 'active' : ''}`}>
                <CalendarCheck className="nav-icon" /> Attendance
              </Link>
            </li>
            <li className="nav-item">
              <Link to="/staff/reports" className={`nav-link ${location.pathname === '/staff/reports' ? 'active' : ''}`}>
                <ChartNoAxesCombined className="nav-icon" /> Reports
              </Link>
            </li>
            <li className="nav-item">
              <Link to="/staff/settings" className={`nav-link ${location.pathname === '/staff/settings' ? 'active' : ''}`}>
                <Settings className="nav-icon" /> Settings
              </Link>
            </li>
            <li className="nav-item">
              <Link to="/staff/help" className={`nav-link ${location.pathname === '/staff/help' ? 'active' : ''}`}>
                <MessageCircleQuestion className="nav-icon" /> Help
              </Link>
            </li>
          </ul>
        </nav>
      )}

      {/* Logout Confirmation Modal */}
      <Modal isOpen={isLogoutOpen} onClose={onLogoutClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Confirm Logout</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Alert status="warning">
              <AlertIcon />
              <Box>
                <AlertTitle>Warning!</AlertTitle>
                <AlertDescription>
                  You are about to log out of the system. Any unsaved changes will be lost.
                  Are you sure you want to proceed?
                </AlertDescription>
              </Box>
            </Alert>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="red" mr={3} onClick={() => { handleLogout(); onLogoutClose(); }}>
              Yes, Logout
            </Button>
            <Button variant="ghost" onClick={onLogoutClose}>
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default Header;
