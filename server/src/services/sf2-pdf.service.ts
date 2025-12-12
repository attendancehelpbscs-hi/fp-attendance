import PDFDocument from 'pdfkit';
import { SF2Data } from '../interfaces/sf2.interface';

export const generateSF2PDF = async (data: SF2Data): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        layout: 'landscape',
      });

      const chunks: Buffer[] = [];

      doc.on('data', (chunk: any) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks as any)));
      doc.on('error', reject);

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;

      // Professional Header Section with DepEd Branding
      doc.rect(0, 0, pageWidth, 120).fill('#ffffff');
      doc.strokeColor('#003366').lineWidth(3).rect(0, 0, pageWidth, 120).stroke();
      doc.strokeColor('#0066cc').lineWidth(1).rect(5, 5, pageWidth - 10, 110).stroke();

      // DepEd Seal/Logo area (represented by colored circle)
      doc.circle(80, 60, 25).fill('#003366');
      doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold').text('DepEd', 65, 55);

      // Official Header Text
      doc.fillColor('#003366')
        .fontSize(22)
        .font('Helvetica-Bold')
        .text('REPUBLIC OF THE PHILIPPINES', 120, 20, { align: 'left' });

      doc.fontSize(18)
        .text('DEPARTMENT OF EDUCATION', 120, 40, { align: 'left' });

      doc.fillColor('#0066cc')
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('SCHOOL FORM 2 (SF2)', 120, 65, { align: 'left' });

      doc.fontSize(14)
        .text('Daily Attendance Report of Learners', 120, 85, { align: 'left' });

      // School Information Panel
      doc.rect(450, 15, 300, 90).fill('#f0f8ff');
      doc.strokeColor('#0066cc').lineWidth(1).rect(450, 15, 300, 90).stroke();

      doc.fillColor('#003366').fontSize(11).font('Helvetica-Bold');
      doc.text('School Name:', 460, 25);
      doc.font('Helvetica').text(data.schoolName || 'School Name', 540, 25);

      doc.font('Helvetica-Bold').text('School ID:', 460, 40);
      doc.font('Helvetica').text(data.schoolId || 'School ID', 540, 40);

      doc.font('Helvetica-Bold').text('School Year:', 460, 55);
      doc.font('Helvetica').text(data.schoolYear || 'School Year', 540, 55);

      doc.font('Helvetica-Bold').text('Report for:', 460, 70);
      doc.font('Helvetica').text(`${data.month}/${data.year}`, 540, 70);

      doc.font('Helvetica-Bold').text('Generated:', 460, 85);
      doc.font('Helvetica').text(new Date().toLocaleDateString(), 540, 85);

      doc.moveDown(3);

      // Grade and Section Information
      doc.fillColor('#0066cc')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text(`Grade: ${data.grade} | Section: ${data.section}`, { align: 'center' });
      doc.moveDown(1);

      // Teacher Information
      doc.fillColor('#000000')
        .fontSize(12)
        .font('Helvetica')
        .text(`Teacher: ${data.teacherName || 'Teacher Name'}`, 50, doc.y);
      doc.moveDown(1);

      // Table Setup
      const tableTop = doc.y;
      const cellHeight = 20;
      const nameColWidth = 120;
      const dayColWidth = 25;

      // Calculate total columns: Name + Days in month
      const daysInMonth = new Date(data.year, data.month, 0).getDate();
      const totalCols = 1 + daysInMonth; // Name + days
      const totalTableWidth = nameColWidth + (daysInMonth * dayColWidth);

      // Table Headers
      doc.fillColor('#0066cc');
      doc.rect(50, tableTop, totalTableWidth, cellHeight).fill('#0066cc');

      doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold');
      doc.text('LEARNER NAME', 55, tableTop + 5);

      let dayX = 50 + nameColWidth;
      for (let day = 1; day <= daysInMonth; day++) {
        doc.text(day.toString(), dayX + 5, tableTop + 5, { width: dayColWidth - 10, align: 'center' });
        dayX += dayColWidth;
      }

      // Table Data
      doc.fontSize(9).font('Helvetica');
      let yPos = tableTop + cellHeight;
      let rowIndex = 0;

      data.students.forEach((student) => {
        const fillColor = rowIndex % 2 === 0 ? '#f9f9f9' : '#ffffff';
        doc.fillColor(fillColor);

        // Name cell
        doc.rect(50, yPos, nameColWidth, cellHeight).fill(fillColor);
        doc.strokeColor('#cccccc').lineWidth(0.5).rect(50, yPos, nameColWidth, cellHeight).stroke();

        doc.fillColor('#000000');
        doc.text(student.name, 55, yPos + 5, { width: nameColWidth - 10 });

        // Day cells
        dayX = 50 + nameColWidth;
        for (let day = 1; day <= daysInMonth; day++) {
          const dayStr = `${data.year}-${data.month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
          const attendance = student.dailyAttendance[dayStr];

          doc.fillColor(fillColor);
          doc.rect(dayX, yPos, dayColWidth, cellHeight).fill(fillColor);
          doc.strokeColor('#cccccc').lineWidth(0.5).rect(dayX, yPos, dayColWidth, cellHeight).stroke();

          doc.fillColor('#000000');
          const marking = attendance ? (attendance.am === 'present' ? '/' : attendance.am === 'absent' ? 'X' : attendance.am) : '';
          doc.text(marking, dayX + 5, yPos + 5, { width: dayColWidth - 10, align: 'center' });

          dayX += dayColWidth;
        }

        yPos += cellHeight;
        rowIndex++;
      });

      // Footer
      const footerY = pageHeight - 40;
      doc.fillColor('#666666')
        .fontSize(8)
        .font('Helvetica')
        .text('This SF2 report is generated automatically by the School Attendance Management System', 50, footerY, { align: 'center' });
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 50, footerY + 10, { align: 'center' });
      doc.text(`Page 1 of 1`, pageWidth - 100, footerY, { align: 'right' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};