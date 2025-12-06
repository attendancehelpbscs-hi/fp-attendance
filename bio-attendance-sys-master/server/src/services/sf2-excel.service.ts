import ExcelJS from 'exceljs';
import { SF2Data } from '../interfaces/sf2.interface';

export const generateSF2Excel = async (data: SF2Data): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('SF2 Daily Attendance Report');

  worksheet.pageSetup = {
    orientation: 'landscape',
  };

  worksheet.columns = [
    { header: 'No.', key: 'no', width: 5 },
    { header: 'NAME OF LEARNER', key: 'name', width: 25 },
    { header: 'LRN', key: 'matric_no', width: 15 },
    ...data.schoolDays.flatMap(day => [
      { header: `${formatDateForHeader(day)}\nAM`, key: `${day}_am`, width: 6 },
      { header: `${formatDateForHeader(day)}\nPM`, key: `${day}_pm`, width: 6 },
    ]),
    { header: 'Total Absences', key: 'absent', width: 10 },
    { header: 'Remarks', key: 'remarks', width: 20 },
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, size: 10 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD3D3D3' },
  };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

  worksheet.insertRows(1, [
    { date: 'DepEd School Form 2 - Daily Attendance Report of Learners' },
  ], 'i');

  const titleRow = worksheet.getRow(1);
  titleRow.font = { bold: true, size: 14 };
  titleRow.alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells(`A1:${getColumnLetter(3 + data.schoolDays.length * 2 + 2)}1`);

  worksheet.insertRows(2, [
    { date: `Region: ${data.region || 'NCR'}` },
  ], 'i');

  const regionRow = worksheet.getRow(2);
  regionRow.font = { size: 11 };
  regionRow.alignment = { horizontal: 'left' };

  worksheet.insertRows(3, [
    { date: `Division: ${data.division || 'Division Name'}` },
  ], 'i');

  const divisionRow = worksheet.getRow(3);
  divisionRow.font = { size: 11 };
  divisionRow.alignment = { horizontal: 'left' };

  worksheet.insertRows(4, [
    { date: `District: ${data.district || 'District Name'}` },
  ], 'i');

  const districtRow = worksheet.getRow(4);
  districtRow.font = { size: 11 };
  districtRow.alignment = { horizontal: 'left' };

  worksheet.insertRows(5, [
    { date: `School Year: ${data.schoolYear}` },
  ], 'i');

  const schoolYearRow = worksheet.getRow(5);
  schoolYearRow.font = { size: 11 };
  schoolYearRow.alignment = { horizontal: 'left' };

  worksheet.insertRows(6, [
    { date: `School: ${data.schoolName} (ID: ${data.schoolId})` },
  ], 'i');

  worksheet.insertRows(7, [
    { date: `Month: ${data.month} | Grade: ${data.grade} | Section: ${data.section}` },
  ], 'i');

  let rowNum = 9;

  const headerRow2 = worksheet.getRow(rowNum);
  const headerValues: Record<string, string> = {
    no: 'No.',
    name: 'NAME OF LEARNER',
    matric_no: 'LRN',
  };
  
  data.schoolDays.forEach(day => {
    headerValues[`${day}_am`] = `${formatDateForHeader(day)} AM`;
    headerValues[`${day}_pm`] = `${formatDateForHeader(day)} PM`;
  });
  
  headerValues.absent = 'Total Absent';
  headerValues.remarks = 'Remarks';
  
  headerRow2.values = headerValues;

  headerRow2.font = { bold: true, size: 10 };
  headerRow2.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFB4C7E7' },
  };
  headerRow2.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

  rowNum++;

  data.students.forEach((student, index) => {
    const rowData: any = {
      no: index + 1,
      name: student.name,
      matric_no: student.matric_no,
      absent: student.absentCount,
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
    rowNum++;
  });

  rowNum += 2;

  const summaryRow1 = worksheet.getRow(rowNum);
  summaryRow1.values = {
    date: 'Summary Statistics',
  };
  summaryRow1.font = { bold: true, size: 11 };
  rowNum++;

  const summaryData = [
    { label: 'Enrollment as of 1st Friday of June', value: data.enrollmentFirstFriday },
    { label: 'Late Enrollment during the month', value: data.lateEnrollmentCount },
    { label: 'Registered Learners as of end of month', value: data.registeredLearners },
    { label: 'Percentage of Enrollment (%)', value: data.percentageEnrollment },
    { label: 'Average Daily Attendance', value: data.averageDailyAttendance.toFixed(2) },
    { label: 'Percentage of Attendance for the Month (%)', value: data.percentageAttendance },
    {
      label: 'Number of Students Absent for 5 Consecutive Days',
      value: data.consecutiveAbsent5Days,
    },
    { label: 'Dropout (Male)', value: data.dropoutMale },
    { label: 'Dropout (Female)', value: data.dropoutFemale },
    { label: 'Transferred Out (Male)', value: data.transferOutMale },
    { label: 'Transferred Out (Female)', value: data.transferOutFemale },
    { label: 'Transferred In (Male)', value: data.transferInMale },
    { label: 'Transferred In (Female)', value: data.transferInFemale },
  ];

  summaryData.forEach(item => {
    const row = worksheet.getRow(rowNum);
    row.values = { date: item.label, name: item.value };
    row.font = { size: 10 };
    rowNum++;
  });

  rowNum += 2;

  const signatureRow1 = worksheet.getRow(rowNum);
  signatureRow1.values = {
    date: 'Prepared by:',
    name: 'Verified by:',
  };
  signatureRow1.font = { bold: true, size: 10 };
  rowNum += 3;

  const signatureRow2 = worksheet.getRow(rowNum);
  signatureRow2.values = {
    date: data.staffName,
    name: data.schoolHeadName,
  };
  signatureRow2.font = { size: 10, underline: true };
  rowNum++;

  const signatureRow3 = worksheet.getRow(rowNum);
  signatureRow3.values = {
    date: 'Teacher/Class Adviser',
    name: 'Principal/School Head',
  };
  signatureRow3.font = { size: 9, italic: true };

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
