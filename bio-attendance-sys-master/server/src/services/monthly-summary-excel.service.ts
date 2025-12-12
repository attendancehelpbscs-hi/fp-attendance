import ExcelJS from 'exceljs';

interface MonthlySummaryData {
  year: number;
  totalStudents: number;
  monthlySummaries: Array<{
    month: string;
    monthKey: string;
    totalStudents: number;
    schoolDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    absencePercentage: number;
    latePercentage: number;
    days: Array<{
      date: string;
      isWeekend: boolean;
      isHoliday: boolean;
      present: number;
      absent: number;
      late: number;
      total: number;
    } | null>;
  }>;
}

export const generateMonthlySummaryExcel = async (data: MonthlySummaryData): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Monthly Attendance Summary');

  worksheet.pageSetup = {
    orientation: 'landscape',
    margins: {
      left: 0.5,
      right: 0.5,
      top: 0.5,
      bottom: 0.5,
      header: 0.3,
      footer: 0.3,
    },
  };

  // Set column widths first
  worksheet.columns = [
    { key: 'month', width: 15 },
    { key: 'totalStudents', width: 12 },
    { key: 'schoolDays', width: 12 },
    { key: 'presentDays', width: 12 },
    { key: 'absentDays', width: 12 },
    { key: 'lateDays', width: 10 },
    { key: 'absencePercentage', width: 12 },
    { key: 'latePercentage', width: 10 },
  ];

  // Title
  worksheet.addRow({ month: `Monthly Attendance Summary - ${data.year}` });
  const titleRow = worksheet.getRow(1);
  titleRow.font = { bold: true, size: 16 };
  titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.mergeCells('A1:H1');

  // Summary Statistics
  worksheet.addRow({}); // Empty row
  worksheet.addRow({ month: 'Summary Statistics' });
  const summaryTitleRow = worksheet.getRow(3);
  summaryTitleRow.font = { bold: true, size: 12 };

  worksheet.addRow({}); // Empty row
  worksheet.addRow({
    month: 'Total Students',
    totalStudents: data.totalStudents
  });

  worksheet.addRow({
    month: 'Total School Days',
    totalStudents: data.monthlySummaries.reduce((sum, month) => sum + month.schoolDays, 0)
  });

  worksheet.addRow({
    month: 'Total Absences',
    totalStudents: data.monthlySummaries.reduce((sum, month) => sum + month.absentDays, 0)
  });

  worksheet.addRow({
    month: 'Total Lates',
    totalStudents: data.monthlySummaries.reduce((sum, month) => sum + month.lateDays, 0)
  });

  // Monthly Summary Table
  worksheet.addRow({}); // Empty row
  worksheet.addRow({ month: `Monthly Attendance Summary - ${data.year}` });
  const tableTitleRow = worksheet.getRow(9);
  tableTitleRow.font = { bold: true, size: 14 };
  tableTitleRow.alignment = { horizontal: 'center' };
  worksheet.mergeCells('A9:H9');

  // Table Headers
  worksheet.addRow({}); // Empty row
  const headerRow = worksheet.addRow({
    month: 'Month',
    totalStudents: 'Total Students',
    schoolDays: 'School Days',
    presentDays: 'Present Days',
    absentDays: 'Absent Days',
    lateDays: 'Late Days',
    absencePercentage: 'Absence %',
    latePercentage: 'Late %',
  });
  headerRow.font = { bold: true, size: 10 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD9D9D9' },
  };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

  // Add borders to header
  for (let col = 1; col <= 8; col++) {
    const cell = headerRow.getCell(col);
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  }

  // Table Data
  data.monthlySummaries.forEach((month) => {
    const dataRow = worksheet.addRow({
      month: month.month,
      totalStudents: month.totalStudents,
      schoolDays: month.schoolDays,
      presentDays: month.presentDays,
      absentDays: month.absentDays,
      lateDays: month.lateDays,
      absencePercentage: `${month.absencePercentage.toFixed(1)}%`,
      latePercentage: `${month.latePercentage.toFixed(1)}%`,
    });
    dataRow.alignment = { horizontal: 'center', vertical: 'middle' };
    dataRow.font = { size: 10 };

    // Add borders to data row
    for (let col = 1; col <= 8; col++) {
      const cell = dataRow.getCell(col);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};