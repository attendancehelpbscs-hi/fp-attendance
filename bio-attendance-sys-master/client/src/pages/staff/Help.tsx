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
            Welcome to the Fingerprint Attendance System! This comprehensive guide will walk you through all the features and functionalities available to staff members. Whether you're new to the system or need a refresher, you'll find detailed instructions on managing students, marking attendance, generating reports, and troubleshooting common issues. Our system uses advanced fingerprint technology for secure and efficient attendance tracking. If you encounter any difficulties or have questions not covered here, please use the contact form below to reach our support team or visit our <Link href="https://tally.so/r/nPMrPB" isExternal color="blue.500" textDecoration="underline">support link</Link> for additional assistance.
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
                Use the navigation menu to access: Dashboard (home), Manage Students, Manage Courses, Mark Attendance, Reports, Profile, and Help
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
                Add new students using the "+" button - enter name, matriculation/ID number, grade, and assign courses/sections
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
              Marking Attendance
            </Box>
            <AccordionIcon />
          </AccordionButton>
          <AccordionPanel pb={4}>
            <List spacing={3}>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Navigate to "Manage Attendance" from the menu and click "Open Attendance Kiosk" to launch the full-screen attendance interface
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                The kiosk displays real-time clock, date, and scanner connection status at the top
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Enable "Continuous Mode" for automatic marking after successful fingerprint identification
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Select "Check In" or "Check Out" time type before scanning fingerprints
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Students place their finger on the scanner - the system automatically identifies them and shows their details
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Click "Mark student" to record attendance, or enable continuous mode for automatic marking
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Monitor the "Daily Attendance Log" table for real-time updates of check-in/out times
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                View "Recent Scans" for immediate feedback on successful/failed identifications
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Use the "Exit Kiosk" button to return to the main attendance management page
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
