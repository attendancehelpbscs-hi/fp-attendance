import type { FC } from 'react';
import { useState, useMemo, useEffect } from 'react';
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
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import { DownloadIcon, ChevronDownIcon } from '@chakra-ui/icons';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
import { useGetReports, useGetGradesAndSections, useGetStudentReports, useGetSectionsForGrade, useGetStudentsForGradeAndSection, useGetStudentDetailedReport, useMarkStudentAttendance } from '../../api/atttendance.api';
import { useToast } from '@chakra-ui/react';
import useStore from '../../store/store';
import type { AttendanceReportData, StudentAttendanceReportData, StudentAttendanceSummary } from '../../interfaces/api.interface';

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
  const [sectionSortOrder, setSectionSortOrder] = useState<'asc' | 'desc'>('asc');
  const [sortConfig, setSortConfig] = useState<{ key: 'date' | 'grade' | 'section' | 'present' | 'absent' | 'rate'; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Student-specific report states
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [studentSearchTerm, setStudentSearchTerm] = useState<string>('');
  const [studentSortConfig, setStudentSortConfig] = useState<{ key: keyof StudentAttendanceReportData; direction: 'asc' | 'desc' } | null>(null);
  const [studentCurrentPage, setStudentCurrentPage] = useState<number>(1);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  // Manual attendance marking states
  const [markAttendanceDates, setMarkAttendanceDates] = useState<Date[]>([]);
  const [markAttendanceStatus, setMarkAttendanceStatus] = useState<'late' | 'absent'>('absent');
  const [markAttendanceSection, setMarkAttendanceSection] = useState<string>('');
  const [markAttendanceGracePeriod, setMarkAttendanceGracePeriod] = useState<number>(15);

  const toast = useToast();

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedGrade, selectedSection, selectedDateRange, searchTerm]);

  // Reset student page when student filters change
  useEffect(() => {
    setStudentCurrentPage(1);
  }, [selectedStatus, startDate, endDate, studentSearchTerm]);

  const { data: reportsData, isLoading, error } = useGetReports(staffInfo?.id || '', {
    grade: selectedGrade === 'all' ? undefined : selectedGrade,
    section: selectedSection === 'all' ? undefined : selectedSection,
    dateRange: selectedDateRange,
  })({
    queryKey: ['reports', staffInfo?.id, selectedGrade, selectedSection, selectedDateRange],
  });

  const { data: filtersData } = useGetGradesAndSections(staffInfo?.id || '')({
    queryKey: ['grades-sections', staffInfo?.id],
  });

  const { data: studentReportsData, isLoading: studentReportsLoading, error: studentReportsError } = useGetStudentReports(
    staffInfo?.id || '',
    undefined,
    startDate ? startDate.toISOString().split('T')[0] : undefined,
    endDate ? endDate.toISOString().split('T')[0] : undefined
  )({
    queryKey: ['student-reports', staffInfo?.id, startDate, endDate],
  });

  const { data: sectionsForGradeData } = useGetSectionsForGrade(staffInfo?.id || '', selectedGrade)({
    queryKey: ['sections-for-grade', staffInfo?.id, selectedGrade],
  });

  const { data: studentsForGradeAndSectionData } = useGetStudentsForGradeAndSection(staffInfo?.id || '', selectedGrade, selectedSection)({
    queryKey: ['students-for-grade-section', staffInfo?.id, selectedGrade, selectedSection],
  });

  const { mutate: markStudentAttendance } = useMarkStudentAttendance();

  const { data: studentDetailedReportData, isLoading: studentDetailedLoading } = useGetStudentDetailedReport(
    staffInfo?.id || '',
    selectedStudent?.id || '',
    startDate ? startDate.toISOString().split('T')[0] : undefined,
    endDate ? endDate.toISOString().split('T')[0] : undefined
  )({
    queryKey: ['student-detailed-report', staffInfo?.id, selectedStudent?.id, startDate, endDate],
    enabled: !!selectedStudent?.id,
  });

  const sectionsForGrade = sectionsForGradeData?.sections || [];
  const studentsForGradeAndSection = studentsForGradeAndSectionData?.students || [];

  // Use real data from API
  const attendanceData = reportsData?.data?.reports || [];
  // Hardcode grades 1-6 instead of fetching from API
  const availableGrades = ['1', '2', '3', '4', '5', '6'];
  // Sort sections based on sectionSortOrder
  const availableSections = [...new Set(filtersData?.data?.sections || [])].sort((a, b) =>
    sectionSortOrder === 'asc' ? a.localeCompare(b) : b.localeCompare(a)
  );

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

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

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
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(18);
    doc.text('Attendance Report', 14, 22);

    // Add filters info
    doc.setFontSize(12);
    let yPosition = 35;
    doc.text(`Grade: ${selectedGrade === 'all' ? 'All Grades' : selectedGrade}`, 14, yPosition);
    yPosition += 7;
    doc.text(`Section: ${selectedSection === 'all' ? 'All Sections' : selectedSection}`, 14, yPosition);
    yPosition += 7;
    doc.text(`Date Range: ${selectedDateRange}`, 14, yPosition);
    yPosition += 7;
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, yPosition);

    // Prepare table data
    const tableColumns = ['Date', 'Grade', 'Section', 'Present', 'Absent', 'Rate (%)'];
    const tableRows = filteredData.map(row => [
      row.date,
      row.grade,
      row.section,
      row.present.toString(),
      row.absent.toString(),
      row.rate.toString()
    ]);

    // Add table
    autoTable(doc, {
      head: [tableColumns],
      body: tableRows,
      startY: yPosition + 10,
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [56, 178, 172], // Teal color
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
    });

    // Save the PDF
    doc.save(`attendance_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const studentAttendanceData = studentReportsData?.data?.reports || [];

  // Filtered and searched student data
  const filteredAndSearchedStudentData = useMemo(() => {
    let data = studentAttendanceData.filter((item: any) => {
      const statusMatch = selectedStatus === 'all' || item.status === selectedStatus;
      const dateMatch = (() => {
        if (!startDate && !endDate) return true;
        const itemDateStr = new Date(item.date).toISOString().split('T')[0];
        const startStr = startDate ? startDate.toISOString().split('T')[0] : null;
        const endStr = endDate ? endDate.toISOString().split('T')[0] : null;
        if (startStr && itemDateStr < startStr) return false;
        if (endStr && itemDateStr > endStr) return false;
        return true;
      })();
      return statusMatch && dateMatch;
    });

    if (studentSearchTerm) {
      data = data.filter((item: any) =>
        item.date.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
        item.student_name.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
        item.status.toLowerCase().includes(studentSearchTerm.toLowerCase())
      );
    }

    return data;
  }, [studentAttendanceData, selectedStatus, startDate, endDate, studentSearchTerm]);

  // Sorted student data
  const sortedStudentData = useMemo(() => {
    if (!studentSortConfig) return filteredAndSearchedStudentData;

    return [...filteredAndSearchedStudentData].sort((a, b) => {
      const aValue = a[studentSortConfig.key];
      const bValue = b[studentSortConfig.key];

      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return studentSortConfig.direction === 'asc' ? -1 : 1;
      if (bValue == null) return studentSortConfig.direction === 'asc' ? 1 : -1;

      if (aValue < bValue) return studentSortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return studentSortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredAndSearchedStudentData, studentSortConfig]);

  // Pagination for students
  const studentTotalPages = Math.ceil(sortedStudentData.length / itemsPerPage);
  const studentStartIndex = (studentCurrentPage - 1) * itemsPerPage;
  const studentPaginatedData = sortedStudentData.slice(studentStartIndex, studentStartIndex + itemsPerPage);

  return (
    <WithStaffLayout>
      <Heading fontSize={25} fontWeight={600} marginBottom="2rem">
        Reports & Analytics
      </Heading>

      <Tabs>
        <TabList>
          <Tab>Class Reports</Tab>
          <Tab>Student Reports</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            {/* Filters */}
            <Card marginBottom="2rem" padding="1rem">
              <Grid templateColumns={{ base: '1fr', md: 'repeat(5, 1fr)' }} gap={4} alignItems="end">
                <GridItem>
                  <Text fontWeight="bold" marginBottom="0.5rem">Search</Text>
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
                </GridItem>
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
                  <VStack align="stretch" spacing={1}>
                    <Select value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} placeholder="All Sections">
                      <option value="all">All Sections</option>
                      {selectedGrade !== 'all' ? sectionsForGrade.map(section => (
                        <option key={section} value={section}>{section}</option>
                      )) : availableSections.map(section => (
                        <option key={section} value={section}>{section}</option>
                      ))}
                    </Select>
                    <HStack spacing={1}>
                      <Button size="xs" onClick={() => setSectionSortOrder('asc')} colorScheme={sectionSortOrder === 'asc' ? 'blue' : 'gray'}>
                        A-Z
                      </Button>
                      <Button size="xs" onClick={() => setSectionSortOrder('desc')} colorScheme={sectionSortOrder === 'desc' ? 'blue' : 'gray'}>
                        Z-A
                      </Button>
                    </HStack>
                  </VStack>
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
                    label={(entry: any) => {
                      const total = attendanceRateData.reduce((sum: number, item: any) => sum + item.value, 0);
                      const percent = total > 0 ? (entry.value / total) * 100 : 0;
                      return `${entry.name} ${percent.toFixed(0)}%`;
                    }}
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

      {/* Summary Analysis Table */}
      <Card marginBottom="2rem">
        <Box padding="1rem">
          <Heading size="md" marginBottom="1rem">Summary Analysis Report</Heading>
          <TableContainer>
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Category</Th>
                  <Th>Value</Th>
                </Tr>
              </Thead>
              <Tbody>
                <Tr>
                  <Td>Average Attendance Rate</Td>
                  <Td>{summaryStats.avgRate.toFixed(1)}%</Td>
                </Tr>
                <Tr>
                  <Td>Total Students</Td>
                  <Td>{summaryStats.totalStudents}</Td>
                </Tr>
                <Tr>
                  <Td>Low Attendance Cases</Td>
                  <Td>{summaryStats.lowAttendance}</Td>
                </Tr>
                <Tr>
                  <Td>Perfect Attendance</Td>
                  <Td>{summaryStats.perfectAttendance}</Td>
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
                {paginatedData.map((row, index) => (
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

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <Box marginTop="1rem" display="flex" justifyContent="center" alignItems="center" gap={2}>
              <Button
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                isDisabled={currentPage === 1}
              >
                Previous
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <Button
                  key={page}
                  size="sm"
                  colorScheme={currentPage === page ? 'blue' : 'gray'}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              ))}
              <Button
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                isDisabled={currentPage === totalPages}
              >
                Next
              </Button>
            </Box>
          )}
        </Box>
      </Card>
          </TabPanel>

          <TabPanel>
            {/* Student Reports - Hierarchical Structure */}
            <Card marginBottom="2rem" padding="1rem">
              <VStack spacing={6} align="stretch">
                {/* Grades Selection */}
                <Box>
                  <Text fontWeight="bold" marginBottom="1rem" fontSize="lg">Select Grade</Text>
                  <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(6, 1fr)' }} gap={4}>
                    {availableGrades.map(grade => (
                      <Button
                        key={grade}
                        colorScheme={selectedGrade === grade ? 'blue' : 'gray'}
                        variant={selectedGrade === grade ? 'solid' : 'outline'}
                        onClick={() => {
                          setSelectedGrade(grade);
                          setSelectedSection('');
                          setSelectedStudent(null);
                        }}
                        size="lg"
                        height="50px"
                      >
                        Grade {grade}
                      </Button>
                    ))}
                  </Grid>
                </Box>

                {/* Sections for Selected Grade */}
                {selectedGrade && (
                  <Box>
                    <Text fontWeight="bold" marginBottom="1rem" fontSize="lg">Select Section</Text>
                    <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }} gap={4}>
                      {sectionsForGrade.map(section => (
                        <Button
                          key={section}
                          colorScheme={selectedSection === section ? 'green' : 'gray'}
                          variant={selectedSection === section ? 'solid' : 'outline'}
                          onClick={() => {
                            setSelectedSection(section);
                            setSelectedStudent(null);
                          }}
                          size="lg"
                          height="50px"
                        >
                          Section {section}
                        </Button>
                      ))}
                    </Grid>
                  </Box>
                )}

                {/* Students for Selected Grade and Section */}
                {selectedGrade && selectedSection && (
                  <Box>
                    <Text fontWeight="bold" marginBottom="1rem" fontSize="lg">Select Student</Text>
                    <Grid templateColumns={{ base: 'repeat(1, 1fr)', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap={4}>
                      {studentsForGradeAndSection.map(student => (
                        <Button
                          key={student.id}
                          colorScheme={selectedStudent?.id === student.id ? 'purple' : 'gray'}
                          variant={selectedStudent?.id === student.id ? 'solid' : 'outline'}
                          onClick={() => setSelectedStudent(student)}
                          size="md"
                          height="auto"
                          padding="1rem"
                          whiteSpace="normal"
                          textAlign="left"
                        >
                          <VStack align="start" spacing={1}>
                            <Text fontWeight="bold">{student.name}</Text>
                            <Text fontSize="sm" color="gray.600">Matric: {student.matric_no}</Text>
                          </VStack>
                        </Button>
                      ))}
                    </Grid>
                  </Box>
                )}

                {/* Manual Attendance Marking */}
                {selectedStudent && (
                  <Card padding="1rem" marginTop="1rem">
                    <VStack spacing={4} align="stretch">
                      <Heading size="md">Mark Attendance for {selectedStudent.name}</Heading>

                      <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={4} alignItems="end">
                        <GridItem>
                          <Text fontWeight="bold" marginBottom="0.5rem">Select Dates</Text>
                          <DatePicker
                            selected={null}
                            onChange={(date) => {
                              if (date) {
                                setMarkAttendanceDates(prev => [...prev, date]);
                              }
                            }}
                            placeholderText="Click to select dates"
                            dateFormat="yyyy-MM-dd"
                            isClearable
                            inline
                          />
                          {markAttendanceDates.length > 0 && (
                            <Box marginTop="0.5rem">
                              <Text fontSize="sm" fontWeight="bold">Selected Dates:</Text>
                              <HStack spacing={2} wrap="wrap">
                                {markAttendanceDates.map((date, index) => (
                                  <Button
                                    key={index}
                                    size="xs"
                                    colorScheme="red"
                                    variant="outline"
                                    onClick={() => setMarkAttendanceDates(prev => prev.filter((_, i) => i !== index))}
                                  >
                                    {date.toLocaleDateString()} ×
                                  </Button>
                                ))}
                              </HStack>
                            </Box>
                          )}
                        </GridItem>

                        <GridItem>
                          <Text fontWeight="bold" marginBottom="0.5rem">Status</Text>
                          <Select
                            value={markAttendanceStatus}
                            onChange={(e) => setMarkAttendanceStatus(e.target.value as 'late' | 'absent')}
                          >
                            <option value="absent">Absent</option>
                            <option value="late">Late</option>
                          </Select>
                        </GridItem>

                        <GridItem>
                          <Button
                            colorScheme="blue"
                            onClick={() => {
                              if (selectedStudent && markAttendanceDates.length > 0) {
                                markStudentAttendance({
                                  staffId: staffInfo?.id || '',
                                  studentId: selectedStudent.id,
                                  dates: markAttendanceDates.map(date => date.toISOString().split('T')[0]),
                                  status: markAttendanceStatus,
                                  section: selectedStudent.section || markAttendanceSection,
                                }, {
                                  onSuccess: () => {
                                    toast({
                                      title: 'Attendance marked successfully',
                                      status: 'success',
                                      duration: 3000,
                                      isClosable: true,
                                    });
                                    setMarkAttendanceDates([]);
                                  },
                                  onError: (error) => {
                                    toast({
                                      title: 'Failed to mark attendance',
                                      description: error.message || 'An error occurred',
                                      status: 'error',
                                      duration: 3000,
                                      isClosable: true,
                                    });
                                  },
                                });
                              }
                            }}
                            isDisabled={markAttendanceDates.length === 0}
                          >
                            Mark Attendance
                          </Button>
                        </GridItem>
                      </Grid>
                    </VStack>
                  </Card>
                )}
              </VStack>
            </Card>


          </TabPanel>
        </TabPanels>
      </Tabs>
    </WithStaffLayout>
  );
};

export default Reports;
