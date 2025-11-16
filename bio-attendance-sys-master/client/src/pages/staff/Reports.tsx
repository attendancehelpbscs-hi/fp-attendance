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
  Badge,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Progress,
  Spinner,
  Center,
  Flex,
  Spacer,
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import { DownloadIcon, ChevronDownIcon, WarningIcon, CheckCircleIcon, CalendarIcon } from '@chakra-ui/icons';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
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
  AreaChart,
  Area,
  ComposedChart,
} from 'recharts';
import { useGetReports, useGetGradesAndSections, useGetStudentReports, useGetSectionsForGrade, useGetStudentsForGradeAndSection, useGetStudentDetailedReport, useGetCheckInTimeAnalysis, useGetStudentsByStatus } from '../../api/atttendance.api';
import { useGetStudents } from '../../api/student.api';
import { useToast } from '@chakra-ui/react';
import { Tabs, TabList, TabPanels, Tab, TabPanel } from '@chakra-ui/react';
import useStore from '../../store/store';
import dayjs from 'dayjs';
import type { AttendanceReportData, StudentAttendanceReportData, StudentAttendanceSummary, StudentDetailedReport } from '../../interfaces/api.interface';
import StudentReportDetail from '../../components/StudentReportDetail';

import StudentListModal from '../../components/StudentListModal';

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

// Report Types
type ReportType = 'daily-records' | 'student-summary' | 'attendance-trends' | 'attendance-patterns';

const REPORT_TYPES: { value: ReportType; label: string; description: string }[] = [
  { value: 'daily-records', label: 'Daily Records', description: 'Detailed attendance records with color coding' },
  { value: 'student-summary', label: 'Student Summary', description: 'Individual student attendance summaries' },
  { value: 'attendance-trends', label: 'Attendance Trends', description: 'Trends and patterns over time' },
  { value: 'attendance-patterns', label: 'Attendance Patterns', description: 'Pattern analysis and insights' },
];

// Grade color mapping
const gradeColors: Record<string, string> = {
  '1': '#E57373', // Bright Red
  '2': '#FFB74D', // Vivid Orange
  '3': '#FFD54F', // Neon Yellow
  '4': '#81C784', // Lime Green
  '5': '#64B5F6', // Pure Blue
  '6': '#9575CD', // Strong Blue Violet
};

