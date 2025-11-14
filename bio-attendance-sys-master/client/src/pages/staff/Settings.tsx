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
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import useStore from '../../store/store';
import { toast } from 'react-hot-toast';
import { getAuditLogs } from '../../api/audit.api';
import { useBackupData, useClearAuditLogs, useUpdateStaffProfile } from '../../api/staff.api';
import noDp from '../../assets/no-dp.png';
import { fingerprintControl } from '../../lib/fingerprint';
import { Base64 } from '@digitalpersona/core';


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
  const updateProfileMutation = useUpdateStaffProfile()();



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

  const handlePrintPDF = () => {
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(18);
    doc.text('Access & Audit Logs Report', 14, 20);

    // Add generation date
    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

    // Prepare table data
    const tableColumn = ['Action', 'User', 'Timestamp', 'Details'];
    const tableRows = auditLogs.map(log => [
      log.action,
      log.staff?.name || 'Unknown',
      new Date(log.created_at).toLocaleString(),
      log.details || 'N/A'
    ]);

    // Add table
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
    });

    // Add footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Page ${i} of ${pageCount}`, 14, doc.internal.pageSize.height - 10);
    }

    // Save the PDF
    doc.save(`audit-logs-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('PDF generated successfully');
  };

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [profileName, setProfileName] = useState(''); // Keep for backward compatibility
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [fingerprintData, setFingerprintData] = useState<string>('');
  const [profilePictureBase64, setProfilePictureBase64] = useState<string>('');
  const [deviceConnected, setDeviceConnected] = useState<boolean>(false);
  const [profilePicture, setProfilePicture] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Sync firstName, lastName, and profilePicture with staffInfo, but allow profileName to be edited independently
  useEffect(() => {
    setFirstName(staffInfo?.firstName || '');
    setLastName(staffInfo?.lastName || '');
    // Create blob URL for display if profilePicture exists
    if (staffInfo?.profilePicture) {
      setProfilePicture(`data:image/jpeg;base64,${staffInfo.profilePicture}`);
    } else {
      setProfilePicture('');
    }
  }, [staffInfo]);

  // Handle device connection events (same as student enrollment)
  const handleDeviceConnected = () => {
    console.log('Fingerprint device connected');
    setDeviceConnected(true);
  };

  const handleDeviceDisconnected = () => {
    console.log('Fingerprint device disconnected');
    setDeviceConnected(false);
  };

  // Handle sample acquisition (same as student enrollment)
  const handleSampleAcquired = (event: any) => {
    console.log('Fingerprint sample acquired:', event?.samples);
    const rawImages = event?.samples.map((sample: string) => Base64.fromBase64Url(sample));
    setFingerprintData(rawImages[0]);
  };

  // Initialize fingerprint control on component mount
  useEffect(() => {
    fingerprintControl.onDeviceConnected = handleDeviceConnected;
    fingerprintControl.onDeviceDisconnected = handleDeviceDisconnected;
    fingerprintControl.onSamplesAcquired = handleSampleAcquired;
    fingerprintControl.init();

    // Cleanup on unmount
    return () => {
      fingerprintControl.destroy();
    };
  }, []);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Create blob URL for display to avoid 431 header size error
      const blobUrl = URL.createObjectURL(file);
      setProfilePicture(blobUrl);

      // Store base64 for API submission
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setProfilePictureBase64(base64.split(',')[1]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    // Validate passwords match
    if (newPassword && newPassword !== confirmNewPassword) {
      toast.error('Passwords do not match');
      return;
    }

    // Validate current password is provided when changing password
    if (newPassword && !currentPassword) {
      toast.error('Please provide your current password to change password');
      return;
    }

    // Validate at least one field is provided
    if (!firstName.trim() && !lastName.trim() && !newPassword && !fingerprintData && !profilePicture) {
      toast.error('Please provide at least first name, last name, password, fingerprint, or profile picture to update');
      return;
    }

    // Show confirmation modal
    onProfileUpdateOpen();
  };

  const confirmProfileUpdate = async () => {
    try {
      const updateData: any = {};
      if (firstName.trim()) updateData.firstName = firstName.trim();
      if (lastName.trim()) updateData.lastName = lastName.trim();
      if (profileName.trim()) updateData.name = profileName.trim(); // Allow updating the legacy name if provided
      if (newPassword) {
        updateData.currentPassword = currentPassword;
        updateData.newPassword = newPassword;
        updateData.confirmPassword = confirmNewPassword;
      }
      if (fingerprintData) updateData.fingerprint = fingerprintData;
      if (profilePictureBase64) {
        updateData.profilePicture = profilePictureBase64;
      }

      // Update the store immediately for instant UI feedback
      const optimisticUpdate = {
        firstName: firstName.trim() || staffInfo?.firstName || '',
        lastName: lastName.trim() || staffInfo?.lastName || '',
        name: profileName.trim() || staffInfo?.name || '', // Update with the new legacy name if provided
        profilePicture: profilePicture.startsWith('data:image') ? profilePicture : staffInfo?.profilePicture || '',
      };
      useStore.getState().updateStaffProfile(optimisticUpdate);

      const result = await updateProfileMutation.mutateAsync(updateData);

      // Update the store with the server response (in case there are differences)
      useStore.getState().updateStaffProfile(result.staff);

      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setFingerprintData('');
      setProfilePictureBase64('');
      setSelectedFile(null);
      // Reset profile picture to current staff info
      if (staffInfo?.profilePicture) {
        setProfilePicture(`data:image/jpeg;base64,${staffInfo.profilePicture}`);
      } else {
        setProfilePicture('');
      }

      onProfileUpdateClose();
      toast.success('Profile updated successfully');
    } catch (error: any) {
      // Revert the optimistic update on error
      useStore.getState().updateStaffProfile(staffInfo || {});
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
                    <FormLabel>First Name</FormLabel>
                    <Input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Enter your first name"
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Last Name</FormLabel>
                    <Input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Enter your last name"
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel>System Role</FormLabel>
                    <Input
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="Enter your Role (here)"
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Email address</FormLabel>
                    <Input type="email" disabled value={staffInfo?.email || ''} />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Profile Picture</FormLabel>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      display="none"
                      id="profile-picture-upload"
                    />
                    <VStack spacing={2}>
                      <Button
                        as="label"
                        htmlFor="profile-picture-upload"
                        cursor="pointer"
                        colorScheme="blue"
                        variant="outline"
                        size="sm"
                      >
                        Choose Profile Picture
                      </Button>
                      {profilePicture && (
                        <Image
                          src={profilePicture}
                          alt="Profile Preview"
                          boxSize="100px"
                          objectFit="cover"
                          borderRadius="full"
                          border="2px solid"
                          borderColor="blue.200"
                        />
                      )}
                      {selectedFile && (
                        <Text fontSize="sm" color="gray.600">
                          Selected: {selectedFile.name}
                        </Text>
                      )}
                    </VStack>
                  </FormControl>
                  <FormControl>
                    <FormLabel>Current Password</FormLabel>
                    <Input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                    />
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
                  <Divider my={4} />
                  <FormControl>
                    <FormLabel>Fingerprint Enrollment</FormLabel>
                    <Text fontSize="sm" color="gray.600" mb={2}>
                      Enroll your fingerprint for biometric login. Place your finger on the scanner.
                    </Text>
                    <Text fontSize="sm" color="gray.500" mb={2}>
                      {deviceConnected
                        ? "✅ System: Fingerprint scanner is connected"
                        : "❌ System: Fingerprint scanner not connected. Please refresh the page and try again."
                      }
                    </Text>
                    <Box shadow="xs" h={120} w={120} margin="1rem auto" border="1px solid rgba(0, 0, 0, 0.04)">
                      {fingerprintData && <img src={`data:image/png;base64,${fingerprintData}`} alt="Fingerprint" />}
                    </Box>
                    {fingerprintData && (
                      <Box mt={4}>
                        <Text fontSize="sm" color="green.600" mb={2}>
                          ✓ Fingerprint captured successfully! Ready to save.
                        </Text>
                      </Box>
                    )}
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
            <Card maxW={1200} margin="1rem auto">
              <Box padding="1rem">
                <Heading size="md" marginBottom="1rem">Access & Audit Logs</Heading>
                <TableContainer>
                  <Table variant="simple" size="sm">
                    <Thead>
                      <Tr>
                        <Th width="15%">Action</Th>
                        <Th width="20%">User</Th>
                        <Th width="25%">Timestamp</Th>
                        <Th width="40%">Details</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {auditLogs.map((log) => (
                        <Tr key={log.id}>
                          <Td fontSize="sm">{log.action}</Td>
                          <Td fontSize="sm">{log.staff?.name || 'Unknown'}</Td>
                          <Td fontSize="sm">{new Date(log.created_at).toLocaleString()}</Td>
                          <Td fontSize="sm" wordBreak="break-word">{log.details || 'N/A'}</Td>
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
                <HStack spacing={4} marginTop="1rem">
                  <Button leftIcon={<ViewIcon />} colorScheme="teal" onClick={onViewLogsOpen}>
                    View Full Logs
                  </Button>
                  <Button leftIcon={<DownloadIcon />} colorScheme="blue" onClick={handlePrintPDF}>
                    Print PDF
                  </Button>
                </HStack>
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
        <ModalContent maxW="90vw">
          <ModalHeader>Full Audit Logs</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <TableContainer>
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th width="15%">Action</Th>
                    <Th width="20%">User</Th>
                    <Th width="25%">Timestamp</Th>
                    <Th width="40%">Details</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {auditLogs.map((log) => (
                    <Tr key={log.id}>
                      <Td fontSize="sm">{log.action}</Td>
                      <Td fontSize="sm">{log.staff?.name || 'Unknown'}</Td>
                      <Td fontSize="sm">{new Date(log.created_at).toLocaleString()}</Td>
                      <Td fontSize="sm" wordBreak="break-word">{log.details || 'N/A'}</Td>
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
