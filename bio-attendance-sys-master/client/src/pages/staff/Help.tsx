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
          <Heading size="md" marginBottom="1rem">Welcome to FP Attendance System Help Center</Heading>
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
                Log in using your staff credentials provided by the administrator
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Navigate through the menu to access different modules like Dashboard, Manage Students, Mark Attendance, Reports, and Settings
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Ensure the fingerprint scanner is properly connected and recognized by the system before starting attendance sessions
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Familiarize yourself with the dashboard overview showing key statistics and recent activities
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
                Add new students by clicking the "+" button, entering their details including name, matriculation number or ID number, grade, and enrolled sections
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Enroll student fingerprints during the add/edit process for secure attendance tracking
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Use the search bar to find students by name, ID, or grade; filter by grade; and sort by various criteria (name, ID, grade, section)
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                View individual student attendance history by clicking the eye icon, edit student details with the pencil icon, or delete students with the trash icon
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Navigate through paginated results to manage large student databases efficiently
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
                Navigate to the "Mark Attendance" section and select the appropriate section and date for the session
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Students place their finger on the scanner; the system automatically identifies and marks attendance with timestamp
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                The system supports continuous scanning for multiple students in sequence, with real-time status updates
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Use manual marking options if automatic scanning fails or for special circumstances
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Monitor attendance progress in real-time with visual indicators for attendance status
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
                Access the Reports section to view comprehensive attendance analytics, including attendance trends, and detailed breakdowns
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Use advanced filters to narrow down reports by grade, section, and custom date ranges
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Export reports in various formats (PDF, Excel) for administrative purposes, parent communications, or further analysis
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                View individual student report details with attendance history and timestamps
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Monitor class-wise and grade-wise attendance patterns to identify trends and areas needing attention
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
                Ensure the fingerprint scanner is properly connected via USB and recognized by the system; check device manager for driver issues
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Verify student fingerprint enrollment is complete and accurate; re-enroll if identification consistently fails
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Clear browser cache and cookies, or try using an incognito/private browsing window if experiencing loading or display issues
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Check network connectivity for real-time features; ensure stable internet connection for optimal performance
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Restart the application or refresh the page if encountering unexpected errors; contact support if issues persist
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
