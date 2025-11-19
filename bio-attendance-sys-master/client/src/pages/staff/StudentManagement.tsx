import { useState } from 'react';
import type { FC } from 'react';
import WithStaffLayout from '../../layouts/WithStaffLayout';
import {
  Heading,
  Flex,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Box,
} from '@chakra-ui/react';
import { Users, BookOpen } from 'lucide-react';
import ManageStudents from './ManageStudents';
import ManageCourses from './ManageCourses';

const StudentManagement: FC = () => {
  return (
    <WithStaffLayout>
      <Flex justifyContent="space-between" alignItems="center" marginTop="2rem" marginBottom="1rem">
        <Heading fontSize={25} fontWeight={600}>
          Student Management
        </Heading>
      </Flex>

      <Box marginTop="1rem">
        <Tabs variant="enclosed" colorScheme="blue">
          <TabList>
            <Tab sx={{ color: 'black' }}>
              <Users size={16} style={{ marginRight: '8px' }} />
              Students List
            </Tab>
            <Tab sx={{ color: 'black' }}>
              <BookOpen size={16} style={{ marginRight: '8px' }} />
              Section Management
            </Tab>
          </TabList>

          <TabPanels>
            <TabPanel padding="0">
              <ManageStudents />
            </TabPanel>
            <TabPanel padding="0">
              <ManageCourses />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </WithStaffLayout>
  );
};

export default StudentManagement;
