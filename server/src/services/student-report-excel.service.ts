import ExcelJS from 'exceljs';

interface StudentReportData {
  student: {
    id: string;
    name: string;
    matric_no?: string;
    grade: string;
  };
  attendanceRecords: Array<{
    date: string;
    status: string;
    time_type: string;
    section?: string;
    created_at: Date;
  }>;
}

export const generateStudentReportExcel = async (data: StudentReportData): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Student Attendance Report');

  worksheet.pageSetup = {
    orientation: 'portrait',
    margins: {
      left: 0.5,
      right: 0.5,
      top: 0.75,
      bottom: 0.75,
      header: 0.3,
      footer: 0.3,
    },
  };

  // Set column widths
  worksheet.columns = [
    { key: 'date', header: 'Date', width: 12 },
    { key: 'status', header: 'Status', width: 10 },
    { key: 'timeType', header: 'Time Type', width: 12 },
    { key: 'section', header: 'Section', width: 12 },
    { key: 'timestamp', header: 'Timestamp', width: 18 },
  ];

  // Professional Header Section
  worksheet.addRow({ date: 'SCHOOL ATTENDANCE MANAGEMENT SYSTEM' });
  const headerRow1 = worksheet.getRow(1);
  headerRow1.font = { bold: true, size: 20, color: { argb: 'FF003366' } };
  headerRow1.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.mergeCells('A1:E1');

  worksheet.addRow({ date: 'INDIVIDUAL STUDENT ATTENDANCE REPORT' });
  const headerRow2 = worksheet.getRow(2);
  headerRow2.font = { bold: true, size: 16, color: { argb: 'FF0066CC' } };
  headerRow2.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.mergeCells('A2:E2');

  worksheet.addRow({ date: `Report Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}` });
  const headerRow3 = worksheet.getRow(3);
  headerRow3.font = { size: 10, italic: true, color: { argb: 'FF666666' } };
  headerRow3.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.mergeCells('A3:E3');

  // Enhanced Student Information Section
  worksheet.addRow({}); // Empty row
  worksheet.addRow({ date: 'STUDENT PROFILE' });
  const studentInfoRow = worksheet.getRow(5);
  studentInfoRow.font = { bold: true, size: 14, color: { argb: 'FF003366' } };
  studentInfoRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE3F2FD' },
  };
  worksheet.mergeCells('A5:E5');

  worksheet.addRow({}); // Empty row
  worksheet.addRow({ date: 'Full Name:', status: data.student.name });
  worksheet.addRow({ date: 'Student ID:', status: data.student.matric_no || 'N/A' });
  worksheet.addRow({ date: 'Grade Level:', status: data.student.grade });
  worksheet.addRow({ date: 'Report Period:', status: 'All Available Records' });

  // Enhanced Attendance Summary with Color Indicators
  const totalRecords = data.attendanceRecords.length;
  const presentCount = data.attendanceRecords.filter(r => r.status === 'present').length;
  const absentCount = data.attendanceRecords.filter(r => r.status === 'absent').length;
  const lateCount = data.attendanceRecords.filter(r => r.status === 'present' && r.time_type === 'IN' && r.created_at.getHours() >= 8).length;
  const attendanceRate = totalRecords > 0 ? ((presentCount / totalRecords) * 100).toFixed(1) : '0.0';

  worksheet.addRow({}); // Empty row

  // Color Legend Section
  worksheet.addRow({ date: 'ATTENDANCE STATUS LEGEND' });
  const legendRow = worksheet.getRow(12);
  legendRow.font = { bold: true, size: 12, color: { argb: 'FF003366' } };
  legendRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE3F2FD' },
  };
  worksheet.mergeCells('A12:E12');

  worksheet.addRow({}); // Empty row

  // Legend with color indicators
  const legendData = [
    { label: 'Present Days', color: 'FF28A745', count: presentCount },
    { label: 'Absent Days', color: 'FFDC3545', count: absentCount },
    { label: 'Late Arrivals', color: 'FFFFC107', count: lateCount }
  ];

  legendData.forEach((item) => {
    const row = worksheet.addRow({
      date: item.label,
      status: item.count.toString(),
      timeType: `Rate: ${item.label === 'Present Days' ? attendanceRate + '%' : ''}`
    });

    // Color indicator in the first cell
    row.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: item.color },
    };
    row.getCell(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };
    row.getCell(2).font = { bold: true };
  });

  worksheet.addRow({}); // Empty row

  worksheet.addRow({ date: 'ATTENDANCE STATISTICS SUMMARY' });
  const summaryRow = worksheet.getRow(worksheet.rowCount);
  summaryRow.font = { bold: true, size: 14, color: { argb: 'FF003366' } };
  summaryRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE8F5E8' },
  };
  worksheet.mergeCells(`A${worksheet.rowCount}:E${worksheet.rowCount}`);

  worksheet.addRow({}); // Empty row
  worksheet.addRow({ date: 'Total Attendance Records:', status: totalRecords.toString() });
  worksheet.addRow({ date: 'Overall Attendance Rate:', status: `${attendanceRate}%` });

  // Professional Attendance Records Table
  worksheet.addRow({}); // Empty row
  worksheet.addRow({}); // Empty row
  worksheet.addRow({ date: 'DETAILED ATTENDANCE RECORD' });
  const tableTitleRow = worksheet.getRow(20);
  tableTitleRow.font = { bold: true, size: 16, color: { argb: 'FF003366' } };
  tableTitleRow.alignment = { horizontal: 'center' };
  worksheet.mergeCells('A20:E20');

  // Summary bar
  worksheet.addRow({}); // Empty row
  worksheet.addRow({
    date: `Student: ${data.student.name}`,
    status: `Attendance Rate: ${attendanceRate}%`,
    timeType: `Total Records: ${totalRecords}`,
    section: `Late Arrivals: ${lateCount}`
  });
  const summaryBarRow = worksheet.getRow(22);
  summaryBarRow.font = { bold: true, size: 10, color: { argb: 'FF003366' } };
  summaryBarRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE3F2FD' },
  };
  summaryBarRow.alignment = { horizontal: 'center', vertical: 'middle' };

  // Table Headers
  worksheet.addRow({}); // Empty row
  const headerRow = worksheet.addRow({
    date: 'Date',
    status: 'Attendance Status',
    timeType: 'Check-in Type',
    section: 'Section/Class',
    timestamp: 'Timestamp',
  });
  headerRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF003366' },
  };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.height = 25;

  // Enhanced borders for header
  for (let col = 1; col <= 5; col++) {
    const cell = headerRow.getCell(col);
    cell.border = {
      top: { style: 'thick', color: { argb: 'FF000000' } },
      left: { style: 'medium', color: { argb: 'FF000000' } },
      bottom: { style: 'thick', color: { argb: 'FF000000' } },
      right: { style: 'medium', color: { argb: 'FF000000' } },
    };
  }

  // Enhanced Table Data with Prominent Color Indicators
  const sortedRecords = data.attendanceRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  sortedRecords.forEach((record, index) => {
    const dataRow = worksheet.addRow({
      date: new Date(record.date).toLocaleDateString(),
      status: record.status.charAt(0).toUpperCase() + record.status.slice(1),
      timeType: record.time_type,
      section: record.section || 'N/A',
      timestamp: record.created_at.toLocaleString(),
    });
    dataRow.alignment = { horizontal: 'center', vertical: 'middle' };
    dataRow.font = { size: 10 };
    dataRow.height = 22;

    // Enhanced Status-based row colors and prominent indicators
    let rowFillColor = 'FFFFFFFF'; // Default white
    let statusBgColor = 'FFFFFFFF'; // Default for status cell
    let statusFontColor = 'FF000000'; // Default black

    if (record.status === 'present') {
      rowFillColor = index % 2 === 0 ? 'FFE8F5E8' : 'FFF1F8E9'; // Light green row
      statusBgColor = 'FF28A745'; // Bright green for status cell
      statusFontColor = 'FFFFFFFF'; // White text on green
    } else if (record.status === 'absent') {
      rowFillColor = index % 2 === 0 ? 'FFFFEBEE' : 'FFFCE4EC'; // Light red row
      statusBgColor = 'FFDC3545'; // Bright red for status cell
      statusFontColor = 'FFFFFFFF'; // White text on red
    } else {
      rowFillColor = index % 2 === 0 ? 'FFF5F5F5' : 'FFFAFAFA'; // Light gray row
      statusBgColor = 'FF6C757D'; // Gray for status cell
      statusFontColor = 'FFFFFFFF'; // White text on gray
    }

    // Late arrival highlighting - orange accent
    const isLate = record.status === 'present' && record.time_type === 'IN' && record.created_at.getHours() >= 8;
    const timeBgColor = isLate ? 'FFFFC107' : rowFillColor; // Yellow background for late
    const timeFontColor = isLate ? 'FF856404' : 'FF000000'; // Dark orange text for late

    for (let col = 1; col <= 5; col++) {
      const cell = dataRow.getCell(col);

      // Special handling for status and time columns
      if (col === 2) { // Status column - bright color background
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: statusBgColor },
        };
        cell.font = { size: 10, color: { argb: statusFontColor }, bold: true };
      } else if (col === 5 && isLate) { // Timestamp column for late arrivals
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: timeBgColor },
        };
        cell.font = { size: 10, color: { argb: timeFontColor }, bold: true };
      } else {
        // Regular row coloring for other columns
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: rowFillColor },
        };
      }

      // Enhanced borders for better definition
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFADB5BD' } },
        left: { style: 'thin', color: { argb: 'FFADB5BD' } },
        bottom: { style: 'thin', color: { argb: 'FFADB5BD' } },
        right: { style: 'thin', color: { argb: 'FFADB5BD' } },
      };
    }
  });

  // Professional Footer Section
  worksheet.addRow({}); // Empty row
  worksheet.addRow({}); // Empty row

  // Footer information box
  worksheet.addRow({ date: 'REPORT INFORMATION' });
  const footerInfoRow = worksheet.getRow(worksheet.rowCount);
  footerInfoRow.font = { bold: true, size: 11, color: { argb: 'FF003366' } };
  footerInfoRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE3F2FD' },
  };
  worksheet.mergeCells(`A${worksheet.rowCount}:E${worksheet.rowCount}`);

  worksheet.addRow({ date: 'Generated by:', status: 'School Attendance Management System' });
  worksheet.addRow({ date: 'Report Date:', status: new Date().toLocaleDateString() });
  worksheet.addRow({ date: 'Student:', status: data.student.name });
  worksheet.addRow({ date: 'Total Records:', status: totalRecords.toString() });

  // System footer
  worksheet.addRow({}); // Empty row
  worksheet.addRow({ date: 'This is an official student attendance report. Please keep this document for your records.' });
  const systemFooterRow = worksheet.getRow(worksheet.rowCount);
  systemFooterRow.font = { size: 9, italic: true, color: { argb: 'FF666666' } };
  systemFooterRow.alignment = { horizontal: 'center' };
  worksheet.mergeCells(`A${worksheet.rowCount}:E${worksheet.rowCount}`);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};