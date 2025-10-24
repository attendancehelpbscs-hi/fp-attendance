import type { FC } from 'react';
import WithStaffLayout from '../../layouts/WithStaffLayout';
import { Card, Heading, Box, Text, Accordion, AccordionItem, AccordionButton, AccordionPanel, AccordionIcon, List, ListItem, ListIcon, Link } from '@chakra-ui/react';
import { CheckCircleIcon, InfoIcon } from '@chakra-ui/icons';

const Help: FC = () => {
  return (
    <WithStaffLayout>
      <Heading fontSize={25} fontWeight={600} marginBottom="2rem">
        Help & Support
      </Heading>

      <Card marginBottom="2rem">
        <Box padding="1rem">
          <Heading size="md" marginBottom="1rem">Welcome to FP Attendance System Help Center</Heading>
          <Text>
            This guide will help you understand how to use the FP Attendance System effectively.
            If you need further assistance, please contact our support team.
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
                Log in using your staff credentials
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Navigate through the menu to access different modules
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Ensure the fingerprint scanner is connected before marking attendance
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
                Add new students with their personal information and course enrollment
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Enroll student fingerprints for attendance tracking
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Use filters to search and sort students by grade, section, or name
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
                Create attendance sessions for specific courses and dates
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Students scan their fingerprints to mark attendance automatically
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                The system supports continuous scanning for multiple students
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
                View attendance statistics and trends
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Filter reports by grade, section, and date range
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Export reports for further analysis
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
                Ensure fingerprint scanner is properly connected
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Check student fingerprint enrollment if identification fails
              </ListItem>
              <ListItem>
                <ListIcon as={CheckCircleIcon} color="green.500" />
                Clear browser cache if experiencing technical issues
              </ListItem>
            </List>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>

      <Card>
        <Box padding="1rem">
          <Heading size="md" marginBottom="1rem">Contact Support</Heading>
          <Text marginBottom="1rem">
            For technical issues or additional support, please contact our help desk.
            Do not send emails directly; instead, copy the following email address and use it in your preferred email client:
          </Text>
          <Text fontWeight="bold" fontSize="lg" color="blue.500">
            attendance.help.bscs@gmail.com
          </Text>
          <Text marginTop="1rem">
            Please include detailed information about your issue when contacting support.
          </Text>
        </Box>
      </Card>
    </WithStaffLayout>
  );
};

export default Help;
