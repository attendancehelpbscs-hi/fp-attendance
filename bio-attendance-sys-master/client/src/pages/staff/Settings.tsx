import type { FC } from 'react';
import { useState, useEffect } from 'react';
import WithStaffLayout from '../../layouts/WithStaffLayout';
import {
  Card,
  Heading,
  FormControl,
  FormLabel,
  Input,
  Button,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Box,
  Text,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Switch,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Select,
  VStack,
  HStack,
  Divider,
  Image,
} from '@chakra-ui/react';
import { DownloadIcon, DeleteIcon, ViewIcon } from '@chakra-ui/icons';
import useStore from '../../store/store';
import { toast } from 'react-hot-toast';
import { getAuditLogs } from '../../api/audit.api';
import { useBackupData, useClearAuditLogs, useUpdateStaffProfile } from '../../api/staff.api';
import noDp from '../../assets/no-dp.png';


const Settings: FC = () => {
  const staffInfo = useStore.use.staffInfo();
  const staffSettings = useStore.use.staffSettings();
  const setStaffSettings = useStore.use.setStaffSettings();

  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const { isOpen: isBackupOpen, onOpen: onBackupOpen, onClose: onBackupClose } = useDisclosure();
  const { isOpen: isClearLogsOpen, onOpen: onClearLogsOpen, onClose: onClearLogsClose } = useDisclosure();
  const { isOpen: isViewLogsOpen, onOpen: onViewLogsOpen, onClose: onViewLogsClose } = useDisclosure();
  const { isOpen: isProfileUpdateOpen, onOpen: onProfileUpdateOpen, onClose: onProfileUpdateClose } = useDisclosure();

  const backupMutation = useBackupData();
  const clearLogsMutation = useClearAuditLogs();
  const updateProfileMutation = useUpdateStaffProfile();



  const handleBackup = async () => {
    try {
      await backupMutation.mutateAsync({});
      toast.success('Data backup completed successfully');
      onBackupClose();
    } catch (error) {
      toast.error('Failed to backup data');
      console.error('Backup error:', error);
    }
  };

  const handleClearLogs = async () => {
    try {
      await clearLogsMutation.mutateAsync({});
      toast.success('System logs cleared successfully');
      onClearLogsClose();
      // Refresh audit logs
      setCurrentPage(1);
      await fetchAuditLogs(1);
    } catch (error) {
      toast.error('Failed to clear logs');
      console.error('Clear logs error:', error);
    }
  };

  const [profileName, setProfileName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Add this useEffect to sync profileName with staffInfo
  useEffect(() => {
    setProfileName(staffInfo?.name || '');
  }, [staffInfo]);


  const handleSaveProfile = async () => {
    // Validate passwords match
    if (newPassword && newPassword !== confirmNewPassword) {
      toast.error('Passwords do not match');
      return;
    }

    // Validate at least one field is provided
    if (!profileName.trim() && !newPassword) {
      toast.error('Please provide at least name or password to update');
      return;
    }

    // Show confirmation modal
    onProfileUpdateOpen();
  };

  const confirmProfileUpdate = async () => {
    try {
      const updateData: any = {};
      if (profileName.trim()) updateData.name = profileName.trim();
      if (newPassword) {
        updateData.password = newPassword;
        updateData.confirmPassword = confirmNewPassword;
      }

      await updateProfileMutation.mutateAsync(updateData);

      // Update local state
      if (profileName.trim()) {
        useStore.setState((state) => ({
          staffInfo: state.staffInfo ? { ...state.staffInfo, name: profileName.trim() } : null,
        }));
      }

      // Clear password fields
      setNewPassword('');
      setConfirmNewPassword('');

      onProfileUpdateClose();
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update profile');
      console.error('Profile update error:', error);
    }
  };





  const fetchAuditLogs = async (page: number = currentPage) => {
    try {
      const response = await getAuditLogs(page);
      setAuditLogs(response.data.logs);
      setTotalPages(response.data.totalPages);
      setTotalLogs(response.data.total);
      setCurrentPage(page);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      toast.error('Failed to load audit logs');
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  return (
    <WithStaffLayout>
      <Heading as="h2" fontSize="1.8rem" margin="2rem auto" textAlign="center">
        SETTINGS
      </Heading>

      <Tabs variant="enclosed" colorScheme="blue">
        <TabList>
          <Tab>Profile</Tab>
          <Tab>Data & Security</Tab>
          <Tab>Audit Logs</Tab>
        </TabList>

        <TabPanels>
          {/* Profile Tab */}
          <TabPanel>
            <Card maxW={500} margin="1rem auto">
              <Box padding="1rem">
                <Heading size="md" marginBottom="1rem">Update Profile</Heading>
                <VStack spacing={4} align="stretch">
                  <FormControl>
                    <FormLabel>Name</FormLabel>
                    <Input
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="Enter your name"
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Email address</FormLabel>
                    <Input type="email" disabled value={staffInfo?.email || ''} />
                  </FormControl>
                  <FormControl>
                    <FormLabel>New Password</FormLabel>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Confirm New Password</FormLabel>
                    <Input
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                  </FormControl>
                  <Button
                    bg="var(--bg-primary)"
                    color="white"
                    _hover={{ background: 'var(--bg-primary-light)' }}
                    onClick={handleSaveProfile}
                    isLoading={updateProfileMutation.isLoading}
                  >
                    Save Profile
                  </Button>
                </VStack>
              </Box>
            </Card>
          </TabPanel>





          {/* Data & Security Tab */}
          <TabPanel>
            <VStack spacing={4} align="stretch">
              <Card maxW={500} margin="1rem auto">
                <Box padding="1rem">
                  <Heading size="md" marginBottom="1rem">Data Management</Heading>
                  <VStack spacing={4} align="stretch">
                    <Box>
                      <HStack spacing={4} marginBottom="0.5rem">
                        <Button leftIcon={<DownloadIcon />} colorScheme="blue" onClick={onBackupOpen} isLoading={backupMutation.isLoading}>
                          Backup Data
                        </Button>
                        <Button leftIcon={<DeleteIcon />} colorScheme="red" onClick={onClearLogsOpen} isLoading={clearLogsMutation.isLoading}>
                          Clear Logs
                        </Button>
                      </HStack>
                    </Box>
                    <Box>
                      <Text fontSize="sm" color="gray.600" marginBottom="0.5rem">
                        <strong>Backup Data:</strong> Creates a complete backup of all system data (students, staff, attendance records, courses, and settings) as a downloadable JSON file. The backup is also saved on the server for safekeeping.
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        <strong>Clear Logs:</strong> Permanently deletes all audit logs from the system. This action cannot be undone and should only be used when necessary for privacy or storage reasons.
                      </Text>
                    </Box>
                  </VStack>
                </Box>
              </Card>
            </VStack>
          </TabPanel>

          {/* Audit Logs Tab */}
          <TabPanel>
            <Card maxW={800} margin="1rem auto">
              <Box padding="1rem">
                <Heading size="md" marginBottom="1rem">Access & Audit Logs</Heading>
                <TableContainer>
                  <Table variant="simple">
                    <Thead>
                      <Tr>
                        <Th>Action</Th>
                        <Th>User</Th>
                        <Th>Timestamp</Th>
                        <Th>Details</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {auditLogs.map((log) => (
                        <Tr key={log.id}>
                          <Td>{log.action}</Td>
                          <Td>{log.staff?.name || 'Unknown'}</Td>
                          <Td>{new Date(log.created_at).toLocaleString()}</Td>
                          <Td>{log.details || 'N/A'}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>
                <Box marginTop="1rem">
                  <HStack spacing={4} justify="center">
                    <Button
                      onClick={() => fetchAuditLogs(currentPage - 1)}
                      isDisabled={currentPage === 1}
                      size="sm"
                    >
                      Previous
                    </Button>
                    <Text>
                      Page {currentPage} of {totalPages} ({totalLogs} total logs)
                    </Text>
                    <Button
                      onClick={() => fetchAuditLogs(currentPage + 1)}
                      isDisabled={currentPage === totalPages}
                      size="sm"
                    >
                      Next
                    </Button>
                  </HStack>
                </Box>
                <Button leftIcon={<ViewIcon />} colorScheme="teal" marginTop="1rem" onClick={onViewLogsOpen}>
                  View Full Logs
                </Button>
              </Box>
            </Card>
          </TabPanel>


        </TabPanels>
      </Tabs>

      {/* Backup Confirmation Modal */}
      <Modal isOpen={isBackupOpen} onClose={onBackupClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Confirm Data Backup</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>Are you sure you want to backup all system data? This may take a few minutes.</Text>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={handleBackup}>
              Yes, Backup
            </Button>
            <Button variant="ghost" onClick={onBackupClose}>
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Clear Logs Confirmation Modal */}
      <Modal isOpen={isClearLogsOpen} onClose={onClearLogsClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Confirm Clear System Logs</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Alert status="warning">
              <AlertIcon />
              <Box>
                <AlertTitle>Warning!</AlertTitle>
                <AlertDescription>
                  Clearing system logs will permanently delete all audit records. This action cannot be undone.
                  Are you sure you want to proceed?
                </AlertDescription>
              </Box>
            </Alert>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="red" mr={3} onClick={handleClearLogs}>
              Yes, Clear Logs
            </Button>
            <Button variant="ghost" onClick={onClearLogsClose}>
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* View Full Logs Modal */}
      <Modal isOpen={isViewLogsOpen} onClose={onViewLogsClose} size="6xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Full Audit Logs</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <TableContainer>
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Action</Th>
                    <Th>User</Th>
                    <Th>Timestamp</Th>
                    <Th>Details</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {auditLogs.map((log) => (
                    <Tr key={log.id}>
                      <Td>{log.action}</Td>
                      <Td>{log.staff?.name || 'Unknown'}</Td>
                      <Td>{new Date(log.created_at).toLocaleString()}</Td>
                      <Td>{log.details || 'N/A'}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={onViewLogsClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Profile Update Confirmation Modal */}
      <Modal isOpen={isProfileUpdateOpen} onClose={onProfileUpdateClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Confirm Profile Update</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Alert status="warning">
              <AlertIcon />
              <Box>
                <AlertTitle>Warning!</AlertTitle>
                <AlertDescription>
                  You are about to update your profile information. This action will modify your account details.
                  {newPassword && (
                    <Text mt={2} fontWeight="bold">
                      Note: Changing your password will require you to log in again with the new password.
                    </Text>
                  )}
                  Are you sure you want to proceed?
                </AlertDescription>
              </Box>
            </Alert>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={confirmProfileUpdate} isLoading={updateProfileMutation.isLoading}>
              Yes, Update Profile
            </Button>
            <Button variant="ghost" onClick={onProfileUpdateClose}>
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </WithStaffLayout>
  );
};

export default Settings;