const Reports: FC = () => {
  const staffInfo = useStore.use.staffInfo();
  const [selectedReportType, setSelectedReportType] = useState<ReportType>('daily-records');

  // Unified filter states
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedDateRange, setSelectedDateRange] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | null>(null); // No default date
  const [endDate, setEndDate] = useState<Date | null>(new Date()); // Default to today
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchInput, setSearchInput] = useState<string>('');

  // Sorting and pagination
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Student-specific states
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showStudentDetail, setShowStudentDetail] = useState<boolean>(false);

  // Additional student report states
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [studentSearchTerm, setStudentSearchTerm] = useState<string>('');
  const [studentSortConfig, setStudentSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [studentCurrentPage, setStudentCurrentPage] = useState<number>(1);

  // Manual attendance marking states
  const [markAttendanceStatus, setMarkAttendanceStatus] = useState<'present'>('present');
  const [markAttendanceGracePeriod, setMarkAttendanceGracePeriod] = useState<number>(0);
  const [markAttendanceDates, setMarkAttendanceDates] = useState<Date[]>([]);
  const [markAttendanceSection, setMarkAttendanceSection] = useState<string>('');



  // Student List Modal states
  const [isListModalOpen, setIsListModalOpen] = useState<boolean>(false);
  const [listModalStatus, setListModalStatus] = useState<'present' | 'absent'>('present');
  const [listModalDate, setListModalDate] = useState<string>('');
  const [listModalGrade, setListModalGrade] = useState<string>('');
  const [listModalSection, setListModalSection] = useState<string>('');

  // Pagination states for Grade-Section chart
  const [gradeSectionPage, setGradeSectionPage] = useState<number>(1);
  const [gradeSectionItemsPerPage, setGradeSectionItemsPerPage] = useState<number>(10);

  // Pagination states for Attendance Percentage by Grade chart
  const [attendancePercentagePage, setAttendancePercentagePage] = useState<number>(1);
  const [attendancePercentageItemsPerPage, setAttendancePercentageItemsPerPage] = useState<number>(10);

  // Pagination states for Grade Performance Comparison chart
  const [gradePerformancePage, setGradePerformancePage] = useState<number>(1);
  const [gradePerformanceItemsPerPage, setGradePerformanceItemsPerPage] = useState<number>(10);

  const toast = useToast();

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedGrade, selectedSection, selectedDateRange, searchTerm, selectedReportType]);

  // Reset filters when report type changes
  useEffect(() => {
    setSelectedGrade('');
    setSelectedSection('');
    setSearchTerm('');
    setStartDate(null); // Reset to no default date
    setEndDate(new Date()); // Reset to default today
    setCurrentPage(1);
    setSortConfig(null);
    setSelectedStudent(null);
    setShowStudentDetail(false);
  }, [selectedReportType]);

  // Reset student-specific states when report type changes
  useEffect(() => {
    setSelectedStatus('all');
    setStudentSearchTerm('');
    setStudentSortConfig(null);
    setStudentCurrentPage(1);
    setMarkAttendanceStatus('present');
    setMarkAttendanceGracePeriod(0);
    setMarkAttendanceDates([]);
    setMarkAttendanceSection('');
    setGradeSectionPage(1);
    setAttendancePercentagePage(1);
    setGradePerformancePage(1);
  }, [selectedReportType]);

  const { data: reportsData, isLoading, error } = useGetReports(staffInfo?.id || '', {
    grade: selectedGrade || undefined,
    section: selectedSection || undefined,
    dateRange: selectedDateRange,
    startDate: selectedReportType === 'student-summary' ? (startDate ? startDate.toISOString().split('T')[0] : undefined) : undefined,
    endDate: selectedReportType === 'student-summary' ? (endDate ? endDate.toISOString().split('T')[0] : undefined) : undefined,
    page: currentPage,
    per_page: itemsPerPage,
  });

  // Separate API call for chart data to get all records (not paginated)
  const { data: chartData } = useGetReports(staffInfo?.id || '', {
    grade: selectedGrade || undefined,
    section: selectedSection || undefined,
    dateRange: selectedDateRange,
    startDate: selectedReportType === 'student-summary' ? (startDate ? startDate.toISOString().split('T')[0] : undefined) : undefined,
    endDate: selectedReportType === 'student-summary' ? (endDate ? endDate.toISOString().split('T')[0] : undefined) : undefined,
    page: 1,
    per_page: 100, // Server max is 100
  });

  const { data: filtersData } = useGetGradesAndSections(staffInfo?.id || '', {
    enabled: !!staffInfo?.id,
  });

  const { data: studentReportsData, isLoading: studentReportsLoading, error: studentReportsError } = useGetStudentReports(
    staffInfo?.id || '',
    {
      grade: selectedGrade || undefined,
      section: selectedSection || undefined,
      startDate: startDate ? startDate.toISOString().split('T')[0] : undefined,
      endDate: endDate ? endDate.toISOString().split('T')[0] : undefined,
      dateRange: selectedDateRange,
      page: studentCurrentPage,
      per_page: itemsPerPage,
    }
  );

  const sectionsForGradeQuery = useGetSectionsForGrade(staffInfo?.id || '', selectedGrade, {
    enabled: !!staffInfo?.id && !!selectedGrade,
  });
  const sectionsForGradeData = sectionsForGradeQuery.data;

  const studentsForGradeAndSectionQuery = useGetStudentsForGradeAndSection(staffInfo?.id || '', selectedGrade, selectedSection, {
    enabled: !!staffInfo?.id && !!selectedGrade && !!selectedSection,
  });
  const studentsForGradeAndSectionData = studentsForGradeAndSectionQuery.data;



  const studentDetailedReportQuery = useGetStudentDetailedReport(
    staffInfo?.id || '',
    selectedStudent?.id || '',
    startDate ? startDate.toISOString().split('T')[0] : undefined,
    endDate ? endDate.toISOString().split('T')[0] : undefined,
    {
      enabled: !!staffInfo?.id && !!selectedStudent?.id,
    }
  );
  const studentDetailedReportData = studentDetailedReportQuery.data;
  const studentDetailedLoading = studentDetailedReportQuery.isLoading;

  const { data: checkInTimeAnalysisData, isLoading: checkInTimeAnalysisLoading } = useGetCheckInTimeAnalysis(staffInfo?.id || '', {
    grade: selectedGrade || undefined,
    section: selectedSection || undefined,
    dateRange: selectedDateRange,
    startDate: undefined,
    endDate: undefined,
  });

  const { data: studentsData } = useGetStudents(staffInfo?.id || '', 1, 100, {
    enabled: !!staffInfo?.id,
  });





  // Reset filters function
  const resetFilters = () => {
    setSelectedGrade('');
    setSelectedSection('');
    setSelectedDateRange('all');
    setStartDate(null);
    setEndDate(new Date());
    setSearchTerm('');
    setSearchInput('');
    setCurrentPage(1);
    setSelectedStatus('all');
    setStudentSearchTerm('');
    setStudentCurrentPage(1);
    setGradeSectionPage(1);
    setGradeSectionItemsPerPage(10);
    setAttendancePercentagePage(1);
    setAttendancePercentageItemsPerPage(10);
    setGradePerformancePage(1);
    setGradePerformanceItemsPerPage(10);
    setSortConfig(null);
    setStudentSortConfig(null);
  };

  const sectionsForGrade = sectionsForGradeData?.sections || [];
  const studentsForGradeAndSection = studentsForGradeAndSectionData?.students || [];

  // Use real data from API - ensure we have data
  const attendanceData = reportsData?.data?.reports || [];
  const chartAttendanceData = chartData?.data?.reports || []; // Use chartData for charts
  const studentAttendanceData = studentReportsData?.data?.reports || [];
  const reportsMeta = reportsData?.data?.meta;
  const studentReportsMeta = studentReportsData?.data?.meta;
  const availableGrades = ['1', '2', '3', '4', '5', '6'];
  const availableSections = [...new Set(filtersData?.data?.sections || [])].sort();

  // Filtered and searched data for different report types
  const filteredAttendanceData = useMemo(() => {
    let data = attendanceData.filter((item: any) => {
      const gradeMatch = !selectedGrade || item.grade === selectedGrade;
      const sectionMatch = !selectedSection || item.section === selectedSection;
      return gradeMatch && sectionMatch;
    });

    if (searchTerm) {
      data = data.filter((item: any) =>
        item.date.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.grade.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.section.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.present.toString().toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return data;
  }, [attendanceData, selectedGrade, selectedSection, searchTerm]);

  // Filtered data for charts (using chartAttendanceData)
  const filteredChartData = useMemo(() => {
    let data = chartAttendanceData.filter((item: any) => {
      const gradeMatch = !selectedGrade || item.grade === selectedGrade;
      const sectionMatch = !selectedSection || item.section === selectedSection;
      return gradeMatch && sectionMatch;
    });

    return data;
  }, [chartAttendanceData, selectedGrade, selectedSection]);

  const filteredStudentData = useMemo(() => {
    let data = studentAttendanceData.filter((item: any) => {
      const gradeMatch = !selectedGrade || item.grade === selectedGrade;
      const sectionMatch = !selectedSection || item.section === selectedSection;
      const dateMatch = (() => {
        if (!startDate && !endDate) return true;
        const itemDateStr = new Date(item.date).toISOString().split('T')[0];
        const startStr = startDate ? startDate.toISOString().split('T')[0] : null;
        const endStr = endDate ? endDate.toISOString().split('T')[0] : null;
        if (startStr && itemDateStr < startStr) return false;
        if (endStr && itemDateStr > endStr) return false;
        return true;
      })();
      return gradeMatch && sectionMatch && dateMatch;
    });

    if (searchTerm) {
      data = data.filter((item: any) =>
        item.date.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.matric_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.grade.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.section.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return data;
  }, [studentAttendanceData, selectedGrade, selectedSection, startDate, endDate, searchTerm]);

  // Sorted data
  const sortedData = useMemo(() => {
    const data = selectedReportType === 'daily-records' ? filteredAttendanceData : filteredStudentData;
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      const aValue = (a as any)[sortConfig.key];
      const bValue = (b as any)[sortConfig.key];

      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortConfig.direction === 'asc' ? -1 : 1;
      if (bValue == null) return sortConfig.direction === 'asc' ? 1 : -1;

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredAttendanceData, filteredStudentData, sortConfig, selectedReportType]);

  // Pagination logic - use server-side pagination when available
  const totalPages = reportsMeta?.total_pages || Math.ceil(sortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = reportsMeta ? sortedData : sortedData.slice(startIndex, startIndex + itemsPerPage);

  // Calculate summary stats from filtered data
  const summaryStats = useMemo(() => {
    const enrolledStudents = studentsData?.data?.students?.length || 0;
    const data = selectedReportType === 'daily-records' ? filteredAttendanceData : filteredStudentData;
    if (data.length === 0) return { avgRate: 0, totalStudents: enrolledStudents, lowAttendance: 0, perfectAttendance: 0 };

    if (selectedReportType === 'daily-records') {
      const totalRate = data.reduce((sum: number, item: any) => sum + item.rate, 0);
      const avgRate = totalRate / data.length;
      const totalStudents = enrolledStudents; // Use actual enrolled students count
      const lowAttendance = data.filter((item: any) => item.rate < 70).length;
      const perfectAttendance = data.filter((item: any) => item.rate === 100).length;
      return { avgRate, totalStudents, lowAttendance, perfectAttendance };
    } else {
      // Student-level stats
      const totalStudents = enrolledStudents; // Use actual enrolled students count
      const presentCount = data.filter((item: any) => item.status === 'present').length;
      const avgRate = data.length > 0 ? (presentCount / data.length) * 100 : 0;
      const lowAttendance = 0; // No low attendance since only present is tracked
      const perfectAttendance = data.filter((item: any) => item.status === 'present').length;
      return { avgRate, totalStudents, lowAttendance, perfectAttendance };
    }
  }, [filteredAttendanceData, filteredStudentData, selectedReportType, studentsData]);

  // Chart data preparation - always use daily records data for trends and patterns
  const attendanceTrendData = useMemo(() => {
    const data = filteredChartData; // Use chart data for trends
    const dateGroups = data.reduce((acc: Record<string, any>, item: any) => {
      // Group by date only (YYYY-MM-DD) to prevent overcrowding
      const dateKey = new Date(item.date).toISOString().split('T')[0];
      if (!acc[dateKey]) acc[dateKey] = { date: dateKey, present: 0, absent: 0, rate: 0 };
      acc[dateKey].present += item.present;
      acc[dateKey].rate = item.rate; // Use the rate directly since absent is removed
      return acc;
    }, {} as Record<string, any>);

    return Object.values(dateGroups).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredChartData]);

  // Weekly attendance pattern data
  const weeklyAttendanceData = useMemo(() => {
    const data = filteredChartData;

    // First, aggregate by date to get total present per day
    const dailyTotals = data.reduce((acc: Record<string, number>, item: any) => {
      const date = item.date;
      if (!acc[date]) acc[date] = 0;
      acc[date] += item.present;
      return acc;
    }, {} as Record<string, number>);

    // Then, group by day of week and calculate averages
    const dayGroups = Object.entries(dailyTotals).reduce((acc: Record<string, any>, [date, totalPresent]) => {
      const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
      if (!acc[dayOfWeek]) acc[dayOfWeek] = { total: 0, count: 0 };
      acc[dayOfWeek].total += totalPresent;
      acc[dayOfWeek].count += 1;
      return acc;
    }, {} as Record<string, any>);

    // Calculate average attendance per day
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return daysOfWeek.map(day => {
      const dayData = dayGroups[day];
      return {
        day,
        averagePresent: dayData ? Math.round(dayData.total / dayData.count) : 0,
        totalPresent: dayData ? dayData.total : 0,
        occurrences: dayData ? dayData.count : 0
      };
    });
  }, [filteredChartData]);

  const gradeSectionData = useMemo(() => {
    const data = filteredChartData; // Use chart data for patterns
    const groups = data.reduce((acc: Record<string, any>, item: any) => {
      const key = `${item.grade} - ${item.section}`;
      if (!acc[key]) acc[key] = { name: key, present: 0, absent: 0, grade: item.grade, section: item.section };
      acc[key].present += item.present;
      acc[key].absent += item.absent;
      return acc;
    }, {} as Record<string, any>);

    // Ensure all grade-section combinations are represented, even if they have no data
    const availableSections = [...new Set(filtersData?.data?.sections || [])].sort();
    availableGrades.forEach(grade => {
      availableSections.forEach(section => {
        const key = `${grade} - ${section}`;
        if (!groups[key]) {
          groups[key] = { name: key, present: 0, absent: 0, grade, section };
        }
      });
    });

    return Object.values(groups).map((item: any) => {
      const total = item.present + item.absent;
      const presentPercentage = total > 0 ? (item.present / total) * 100 : 0;
      const absentPercentage = total > 0 ? (item.absent / total) * 100 : 0;
      return {
        ...item,
        presentPercentage: Math.round(presentPercentage * 10) / 10, // Round to 1 decimal
        absentPercentage: Math.round(absentPercentage * 10) / 10,
        total: total,
        color: gradeColors[item.grade] || '#38B2AC', // Default to teal if grade not found
      };
    }).sort((a: any, b: any) => a.name.localeCompare(b.name)); // Sort alphabetically
  }, [filteredChartData, availableGrades, filtersData]);

  // Paginated grade-section data
  const paginatedGradeSectionData = useMemo(() => {
    if (gradeSectionItemsPerPage === 0) return gradeSectionData; // Show all
    const startIndex = (gradeSectionPage - 1) * gradeSectionItemsPerPage;
    const endIndex = startIndex + gradeSectionItemsPerPage;
    return gradeSectionData.slice(startIndex, endIndex);
  }, [gradeSectionData, gradeSectionPage, gradeSectionItemsPerPage]);

  // Pagination info for grade-section chart
  const gradeSectionTotalPages = gradeSectionItemsPerPage === 0 ? 1 : Math.ceil(gradeSectionData.length / gradeSectionItemsPerPage);

  // Paginated attendance percentage data
  const paginatedAttendancePercentageData = useMemo(() => {
    if (attendancePercentageItemsPerPage === 0) return gradeSectionData; // Show all
    const startIndex = (attendancePercentagePage - 1) * attendancePercentageItemsPerPage;
    const endIndex = startIndex + attendancePercentageItemsPerPage;
    return gradeSectionData.slice(startIndex, endIndex);
  }, [gradeSectionData, attendancePercentagePage, attendancePercentageItemsPerPage]);

  // Pagination info for attendance percentage chart
  const attendancePercentageTotalPages = attendancePercentageItemsPerPage === 0 ? 1 : Math.ceil(gradeSectionData.length / attendancePercentageItemsPerPage);

  // Paginated grade performance data
  const paginatedGradePerformanceData = useMemo(() => {
    if (gradePerformanceItemsPerPage === 0) return gradeSectionData; // Show all
    const startIndex = (gradePerformancePage - 1) * gradePerformanceItemsPerPage;
    const endIndex = startIndex + gradePerformanceItemsPerPage;
    return gradeSectionData.slice(startIndex, endIndex);
  }, [gradeSectionData, gradePerformancePage, gradePerformanceItemsPerPage]);

  // Pagination info for grade performance chart
  const gradePerformanceTotalPages = gradePerformanceItemsPerPage === 0 ? 1 : Math.ceil(gradeSectionData.length / gradePerformanceItemsPerPage);

  const attendanceRateData = useMemo(() => {
    return [
      { name: 'Present', value: summaryStats.totalStudents * (summaryStats.avgRate / 100), color: '#38B2AC' },
    ];
  }, [summaryStats]);

  // Update summary stats to always use filteredAttendanceData for consistency across tabs
  const updatedSummaryStats = useMemo(() => {
    const data = filteredAttendanceData;
    if (data.length === 0) return { avgRate: 0, totalStudents: studentsData?.data?.students?.length || 0, lowAttendance: 0, perfectAttendance: 0 };

    const totalRate = data.reduce((sum: number, item: any) => sum + item.rate, 0);
    const avgRate = totalRate / data.length;
    const totalStudents = studentsData?.data?.students?.length || 0;
    const lowAttendance = data.filter((item: any) => item.rate < 70).length;
    const perfectAttendance = data.filter((item: any) => item.rate === 100).length;
    return { avgRate, totalStudents, lowAttendance, perfectAttendance };
  }, [filteredAttendanceData, studentsData]);

  const exportToCSV = () => {
    const data = selectedReportType === 'daily-records' ? paginatedData : filteredStudentData;
    const headers = selectedReportType === 'daily-records'
      ? ['Date', 'Grade', 'Section', 'Present']
      : ['Student Name', 'Matric No', 'Grade', 'Date', 'Status', 'Section'];

    const csvContent = [
      headers.join(','),
      ...data.map((row: any) => {
        if (selectedReportType === 'daily-records') {
        return [row.date, row.grade, row.section, row.present].join(',');
        } else {
          return [row.student_name, row.matric_no, row.grade, row.date, row.status, row.section].join(',');
        }
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${selectedReportType}_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const data = selectedReportType === 'daily-records' ? paginatedData : filteredStudentData;

    // Add title
    doc.setFontSize(18);
    doc.text(`${REPORT_TYPES.find(t => t.value === selectedReportType)?.label} Report`, 14, 22);

    // Add filters info
    doc.setFontSize(12);
    let yPosition = 35;
    doc.text(`Grade: ${selectedGrade || 'All Grades'}`, 14, yPosition);
    yPosition += 7;
    doc.text(`Section: ${selectedSection || 'All Sections'}`, 14, yPosition);
    yPosition += 7;
    doc.text(`Date Range: ${selectedDateRange}`, 14, yPosition);
    yPosition += 7;
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, yPosition);

    // Prepare table data
    const tableColumns = selectedReportType === 'daily-records'
      ? ['Date', 'Grade', 'Section', 'Present']
      : ['Student Name', 'Matric No', 'Grade', 'Date', 'Status', 'Section'];

    const tableRows = data.map((row: any) => {
      if (selectedReportType === 'daily-records') {
        return [
          row.date,
          row.grade,
          row.section,
          row.present.toString()
        ];
      } else {
        return [
          row.student_name,
          row.matric_no,
          row.grade,
          row.date,
          row.status,
          row.section
        ];
      }
    });

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
    doc.save(`${selectedReportType}_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportStudentReportToCSV = (report: StudentDetailedReport) => {
    const headers = ['Date', 'Status', 'Time Type', 'Section', 'Created At'];
    const csvContent = [
      headers.join(','),
      ...report.attendanceRecords.map(row => [
        row.date,
        row.status,
        row.time_type || '',
        row.section,
        row.created_at
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `student_report_${report.student.name}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportStudentReportToPDF = (report: StudentDetailedReport) => {
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(18);
    doc.text('Student Attendance Report', 14, 22);

    // Add student info
    doc.setFontSize(12);
    let yPosition = 35;
    doc.text(`Student: ${report.student.name}`, 14, yPosition);
    yPosition += 7;
    doc.text(`Matric No: ${report.student.matric_no}`, 14, yPosition);
    yPosition += 7;
    doc.text(`Grade: ${report.student.grade}`, 14, yPosition);
    yPosition += 7;
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, yPosition);

    // Add summaries
    yPosition += 10;
    doc.setFontSize(14);
    doc.text('Attendance Summary', 14, yPosition);
    yPosition += 10;
    doc.setFontSize(10);
    const weeklyRate = report.summaries.weekly.total_days > 0 ? (report.summaries.weekly.present_days / report.summaries.weekly.total_days) * 100 : 0;
    doc.text(`Weekly: ${report.summaries.weekly.present_days}/${report.summaries.weekly.total_days} days (${weeklyRate.toFixed(1)}%)`, 14, yPosition);
    yPosition += 6;
    const monthlyRate = report.summaries.monthly.total_days > 0 ? (report.summaries.monthly.present_days / report.summaries.monthly.total_days) * 100 : 0;
    doc.text(`Monthly: ${report.summaries.monthly.present_days}/${report.summaries.monthly.total_days} days (${monthlyRate.toFixed(1)}%)`, 14, yPosition);
    yPosition += 6;
    const yearlyRate = report.summaries.yearly.total_days > 0 ? (report.summaries.yearly.present_days / report.summaries.yearly.total_days) * 100 : 0;
    doc.text(`Yearly: ${report.summaries.yearly.present_days}/${report.summaries.yearly.total_days} days (${yearlyRate.toFixed(1)}%)`, 14, yPosition);

    // Prepare table data
    const tableColumns = ['Date', 'Status', 'Time Type', 'Section'];
    const tableRows = report.attendanceRecords.map(row => [
      row.date,
      row.status,
      row.time_type || '',
      row.section
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
    doc.save(`student_report_${report.student.name}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // console.log('Student reports data:', studentReportsData); // Debug log - commented out for production

  // Filter student data to show separate logs for IN and OUT records
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
        item.matric_no.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
        item.status.toLowerCase().includes(studentSearchTerm.toLowerCase())
      );
    }

    return data;
  }, [studentAttendanceData, selectedStatus, startDate, endDate, studentSearchTerm]);

  // Sorted student data
  const sortedStudentData = useMemo(() => {
    if (!studentSortConfig) return filteredAndSearchedStudentData;

    return [...filteredAndSearchedStudentData].sort((a, b) => {
      const aValue = (a as any)[studentSortConfig.key];
      const bValue = (b as any)[studentSortConfig.key];

      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return studentSortConfig.direction === 'asc' ? -1 : 1;
      if (bValue == null) return studentSortConfig.direction === 'asc' ? 1 : -1;

      if (aValue < bValue) return studentSortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return studentSortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredAndSearchedStudentData, studentSortConfig]);

  // Pagination for students - use server-side pagination when available
  const studentTotalPages = studentReportsMeta?.total_pages || Math.ceil(sortedStudentData.length / itemsPerPage);
  const studentStartIndex = (studentCurrentPage - 1) * itemsPerPage;
  const studentPaginatedData = studentReportsMeta ? sortedStudentData : sortedStudentData.slice(studentStartIndex, studentStartIndex + itemsPerPage);

  return (
    <WithStaffLayout>
      <VStack spacing={2} align="center" marginBottom="2rem">
        <Heading fontSize={28} fontWeight={700} color="teal.600">
          Reports & Analytics
        </Heading>
      </VStack>

      {/* Unified Report Filters */}
      <Card marginBottom="2rem" padding="1rem">
        <VStack spacing={4} align="stretch">
          <Text fontWeight="bold" fontSize="lg">Report Filters</Text>
          <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }} gap={4} alignItems="end">
            <GridItem>
              <Text fontWeight="bold" marginBottom="0.5rem">Search</Text>
              <InputGroup>
                <InputLeftElement pointerEvents="none">
                  <SearchIcon color="gray.300" />
                </InputLeftElement>
                <Input
                  placeholder="Search records..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
                <Button
                  colorScheme="blue"
                  onClick={() => setSearchTerm(searchInput)}
                  ml={2}
                >
                  Search
                </Button>
              </InputGroup>
            </GridItem>
            <GridItem>
              <Text fontWeight="bold" marginBottom="0.5rem">Grade</Text>
              <Select value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)} placeholder="All Grades">
                <option value="">All Grades</option>
                {availableGrades.map(grade => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </Select>
            </GridItem>
            <GridItem>
              <Text fontWeight="bold" marginBottom="0.5rem">Section</Text>
              <Select value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} placeholder="All Sections">
                <option value="">All Sections</option>
                {selectedGrade ? sectionsForGrade.map((section: string) => (
                  <option key={section} value={section}>{section}</option>
                )) : availableSections.map((section: string) => (
                  <option key={section} value={section}>{section}</option>
                ))}
              </Select>
            </GridItem>

            <GridItem>
              <Text fontWeight="bold" marginBottom="0.5rem">Date Range</Text>
              <Select value={selectedDateRange} onChange={(e) => setSelectedDateRange(e.target.value)}>
                <option value="all">All Time</option>
                <option value="365days">Last 365 days</option>
                <option value="180days">Last 180 days</option>
                <option value="90days">Last 90 days</option>
                <option value="60days">Last 60 days</option>
                <option value="30days">Last 30 days</option>
                <option value="14days">Last 14 days</option>
                <option value="7days">Last 7 days</option>
              </Select>
            </GridItem>
          </Grid>

          {/* Date Range Picker - only for Student Summary */}
          {selectedReportType === 'student-summary' && (
            <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4} alignItems="end">
              <GridItem>
                <Text fontWeight="bold" marginBottom="0.5rem">
                  <CalendarIcon marginRight="0.5rem" />
                  Start Date
                </Text>
                <DatePicker
                  selected={startDate}
                  onChange={(date) => setStartDate(date)}
                  dateFormat="yyyy-MM-dd"
                  placeholderText="Select start date"
                  isClearable
                  className="date-picker-input"
                />
              </GridItem>
              <GridItem>
                <Text fontWeight="bold" marginBottom="0.5rem">
                  <CalendarIcon marginRight="0.5rem" />
                  End Date
                </Text>
                <DatePicker
                  selected={endDate}
                  onChange={(date) => setEndDate(date)}
                  dateFormat="yyyy-MM-dd"
                  placeholderText="Select end date"
                  isClearable
                  className="date-picker-input"
                />
              </GridItem>
            </Grid>
          )}

          {/* Export Options */}
          <Flex justifyContent="flex-end" gap={4}>
            <Menu>
              <MenuButton as={Button} rightIcon={<ChevronDownIcon />} colorScheme="blue">
                Export Report
              </MenuButton>
              <MenuList>
                <MenuItem onClick={exportToCSV}>Export as CSV</MenuItem>
                <MenuItem onClick={exportToPDF}>Export as PDF</MenuItem>
                <MenuItem onClick={() => {
                  const data = selectedReportType === 'daily-records' ? paginatedData : filteredStudentData;
                  const ws = XLSX.utils.json_to_sheet(data);
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, `${REPORT_TYPES.find(t => t.value === selectedReportType)?.label} Report`);
                  XLSX.writeFile(wb, `${selectedReportType}_report_${new Date().toISOString().split('T')[0]}.xlsx`);
                }}>Export as Excel</MenuItem>
              </MenuList>
            </Menu>
          </Flex>
        </VStack>
      </Card>

      <Tabs variant="enclosed" colorScheme="blue" index={REPORT_TYPES.findIndex(rt => rt.value === selectedReportType)} onChange={(index) => setSelectedReportType(REPORT_TYPES[index].value)}>
        <TabList>
          {REPORT_TYPES.map((reportType) => (
            <Tab key={reportType.value}>{reportType.label}</Tab>
          ))}
        </TabList>

        <TabPanels>
          {/* Daily Records Tab */}
          <TabPanel>



            {/* Attendance Percentage by Grade Chart */}
            <Grid templateColumns={{ base: '1fr' }} gap={6} marginBottom="2rem">
              <GridItem>
                <Card>
                  <Box padding="1rem">
                    <Heading size="md" marginBottom="1rem">Attendance Percentage by Grade</Heading>

                    {/* Pagination Controls */}
                    <Flex justifyContent="space-between" alignItems="center" marginBottom="1rem">
                      <HStack spacing={4}>
                        <Text fontSize="sm" color="gray.600">
                          Showing {attendancePercentageItemsPerPage === 0 ? gradeSectionData.length : paginatedAttendancePercentageData.length} of {gradeSectionData.length} sections
                        </Text>
                        <Select
                          size="sm"
                          value={attendancePercentageItemsPerPage}
                          onChange={(e) => {
                            setAttendancePercentageItemsPerPage(parseInt(e.target.value));
                            setAttendancePercentagePage(1); // Reset to first page
                          }}
                          width="120px"
                        >
                          <option value={10}>10 per page</option>
                          <option value={15}>15 per page</option>
                          <option value={20}>20 per page</option>
                          <option value={0}>Show All</option>
                        </Select>
                      </HStack>

                      {attendancePercentageItemsPerPage > 0 && (
                        <HStack spacing={2}>
                          <Button
                            size="sm"
                            onClick={() => setAttendancePercentagePage(prev => Math.max(prev - 1, 1))}
                            isDisabled={attendancePercentagePage === 1}
                          >
                            Previous
                          </Button>
                          <Text fontSize="sm" color="gray.600">
                            Page {attendancePercentagePage} of {attendancePercentageTotalPages}
                          </Text>
                          <Button
                            size="sm"
                            onClick={() => setAttendancePercentagePage(prev => Math.min(prev + 1, attendancePercentageTotalPages))}
                            isDisabled={attendancePercentagePage === attendancePercentageTotalPages}
                          >
                            Next
                          </Button>
                        </HStack>
                      )}
                    </Flex>

                    <Box overflowX="auto" width="100%" maxWidth="100%" sx={{ '&::-webkit-scrollbar': { height: '8px' }, '&::-webkit-scrollbar-track': { background: '#f1f1f1' }, '&::-webkit-scrollbar-thumb': { background: '#888', borderRadius: '4px' }, '&::-webkit-scrollbar-thumb:hover': { background: '#555' } }}>
                      <Box minWidth={Math.max(600, paginatedAttendancePercentageData.length * 80)} width="100%">
                        <ResponsiveContainer width={Math.max(600, paginatedAttendancePercentageData.length * 80)} height={300}>
                          <BarChart data={paginatedAttendancePercentageData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis domain={[0, 800]} ticks={[0, 50, 100, 200, 300, 400, 500, 600, 700, 800]} tickFormatter={(value) => Math.round(value).toString()} />
                            <Tooltip
                              formatter={(value: any, name: string) => {
                                if (name === 'Present') {
                                  const entry = paginatedAttendancePercentageData.find((d: any) => d.present === value);
                                  return [`${Math.round(value)} (${entry?.presentPercentage || 0}%)`, name];
                                } else if (name === 'Absent') {
                                  const entry = paginatedAttendancePercentageData.find((d: any) => d.absent === value);
                                  return [`${Math.round(value)} (${entry?.absentPercentage || 0}%)`, name];
                                }
                                return [`${Math.round(value)}`, name];
                              }}
                            />
                            <Legend />
                            <Bar dataKey="present" name="Present" fill="#38B2AC">
                              {paginatedAttendancePercentageData.map((entry, index) => (
                                <Cell key={`cell-present-${index}`} fill="#38B2AC" />
                              ))}
                            </Bar>
                            <Bar dataKey="absent" name="Absent" fill="#E53E3E">
                              {paginatedAttendancePercentageData.map((entry, index) => (
                                <Cell key={`cell-absent-${index}`} fill="#E53E3E" />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </Box>
                    </Box>
                    <Text fontSize="sm" color="gray.600" marginTop="0.5rem">
                      This chart shows the comparison of present and absent students for each grade and section combination. Green bars represent present students, red bars represent absent students. Hover over bars to see percentages. This provides a clear visual comparison of attendance patterns across different classes. Scroll horizontally if there are many sections to view all data.
                    </Text>
                  </Box>
                </Card>
              </GridItem>
            </Grid>

            {/* Detailed Attendance Report Table */}
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
                      </Tr>
                    </Thead>
                    <Tbody>
                      {paginatedData.map((row: any, index: number) => (
                        <Tr key={index}>
                          <Td>{new Date(row.date).toLocaleDateString()}</Td>
                          <Td>{row.grade}</Td>
                          <Td>{row.section}</Td>
                          <Td
                            color="green.500"
                            cursor="pointer"
                            _hover={{ textDecoration: 'underline' }}
                            onClick={() => {
                              console.log('Raw row data:', row); // Debug log
                              // row.date should already be in YYYY-MM-DD format from the API
                              const modalDate = row.date;
                              console.log('Setting modal date to:', modalDate); // Debug log
                              setListModalDate(modalDate);
                              setListModalGrade(row.grade);
                              setListModalSection(row.section);
                              setListModalStatus('present');
                              setIsListModalOpen(true);
                            }}
                          >
                            {row.present}
                          </Td>
                          <Td
                            color="red.500"
                            cursor="pointer"
                            _hover={{ textDecoration: 'underline' }}
                            onClick={() => {
                              // row.date should already be in YYYY-MM-DD format from the API
                              const modalDate = row.date;
                              setListModalDate(modalDate);
                              setListModalGrade(row.grade);
                              setListModalSection(row.section);
                              setListModalStatus('absent');
                              setIsListModalOpen(true);
                            }}
                          >
                            {row.absent}
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>

                {/* Pagination Controls */}
                {totalPages >= 1 && (
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

          {/* Student Summary Tab */}
          <TabPanel>
            <VStack spacing={4} align="stretch">
              <Heading size="md">Student Attendance Summary</Heading>



              {/* Student Attendance Table */}
              <Card>
                <Box padding="1rem">
                  <Heading size="md" marginBottom="1rem">Student Attendance Records</Heading>
                  <TableContainer>
                    <Table variant="simple">
                      <Thead>
                        <Tr>
                          <Th>Student Name</Th>
                          <Th>Matric No</Th>
                          <Th>Grade</Th>
                          <Th>Date</Th>
                          <Th>Time</Th>
                          <Th>Status</Th>
                          <Th>Section</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {studentPaginatedData.map((row: any, index: number) => (
                          <Tr key={index}>
                            <Td>{row.student_name}</Td>
                            <Td>{row.matric_no}</Td>
                            <Td>{row.grade}</Td>
                            <Td>{new Date(row.date).toLocaleDateString()}</Td>
                            <Td>{row.created_at ? dayjs(row.created_at).format('hh:mm A') : '-'}</Td>
                            <Td>
                              <Badge colorScheme={row.status === 'present' ? 'green' : row.status === 'departure' ? 'blue' : 'red'}>
                                {row.status}
                              </Badge>
                            </Td>
                            <Td>{row.section}</Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </TableContainer>

                  {/* Pagination for students */}
                  {studentTotalPages >= 1 && (
                    <Box marginTop="1rem" display="flex" justifyContent="center" alignItems="center" gap={2}>
                      <Button
                        size="sm"
                        onClick={() => setStudentCurrentPage(prev => Math.max(prev - 1, 1))}
                        isDisabled={studentCurrentPage === 1}
                      >
                        Previous
                      </Button>
                      {Array.from({ length: studentTotalPages }, (_, i) => i + 1).map(page => (
                        <Button
                          key={page}
                          size="sm"
                          colorScheme={studentCurrentPage === page ? 'blue' : 'gray'}
                          onClick={() => setStudentCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      ))}
                      <Button
                        size="sm"
                        onClick={() => setStudentCurrentPage(prev => Math.min(prev + 1, studentTotalPages))}
                        isDisabled={studentCurrentPage === studentTotalPages}
                      >
                        Next
                      </Button>
                    </Box>
                  )}
                </Box>
              </Card>
            </VStack>
          </TabPanel>



          {/* Attendance Trends Tab */}
          <TabPanel>
            <VStack spacing={4} align="stretch">
              <Heading size="md">Attendance Trends</Heading>

              {/* Attendance Trend Chart */}
              <Card>
                <Box padding="1rem">
                  <Heading size="md" marginBottom="1rem">Attendance Trend Over Time</Heading>
                  <Box overflowX="auto" width="100%" maxWidth="100%" sx={{ '&::-webkit-scrollbar': { height: '8px' }, '&::-webkit-scrollbar-track': { background: '#f1f1f1' }, '&::-webkit-scrollbar-thumb': { background: '#888', borderRadius: '4px' }, '&::-webkit-scrollbar-thumb:hover': { background: '#555' } }}>
                    <Box minWidth={Math.max(600, attendanceTrendData.length * 60)} width="100%">
                        <ResponsiveContainer width={Math.max(600, attendanceTrendData.length * 60)} height={400}>
                        <LineChart data={attendanceTrendData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString()} />
                          <YAxis domain={[0, 800]} ticks={[0, 50, 100, 200, 300, 400, 500, 600, 700, 800]} tickFormatter={(value) => Math.round(value).toString()} />
                          <Tooltip
                            labelFormatter={(value) => `Date: ${new Date(value).toLocaleDateString()}`}
                            formatter={(value: any) => [`${Math.round(value)}`, 'Present']}
                          />
                          <Legend />
                          <Line type="monotone" dataKey="present" stroke="#38B2AC" name="Present" />
                        </LineChart>
                      </ResponsiveContainer>
                    </Box>
                  </Box>
                  <Text fontSize="sm" color="gray.600" marginTop="0.5rem">
                    This line chart shows the total number of students who checked in as present each day. Since the system only tracks successful biometric check-ins, higher points indicate more students attended that day. Use this to spot attendance patterns, busy days, or unusual drops in participation. Scroll horizontally if there are many data points to view all trends.
                  </Text>
                </Box>
              </Card>

              {/* Weekly Attendance Patterns */}
              <Card>
                <Box padding="1rem">
                  <Heading size="md" marginBottom="1rem">Weekly Attendance Patterns</Heading>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={weeklyAttendanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis domain={[0, 800]} ticks={[0, 50, 100, 200, 300, 400, 500, 600, 700, 800]} tickFormatter={(value) => Math.round(value).toString()} />
                      <Tooltip
                        formatter={(value: any, name: string) => [
                          name === 'averagePresent' ? `${Math.round(value)} students` : Math.round(value),
                          name === 'averagePresent' ? 'Average Present' : name
                        ]}
                        labelFormatter={(label) => `Day: ${label}`}
                      />
                      <Legend />
                      <Bar dataKey="averagePresent" fill="#38B2AC" name="Average Present" />
                    </BarChart>
                  </ResponsiveContainer>
                  <Text fontSize="sm" color="gray.600" marginTop="0.5rem">
                    This bar chart shows the average number of students who attend each day of the week. Higher bars indicate days with better attendance. This helps identify patterns like lower attendance on certain weekdays or weekends.
                  </Text>
                </Box>
              </Card>
            </VStack>
          </TabPanel>

          {/* Attendance Patterns Tab */}
          <TabPanel>
            <VStack spacing={4} align="stretch">
              <Heading size="md">Attendance Patterns</Heading>



              {/* Grade-Section Attendance Patterns */}
              <Card>
                <Box padding="1rem">
                  <Heading size="md" marginBottom="1rem">Grade-Section Attendance Patterns</Heading>

                  {/* Pagination Controls */}
                  <Flex justifyContent="space-between" alignItems="center" marginBottom="1rem">
                    <HStack spacing={4}>
                      <Text fontSize="sm" color="gray.600">
                        Showing {gradeSectionItemsPerPage === 0 ? gradeSectionData.length : paginatedGradeSectionData.length} of {gradeSectionData.length} sections
                      </Text>
                      <Select
                        size="sm"
                        value={gradeSectionItemsPerPage}
                        onChange={(e) => {
                          setGradeSectionItemsPerPage(parseInt(e.target.value));
                          setGradeSectionPage(1); // Reset to first page
                        }}
                        width="120px"
                      >
                        <option value={10}>10 per page</option>
                        <option value={15}>15 per page</option>
                        <option value={20}>20 per page</option>
                        <option value={0}>Show All</option>
                      </Select>
                    </HStack>

                    {gradeSectionItemsPerPage > 0 && (
                      <HStack spacing={2}>
                        <Button
                          size="sm"
                          onClick={() => setGradeSectionPage(prev => Math.max(prev - 1, 1))}
                          isDisabled={gradeSectionPage === 1}
                        >
                          Previous
                        </Button>
                        <Text fontSize="sm" color="gray.600">
                          Page {gradeSectionPage} of {gradeSectionTotalPages}
                        </Text>
                        <Button
                          size="sm"
                          onClick={() => setGradeSectionPage(prev => Math.min(prev + 1, gradeSectionTotalPages))}
                          isDisabled={gradeSectionPage === gradeSectionTotalPages}
                        >
                          Next
                        </Button>
                      </HStack>
                    )}
                  </Flex>

                  <Box overflowX="auto" width="100%" maxWidth="100%" sx={{ '&::-webkit-scrollbar': { height: '8px' }, '&::-webkit-scrollbar-track': { background: '#f1f1f1' }, '&::-webkit-scrollbar-thumb': { background: '#888', borderRadius: '4px' }, '&::-webkit-scrollbar-thumb:hover': { background: '#555' } }}>
                    <Box minWidth={Math.max(600, paginatedGradeSectionData.length * 80)} width="100%">
                        <ResponsiveContainer width={Math.max(600, paginatedGradeSectionData.length * 80)} height={300}>
                        <BarChart data={paginatedGradeSectionData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis domain={[0, 800]} ticks={[0, 50, 100, 200, 300, 400, 500, 600, 700, 800]} tickFormatter={(value) => Math.round(value).toString()} />
                          <Tooltip formatter={(value: any) => [`${Math.round(value)}`, 'Present']} />
                          <Legend />
                          <Bar dataKey="present" name="Present">
                            {paginatedGradeSectionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </Box>
                  <Text fontSize="sm" color="gray.600" marginTop="0.5rem">
                    This bar chart compares attendance across different grade and section combinations. Each bar represents a specific class group, with colors indicating different grades. Use pagination controls to view all sections.
                  </Text>
                </Box>
              </Card>

              {/* Grade Performance Comparison */}
              <Card>
                <Box padding="1rem">
                  <Heading size="md" marginBottom="1rem">Grade Performance Comparison</Heading>

                  {/* Pagination Controls */}
                  <Flex justifyContent="space-between" alignItems="center" marginBottom="1rem">
                    <HStack spacing={4}>
                      <Text fontSize="sm" color="gray.600">
                        Showing {gradePerformanceItemsPerPage === 0 ? gradeSectionData.length : paginatedGradePerformanceData.length} of {gradeSectionData.length} sections
                      </Text>
                      <Select
                        size="sm"
                        value={gradePerformanceItemsPerPage}
                        onChange={(e) => {
                          setGradePerformanceItemsPerPage(parseInt(e.target.value));
                          setGradePerformancePage(1); // Reset to first page
                        }}
                        width="120px"
                      >
                        <option value={10}>10 per page</option>
                        <option value={15}>15 per page</option>
                        <option value={20}>20 per page</option>
                        <option value={0}>Show All</option>
                      </Select>
                    </HStack>

                    {gradePerformanceItemsPerPage > 0 && (
                      <HStack spacing={2}>
                        <Button
                          size="sm"
                          onClick={() => setGradePerformancePage(prev => Math.max(prev - 1, 1))}
                          isDisabled={gradePerformancePage === 1}
                        >
                          Previous
                        </Button>
                        <Text fontSize="sm" color="gray.600">
                          Page {gradePerformancePage} of {gradePerformanceTotalPages}
                        </Text>
                        <Button
                          size="sm"
                          onClick={() => setGradePerformancePage(prev => Math.min(prev + 1, gradePerformanceTotalPages))}
                          isDisabled={gradePerformancePage === gradePerformanceTotalPages}
                        >
                          Next
                        </Button>
                      </HStack>
                    )}
                  </Flex>

                  <Box overflowX="auto" width="100%" maxWidth="100%" sx={{ '&::-webkit-scrollbar': { height: '8px' }, '&::-webkit-scrollbar-track': { background: '#f1f1f1' }, '&::-webkit-scrollbar-thumb': { background: '#888', borderRadius: '4px' }, '&::-webkit-scrollbar-thumb:hover': { background: '#555' } }}>
                    <Box minWidth={Math.max(600, paginatedGradePerformanceData.length * 80)} width="100%">
                      <ResponsiveContainer width={Math.max(600, paginatedGradePerformanceData.length * 80)} height={300}>
                        <BarChart data={paginatedGradePerformanceData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis domain={[0, 800]} ticks={[0, 50, 100, 200, 300, 400, 500, 600, 700, 800]} tickFormatter={(value) => Math.round(value).toString()} />
                          <Tooltip formatter={(value: any) => [`${Math.round(value)}`, 'Present']} />
                          <Legend />
                          <Bar dataKey="present" name="Present">
                            {paginatedGradePerformanceData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </Box>
                  <Text fontSize="sm" color="gray.600" marginTop="0.5rem">
                    This bar chart shows the number of present students for each grade-section combination. Higher bars indicate more students attended in that specific group. Scroll horizontally if there are many sections to view all data.
                  </Text>
                </Box>
              </Card>

              {/* Check-in Time Distribution */}
              <Card>
                <Box padding="1rem">
                  <Heading size="md" marginBottom="1rem">Check-in Time Distribution</Heading>
                  <Text fontSize="sm" color="gray.600" marginBottom="1rem">
                    Visual timeline showing peak scanning periods during the morning (6 AM - 12 PM)
                  </Text>

                  {checkInTimeAnalysisLoading ? (
                    <Center>
                      <Spinner size="lg" />
                    </Center>
                  ) : !checkInTimeAnalysisData?.data?.data || checkInTimeAnalysisData.data.data.length === 0 ? (
                    <Alert status="info">
                      <AlertIcon />
                      <AlertTitle>No check-in data available</AlertTitle>
                      <AlertDescription>
                        No check-in time data found for the selected filters. Try adjusting your date range or filters.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={checkInTimeAnalysisData.data.data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="timeRange"
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          interval={0}
                        />
                        <YAxis domain={[0, 800]} ticks={[0, 50, 100, 200, 300, 400, 500, 600, 700, 800]} tickFormatter={(value) => Math.round(value).toString()} />
                        <Tooltip
                          formatter={(value: any) => [`${Math.round(value)} check-ins`, 'Count']}
                          labelFormatter={(label) => `Time: ${label}`}
                        />
                        <Legend />
                        <Bar dataKey="count" fill="#3BB4C1" name="Check-ins" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}

                  {/* Debug info for troubleshooting - hidden in production */}
                  {/* <Text fontSize="xs" color="gray.500" marginTop="1rem">
                    Debug: Data length: {checkInTimeAnalysisData?.data?.data?.length || 0}, Loading: {checkInTimeAnalysisLoading ? 'true' : 'false'}, Data: {JSON.stringify(checkInTimeAnalysisData?.data?.data)}
                  </Text> */}

                  <Text fontSize="sm" color="gray.600" marginTop="0.5rem">
                    This chart displays when students typically check in during the morning hours (6 AM - 12 PM). Higher bars indicate peak check-in times, helping identify the busiest periods for attendance monitoring.
                  </Text>
                </Box>
              </Card>
            </VStack>
          </TabPanel>




        </TabPanels>
      </Tabs>



      {/* Student List Modal */}
      <StudentListModal
        isOpen={isListModalOpen}
        onClose={() => setIsListModalOpen(false)}
        date={listModalDate}
        grade={listModalGrade}
        section={listModalSection}
        status={listModalStatus}
      />
    </WithStaffLayout>
  );
};

export default Reports;
