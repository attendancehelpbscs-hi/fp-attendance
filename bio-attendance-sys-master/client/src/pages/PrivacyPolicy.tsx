import type { FC } from 'react';
import { Box, Heading, Text, VStack, Divider, List, ListItem, ListIcon, Button } from '@chakra-ui/react';
import { FaShieldAlt, FaUserLock, FaDatabase, FaCookieBite, FaGavel } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const PrivacyPolicy: FC = () => {
  return (
    <Box maxW="800px" mx="auto" p={6} bg="white" borderRadius="lg" boxShadow="md">
      <VStack spacing={6} align="stretch">
        <Heading as="h1" size="xl" textAlign="center" color="gray.800">
          Data Privacy Policy
        </Heading>

        <Text fontSize="sm" color="gray.600" textAlign="center">
          Last updated: {new Date().toLocaleDateString()}
        </Text>

        <Divider />

        <Box>
          <Heading as="h2" size="lg" mb={4} display="flex" alignItems="center">
            <FaShieldAlt style={{ marginRight: '8px' }} />
            Introduction
          </Heading>
          <Text>
            Welcome to The Trackers' Attendance System ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our biometric attendance tracking system.
          </Text>
        </Box>

        <Divider />

        <Box>
          <Heading as="h2" size="lg" mb={4} display="flex" alignItems="center">
            <FaUserLock style={{ marginRight: '8px' }} />
            Information We Collect
          </Heading>
          <List spacing={3}>
            <ListItem display="flex" alignItems="flex-start">
              <ListIcon as={FaDatabase} color="blue.500" mt={1} />
              <Box>
                <Text fontWeight="bold">Biometric Data:</Text>
                <Text>Fingerprint scans and templates used for attendance verification.</Text>
              </Box>
            </ListItem>
            <ListItem display="flex" alignItems="flex-start">
              <ListIcon as={FaUserLock} color="blue.500" mt={1} />
              <Box>
                <Text fontWeight="bold">Personal Information:</Text>
                <Text>Student names, IDs, matriculation numbers, contact details, and academic information.</Text>
              </Box>
            </ListItem>
            <ListItem display="flex" alignItems="flex-start">
              <ListIcon as={FaDatabase} color="blue.500" mt={1} />
              <Box>
                <Text fontWeight="bold">Attendance Records:</Text>
                <Text>Timestamps, attendance status, and location data for attendance tracking.</Text>
              </Box>
            </ListItem>
            <ListItem display="flex" alignItems="flex-start">
              <ListIcon as={FaCookieBite} color="blue.500" mt={1} />
              <Box>
                <Text fontWeight="bold">Technical Data:</Text>
                <Text>IP addresses, browser information, and system logs for security and troubleshooting.</Text>
              </Box>
            </ListItem>
          </List>
        </Box>

        <Divider />

        <Box>
          <Heading as="h2" size="lg" mb={4} display="flex" alignItems="center">
            <FaDatabase style={{ marginRight: '8px' }} />
            How We Use Your Information
          </Heading>
          <List spacing={3}>
            <ListItem>• To verify and record student attendance using biometric authentication</ListItem>
            <ListItem>• To generate attendance reports and analytics for educational institutions</ListItem>
            <ListItem>• To maintain system security and prevent unauthorized access</ListItem>
            <ListItem>• To comply with legal and regulatory requirements</ListItem>
            <ListItem>• To improve system performance and user experience</ListItem>
          </List>
        </Box>

        <Divider />

        <Box>
          <Heading as="h2" size="lg" mb={4} display="flex" alignItems="center">
            <FaShieldAlt style={{ marginRight: '8px' }} />
            Data Security Measures
          </Heading>
          <Text mb={3}>
            We implement comprehensive security measures to protect your data:
          </Text>
          <List spacing={2}>
            <ListItem>• Biometric data is encrypted and stored securely with access controls</ListItem>
            <ListItem>• Regular security audits and vulnerability assessments</ListItem>
            <ListItem>• Secure transmission protocols (HTTPS/TLS)</ListItem>
            <ListItem>• Access logging and monitoring for suspicious activities</ListItem>
            <ListItem>• Data backup and disaster recovery procedures</ListItem>
          </List>
        </Box>

        <Divider />

        <Box>
          <Heading as="h2" size="lg" mb={4} display="flex" alignItems="center">
            <FaGavel style={{ marginRight: '8px' }} />
            Your Rights and Choices
          </Heading>
          <Text mb={3}>
            You have the following rights regarding your personal data:
          </Text>
          <List spacing={2}>
            <ListItem>• <strong>Access:</strong> Request a copy of your personal data</ListItem>
            <ListItem>• <strong>Correction:</strong> Request correction of inaccurate data</ListItem>
            <ListItem>• <strong>Deletion:</strong> Request deletion of your data (subject to legal requirements)</ListItem>
            <ListItem>• <strong>Portability:</strong> Request transfer of your data to another system</ListItem>
            <ListItem>• <strong>Objection:</strong> Object to processing of your data for certain purposes</ListItem>
          </List>
        </Box>

        <Divider />

        <Box>
          <Heading as="h2" size="lg" mb={4}>
            Data Retention
          </Heading>
          <Text>
            We retain your data only as long as necessary for the purposes outlined in this policy or as required by law. Biometric data and attendance records are typically retained for the duration of your enrollment plus a reasonable period for legal and administrative purposes.
          </Text>
        </Box>

        <Divider />

        <Box>
          <Heading as="h2" size="lg" mb={4}>
            Third-Party Sharing
          </Heading>
          <Text>
            We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy or required by law. Data may be shared with educational institutions for attendance reporting purposes.
          </Text>
        </Box>

        <Divider />

        <Box>
          <Heading as="h2" size="lg" mb={4}>
            Cookies and Tracking
          </Heading>
          <Text>
            Our system may use cookies and similar technologies to enhance functionality and security. These help maintain session security and improve user experience.
          </Text>
        </Box>

        <Divider />

        <Box>
          <Heading as="h2" size="lg" mb={4}>
            Changes to This Policy
          </Heading>
          <Text>
            We may update this Privacy Policy from time to time. We will notify users of any material changes through the system or via email. Continued use of the system after changes constitutes acceptance of the updated policy.
          </Text>
        </Box>

        <Divider />

        <Box>
          <Heading as="h2" size="lg" mb={4}>
            Contact Us
          </Heading>
          <Text>
            If you have any questions about this Privacy Policy or our data practices, please contact the system administrator or data protection officer at your educational institution.
          </Text>
        </Box>

        <Text fontSize="sm" color="gray.500" textAlign="center" mt={6}>
          This privacy policy is designed to comply with relevant data protection regulations including GDPR, PDPA, and other applicable privacy laws.
        </Text>

        <Box textAlign="center" mt={6}>
          <Button as={Link} to="/" colorScheme="blue" size="lg">
            Back to Home
          </Button>
        </Box>
      </VStack>
    </Box>
  );
};

export default PrivacyPolicy;
