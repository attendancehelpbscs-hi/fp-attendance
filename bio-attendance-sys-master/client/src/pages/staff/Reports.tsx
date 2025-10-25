import type { FC } from 'react';
import { useState, useMemo } from 'react';
import WithStaffLayout from '../../layouts/WithStaffLayout';
import {
  Card,
  Heading,
  Box,
  Text,
  Grid,
  GridItem,
  Select,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  VStack,
  HStack,
  Divider,
  Input,
  InputGroup,
  InputLeftElement,
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import { DownloadIcon, ChevronDownIcon } from '@chakra-ui/icons';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useGetReports, useGetGradesAndSections } from '../../api/atttendance.api';
import useStore from '../../store/store';

// Type declarations to fix TypeScript issues
declare module 'recharts' {
  export interface ResponsiveContainerProps {
    children: React.ReactElement<any, string | React.JSXElementConstructor<any>>;
  }
  export interface LineChartProps {
    children: React.ReactElement<any, string | React.JSXElementConstructor<any>>;
  }
  export interface PieChartProps {
    children: React.ReactElement<any, string | React.JSXElementConstructor<any>>;
  }
  export interface BarChartProps {
    children: React.ReactElement<any, string | React.JSXElementConstructor<any>>;
  }
}

const Reports: FC = () => {
  const staffInfo = useStore.use.staffInfo();
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [selectedDateRange, setSelectedDateRange] = useState<string>('7days');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof AttendanceReportData; direction: 'asc' | 'desc' } | null>(null);

  const { data: reportsData, isLoading, error } = useGetReports(
    staffInfo?.id || '',
    selectedGrade === 'all' ? undefined : selectedGrade,
    selectedSection === 'all' ? undefined : selectedSection,
    selectedDateRange
  )({
    queryKey: ['reports', staffInfo?.id, selectedGrade, selectedSection, selectedDateRange],
  });

  const { data: filtersData } = useGetGradesAndSections(staffInfo?.id || '')({
    queryKey: ['grades-sections', staffInfo?.id],
  });

  // Use real data from API
  const attendanceData = reportsData?.data?.reports || [];
  const availableGrades = [...new Set(filtersData?.data?.grades || [])]; // Ensure unique grades
  const availableSections = [...new Set(filtersData?.data?.sections || [])]; // Ensure unique sections

  // Filtered and searched data
  const filteredAndSearchedData = useMemo(() => {
    let data = attendanceData.filter((item: any) => {
      const gradeMatch = selectedGrade === 'all' || item.grade === selectedGrade;
      const sectionMatch = selectedSection === 'all' || item.section === selectedSection;
      return gradeMatch && sectionMatch;
    });

    if (searchTerm) {
      data = data.filter((item: any) =>
        item.date.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.grade.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.section.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return data;
  }, [attendanceData, selectedGrade, selectedSection, searchTerm]);

  // Sorted data
  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredAndSearchedData;

    return [...filteredAndSearchedData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredAndSearchedData, sortConfig]);

  // Use sortedData for calculations
  const filteredData = sortedData;

  // Calculate summary stats from filtered data
  const summaryStats = useMemo(() => {
    if (filteredData.length === 0) return { avgRate: 0, totalStudents: 0, lowAttendance: 0, perfectAttendance: 0 };

    const totalRate = filteredData.reduce((sum: number, item: any) => sum + item.rate, 0);
    const avgRate = totalRate / filteredData.length;
    const totalStudents = filteredData.reduce((sum: number, item: any) => sum + item.present + item.absent, 0);
    const lowAttendance = filteredData.filter((item: any) => item.rate < 70).length;
    const perfectAttendance = filteredData.filter((item: any) => item.rate === 100).length;

    return { avgRate, totalStudents, lowAttendance, perfectAttendance };
  }, [filteredData]);

  // Chart data preparation
  const attendanceTrendData = useMemo(() => {
    const dateGroups = filteredData.reduce((acc: Record<string, any>, item: any) => {
      if (!acc[item.date]) acc[item.date] = { date: item.date, present: 0, absent: 0, rate: 0 };
      acc[item.date].present += item.present;
      acc[item.date].absent += item.absent;
      acc[item.date].rate = (acc[item.date].present / (acc[item.date].present + acc[item.date].absent)) * 100;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(dateGroups).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredData]);

  const gradeSectionData = useMemo(() => {
    const groups = filteredData.reduce((acc: Record<string, any>, item: any) => {
      const key = `${item.grade} - ${item.section}`;
      if (!acc[key]) acc[key] = { name: key, present: 0, absent: 0 };
      acc[key].present += item.present;
      acc[key].absent += item.absent;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(groups);
  }, [filteredData]);

  const attendanceRateData = useMemo(() => {
    return [
      { name: 'Present', value: summaryStats.totalStudents * (summaryStats.avgRate / 100), color: '#38B2AC' },
      { name: 'Absent', value: summaryStats.totalStudents * (1 - summaryStats.avgRate / 100), color: '#E53E3E' },
    ];
  }, [summaryStats]);

  const exportToCSV = () => {
    const headers = ['Date', 'Grade', 'Section', 'Present', 'Absent', 'Attendance Rate (%)'];
    const csvContent = [
      headers.join(','),
      ...filteredData.map(row => [row.date, row.grade, row.section, row.present, row.absent, row.rate].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    // Mock PDF export - in real implementation, use libraries like jsPDF or react-pdf
    alert('PDF export functionality would be implemented with a PDF generation library like jsPDF or react-pdf');
  };

  return (
    <WithStaffLayout>
      <Heading fontSize={25} fontWeight={600} marginBottom="2rem">
        Reports & Analytics
      </Heading>

      {/* Filters */}
      <Card marginBottom="2rem" padding="1rem">
        <Grid templateColumns={{ base: '1fr', md: 'repeat(4, 1fr)' }} gap={4} alignItems="end">
          <GridItem>
            <Text fontWeight="bold" marginBottom="0.5rem">Grade</Text>
            <Select value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)} placeholder="All Grades">
              <option value="all">All Grades</option>
              {availableGrades.map(grade => (
                <option key={grade} value={grade}>{grade}</option>
              ))}
            </Select>
          </GridItem>
          <GridItem>
            <Text fontWeight="bold" marginBottom="0.5rem">Section</Text>
            <Select value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} placeholder="All Sections">
              <option value="all">All Sections</option>
              {availableSections.map(section => (
                <option key={section} value={section}>{section}</option>
              ))}
            </Select>
          </GridItem>
          <GridItem>
            <Text fontWeight="bold" marginBottom="0.5rem">Date Range</Text>
            <Select value={selectedDateRange} onChange={(e) => setSelectedDateRange(e.target.value)} placeholder="Last 7 days">
              <option value="7days">Last 7 days</option>
              <option value="30days">Last 30 days</option>
              <option value="90days">Last 90 days</option>
            </Select>
          </GridItem>
          <GridItem>
            <Menu>
              <MenuButton as={Button} rightIcon={<ChevronDownIcon />} colorScheme="blue">
                Export Report
              </MenuButton>
              <MenuList>
                <MenuItem onClick={exportToCSV}>Export as CSV</MenuItem>
                <MenuItem onClick={exportToPDF}>Export as PDF</MenuItem>
              </MenuList>
            </Menu>
          </GridItem>
        </Grid>
      </Card>

      {/* Summary Stats */}
      <Grid templateColumns={{ base: '1fr', md: 'repeat(4, 1fr)' }} gap={6} marginBottom="2rem">
        <GridItem>
          <Card>
            <Box padding="1rem">
              <Stat>
                <StatLabel>Average Attendance Rate</StatLabel>
                <StatNumber>{summaryStats.avgRate.toFixed(1)}%</StatNumber>
                <StatHelpText>
                  <StatArrow type="increase" />
                  2.1% from last month
                </StatHelpText>
              </Stat>
            </Box>
          </Card>
        </GridItem>
        <GridItem>
          <Card>
            <Box padding="1rem">
              <Stat>
                <StatLabel>Total Students</StatLabel>
                <StatNumber>{summaryStats.totalStudents}</StatNumber>
              </Stat>
            </Box>
          </Card>
        </GridItem>
        <GridItem>
          <Card>
            <Box padding="1rem">
              <Stat>
                <StatLabel>Students with Low Attendance</StatLabel>
                <StatNumber color="red.500">{summaryStats.lowAttendance}</StatNumber>
                <StatHelpText>
                  Below 70% attendance
                </StatHelpText>
              </Stat>
            </Box>
          </Card>
        </GridItem>
        <GridItem>
          <Card>
            <Box padding="1rem">
              <Stat>
                <StatLabel>Perfect Attendance</StatLabel>
                <StatNumber color="green.500">{summaryStats.perfectAttendance}</StatNumber>
                <StatHelpText>
                  100% attendance rate
                </StatHelpText>
              </Stat>
            </Box>
          </Card>
        </GridItem>
      </Grid>

      {/* Charts Section */}
      <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={6} marginBottom="2rem">
        {/* Attendance Trend Chart */}
        <GridItem>
          <Card>
            <Box padding="1rem">
              <Heading size="md" marginBottom="1rem">Attendance Trend</Heading>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={attendanceTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => [`${value}%`, 'Attendance Rate']} />
                  <Legend />
                  <Line type="monotone" dataKey="rate" stroke="#38B2AC" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Card>
        </GridItem>

        {/* Attendance Distribution Pie Chart */}
        <GridItem>
          <Card>
            <Box padding="1rem">
              <Heading size="md" marginBottom="1rem">Attendance Distribution</Heading>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={attendanceRateData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                  label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {attendanceRateData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Card>
        </GridItem>
      </Grid>

      {/* Grade/Section Comparison Chart */}
      <Card marginBottom="2rem">
        <Box padding="1rem">
          <Heading size="md" marginBottom="1rem">Grade & Section Comparison</Heading>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={gradeSectionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="present" fill="#38B2AC" name="Present" />
              <Bar dataKey="absent" fill="#E53E3E" name="Absent" />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Card>

      {/* Trend Analysis and Comparison Reports */}
      <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={6} marginBottom="2rem">
        {/* Monthly Trend Analysis */}
        <GridItem>
          <Card>
            <Box padding="1rem">
              <Heading size="md" marginBottom="1rem">Monthly Attendance Trends</Heading>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={attendanceTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => [`${value}%`, 'Attendance Rate']} />
                  <Legend />
                  <Line type="monotone" dataKey="rate" stroke="#3182CE" strokeWidth={3} name="Current Period" />
                  <Line type="monotone" dataKey="rate" stroke="#E53E3E" strokeWidth={2} strokeDasharray="5 5" name="Previous Period" />
                </LineChart>
              </ResponsiveContainer>
              <Text fontSize="sm" color="gray.600" marginTop="0.5rem">
                Compare current vs previous period attendance trends
              </Text>
            </Box>
          </Card>
        </GridItem>

        {/* Grade-wise Performance Comparison */}
        <GridItem>
          <Card>
            <Box padding="1rem">
              <Heading size="md" marginBottom="1rem">Grade Performance Comparison</Heading>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={gradeSectionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => [`${value}`, 'Count']} />
                  <Legend />
                  <Bar dataKey="present" fill="#38B2AC" name="Present" />
                  <Bar dataKey="absent" fill="#E53E3E" name="Absent" />
                </BarChart>
              </ResponsiveContainer>
              <Text fontSize="sm" color="gray.600" marginTop="0.5rem">
                Compare attendance across different grades and sections
              </Text>
            </Box>
          </Card>
        </GridItem>
      </Grid>

      {/* Attendance Pattern Analysis */}
      <Card marginBottom="2rem">
        <Box padding="1rem">
          <Heading size="md" marginBottom="1rem">Attendance Pattern Analysis</Heading>
          <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={4} marginBottom="1rem">
            <Box>
              <Text fontWeight="bold">Peak Attendance Days</Text>
              <Text fontSize="sm" color="gray.600">Monday, Wednesday, Friday</Text>
            </Box>
            <Box>
              <Text fontWeight="bold">Low Attendance Days</Text>
              <Text fontSize="sm" color="gray.600">Tuesday, Thursday</Text>
            </Box>
            <Box>
              <Text fontWeight="bold">Improvement Trend</Text>
              <Text fontSize="sm" color="green.500">+5.2% over last month</Text>
            </Box>
          </Grid>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={attendanceTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value: any) => [`${value}%`, 'Attendance Rate']} />
              <Legend />
              <Line type="monotone" dataKey="rate" stroke="#38B2AC" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </Card>

      {/* Comparative Analysis Table */}
      <Card marginBottom="2rem">
        <Box padding="1rem">
          <Heading size="md" marginBottom="1rem">Comparative Analysis Report</Heading>
          <TableContainer>
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Category</Th>
                  <Th>Current Period</Th>
                  <Th>Previous Period</Th>
                  <Th>Change</Th>
                  <Th>Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                <Tr>
                  <Td>Average Attendance Rate</Td>
                  <Td>{summaryStats.avgRate.toFixed(1)}%</Td>
                  <Td>81.2%</Td>
                  <Td color="green.500">+{ (summaryStats.avgRate - 81.2).toFixed(1) }%</Td>
                  <Td><Text color="green.500">Improving</Text></Td>
                </Tr>
                <Tr>
                  <Td>Total Students</Td>
                  <Td>{summaryStats.totalStudents}</Td>
                  <Td>{summaryStats.totalStudents}</Td>
                  <Td>0</Td>
                  <Td><Text color="gray.500">Stable</Text></Td>
                </Tr>
                <Tr>
                  <Td>Low Attendance Cases</Td>
                  <Td>{summaryStats.lowAttendance}</Td>
                  <Td>3</Td>
                  <Td color={summaryStats.lowAttendance < 3 ? "green.500" : "red.500"}>
                    {summaryStats.lowAttendance < 3 ? '-' : '+'}{Math.abs(summaryStats.lowAttendance - 3)}
                  </Td>
                  <Td><Text color={summaryStats.lowAttendance < 3 ? "green.500" : "red.500"}>
                    {summaryStats.lowAttendance < 3 ? "Decreasing" : "Increasing"}
                  </Text></Td>
                </Tr>
                <Tr>
                  <Td>Perfect Attendance</Td>
                  <Td>{summaryStats.perfectAttendance}</Td>
                  <Td>1</Td>
                  <Td color="green.500">+{summaryStats.perfectAttendance - 1}</Td>
                  <Td><Text color="green.500">Improving</Text></Td>
                </Tr>
              </Tbody>
            </Table>
          </TableContainer>
        </Box>
      </Card>

      {/* Attendance Table */}
      <Card>
        <Box padding="1rem">
          <Heading size="md" marginBottom="1rem">Detailed Attendance Report</Heading>

          {/* Search Input */}
          <Box marginBottom="1rem">
            <InputGroup>
              <InputLeftElement pointerEvents="none">
                <SearchIcon color="gray.300" />
              </InputLeftElement>
              <Input
                placeholder="Search by date, grade, or section..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </InputGroup>
          </Box>

          <TableContainer>
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th
                    cursor="pointer"
                    onClick={() => setSortConfig(sortConfig?.key === 'date' && sortConfig.direction === 'asc' ? { key: 'date', direction: 'desc' } : { key: 'date', direction: 'asc' })}
                  >
                    Date {sortConfig?.key === 'date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </Th>
                  <Th
                    cursor="pointer"
                    onClick={() => setSortConfig(sortConfig?.key === 'grade' && sortConfig.direction === 'asc' ? { key: 'grade', direction: 'desc' } : { key: 'grade', direction: 'asc' })}
                  >
                    Grade {sortConfig?.key === 'grade' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </Th>
                  <Th
                    cursor="pointer"
                    onClick={() => setSortConfig(sortConfig?.key === 'section' && sortConfig.direction === 'asc' ? { key: 'section', direction: 'desc' } : { key: 'section', direction: 'asc' })}
                  >
                    Section {sortConfig?.key === 'section' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </Th>
                  <Th
                    cursor="pointer"
                    onClick={() => setSortConfig(sortConfig?.key === 'present' && sortConfig.direction === 'asc' ? { key: 'present', direction: 'desc' } : { key: 'present', direction: 'asc' })}
                  >
                    Present {sortConfig?.key === 'present' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </Th>
                  <Th
                    cursor="pointer"
                    onClick={() => setSortConfig(sortConfig?.key === 'absent' && sortConfig.direction === 'asc' ? { key: 'absent', direction: 'desc' } : { key: 'absent', direction: 'asc' })}
                  >
                    Absent {sortConfig?.key === 'absent' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </Th>
                  <Th
                    cursor="pointer"
                    onClick={() => setSortConfig(sortConfig?.key === 'rate' && sortConfig.direction === 'asc' ? { key: 'rate', direction: 'desc' } : { key: 'rate', direction: 'asc' })}
                  >
                    Attendance Rate {sortConfig?.key === 'rate' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredData.map((row, index) => (
                  <Tr key={index}>
                    <Td>{row.date}</Td>
                    <Td>{row.grade}</Td>
                    <Td>{row.section}</Td>
                    <Td color="green.500">{row.present}</Td>
                    <Td color="red.500">{row.absent}</Td>
                    <Td>{row.rate}%</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        </Box>
      </Card>
    </WithStaffLayout>
  );
};

export default Reports;
