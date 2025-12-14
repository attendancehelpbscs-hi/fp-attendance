import ExcelJS from 'exceljs';
import { SF2Data } from '../interfaces/sf2.interface';

export const generateSF2Excel = async (data: SF2Data): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('SF2 Daily Attendance Report');

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


  // Title row
  worksheet.insertRows(1, [
    { title: 'School Form 2 (SF2) Daily Attendance Report of Learners' },
  ]);

  const titleRow = worksheet.getRow(1);
  titleRow.font = { bold: true, size: 16 };
  titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.mergeCells(`A1:${getColumnLetter(3 + data.schoolDays.length * 2 + 3)}1`);

  // Form fields section - better aligned layout
  worksheet.insertRows(2, ['']); // Empty row for spacing

  // Row 3: School ID and School Year
  worksheet.insertRows(3, ['']);
  const schoolIdRow = worksheet.getRow(3);
  schoolIdRow.getCell(1).value = 'School ID';
  schoolIdRow.getCell(2).value = data.schoolId;
  schoolIdRow.getCell(5).value = 'School Year';
  schoolIdRow.getCell(6).value = data.schoolYear;
  schoolIdRow.font = { size: 10 };
  schoolIdRow.alignment = { horizontal: 'left', vertical: 'middle' };

  // Add borders for School ID box
  for (let col = 1; col <= 3; col++) {
    const cell = schoolIdRow.getCell(col);
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  }

  // Add borders for School Year box
  for (let col = 5; col <= 7; col++) {
    const cell = schoolIdRow.getCell(col);
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  }

  // Row 4: Name of School and Report for the Month of
  worksheet.insertRows(4, ['']);
  const schoolNameRow = worksheet.getRow(4);
  schoolNameRow.getCell(1).value = 'Name of School';
  schoolNameRow.getCell(2).value = data.schoolName;
  schoolNameRow.getCell(5).value = 'Report for the Month of';
  schoolNameRow.getCell(6).value = data.month;
  schoolNameRow.font = { size: 10 };
  schoolNameRow.alignment = { horizontal: 'left', vertical: 'middle' };

  // Add borders for Name of School box
  for (let col = 1; col <= 3; col++) {
    const cell = schoolNameRow.getCell(col);
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  }

  // Add borders for Month box
  for (let col = 5; col <= 7; col++) {
    const cell = schoolNameRow.getCell(col);
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  }

  // Row 5: Grade Level and Section
  worksheet.insertRows(5, ['']);
  const gradeSectionRow = worksheet.getRow(5);
  gradeSectionRow.getCell(1).value = 'Grade Level';
  gradeSectionRow.getCell(2).value = data.grade;
  gradeSectionRow.getCell(5).value = 'Section';
  gradeSectionRow.getCell(6).value = data.section;
  gradeSectionRow.font = { size: 10 };
  gradeSectionRow.alignment = { horizontal: 'left', vertical: 'middle' };

  // Add borders for Grade Level box
  for (let col = 1; col <= 3; col++) {
    const cell = gradeSectionRow.getCell(col);
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  }

  // Add borders for Section box
  for (let col = 5; col <= 7; col++) {
    const cell = gradeSectionRow.getCell(col);
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  }

  // Define columns
  worksheet.columns = [
    { header: 'No.', key: 'no', width: 5 },
    { header: 'NAME OF LEARNER', key: 'name', width: 30 },
    { header: 'LRN', key: 'matric_no', width: 15 },
    ...data.schoolDays.flatMap(day => [
      { header: formatDateForHeader(day), key: `${day}_am`, width: 6 },
      { header: '', key: `${day}_pm`, width: 6 },
    ]),
    { header: 'Total\nAbsences', key: 'absent', width: 8 },
    { header: 'Total\nTardy/Late', key: 'tardy_late', width: 10 },
    { header: 'Remarks', key: 'remarks', width: 20 },
  ];

  // Add some spacing
  worksheet.insertRows(6, ['']);

  let rowNum = 7;

  // Main header row 1 (dates)
  const dateHeaderRow = worksheet.getRow(rowNum);
  const dateHeaderValues: Record<string, string> = {
    no: '',
    name: '',
    matric_no: '',
  };

  data.schoolDays.forEach(day => {
    dateHeaderValues[`${day}_am`] = formatDateForHeader(day);
    dateHeaderValues[`${day}_pm`] = '';
  });

  dateHeaderValues.absent = '';
  dateHeaderValues.remarks = '';

  dateHeaderRow.values = dateHeaderValues;
  dateHeaderRow.font = { bold: true, size: 10 };
  dateHeaderRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD9D9D9' },
  };
  dateHeaderRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

  // Merge date cells
  let colIndex = 4; // Starting after No., Name, LRN
  data.schoolDays.forEach(() => {
    const startCol = getColumnLetter(colIndex);
    const endCol = getColumnLetter(colIndex + 1);
    worksheet.mergeCells(`${startCol}${rowNum}:${endCol}${rowNum}`);
    colIndex += 2;
  });

  rowNum++;

  // Main header row 2 (AM/PM)
  const sessionHeaderRow = worksheet.getRow(rowNum);
  const sessionHeaderValues: Record<string, string> = {
    no: 'No.',
    name: 'NAME OF LEARNER',
    matric_no: 'LRN',
  };

  data.schoolDays.forEach(day => {
    sessionHeaderValues[`${day}_am`] = 'AM';
    sessionHeaderValues[`${day}_pm`] = 'PM';
  });

  sessionHeaderValues.absent = 'Total\nAbsences';
  sessionHeaderValues.tardy_late = 'Total\nTardy/Late';
  sessionHeaderValues.remarks = 'Remarks';

  sessionHeaderRow.values = sessionHeaderValues;
  sessionHeaderRow.font = { bold: true, size: 9 };
  sessionHeaderRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFB4C7E7' },
  };
  sessionHeaderRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

  rowNum++;

  const startDataRow = rowNum;
  data.students.forEach((student, index) => {
    const rowData: any = {
      no: index + 1,
      name: student.name,
      matric_no: student.matric_no,
      absent: student.absentCount,
      tardy_late: student.lateCount,
      remarks: student.remarks,
    };

    data.schoolDays.forEach(day => {
      const dayStr = day.toString();
      const attendance = student.dailyAttendance[dayStr];
      // Use standard DepEd SF2 markings: "/" for present, "X" for absent
      rowData[`${dayStr}_am`] = formatAttendanceMarking(attendance?.am);
      rowData[`${dayStr}_pm`] = formatAttendanceMarking(attendance?.pm);
    });

    const row = worksheet.getRow(rowNum);
    row.values = rowData;
    row.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    row.font = { size: 10 };

    // Add thin borders to data rows
    for (let col = 1; col <= 3 + data.schoolDays.length * 2 + 3; col++) {
      const cell = row.getCell(col);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    }

    rowNum++;
  });

  const endDataRow = rowNum - 1;

  // Add borders to header rows
  for (let r = 7; r <= 8; r++) {
    const headerRow = worksheet.getRow(r);
    for (let col = 1; col <= 3 + data.schoolDays.length * 2 + 3; col++) {
      const cell = headerRow.getCell(col);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    }
  }

  rowNum += 3;

  const summaryTitleRow = worksheet.getRow(rowNum);
  summaryTitleRow.getCell(1).value = 'SUMMARY';
  summaryTitleRow.font = { bold: true, size: 12 };
  summaryTitleRow.alignment = { horizontal: 'left' };
  rowNum++;

  const summaryData = [
    { label: 'Enrollment as of 1st Friday of June', value: data.enrollmentFirstFriday },
    { label: 'Registered Learners as of end of month', value: data.registeredLearners },
    { label: 'Percentage of Enrollment (%)', value: `${data.percentageEnrollment}%` },
    { label: 'Average Daily Attendance', value: `${data.averageDailyAttendance}%` },
    { label: 'Percentage of Attendance for the Month (%)', value: `${data.percentageAttendance}%` },
    {
      label: 'Number of Students Absent for 5 Consecutive Days',
      value: data.consecutiveAbsent5Days,
    },
  ];

  summaryData.forEach(item => {
    const row = worksheet.getRow(rowNum);
    // Use first two columns for label and value
    row.getCell(1).value = item.label;
    row.getCell(2).value = item.value;
    row.font = { size: 10 };
    row.alignment = { horizontal: 'left', vertical: 'middle' };
    rowNum++;
  });

  rowNum += 3;

  const signatureTitleRow = worksheet.getRow(rowNum);
  signatureTitleRow.getCell(1).value = 'CERTIFICATION';
  signatureTitleRow.font = { bold: true, size: 12 };
  signatureTitleRow.alignment = { horizontal: 'left' };
  rowNum += 2;

  const signatureRow1 = worksheet.getRow(rowNum);
  signatureRow1.getCell(1).value = 'Prepared by:';
  signatureRow1.getCell(2).value = 'Verified by:';
  signatureRow1.font = { bold: true, size: 10 };
  signatureRow1.alignment = { horizontal: 'left' };
  rowNum += 3;

  const signatureRow2 = worksheet.getRow(rowNum);
  signatureRow2.getCell(1).value = data.staffName;
  signatureRow2.getCell(2).value = data.schoolHeadName;
  signatureRow2.font = { size: 10, underline: true };
  signatureRow2.alignment = { horizontal: 'center' };
  rowNum++;

  const signatureRow3 = worksheet.getRow(rowNum);
  signatureRow3.getCell(1).value = 'Teacher/Class Adviser';
  signatureRow3.getCell(2).value = 'Principal/School Head';
  signatureRow3.font = { size: 9, italic: true };
  signatureRow3.alignment = { horizontal: 'center' };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};

function formatDateForHeader(dateStr: string): string {
  const date = new Date(dateStr);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}/${day}`;
}

function getColumnLetter(num: number): string {
  let letter = '';
  let n = num;
  while (n > 0) {
    n--;
    letter = String.fromCharCode(65 + (n % 26)) + letter;
    n = Math.floor(n / 26);
  }
  return letter;
}

function formatAttendanceMarking(value?: string): string {
  if (!value || value === '') return '/'; // Present
  if (value === 'x') return 'X'; // Absent
  return value; // Keep other values as is (like late markings)
}
