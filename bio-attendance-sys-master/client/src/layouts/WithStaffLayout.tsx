import type { FC, ReactNode } from 'react';
import { Menu, MenuButton, MenuList, Button, MenuItem, Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton, useDisclosure, Alert, AlertIcon, AlertTitle, AlertDescription, Box } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import useStore from '../store/store';
import { toast } from 'react-hot-toast';

const WithStaffLayout: FC<{ children: ReactNode }> = ({ children }) => {
  const logoutStaff = useStore.use.logoutStaff();
  const staffInfo = useStore.use.staffInfo();
  const { isOpen: isLogoutOpen, onOpen: onLogoutOpen, onClose: onLogoutClose } = useDisclosure();

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
            <MenuItem as={Button} bg="#D7263D" color="white" _hover={{ bg: "#B91C1C" }} mt={3} onClick={onLogoutOpen}>Logout</MenuItem>
          </MenuList>
        </Menu>
      </div>
      <div>{children}</div>

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

export default WithStaffLayout;
