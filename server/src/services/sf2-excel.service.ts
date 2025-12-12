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
      top: 0.75,
      bottom: 0.75,
      header: 0.3,
      footer: 0.3,
    },
  };

  // Professional DepEd Header Section
  worksheet.addRow({ title: 'REPUBLIC OF THE PHILIPPINES' });
  const headerRow1 = worksheet.getRow(1);
  headerRow1.font = { bold: true, size: 18, color: { argb: 'FF003366' } };
  headerRow1.alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.addRow({ title: 'DEPARTMENT OF EDUCATION' });
  const headerRow2 = worksheet.getRow(2);
  headerRow2.font = { bold: true, size: 16, color: { argb: 'FF003366' } };
  headerRow2.alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.addRow({ title: 'SCHOOL FORM 2 (SF2) Daily Attendance Report of Learners' });
  const headerRow3 = worksheet.getRow(3);
  headerRow3.font = { bold: true, size: 14, color: { argb: 'FF0066CC' } };
  headerRow3.alignment = { horizontal: 'center', vertical: 'middle' };

  // Professional School Information Section
  worksheet.addRow({}); // Empty row
  worksheet.addRow({ title: 'SCHOOL INFORMATION' });
  const schoolInfoRow = worksheet.getRow(5);
  schoolInfoRow.font = { bold: true, size: 12, color: { argb: 'FF003366' } };
  schoolInfoRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE6F3FF' },
  };

  worksheet.addRow({}); // Empty row
  worksheet.addRow({ title: 'School Name:', schoolName: data.schoolName || 'School Name' });
  worksheet.addRow({ title: 'School ID:', schoolId: data.schoolId || 'School ID' });
  worksheet.addRow({ title: 'School Year:', schoolYear: data.schoolYear || 'School Year' });
  worksheet.addRow({ title: 'Grade & Section:', gradeSection: `Grade ${data.grade} - Section ${data.section}` });
  worksheet.addRow({ title: 'Report Period:', period: `${data.month}/${data.year}` });
  worksheet.addRow({ title: 'Teacher:', teacher: data.teacherName || 'Teacher Name' });
  worksheet.addRow({ title: 'Generated:', generated: new Date().toLocaleDateString() });

  // Set up columns for the attendance table
  const daysInMonth = new Date(data.year, data.month, 0).getDate();
  const columns = [
    { key: 'name', header: 'LEARNER NAME', width: 25 },
  ];

  for (let day = 1; day <= daysInMonth; day++) {
    columns.push({ key: `day${day}`, header: day.toString(), width: 4 });
  }

  worksheet.columns = columns;

  // Table Title
  worksheet.addRow({}); // Empty row
  worksheet.addRow({ name: `SF2 Daily Attendance - ${data.grade} ${data.section} (${data.month}/${data.year})` });
  const tableTitleRow = worksheet.getRow(worksheet.rowCount);
  tableTitleRow.font = { bold: true, size: 12, color: { argb: 'FF0066CC' } };
  tableTitleRow.alignment = { horizontal: 'center' };
  worksheet.mergeCells(`A${worksheet.rowCount}:${String.fromCharCode(65 + daysInMonth)}${worksheet.rowCount}`);

  // Headers
  worksheet.addRow({}); // Empty row
  const headerRow = worksheet.addRow({});
  columns.forEach((col, index) => {
    headerRow.getCell(index + 1).value = col.header;
  });
  headerRow.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0066CC' },
  };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.height = 20;

  // Add borders to header
  for (let col = 1; col <= columns.length; col++) {
    const cell = headerRow.getCell(col);
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'medium', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } },
    };
  }

  // Data Rows
  data.students.forEach((student, index) => {
    const dataRow = worksheet.addRow({});
    dataRow.getCell(1).value = student.name;
    dataRow.height = 18;

    // Fill attendance data
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = `${data.year}-${data.month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const attendance = student.dailyAttendance[dayStr];
      const marking = attendance ? (attendance.am === 'present' ? '/' : attendance.am === 'absent' ? 'X' : attendance.am || '') : '';
      dataRow.getCell(day + 1).value = marking;
    }

    // Alternating row colors and borders
    const fillColor = index % 2 === 0 ? 'FFF9F9F9' : 'FFFFFFFF';
    for (let col = 1; col <= columns.length; col++) {
      const cell = dataRow.getCell(col);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: fillColor },
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      };
      if (col > 1) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    }
  });

  // Footer
  worksheet.addRow({}); // Empty row
  worksheet.addRow({}); // Empty row
  worksheet.addRow({ name: 'This SF2 report is generated automatically by the School Attendance Management System' });
  const footerRow = worksheet.getRow(worksheet.rowCount);
  footerRow.font = { size: 9, italic: true, color: { argb: 'FF666666' } };
  footerRow.alignment = { horizontal: 'center' };
  worksheet.mergeCells(`A${worksheet.rowCount}:${String.fromCharCode(65 + daysInMonth)}${worksheet.rowCount}`);

  worksheet.addRow({ name: `Generated on: ${new Date().toLocaleDateString()}` });
  const dateRow = worksheet.getRow(worksheet.rowCount);
  dateRow.font = { size: 8, color: { argb: 'FF666666' } };
  dateRow.alignment = { horizontal: 'center' };
  worksheet.mergeCells(`A${worksheet.rowCount}:${String.fromCharCode(65 + daysInMonth)}${worksheet.rowCount}`);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};