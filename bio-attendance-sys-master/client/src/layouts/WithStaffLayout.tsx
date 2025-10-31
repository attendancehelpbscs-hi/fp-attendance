import type { FC, ReactNode } from 'react';
import { Menu, MenuButton, MenuList, Button, MenuItem } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import useStore from '../store/store';
import { toast } from 'react-hot-toast';

const WithStaffLayout: FC<{ children: ReactNode }> = ({ children }) => {
  const logoutStaff = useStore.use.logoutStaff();
  const staffInfo = useStore.use.staffInfo();
  const handleLogout = async () => {
    try {
      // Call the logout API to log the event
      const response = await fetch('http://localhost:5000/api/auth/staff/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${useStore.getState().tokens?.accessToken}`,
        },
        body: JSON.stringify({
          staff_id: staffInfo?.id,
        }),
      });

      if (response.ok) {
        logoutStaff();
        toast.success('Logged out successfully');
      } else {
        toast.error('Logout failed');
      }
    } catch (error) {
      console.error('Logout error:', error);
      logoutStaff(); // Still logout locally even if API call fails
      toast.success('Logged out successfully');
    }
  };
  return (
    <div className="staff-layout-wrapper">
      <div>
        <Menu>
          <MenuButton as={Button} bg="var(--bg-primary)" color="white" _hover={{ background: 'var(--bg-primary-light)' }} /* rightIcon={<ChevronDownIcon />} */>Menu</MenuButton>
          <MenuList>
            <MenuItem as={RouterLink} to="/staff/profile">
              Profile
            </MenuItem>
            <MenuItem as={RouterLink} to="/staff/manage/courses">
              Manage Sections
            </MenuItem>
            <MenuItem as={RouterLink} to="/staff/manage/students">
              Manage Students
            </MenuItem>
            <MenuItem as={RouterLink} to="/staff/manage/attendance">
              Manage Attendance
            </MenuItem>
            <MenuItem as={RouterLink} to="/staff/reports">
              Reports & Analytics
            </MenuItem>
            <MenuItem as={RouterLink} to="/staff/help">
              Help & Support
            </MenuItem>
            <MenuItem as={RouterLink} to="/staff/settings">
              Settings
            </MenuItem>
            <MenuItem onClick={handleLogout}>Logout</MenuItem>
          </MenuList>
        </Menu>
      </div>
      <div>{children}</div>
    </div>
  );
};

export default WithStaffLayout;
