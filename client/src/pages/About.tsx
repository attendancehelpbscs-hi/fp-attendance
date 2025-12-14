import type { FC } from 'react';
import { Box, Heading, Text, VStack, Divider, List, ListItem, ListIcon, Grid, GridItem, Card, CardBody, Icon, Button, Image } from '@chakra-ui/react';
import { FaFingerprint, FaUsers, FaChartBar, FaShieldAlt, FaCode, FaDatabase, FaReact, FaNodeJs, FaPython } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const About: FC = () => {
  return (
    <Box maxW="900px" mx="auto" p={6} bg="white" borderRadius="lg" boxShadow="md">
      <VStack spacing={8} align="stretch">
        <Box textAlign="center">
          <Heading as="h1" size="2xl" color="gray.800" mb={4}>
            About The Trackers Attendance System
          </Heading>
          <Text fontSize="lg" color="gray.600">
            A comprehensive biometric attendance management solution for educational institutions
          </Text>
        </Box>

        <Divider />

        <Box>
          <Heading as="h2" size="lg" mb={6} display="flex" alignItems="center" justifyContent="center">
            <Icon as={FaFingerprint as any} mr={3} />
            System Overview
          </Heading>
          <Text fontSize="md" textAlign="center" mb={6}>
            The Trackers Attendance System is designed to streamline attendance tracking using advanced biometric technology.
            Our system provides secure, efficient, and accurate attendance management for students and staff in educational environments.
          </Text>
        </Box>

        <Divider />

        <Box>
          <Heading as="h2" size="lg" mb={6} textAlign="center">
            Project Goal
          </Heading>
          <Text fontSize="md" textAlign="center" mb={6}>
            The main objective of this project was to successfully design and deploy a scalable, user-friendly biometric attendance system
            that streamlines attendance tracking and management for educational institutions. Our solution leverages cutting-edge technology
            to provide accurate, secure, and efficient attendance monitoring while generating comprehensive reports for administrative analysis.
          </Text>
        </Box>

        <Divider />

        <Box>
          <Image
            src="/The Trackers LOGO.png"
            alt="The Trackers Logo"
            height="180px"
            mb={6}
            mx="auto"
          />
          <Heading as="h2" size="lg" mb={6} textAlign="center">
            Team Information
          </Heading>
          <VStack spacing={3} textAlign="center">
            <Text fontSize="md">
              <strong>Developed by:</strong> The Trackers Team (BSIS–4B)
            </Text>
            <Text fontSize="md">
              <strong>Supervised by:</strong> Our Capstone Adviser
            </Text>
          </VStack>
        </Box>

        <Divider />

        <Box>
          <Heading as="h2" size="lg" mb={6} textAlign="center">
            Contact Information
          </Heading>
          <VStack spacing={3} textAlign="center">
            <Text fontSize="md">
              <strong>Email:</strong> attendance.help.bscs@gmail.com
            </Text>
            <Text fontSize="md">
              <strong>Source Code:</strong> <a href="https://github.com/attendancehelpbscs-hi/fp-attendance" target="_blank" rel="noopener noreferrer">GitHub Repository</a>
            </Text>
          </VStack>
        </Box>

        <Divider />

        <Box>
          <Heading as="h2" size="lg" mb={6} display="flex" alignItems="center" justifyContent="center">
            <Icon as={FaFingerprint as any} mr={3} />
            System Features
          </Heading>


          <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={6}>
            <Card>
              <CardBody>
                <VStack spacing={4}>
                  <Icon as={FaUsers as any} size="3rem" color="blue.500" />
                  <Heading size="md">Student Management</Heading>
                  <Text textAlign="center" color="gray.600">
                    Comprehensive student profile management with biometric enrollment and detailed attendance records.
                  </Text>
                </VStack>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <VStack spacing={4}>
                  <Icon as={FaChartBar as any} size="3rem" color="green.500" />
                  <Heading size="md">Analytics & Reports</Heading>
                  <Text textAlign="center" color="gray.600">
                    Generate detailed attendance reports, trends, and analytics for informed decision-making.
                  </Text>
                </VStack>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <VStack spacing={4}>
                  <Icon as={FaShieldAlt as any} size="3rem" color="red.500" />
                  <Heading size="md">Security First</Heading>
                  <Text textAlign="center" color="gray.600">
                    Advanced biometric authentication with encrypted data storage and audit logging.
                  </Text>
                </VStack>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <VStack spacing={4}>
                  <Icon as={FaCode as any} size="3rem" color="purple.500" />
                  <Heading size="md">Modern Technology</Heading>
                  <Text textAlign="center" color="gray.600">
                    Built with cutting-edge web technologies for reliable performance and scalability.
                  </Text>
                </VStack>
              </CardBody>
            </Card>
          </Grid>
        </Box>

        <Divider />

        <Box>
          <Heading as="h2" size="lg" mb={6} textAlign="center">
            Key Features
          </Heading>
          <List spacing={4}>
            <ListItem display="flex" alignItems="flex-start">
              <ListIcon as={FaFingerprint as any} color="blue.500" mt={1} />
              <Box>
                <Text fontWeight="bold">Biometric Authentication:</Text>
                <Text>Fingerprint-based attendance marking with high accuracy and security.</Text>
              </Box>
            </ListItem>
            <ListItem display="flex" alignItems="flex-start">
              <ListIcon as={FaUsers as any} color="blue.500" mt={1} />
              <Box>
                <Text fontWeight="bold">Real-time Monitoring:</Text>
                <Text>Live attendance tracking with instant notifications and status updates.</Text>
              </Box>
            </ListItem>
            <ListItem display="flex" alignItems="flex-start">
              <ListIcon as={FaChartBar as any} color="blue.500" mt={1} />
              <Box>
                <Text fontWeight="bold">Comprehensive Reporting:</Text>
                <Text>Detailed attendance reports, trends, and analytics for various time periods.</Text>
              </Box>
            </ListItem>
            <ListItem display="flex" alignItems="flex-start">
              <ListIcon as={FaShieldAlt as any} color="blue.500" mt={1} />
              <Box>
                <Text fontWeight="bold">Data Privacy:</Text>
                <Text>GDPR and PDPA compliant with encrypted biometric data and access controls.</Text>
              </Box>
            </ListItem>
            <ListItem display="flex" alignItems="flex-start">
              <ListIcon as={FaDatabase as any} color="blue.500" mt={1} />
              <Box>
                <Text fontWeight="bold">Multi-platform Support:</Text>
                <Text>Web-based interface with responsive design for desktop and mobile devices.</Text>
              </Box>
            </ListItem>
          </List>
        </Box>

        <Divider />

        <Box>
          <Heading as="h2" size="lg" mb={6} textAlign="center">
            Technology Stack
          </Heading>
          <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={4}>
            <Card bg="blue.50">
              <CardBody textAlign="center">
                <Icon as={FaReact as any} size="2rem" color="blue.500" mb={2} />
                <Text fontWeight="bold">Frontend</Text>
                <Text fontSize="sm" color="gray.600">React, TypeScript, Chakra UI</Text>
              </CardBody>
            </Card>

            <Card bg="green.50">
              <CardBody textAlign="center">
                <Icon as={FaNodeJs as any} size="2rem" color="green.500" mb={2} />
                <Text fontWeight="bold">Backend</Text>
                <Text fontSize="sm" color="gray.600">Node.js, Express, Prisma</Text>
              </CardBody>
            </Card>

            <Card bg="yellow.50">
              <CardBody textAlign="center">
                <Icon as={FaPython as any} size="2rem" color="yellow.500" mb={2} />
                <Text fontWeight="bold">Biometric Engine</Text>
                <Text fontSize="sm" color="gray.600">Python, DigitalPersona SDK</Text>
              </CardBody>
            </Card>
          </Grid>
        </Box>

        <Divider />

        <Box textAlign="center">
          <Heading as="h2" size="lg" mb={4}>
            Version Information
          </Heading>
          <Text fontSize="sm" color="gray.600">
            Version 1.0.0 | Last updated: {new Date().toLocaleDateString()}
          </Text>
          <Text fontSize="sm" color="gray.500" mt={2}>
            © {new Date().getFullYear()} The Trackers. All rights reserved.
          </Text>
        </Box>

        <Box textAlign="center" mt={6}>
          <Button as={Link} to="/" colorScheme="blue" size="lg">
            Back to Home
          </Button>
        </Box>
      </VStack>
    </Box>
  );
};

export default About;
