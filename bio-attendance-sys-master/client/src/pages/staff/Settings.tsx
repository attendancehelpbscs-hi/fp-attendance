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
  Flex,
} from '@chakra-ui/react';
import { DownloadIcon, DeleteIcon, ViewIcon } from '@chakra-ui/icons';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import useStore from '../../store/store';
import { toast } from 'react-hot-toast';
import { getAuditLogs } from '../../api/audit.api';
import { useBackupData, useClearAuditLogs, useUpdateStaffProfile, useUpdateStaffSettings } from '../../api/staff.api';
import noDp from '../../assets/no-dp.png';
import { fingerprintControl } from '../../lib/fingerprint';
import { Base64 } from '@digitalpersona/core';


const Settings: FC = () => {
  const staffInfo = useStore.use.staffInfo();
  const staffSettings = useStore.use.staffSettings();
  const setStaffSettings = useStore.use.setStaffSettings();
  const isAdmin = staffInfo?.role === 'ADMIN';

  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [lateCutoff, setLateCutoff] = useState('07:30');
  const [graceMinutes, setGraceMinutes] = useState(0);
  const [pmLateEnabled, setPmLateEnabled] = useState(false);
  const [pmLateCutoff, setPmLateCutoff] = useState('12:50');
  const { isOpen: isBackupOpen, onOpen: onBackupOpen, onClose: onBackupClose } = useDisclosure();
  const { isOpen: isClearLogsOpen, onOpen: onClearLogsOpen, onClose: onClearLogsClose } = useDisclosure();
  const { isOpen: isViewLogsOpen, onOpen: onViewLogsOpen, onClose: onViewLogsClose } = useDisclosure();
  const { isOpen: isProfileUpdateOpen, onOpen: onProfileUpdateOpen, onClose: onProfileUpdateClose } = useDisclosure();
  const { isOpen: isProfileUpdateSuccessOpen, onOpen: onProfileUpdateSuccessOpen, onClose: onProfileUpdateSuccessClose } = useDisclosure();

  const backupMutation = useBackupData();
  const clearLogsMutation = useClearAuditLogs();
  const updateProfileMutation = useUpdateStaffProfile()();
  const updateSettingsMutation = useUpdateStaffSettings();



  const handleBackup = async () => {
    if (!isAdmin) {
      toast.error('Only administrators can perform this action');
      return;
    }
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
    if (!isAdmin) {
      toast.error('Only administrators can perform this action');
      return;
    }
    try {
      await clearLogsMutation.mutateAsync({});
      toast.success('System logs cleared successfully');
      onClearLogsClose();
      setCurrentPage(1);
      await fetchAuditLogs(1);
    } catch (error) {
      toast.error('Failed to clear logs');
      console.error('Clear logs error:', error);
    }
  };

  const handleSaveAttendanceSettings = async () => {
    if (!isAdmin) {
      toast.error('Only administrators can perform this action');
      return;
    }
    const normalizedGrace = Number.isFinite(Number(graceMinutes)) ? Number(graceMinutes) : 0;
    if (!lateCutoff) {
      toast.error('Please select a late cutoff time');
      return;
    }
    if (pmLateEnabled && !pmLateCutoff) {
      toast.error('Please select a PM late cutoff time');
      return;
    }
    try {
      await updateSettingsMutation.mutateAsync({
        school_start_time: lateCutoff,
        grace_period_minutes: normalizedGrace,
        pm_late_cutoff_enabled: pmLateEnabled,
        pm_late_cutoff_time: pmLateEnabled ? pmLateCutoff : null,
      });
      setStaffSettings({
        grace_period_minutes: normalizedGrace,
        school_start_time: lateCutoff,
        late_threshold_hours: staffSettings?.late_threshold_hours ?? 1,
        pm_late_cutoff_enabled: pmLateEnabled,
        pm_late_cutoff_time: pmLateEnabled ? pmLateCutoff : null,
      });
      toast.success('Attendance settings updated successfully');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update attendance settings');
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
    if (staffInfo?.profilePicture) {
      setProfilePicture(`data:image/jpeg;base64,${staffInfo.profilePicture}`);
    } else {
      setProfilePicture('');
    }
  }, [staffInfo]);

  useEffect(() => {
    if (staffSettings) {
      setLateCutoff(staffSettings.school_start_time || '07:30');
      setGraceMinutes(staffSettings.grace_period_minutes ?? 0);
      setPmLateEnabled(staffSettings.pm_late_cutoff_enabled ?? false);
      setPmLateCutoff(staffSettings.pm_late_cutoff_time || '12:50');
    }
  }, [staffSettings]);

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

  // Set up fingerprint control callbacks (global init is handled in App.tsx)
  useEffect(() => {
    fingerprintControl.onDeviceConnectedCallback = handleDeviceConnected;
    fingerprintControl.onDeviceDisconnectedCallback = handleDeviceDisconnected;
    fingerprintControl.onSamplesAcquiredCallback = handleSampleAcquired;

    // Check initial connection status (same as AttendanceKiosk)
    const checkInitialConnection = () => {
      try {
        if (fingerprintControl.isDeviceConnected) {
          console.log('Settings: Device was already connected');
          setDeviceConnected(true);
        } else {
          console.log('Settings: Device not connected yet, waiting for connection event');
          setDeviceConnected(false);

          // Add a small delay to check again in case the global init is still running
          setTimeout(() => {
            if (fingerprintControl.isDeviceConnected) {
              console.log('Settings: Device connected after delay');
              setDeviceConnected(true);
            } else {
              console.log('Settings: Device still not connected after delay');
              setDeviceConnected(false);
            }
          }, 3000); // Wait 3 seconds for global init to complete
        }
      } catch (error) {
        console.warn('Settings: Error checking initial connection:', error);
        setDeviceConnected(false);
      }
    };

    checkInitialConnection();

    // Cleanup callbacks on unmount (but don't destroy the global instance)
    return () => {
      fingerprintControl.onDeviceConnectedCallback = undefined;
      fingerprintControl.onDeviceDisconnectedCallback = undefined;
      fingerprintControl.onSamplesAcquiredCallback = undefined;
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
        profilePicture: profilePictureBase64 || staffInfo?.profilePicture || '',
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
      onProfileUpdateSuccessOpen();
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
                      onChange={(e) => setFirstName(e.target.value.toUpperCase())}
                      placeholder="Enter your first name"
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Last Name</FormLabel>
                    <Input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value.toUpperCase())}
                      placeholder="Enter your last name"
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
                    <Flex gap={2} alignItems="center">
                      <Input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                      />
                      <Button
                        size="sm"
                        colorScheme="blue"
                        variant="outline"
                        onClick={() => {
                          // Confirm logout and navigation to forgot password
                          const confirmLogout = window.confirm(
                            'You will be logged out and redirected to the forgot password page. Continue?'
                          );
                          if (confirmLogout) {
                            useStore.getState().logoutStaff();
                            window.location.href = '/staff/forgot-password';
                          }
                        }}
                      >
                        Forgot Password?
                      </Button>
                    </Flex>
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
                  <Heading size="md" marginBottom="1rem">Attendance Settings</Heading>
                  <VStack spacing={4} align="stretch">
                    <FormControl>
                      <FormLabel>AM Late Cutoff</FormLabel>
                      <Input type="time" value={lateCutoff} onChange={(e) => setLateCutoff(e.target.value)} isDisabled={!isAdmin} />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Grace Period (minutes)</FormLabel>
                      <NumberInput min={0} value={graceMinutes} onChange={(_, valueNumber) => setGraceMinutes(Number.isNaN(valueNumber) ? 0 : valueNumber)} isDisabled={!isAdmin}>
                        <NumberInputField />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                    </FormControl>
                    <FormControl display="flex" alignItems="center">
                      <FormLabel htmlFor="pm-late-enabled" mb="0">
                        Enable PM Late Cutoff
                      </FormLabel>
                      <Switch
                        id="pm-late-enabled"
                        isChecked={pmLateEnabled}
                        onChange={(e) => setPmLateEnabled(e.target.checked)}
                        isDisabled={!isAdmin}
                      />
                    </FormControl>
                    {pmLateEnabled && (
                      <FormControl>
                        <FormLabel>PM Late Cutoff</FormLabel>
                        <Select
                          value={pmLateCutoff}
                          onChange={(e) => setPmLateCutoff(e.target.value)}
                          isDisabled={!isAdmin}
                        >
                          <option value="12:30">12:30 PM</option>
                          <option value="12:35">12:35 PM</option>
                          <option value="12:40">12:40 PM</option>
                          <option value="12:45">12:45 PM</option>
                          <option value="12:50">12:50 PM</option>
                          <option value="12:55">12:55 PM</option>
                          <option value="13:00">1:00 PM</option>
                          <option value="13:05">1:05 PM</option>
                          <option value="13:10">1:10 PM</option>
                          <option value="13:15">1:15 PM</option>
                          <option value="13:20">1:20 PM</option>
                          <option value="13:25">1:25 PM</option>
                          <option value="13:30">1:30 PM</option>
                          <option value="13:35">1:35 PM</option>
                          <option value="13:40">1:40 PM</option>
                          <option value="13:45">1:45 PM</option>
                          <option value="13:50">1:50 PM</option>
                          <option value="13:55">1:55 PM</option>
                          <option value="14:00">2:00 PM</option>
                        </Select>
                      </FormControl>
                    )}
                    <Button colorScheme="blue" onClick={handleSaveAttendanceSettings} isLoading={updateSettingsMutation.isLoading} isDisabled={!isAdmin}>
                      Save Attendance Settings
                    </Button>
                  </VStack>
                </Box>
              </Card>
              <Card maxW={500} margin="1rem auto">
                <Box padding="1rem">
                  <Heading size="md" marginBottom="1rem">Data Management</Heading>
                  <VStack spacing={4} align="stretch">
                    <Box>
                      <HStack spacing={4} marginBottom="0.5rem">
                        <Button leftIcon={<DownloadIcon />} colorScheme="blue" onClick={onBackupOpen} isLoading={backupMutation.isLoading} isDisabled={!isAdmin}>
                          Backup Data
                        </Button>
                        <Button leftIcon={<DeleteIcon />} colorScheme="red" onClick={onClearLogsOpen} isLoading={clearLogsMutation.isLoading} isDisabled={!isAdmin}>
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
            <Button colorScheme="blue" mr={3} onClick={handleBackup} isDisabled={!isAdmin}>
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
            <Button colorScheme="red" mr={3} onClick={handleClearLogs} isDisabled={!isAdmin}>
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

      {/* Profile Update Success Modal */}
      <Modal isOpen={isProfileUpdateSuccessOpen} onClose={onProfileUpdateSuccessClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader textAlign="center">Profile Updated Successfully</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Text textAlign="center" mb={4}>
              Your profile has been updated successfully! {newPassword && 'Please log in again with your new password.'}
            </Text>
            <Button colorScheme="blue" onClick={onProfileUpdateSuccessClose} w="100%">
              OK
            </Button>
          </ModalBody>
        </ModalContent>
      </Modal>
    </WithStaffLayout>
  );
};

export default Settings;
