import PDFDocument from 'pdfkit';
import { SF2Data } from '../interfaces/sf2.interface';

export const generateSF2PDF = async (data: SF2Data): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 30,
        layout: 'landscape',
      });

      const chunks: Buffer[] = [];

      doc.on('data', (chunk: any) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks as any)));
      doc.on('error', reject);

      const pageWidth = doc.page.width - 60;
      const pageHeight = doc.page.height - 60;

      // Title
      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('School Form 2 (SF2) Daily Attendance Report of Learners', { align: 'center' });

      doc.moveDown(0.5);

      // Form fields layout
      const leftMargin = 50;
      const fieldWidth = 200;
      const fieldHeight = 20;
      const verticalSpacing = 25;

      // School ID and School Year
      doc.fontSize(10).font('Helvetica');
      doc.rect(leftMargin, doc.y, fieldWidth, fieldHeight).stroke();
      doc.text('School ID', leftMargin + 5, doc.y + 5);
      doc.text(data.schoolId, leftMargin + 80, doc.y + 5);

      doc.rect(leftMargin + 250, doc.y, fieldWidth, fieldHeight).stroke();
      doc.text('School Year', leftMargin + 255, doc.y + 5);
      doc.text(data.schoolYear, leftMargin + 330, doc.y + 5);

      doc.y += verticalSpacing;

      // Name of School and Report for the Month of
      doc.rect(leftMargin, doc.y, fieldWidth, fieldHeight).stroke();
      doc.text('Name of School', leftMargin + 5, doc.y + 5);
      doc.text(data.schoolName, leftMargin + 80, doc.y + 5);

      doc.rect(leftMargin + 250, doc.y, fieldWidth, fieldHeight).stroke();
      doc.text('Report for the Month of', leftMargin + 255, doc.y + 5);
      doc.text(data.month, leftMargin + 380, doc.y + 5);

      doc.y += verticalSpacing;

      // Grade Level and Section
      doc.rect(leftMargin, doc.y, fieldWidth, fieldHeight).stroke();
      doc.text('Grade Level', leftMargin + 5, doc.y + 5);
      doc.text(data.grade, leftMargin + 80, doc.y + 5);

      doc.rect(leftMargin + 250, doc.y, fieldWidth, fieldHeight).stroke();
      doc.text('Section', leftMargin + 255, doc.y + 5);
      doc.text(data.section, leftMargin + 330, doc.y + 5);

      doc.y += verticalSpacing + 10;

      const tableTop = doc.y;
      const cellHeight = 20;
      const dayColWidth = 10;
      const maxDaysPerPage = 12;
      const maxRowsPerPage = Math.floor((pageHeight - tableTop) / cellHeight) - 5;

      let currentPage = 0;
      let currentRow = 0;
      const totalRows = data.students.length;

      const drawTableHeader = (y: number, startDay: number = 0) => {
        doc.fontSize(8).font('Helvetica-Bold');

        // No. column
        doc.rect(32, y, 25, cellHeight).stroke();
        doc.text('No.', 35, y + 5, { width: 20, align: 'center' });

        // Student Name column
        doc.rect(57, y, 80, cellHeight).stroke();
        doc.text('NAME OF LEARNER', 60, y + 2, { width: 75, align: 'center' });

        // LRN column
        doc.rect(137, y, 45, cellHeight).stroke();
        doc.text('LRN', 140, y + 5, { width: 40, align: 'center' });

        let dayX = 182;
        const daysToShow = data.schoolDays.slice(startDay, startDay + maxDaysPerPage);
        daysToShow.forEach((day, idx) => {
          const date = new Date(day);
          const label = `${date.getDate()}`;

          // Date header (merged AM/PM)
          doc.rect(dayX, y, dayColWidth * 2, cellHeight / 2).stroke();
          doc.fontSize(7).text(label, dayX, y + 2, { width: dayColWidth * 2, align: 'center' });

          // AM/PM subheaders
          doc.rect(dayX, y + cellHeight / 2, dayColWidth, cellHeight / 2).stroke();
          doc.text('AM', dayX, y + cellHeight / 2 + 2, { width: dayColWidth, align: 'center' });
          dayX += dayColWidth;

          doc.rect(dayX, y + cellHeight / 2, dayColWidth, cellHeight / 2).stroke();
          doc.text('PM', dayX, y + cellHeight / 2 + 2, { width: dayColWidth, align: 'center' });
          dayX += dayColWidth;
        });

        // Total Absences column
        doc.rect(dayX, y, 35, cellHeight).stroke();
        doc.fontSize(7).text('Total\nAbsences', dayX + 2, y + 2, { width: 30, align: 'center' });
        dayX += 35;

        // Total Tardy/Late column
        doc.rect(dayX, y, 40, cellHeight).stroke();
        doc.text('Total\nTardy/Late', dayX + 2, y + 2, { width: 35, align: 'center' });
        dayX += 40;

        // Remarks column
        doc.rect(dayX, y, 50, cellHeight).stroke();
        doc.fontSize(8).text('Remarks', dayX + 5, y + 5, { width: 40, align: 'center' });

        return y + cellHeight;
      };

      let tableY = drawTableHeader(tableTop, 0);

      doc.fontSize(9).font('Helvetica');

      data.students.forEach((student, idx) => {
        if (currentRow >= maxRowsPerPage) {
          doc.addPage();
          tableY = drawTableHeader(40, 0);
          currentRow = 0;
          currentPage++;
        }

        const y = tableY + currentRow * cellHeight;

        // No. column
        doc.rect(32, y, 25, cellHeight).stroke();
        doc.fontSize(8).text((idx + 1).toString(), 35, y + 6, { width: 20, align: 'center' });

        // Student Name column
        doc.rect(57, y, 80, cellHeight).stroke();
        doc.fontSize(7).text(student.name, 60, y + 6, { width: 75, align: 'left' });

        // LRN column
        doc.rect(137, y, 45, cellHeight).stroke();
        doc.text(student.matric_no, 140, y + 6, { width: 40, align: 'center' });

        let dayX = 182;
        const daysToShow = data.schoolDays.slice(0, maxDaysPerPage);
        daysToShow.forEach(day => {
          const dayStr = day.toString();
          const attendance = student.dailyAttendance[dayStr] || { am: 'x', pm: 'x' };

          const amValue = attendance.am === '' ? '/' : attendance.am === 'x' ? 'X' : attendance.am;
          const pmValue = attendance.pm === '' ? '/' : attendance.pm === 'x' ? 'X' : attendance.pm;

          doc.rect(dayX, y, dayColWidth, cellHeight).stroke();
          doc.fontSize(8).text(amValue, dayX, y + 6, { width: dayColWidth, align: 'center' });
          dayX += dayColWidth;

          doc.rect(dayX, y, dayColWidth, cellHeight).stroke();
          doc.text(pmValue, dayX, y + 6, { width: dayColWidth, align: 'center' });
          dayX += dayColWidth;
        });

        // Total Absences column
        doc.rect(dayX, y, 35, cellHeight).stroke();
        doc.fontSize(8).text(student.absentCount.toString(), dayX + 2, y + 6, { width: 30, align: 'center' });
        dayX += 35;

        // Total Tardy/Late column
        doc.rect(dayX, y, 40, cellHeight).stroke();
        doc.text(student.lateCount.toString(), dayX + 2, y + 6, { width: 35, align: 'center' });
        dayX += 40;

        // Remarks column
        doc.rect(dayX, y, 50, cellHeight).stroke();
        doc.fontSize(7).text(student.remarks, dayX + 5, y + 5, { width: 40 });

        currentRow++;
      });

      doc.addPage();
      doc.fontSize(14).font('Helvetica-Bold').text('SUMMARY', { align: 'left' });
      doc.moveDown(0.5);

      const summaryData = [
        { label: 'Enrollment as of 1st Friday of June', value: data.enrollmentFirstFriday },
        { label: 'Registered Learners as of end of month', value: data.registeredLearners },
        { label: 'Percentage of Enrollment (%)', value: `${data.percentageEnrollment}%` },
        { label: 'Average Daily Attendance', value: `${data.averageDailyAttendance}%` },
        { label: 'Percentage of Attendance for the Month (%)', value: `${data.percentageAttendance}%` },
        { label: 'Number of Students Absent for 5 Consecutive Days', value: data.consecutiveAbsent5Days },
      ];

      doc.fontSize(10).font('Helvetica');
      summaryData.forEach(item => {
        doc.text(`${item.label}: ${item.value}`);
      });

      doc.moveDown(1);

      doc.fontSize(12).font('Helvetica-Bold').text('CERTIFICATION', { align: 'left' });
      doc.moveDown(0.5);

      doc.fontSize(10).font('Helvetica-Bold').text('Prepared by:', { continued: true });
      doc.font('Helvetica').text(` ___________________________`, { underline: true });
      doc.moveDown(0.3);
      doc.font('Helvetica').text(` ${data.staffName}`, { align: 'center' });
      doc.fontSize(9).font('Helvetica').text('Teacher/Class Adviser', { align: 'center' });

      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').text('Verified by:', { continued: true });
      doc.font('Helvetica').text(` ___________________________`, { underline: true });
      doc.moveDown(0.3);
      doc.font('Helvetica').text(` ${data.schoolHeadName}`, { align: 'center' });
      doc.fontSize(9).font('Helvetica').text('Principal/School Head', { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
