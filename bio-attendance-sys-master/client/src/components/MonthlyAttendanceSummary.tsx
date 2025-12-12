import React, { useState, useMemo } from 'react';
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Heading,
  Select,
  VStack,
  HStack,
  Text,
  Badge,
  Card,
  Grid,
  GridItem,
  Button,
  Flex,
  Center,
  Spinner,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
} from '@chakra-ui/react';
import { DownloadIcon, ChevronDownIcon } from '@chakra-ui/icons';
import { useGetMonthlyAttendanceSummary, useGetGradesAndSections } from '../api/atttendance.api';
import useStore from '../store/store';
import { axiosClient } from '../lib/axios-client';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const MonthlyAttendanceSummary: React.FC = () => {
  const staffInfo = useStore.use.staffInfo();
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(dayjs().tz('Asia/Manila').year());
  const [selectedSession, setSelectedSession] = useState<string>('all');
  const [currentMonthPage, setCurrentMonthPage] = useState<number>(0); // For calendar pagination

  const { data: filtersData } = useGetGradesAndSections(staffInfo?.id || '', {
    enabled: !!staffInfo?.id,
  });

  const { data: summaryData, isLoading } = useGetMonthlyAttendanceSummary(staffInfo?.id || '', {
    grade: selectedGrade || undefined,
    section: selectedSection || undefined,
    year: selectedYear,
    session: selectedSession !== 'all' ? selectedSession : undefined,
  });

  const availableGrades = filtersData?.data ? filtersData.data.map((item) => item.grade) : [];
  const availableSections = selectedGrade && filtersData?.data
    ? filtersData.data.find((item) => item.grade === selectedGrade)?.sections || []
    : [];
  const monthlySummaries = summaryData?.data?.monthlySummaries || [];
  const totalStudents = summaryData?.data?.totalStudents || 0;

  // Generate years from current year forward to 5 years ahead
  const currentYear = dayjs().tz('Asia/Manila').year();
  const availableYears = Array.from({ length: 5 }, (_, i) => currentYear + i);

  // Calendar view data for current month page
  const currentMonthData = monthlySummaries[currentMonthPage];
  const calendarDays = currentMonthData?.days || [];

  // Group calendar days into weeks
  const calendarWeeks = useMemo(() => {
    if (!calendarDays.length) return [];

    const weeks: any[][] = [];
    let currentWeek: any[] = [];

    calendarDays.forEach((day: any, _index: number) => {
      currentWeek.push(day);
      if (currentWeek.length === 7 || _index === calendarDays.length - 1) {
        weeks.push([...currentWeek]);
        currentWeek = [];
      }
    });

    return weeks;
  }, [calendarDays]);

  const resetFilters = () => {
    setSelectedGrade('');
    setSelectedSection('');
    setSelectedSession('all');
    setCurrentMonthPage(0);
  };

  const handleExport = async (format: 'excel' | 'pdf') => {
    if (!staffInfo?.id) {
      console.error('Staff ID is required for export');
      return;
    }

    try {
      const params = new URLSearchParams({
        year: selectedYear.toString(),
        ...(selectedGrade && { grade: selectedGrade }),
        ...(selectedSection && { section: selectedSection }),
        ...(selectedSession !== 'all' && { session: selectedSession }),
      });

      const endpoint = `/api/reports/${staffInfo.id}/monthly-summary/export/${format}?${params.toString()}`;
      const response = await axiosClient.get(endpoint, { responseType: 'blob' });

      const blob = new Blob([response.data], {
        type: format === 'excel'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/pdf'
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `monthly-attendance-summary-${selectedYear}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      // You might want to show a user-friendly error message here
    }
  };

  if (isLoading) {
    return (
      <Center py={8}>
        <Spinner size="lg" />
      </Center>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      <Flex justifyContent="space-between" alignItems="center">
        <Heading size="md">Monthly Attendance Summary</Heading>
        <Menu>
          <MenuButton as={Button} rightIcon={<ChevronDownIcon />} colorScheme="blue" size="sm">
            <DownloadIcon mr={2} />
            Export
          </MenuButton>
          <MenuList>
            <MenuItem onClick={() => handleExport('excel')}>
              Export as Excel (.xlsx)
            </MenuItem>
            <MenuItem onClick={() => handleExport('pdf')}>
              Export as PDF (.pdf)
            </MenuItem>
          </MenuList>
        </Menu>
      </Flex>

      {/* Filters */}
      <Card p={4}>
        <VStack spacing={4} align="stretch">
          <Grid templateColumns={{ base: '1fr', md: 'repeat(4, 1fr)' }} gap={4}>
            <GridItem>
              <Text fontWeight="bold" mb={2}>Year</Text>
              <Select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </Select>
            </GridItem>
            <GridItem>
              <Text fontWeight="bold" mb={2}>Grade</Text>
              <Select
                value={selectedGrade}
                onChange={(e) => {
                  setSelectedGrade(e.target.value);
                  setSelectedSection(''); // Reset section when grade changes
                }}
                placeholder="All Grades"
              >
                <option value="">All Grades</option>
                {availableGrades.map((grade: string) => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </Select>
            </GridItem>
            <GridItem>
              <Text fontWeight="bold" mb={2}>Section</Text>
              <Select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                placeholder="All Sections"
                disabled={!selectedGrade}
              >
                <option value="">All Sections</option>
                {availableSections.map((section: string) => (
                  <option key={section} value={section}>{section}</option>
                ))}
              </Select>
            </GridItem>
            <GridItem>
              <Text fontWeight="bold" mb={2}>Session</Text>
              <Select
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
              >
                <option value="all">All Sessions</option>
                <option value="AM">AM Session</option>
                <option value="PM">PM Session</option>
              </Select>
            </GridItem>
          </Grid>
          <Flex justifyContent="flex-end">
            <Button variant="outline" onClick={resetFilters}>Reset Filters</Button>
          </Flex>
        </VStack>
      </Card>

      {/* Summary Stats */}
      <Grid templateColumns={{ base: '1fr', md: 'repeat(4, 1fr)' }} gap={4}>
        <Card p={4}>
          <VStack>
            <Text fontSize="sm" color="gray.500">Total Students</Text>
            <Text fontSize="2xl" fontWeight="bold" color="blue.500">{totalStudents}</Text>
          </VStack>
        </Card>
        <Card p={4}>
          <VStack>
            <Text fontSize="sm" color="gray.500">Total School Days ({selectedYear})</Text>
            <Text fontSize="2xl" fontWeight="bold" color="green.500">
              {monthlySummaries.reduce((sum: number, month: any) => sum + month.schoolDays, 0)}
            </Text>
          </VStack>
        </Card>
        <Card p={4}>
          <VStack>
            <Text fontSize="sm" color="gray.500">Total Absences</Text>
            <Text fontSize="2xl" fontWeight="bold" color="red.500">
              {monthlySummaries.reduce((sum: number, month: any) => sum + month.absentDays, 0)}
            </Text>
          </VStack>
        </Card>
        <Card p={4}>
          <VStack>
            <Text fontSize="sm" color="gray.500">Total Lates</Text>
            <Text fontSize="2xl" fontWeight="bold" color="yellow.500">
              {monthlySummaries.reduce((sum: number, month: any) => sum + month.lateDays, 0)}
            </Text>
          </VStack>
        </Card>
      </Grid>

      {/* Monthly Summary Table */}
      <Card>
        <Box p={4}>
          <Heading size="md" mb={4}>Monthly Attendance Summary - {selectedYear}</Heading>
          <TableContainer>
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Month</Th>
                  <Th isNumeric>Total Students</Th>
                  <Th isNumeric>School Days</Th>
                  <Th isNumeric>Present Days</Th>
                  <Th isNumeric>Absent Days</Th>
                  <Th isNumeric>Late Days</Th>
                  <Th isNumeric>Absence %</Th>
                  <Th isNumeric>Late %</Th>
                </Tr>
              </Thead>
              <Tbody>
                {monthlySummaries.map((month: any, _index: number) => (
                  <Tr key={month.month}>
                    <Td fontWeight="semibold">{month.month}</Td>
                    <Td isNumeric>{month.totalStudents}</Td>
                    <Td isNumeric>{month.schoolDays}</Td>
                    <Td isNumeric color="green.500">{month.presentDays}</Td>
                    <Td isNumeric color="red.500">{month.absentDays}</Td>
                    <Td isNumeric color="yellow.600">{month.lateDays}</Td>
                    <Td isNumeric>{month.absencePercentage.toFixed(1)}%</Td>
                    <Td isNumeric>{month.latePercentage.toFixed(1)}%</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        </Box>
      </Card>

      {/* Monthly Calendar View */}
      <Card>
        <Box p={4}>
          <Flex justifyContent="space-between" alignItems="center" mb={4}>
            <Heading size="md">Monthly Calendar View</Heading>
            <HStack>
              <Button
                size="sm"
                onClick={() => setCurrentMonthPage(prev => Math.max(prev - 1, 0))}
                isDisabled={currentMonthPage === 0}
              >
                Previous
              </Button>
              <Text fontSize="sm">
                {currentMonthData?.month || 'No Data'} {selectedYear}
              </Text>
              <Button
                size="sm"
                onClick={() => setCurrentMonthPage(prev => Math.min(prev + 1, monthlySummaries.length - 1))}
                isDisabled={currentMonthPage === monthlySummaries.length - 1}
              >
                Next
              </Button>
            </HStack>
          </Flex>

          {currentMonthData && (
            <Box>
              {/* Calendar Header */}
              <Grid templateColumns="repeat(7, 1fr)" gap={1} mb={2}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <Box key={day} textAlign="center" fontWeight="bold" fontSize="sm" p={2}>
                    {day}
                  </Box>
                ))}
              </Grid>

              {/* Calendar Body */}
              {calendarWeeks.map((week, weekIndex) => (
                <Grid key={weekIndex} templateColumns="repeat(7, 1fr)" gap={1} mb={1}>
                  {week.map((day: any, dayIndex: number) => 
                    day ? (
                    <Box
                      key={day.date}
                      minH="60px"
                      p={2}
                      border="1px solid"
                      borderColor="gray.200"
                      bg={
                        day.isWeekend ? 'gray.100' :
                        day.isHoliday ? 'red.50' :
                        'white'
                      }
                      textAlign="center"
                      fontSize="sm"
                    >
                      <Text fontWeight="bold" mb={1}>
                        {dayjs(day.date).date()}
                      </Text>
                      {day.isWeekend && (
                        <Badge colorScheme="gray" size="sm" fontSize="xs">W</Badge>
                      )}
                      {day.isHoliday && (
                        <Badge colorScheme="red" size="sm" fontSize="xs">H</Badge>
                      )}
                      {!day.isWeekend && !day.isHoliday && (
                        <VStack spacing={0}>
                          <Text fontSize="xs" color="green.500">{day.present || '•'}</Text>
                          <Text fontSize="xs" color="red.500">{day.absent || '•'}</Text>
                        </VStack>
                      )}
                    </Box>
                    ) : (
                      <Box key={`empty-${dayIndex}`} minH="60px" bg="gray.50" />
                    )
                  )}
                  {/* Fill empty cells for incomplete weeks */}
                  {Array.from({ length: 7 - week.length }).map((_, index) => (
                    <Box key={`empty-${index}`} minH="60px" bg="gray.50" />
                  ))}
                </Grid>
              ))}

              <Text fontSize="xs" color="gray.600" mt={2}>
                <Badge colorScheme="gray" mr={2}>W</Badge>Weekend
                <Badge colorScheme="red" ml={4} mr={2}>H</Badge>Holiday
                <Text as="span" ml={4}>Green: Present, Red: Absent</Text>
              </Text>
            </Box>
          )}
        </Box>
      </Card>
    </VStack>
  );
};

export default MonthlyAttendanceSummary;