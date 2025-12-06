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

      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('DepEd School Form 2 (SF2)', { align: 'center' })
        .fontSize(12)
        .text('Daily Attendance Report of Learners', { align: 'center' });

      doc
        .fontSize(10)
        .font('Helvetica')
        .moveDown(0.5);

      const schoolInfo = [
        `School ID: ${data.schoolId}`,
        `School Name: ${data.schoolName}`,
        `School Year: ${data.schoolYear}`,
        `Month: ${data.month}`,
        `Grade: ${data.grade}`,
        `Section: ${data.section}`,
      ];

      schoolInfo.forEach((info, idx) => {
        if (idx % 2 === 0) {
          doc.text(info, { continued: true });
          if (idx < schoolInfo.length - 1) doc.text('  ');
        } else {
          doc.text(info);
        }
      });

      doc.moveDown(0.5);

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

        doc.rect(32, y, 65, cellHeight).stroke();
        doc.text('Student Name', 35, y + 5, { width: 60, align: 'center' });

        doc.rect(100, y, 55, cellHeight).stroke();
        doc.text('Matric No.', 103, y + 5, { width: 50, align: 'center' });

        let dayX = 160;
        const daysToShow = data.schoolDays.slice(startDay, startDay + maxDaysPerPage);
        daysToShow.forEach((day, idx) => {
          const date = new Date(day);
          const label = `${date.getDate()}`;
          
          doc.rect(dayX, y, dayColWidth, cellHeight).stroke();
          doc.fontSize(7).text(`${label}A`, dayX, y + 6, { width: dayColWidth, align: 'center' });
          dayX += dayColWidth;
          
          doc.rect(dayX, y, dayColWidth, cellHeight).stroke();
          doc.text(`${label}P`, dayX, y + 6, { width: dayColWidth, align: 'center' });
          dayX += dayColWidth;
        });

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

        doc.rect(32, y, 65, cellHeight).stroke();
        doc.fontSize(8).text(student.name, 35, y + 5, { width: 60, height: cellHeight });

        doc.rect(100, y, 55, cellHeight).stroke();
        doc.text(student.matric_no, 103, y + 5, { width: 50, align: 'center' });

        let dayX = 160;
        const daysToShow = data.schoolDays.slice(0, maxDaysPerPage);
        daysToShow.forEach(day => {
          const dayStr = day.toString();
          const attendance = student.dailyAttendance[dayStr] || { am: 'x', pm: 'x' };
          
          const amValue = attendance.am === '' ? '✓' : attendance.am === 'x' ? 'A' : attendance.am;
          const pmValue = attendance.pm === '' ? '✓' : attendance.pm === 'x' ? 'A' : attendance.pm;

          doc.rect(dayX, y, dayColWidth, cellHeight).stroke();
          doc.fontSize(7).text(amValue, dayX, y + 6, { width: dayColWidth, align: 'center' });
          dayX += dayColWidth;
          
          doc.rect(dayX, y, dayColWidth, cellHeight).stroke();
          doc.text(pmValue, dayX, y + 6, { width: dayColWidth, align: 'center' });
          dayX += dayColWidth;
        });

        doc.rect(dayX, y, 50, cellHeight).stroke();
        doc.fontSize(7).text(student.remarks, dayX + 5, y + 5, { width: 40 });

        currentRow++;
      });

      doc.addPage();
      doc.fontSize(12).font('Helvetica-Bold').text('Summary Statistics');
      doc.moveDown(0.5);

      const summaryData = [
        { label: 'Enrollment as of 1st Friday of June:', value: data.enrollmentFirstFriday },
        { label: 'Late Enrollment during the month:', value: data.lateEnrollmentCount },
        { label: 'Registered Learners as of end of month:', value: data.registeredLearners },
        { label: 'Percentage of Enrollment (%):', value: data.percentageEnrollment },
        { label: 'Average Daily Attendance:', value: data.averageDailyAttendance.toFixed(2) },
        { label: 'Percentage of Attendance (%):', value: data.percentageAttendance },
        { label: 'Students Absent for 5 Consecutive Days:', value: data.consecutiveAbsent5Days },
        { label: 'Dropout (M/F):', value: `${data.dropoutMale}/${data.dropoutFemale}` },
        { label: 'Transferred Out (M/F):', value: `${data.transferOutMale}/${data.transferOutFemale}` },
        { label: 'Transferred In (M/F):', value: `${data.transferInMale}/${data.transferInFemale}` },
      ];

      doc.fontSize(10).font('Helvetica');
      summaryData.forEach(item => {
        doc.text(`${item.label} ${item.value}`);
      });

      doc.moveDown(1);

      doc.fontSize(10).font('Helvetica-Bold').text('Prepared by:', { continued: true });
      doc.font('Helvetica').text(` ${data.staffName}`, { continued: true });
      doc.text(' (Teacher/Class Adviser)');

      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').text('Verified by:', { continued: true });
      doc.font('Helvetica').text(` ${data.schoolHeadName}`, { continued: true });
      doc.text(' (Principal/School Head)');

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
