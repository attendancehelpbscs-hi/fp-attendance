import type { FC } from 'react';
import { Box, Heading, Text, VStack, HStack, Button, Divider, Tag } from '@chakra-ui/react';
import type { StudentDetailedReport } from '../interfaces/api.interface';

interface StudentReportDetailProps {
  report: StudentDetailedReport;
  onExport: (format: 'csv' | 'pdf') => void;
}

const StudentReportDetail: FC<StudentReportDetailProps> = ({ report, onExport }) => {
  const { student, attendanceRecords, summaries } = report;

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'present':
        return <Tag colorScheme="green">Present</Tag>;
      case 'late':
        return <Tag colorScheme="orange">Late</Tag>;
      case 'absent':
        return <Tag colorScheme="red">Absent</Tag>;
      case 'departure':
        return <Tag colorScheme="blue">Departure</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  return (
    <Box>
      <VStack spacing={6} align="stretch">
        <Box>
          <Heading size="lg">{student.name}</Heading>
          <Text color="gray.500">Matric No: {student.matric_no}</Text>
          <Text color="gray.500">Grade: {student.grade}</Text>
        </Box>

        <Divider />

        <Box>
          <Heading size="md" mb={4}>Attendance Summary</Heading>
          <HStack spacing={8}>
            <VStack>
              <Text fontWeight="bold">Weekly</Text>
              <Text>{summaries.weekly.present_days} present</Text>
              <Text color="yellow.600">{summaries.weekly.late_days} late</Text>
              <Text color="red.500">{summaries.weekly.absent_days} absent</Text>
            </VStack>
            <VStack>
              <Text fontWeight="bold">Monthly</Text>
              <Text>{summaries.monthly.present_days} present</Text>
              <Text color="yellow.600">{summaries.monthly.late_days} late</Text>
              <Text color="red.500">{summaries.monthly.absent_days} absent</Text>
            </VStack>
            <VStack>
              <Text fontWeight="bold">Yearly</Text>
              <Text>{summaries.yearly.present_days} present</Text>
              <Text color="yellow.600">{summaries.yearly.late_days} late</Text>
              <Text color="red.500">{summaries.yearly.absent_days} absent</Text>
            </VStack>
          </HStack>
        </Box>

        <Divider />

        <Box>
          <HStack justify="space-between" mb={4}>
            <Heading size="md">Attendance Records</Heading>
            <HStack>
              <Button size="sm" onClick={() => onExport('csv')}>Export as CSV</Button>
              <Button size="sm" onClick={() => onExport('pdf')}>Export as PDF</Button>
            </HStack>
          </HStack>
          <VStack spacing={4} align="stretch">
            {attendanceRecords.map((record, index) => (
              <HStack key={index} p={4} borderWidth="1px" borderRadius="md" justifyContent="space-between">
                <Box>
                  <Text fontWeight="bold">{new Date(record.date).toLocaleDateString()}</Text>
                  <Text fontSize="sm" color="gray.500">{record.section}</Text>
                </Box>
                <Box>
                  {getStatusTag(record.status)}
                </Box>
                <Box>
                  <Text>Check-in: {record.checkin_time ? new Date(record.checkin_time).toLocaleTimeString() : '--'}</Text>
                  <Text>Check-out: {record.checkout_time ? new Date(record.checkout_time).toLocaleTimeString() : '--'}</Text>
                </Box>
              </HStack>
            ))}
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
};

export default StudentReportDetail;
