import type { FC } from 'react';
import { useEffect } from 'react';
import WithStaffLayout from '../../layouts/WithStaffLayout';
import { Card, Heading, Box, Text, Accordion, AccordionItem, AccordionButton, AccordionPanel, AccordionIcon, List, ListItem, ListIcon, Link } from '@chakra-ui/react';
import { CheckCircleIcon, InfoIcon } from '@chakra-ui/icons';

const Help: FC = () => {
  useEffect(() => {
    if (!document.querySelector('script[src="https://tally.so/widgets/embed.js"]')) {
      const script = document.createElement('script');
      script.src = 'https://tally.so/widgets/embed.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  return (
    <WithStaffLayout>
      <Heading fontSize={25} fontWeight={600} marginBottom="2rem">
        Help & Support
      </Heading>

      <Card marginBottom="2rem">
        <Box padding="1rem">
          <Heading size="md" marginBottom="1rem">Welcome to the Help Center</Heading>
          <Text>
            Welcome to the Fingerprint Attendance System! This comprehensive guide will walk you through all the features and functionalities available to staff members. Whether you're new to the system or need a refresher, you'll find detailed instructions on managing teachers, students, and courses, biometric enrollment, attendance marking, reports, settings, audit logging, and troubleshooting. Our system uses advanced fingerprint technology for secure and efficient attendance tracking, with role-based access control for administrators, teachers, and staff. If you encounter any difficulties or have questions not covered here, please use the contact form below to reach our support team or visit our <Link href="https://tally.so/r/nPMrPB" isExternal color="blue.500" textDecoration="underline">support link</Link> for additional assistance.
          </Text>
        </Box>
      </Card>

      <Accordion allowToggle marginBottom="2rem">
        <AccordionItem>
          <AccordionButton>
            <Box flex="1" textAlign="left">
              <InfoIcon marginRight="0.5rem" />
              Getting Started
            </Box>
            <AccordionIcon />
          </AccordionButton>
          <AccordionPanel pb={4}>
            <List spacing={3}>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Access the system at the main URL and log in using your staff credentials (username/email and password or fingerprint)
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                After login, you'll see the dashboard with key attendance statistics, daily trends, and system status
              </ListItem>
              <ListItem>
                 <ListIcon as={CheckCircleIcon} color="green.500" />
                 Use the navigation menu to access: Dashboard (home), Manage Teachers, Manage Students, Manage Courses, Mark Attendance, Fingerprint Enrollment, Reports, Settings, Profile, and Help
               </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Ensure your fingerprint scanner is connected and the system status shows "Online" for full functionality
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Check the floating system status widget for scanner connectivity and recent activities
              </ListItem>
            </List>
          </AccordionPanel>
        </AccordionItem>

        <AccordionItem>
          <AccordionButton>
            <Box flex="1" textAlign="left">
              <InfoIcon marginRight="0.5rem" />
              Managing Students
            </Box>
            <AccordionIcon />
          </AccordionButton>
          <AccordionPanel pb={4}>
            <List spacing={3}>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Go to "Manage Students" from the menu to view the student list with search, filter, and pagination controls
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Add new students using the "+" button - enter name, ID number, grade, and assign courses/sections
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Edit student details by clicking the edit icon, including updating enrolled courses and personal information
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                View detailed attendance history for individual students using the view icon
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Use search and filter options to find students by name, matric/ID number, grade, or course
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Delete students if needed, but note that this will remove all associated attendance records
              </ListItem>
            </List>
          </AccordionPanel>
        </AccordionItem>

        <AccordionItem>
          <AccordionButton>
            <Box flex="1" textAlign="left">
              <InfoIcon marginRight="0.5rem" />
              Managing Teachers
            </Box>
            <AccordionIcon />
          </AccordionButton>
          <AccordionPanel pb={4}>
            <List spacing={3}>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Navigate to "Manage Teachers" from the menu to view all teacher accounts with search, filter, and pagination controls
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Add new teachers using the "Add New Teacher" button - enter name, email, teacher ID, role (admin/teacher), grade, and section assignments
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Edit teacher details by clicking the edit icon, including updating personal information, role assignments, and course associations
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                View detailed teacher information using the view icon, including profile details and creation date
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                For admins: View enrolled students for each teacher using the list icon to see which students are assigned to their courses
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Use search functionality to find teachers by name, email, role, teacher ID, section, or grade
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Filter teachers by role (admin or teacher) using the dropdown filter
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Sort teachers by name (A-Z/Z-A), email, or role using the sort dropdown
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Select multiple teachers using checkboxes for bulk deletion operations
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Delete individual teachers or perform bulk deletions (admin access required)
              </ListItem>
            </List>
          </AccordionPanel>
        </AccordionItem>

        <AccordionItem>
           <AccordionButton>
             <Box flex="1" textAlign="left">
               <InfoIcon marginRight="0.5rem" />
               Marking Attendance
             </Box>
             <AccordionIcon />
           </AccordionButton>
           <AccordionPanel pb={4}>
             <List spacing={3}>
               <ListItem>
                 <ListIcon as={CheckCircleIcon} color="green.500" />
                 Navigate to "Manage Attendance" from the menu to launch the attendance interface
               </ListItem>
               <ListItem>
                 <ListIcon as={CheckCircleIcon} color="green.500" />
                 The kiosk provides a streamlined interface for biometric attendance marking with real-time clock and scanner status
               </ListItem>
               <ListItem>
                 <ListIcon as={CheckCircleIcon} color="green.500" />
                 Students place their enrolled finger on the DigitalPersona scanner for automatic identification
               </ListItem>
               <ListItem>
                 <ListIcon as={CheckCircleIcon} color="green.500" />
                 The system automatically records check-in/check-out times with AM/PM session tracking
               </ListItem>
               <ListItem>
                 <ListIcon as={CheckCircleIcon} color="green.500" />
                 Monitor real-time attendance logs and scanner activity within the kiosk interface
               </ListItem>
               <ListItem>
                 <ListIcon as={CheckCircleIcon} color="green.500" />
                 Use continuous mode for efficient batch processing of multiple students
               </ListItem>
               <ListItem>
                 <ListIcon as={CheckCircleIcon} color="green.500" />
                 View immediate feedback on successful identifications and attendance recordings
               </ListItem>
               <ListItem>
                 <ListIcon as={CheckCircleIcon} color="green.500" />
                 The kiosk mode ensures secure, tamper-proof attendance recording with biometric verification
               </ListItem>
             </List>
           </AccordionPanel>
         </AccordionItem>

        <AccordionItem>
          <AccordionButton>
            <Box flex="1" textAlign="left">
              <InfoIcon marginRight="0.5rem" />
              Fingerprint Enrollment
            </Box>
            <AccordionIcon />
          </AccordionButton>
          <AccordionPanel pb={4}>
            <List spacing={3}>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Navigate to "Fingerprint Enrollment" from the menu to access the biometric registration interface
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Ensure the DigitalPersona U.are.U 4500 scanner is properly connected and the system status shows "Online"
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Select a student from the enrollment list or search for specific students by name or ID
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Click "Enroll Fingerprint" to initiate the biometric registration process
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Guide the student to place their finger on the scanner - the system will capture multiple fingerprint samples
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Monitor the enrollment progress and quality indicators to ensure proper fingerprint capture
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                The system supports multi-finger enrollment for improved recognition accuracy
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Fingerprints are encrypted and securely stored with SHA-256 hash verification
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Re-enrollment may be required if fingerprint quality is poor or recognition fails during attendance marking
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Enrollment status is displayed in the student management interface for easy tracking
              </ListItem>
            </List>
          </AccordionPanel>
        </AccordionItem>

        <AccordionItem>
          <AccordionButton>
            <Box flex="1" textAlign="left">
              <InfoIcon marginRight="0.5rem" />
              Reports & Analytics
            </Box>
            <AccordionIcon />
          </AccordionButton>
          <AccordionPanel pb={4}>
            <List spacing={3}>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Navigate to "Reports" from the menu to access various attendance analytics and data views
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                View attendance trends with charts showing daily present vs. absent counts over time periods
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Filter reports by grade, section, date ranges (7 days, 14 days, 30 days, etc.), or custom start/end dates
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Access student-specific reports showing detailed attendance history with check-in/out times
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                View grade-wise and section-wise attendance statistics and summaries
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Use check-in time analysis to monitor student arrival patterns and punctuality
              </ListItem>
            </List>
          </AccordionPanel>
        </AccordionItem>

        <AccordionItem>
          <AccordionButton>
            <Box flex="1" textAlign="left">
              <InfoIcon marginRight="0.5rem" />
              Settings and Profile Management
            </Box>
            <AccordionIcon />
          </AccordionButton>
          <AccordionPanel pb={4}>
            <List spacing={3}>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Navigate to "Settings" from the menu to configure system-wide attendance policies and preferences
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Set grace periods for late arrivals to automatically adjust attendance status based on configurable time thresholds
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Configure school start times and attendance time windows for AM/PM sessions
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Adjust late arrival thresholds to define when students are marked as late versus on-time
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Access "Profile" section to update your personal information, contact details, and account settings
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Upload and update profile pictures for staff accounts
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Change password securely through the profile management interface
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Configure notification preferences for system alerts and attendance updates
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Settings changes apply system-wide and affect all attendance calculations and reporting
              </ListItem>
            </List>
          </AccordionPanel>
        </AccordionItem>

        <AccordionItem>
          <AccordionButton>
            <Box flex="1" textAlign="left">
              <InfoIcon marginRight="0.5rem" />
              Audit Logging and System Monitoring
            </Box>
            <AccordionIcon />
          </AccordionButton>
          <AccordionPanel pb={4}>
            <List spacing={3}>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Access audit logs through the Reports section to review complete system activity history
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Filter audit logs by date ranges, user actions, and specific staff members for detailed tracking
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Monitor all system activities including logins, attendance marking, student/course management, and configuration changes
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                View real-time system health status through the floating status widget showing scanner connectivity and server status
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Monitor database connectivity and Python server status for biometric processing
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Track recent scan activities and system diagnostics for troubleshooting purposes
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Audit logs provide compliance documentation for all attendance and administrative activities
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Use system monitoring to ensure continuous operation and identify potential issues before they affect attendance tracking
              </ListItem>
            </List>
          </AccordionPanel>
        </AccordionItem>

        <AccordionItem>
          <AccordionButton>
            <Box flex="1" textAlign="left">
              <InfoIcon marginRight="0.5rem" />
              Troubleshooting
            </Box>
            <AccordionIcon />
          </AccordionButton>
          <AccordionPanel pb={4}>
            <List spacing={3}>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Check the system status widget - ensure scanner shows "Online" and Python server is running
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                If scanner is not detected, restart the Python server and refresh the browser page
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                For fingerprint recognition issues, ensure student fingerprints are properly enrolled and try re-enrollment
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Clear browser cache and cookies if experiencing loading or display problems
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Verify network connectivity for real-time features and ensure stable internet connection
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                If issues persist, check server logs and contact support with error details
              </ListItem>
            </List>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>

      <Box position="relative" height="600px" margin="0" overflow="hidden">
        <iframe
          data-tally-src="https://tally.so/r/nPMrPB?transparentBackground=1"
          width="100%"
          height="100%"
          frameBorder="0"
          title="Contact Form Support"
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, border: 0 }}
        ></iframe>
      </Box>
    </WithStaffLayout>
  );
};

export default Help;
