import PDFDocument from 'pdfkit';

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

export const generateStudentReportPDF = async (data: StudentReportData): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        layout: 'portrait',
      });

      const chunks: Buffer[] = [];

      doc.on('data', (chunk: any) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks as any)));
      doc.on('error', reject);

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;

      // Professional Header Section
      doc.rect(0, 0, pageWidth, 120).fill('#ffffff');
      doc.strokeColor('#003366').lineWidth(3).rect(0, 0, pageWidth, 120).stroke();
      doc.strokeColor('#0066cc').lineWidth(1).rect(5, 5, pageWidth - 10, 110).stroke();

      // School Logo/Branding area
      doc.circle(80, 60, 25).fill('#003366');
      doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold').text('SAMS', 65, 55);

      // Official Header Text
      doc.fillColor('#003366')
        .fontSize(22)
        .font('Helvetica-Bold')
        .text('SCHOOL ATTENDANCE MANAGEMENT', 120, 20, { align: 'left' });

      doc.fontSize(18)
        .text('SYSTEM', 120, 40, { align: 'left' });

      doc.fillColor('#0066cc')
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('INDIVIDUAL STUDENT ATTENDANCE REPORT', 120, 70, { align: 'left' });

      // Report Information
      doc.fontSize(11).font('Helvetica-Bold').text('Report Date:', 450, 20);
      doc.font('Helvetica').text(new Date().toLocaleDateString(), 520, 20);
      doc.font('Helvetica-Bold').text('Generated:', 450, 35);
      doc.font('Helvetica').text(new Date().toLocaleTimeString(), 520, 35);

      doc.moveDown(3);

      // Student Information Professional Box
      doc.fillColor('#003366')
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('STUDENT PROFILE', { align: 'center' });
      doc.moveDown(0.5);

      const studentY = doc.y;
      doc.rect(50, studentY, pageWidth - 100, 80).fill('#f8f9fa');
      doc.strokeColor('#003366').lineWidth(2).rect(50, studentY, pageWidth - 100, 80).stroke();

      // Student Photo Placeholder
      doc.rect(70, studentY + 10, 60, 60).fill('#e9ecef');
      doc.strokeColor('#6c757d').lineWidth(1).rect(70, studentY + 10, 60, 60).stroke();
      doc.fillColor('#6c757d').fontSize(8).font('Helvetica').text('Photo', 85, studentY + 35);

      // Student Details
      doc.fillColor('#003366').fontSize(14).font('Helvetica-Bold').text('Student Information', 150, studentY + 15);
      doc.fillColor('#000000').fontSize(12).font('Helvetica-Bold').text(`Full Name:`, 150, studentY + 35);
      doc.font('Helvetica').text(data.student.name, 230, studentY + 35);

      doc.font('Helvetica-Bold').text(`Student ID:`, 150, studentY + 50);
      doc.font('Helvetica').text(data.student.matric_no || 'N/A', 230, studentY + 50);

      doc.font('Helvetica-Bold').text(`Grade Level:`, 400, studentY + 35);
      doc.font('Helvetica').text(data.student.grade, 480, studentY + 35);

      // Attendance Summary Statistics
      const totalRecords = data.attendanceRecords.length;
      const presentCount = data.attendanceRecords.filter(r => r.status === 'present').length;
      const absentCount = data.attendanceRecords.filter(r => r.status === 'absent').length;
      const lateCount = data.attendanceRecords.filter(r => r.status === 'present' && r.time_type === 'IN' && r.created_at.getHours() >= 8).length;
      const attendanceRate = totalRecords > 0 ? ((presentCount / totalRecords) * 100).toFixed(1) : '0.0';

      doc.fillColor('#003366').fontSize(14).font('Helvetica-Bold').text('Attendance Summary', 400, studentY + 50);
      doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold').text(`Total Days: ${totalRecords}`, 400, studentY + 65);
      doc.font('Helvetica').text(`Present: ${presentCount}`, 480, studentY + 65);
      doc.text(`Absent: ${absentCount}`, 540, studentY + 65);

      doc.moveDown(3);

      // Professional Attendance Records Table
      doc.moveDown(2);
      const tableTop = doc.y;

      // Table Title with Professional Styling
      doc.fillColor('#003366')
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('DETAILED ATTENDANCE RECORD', { align: 'center' });
      doc.moveDown(0.5);

      // Color Legend and Summary Statistics Bar
      const legendY = doc.y;

      // Color Legend
      doc.fillColor('#003366').fontSize(12).font('Helvetica-Bold').text('ATTENDANCE STATUS LEGEND:', 50, legendY);
      doc.moveDown(0.3);

      // Legend items with color indicators
      const legendItems = [
        { color: '#28a745', text: 'Present' },
        { color: '#dc3545', text: 'Absent' },
        { color: '#ffc107', text: 'Late Arrival' },
        { color: '#6c757d', text: 'Other' }
      ];

      let legendX = 70;
      legendItems.forEach((item, index) => {
        // Color box
        doc.rect(legendX, doc.y, 15, 12).fill(item.color);
        doc.strokeColor('#000000').lineWidth(0.5).rect(legendX, doc.y, 15, 12).stroke();

        // Text
        doc.fillColor('#000000').fontSize(9).font('Helvetica').text(item.text, legendX + 20, doc.y + 2);

        legendX += 80;
        if (index === 1) { // Move to next row
          legendX = 70;
          doc.moveDown(0.8);
        }
      });

      doc.moveDown(0.5);

      // Summary Statistics Bar
      const summaryBarY = doc.y;
      doc.rect(50, summaryBarY, pageWidth - 100, 30).fill('#e3f2fd');
      doc.strokeColor('#0066cc').lineWidth(2).rect(50, summaryBarY, pageWidth - 100, 30).stroke();

      // Add colored indicators in summary bar
      doc.fillColor('#28a745').circle(70, summaryBarY + 15, 6).fill();
      doc.fillColor('#dc3545').circle(200, summaryBarY + 15, 6).fill();
      doc.fillColor('#ffc107').circle(330, summaryBarY + 15, 6).fill();

      doc.fillColor('#003366').fontSize(11).font('Helvetica-Bold');
      doc.text(`Present: ${presentCount}`, 85, summaryBarY + 10);
      doc.text(`Absent: ${absentCount}`, 215, summaryBarY + 10);
      doc.text(`Late: ${lateCount}`, 345, summaryBarY + 10);
      doc.text(`Rate: ${attendanceRate}%`, 450, summaryBarY + 10);

      doc.moveDown(1.5);

      // Table Setup
      const cellHeight = 22;
      const colWidths = [90, 70, 70, 80, 120]; // Date, Status, Time Type, Section, Timestamp

      // Enhanced Table Headers
      doc.fillColor('#003366');
      let xPos = 50;
      ['Date', 'Status', 'Time Type', 'Section', 'Check-in Time'].forEach((header, index) => {
        doc.rect(xPos, doc.y, colWidths[index], cellHeight).fill('#003366');
        xPos += colWidths[index];
      });

      doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold');
      xPos = 50;
      ['Date', 'Status', 'Time Type', 'Section', 'Check-in Time'].forEach((header, index) => {
        doc.text(header, xPos + 5, doc.y + 7, { width: colWidths[index] - 10, align: 'center' });
        xPos += colWidths[index];
      });

      // Table Data with Enhanced Styling
      doc.fontSize(10).font('Helvetica');
      let yPos = doc.y + cellHeight;
      let rowIndex = 0;

      // Sort records by date
      const sortedRecords = data.attendanceRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      sortedRecords.forEach((record) => {
        const fillColor = rowIndex % 2 === 0 ? '#f8f9fa' : '#ffffff';
        doc.fillColor(fillColor);
        xPos = 50;
        colWidths.forEach((width) => {
          doc.rect(xPos, yPos, width, cellHeight).fill(fillColor);
          doc.strokeColor('#dee2e6').lineWidth(0.5).rect(xPos, yPos, width, cellHeight).stroke();
          xPos += width;
        });

        // Enhanced Status-based color coding with background fills
        const statusColor = record.status === 'present' ? '#28a745' : record.status === 'absent' ? '#dc3545' : '#6c757d';
        const statusBgColor = record.status === 'present' ? '#d4edda' : record.status === 'absent' ? '#f8d7da' : '#e2e3e5';
        const timeColor = (record.status === 'present' && record.time_type === 'IN' && record.created_at.getHours() >= 8) ? '#856404' : '#000000';
        const timeBgColor = (record.status === 'present' && record.time_type === 'IN' && record.created_at.getHours() >= 8) ? '#fff3cd' : fillColor;

        doc.fillColor('#000000');
        xPos = 50;
        const rowData = [
          new Date(record.date).toLocaleDateString(),
          record.status.charAt(0).toUpperCase() + record.status.slice(1),
          record.time_type,
          record.section || 'N/A',
          record.created_at.toLocaleString()
        ];

        rowData.forEach((cellData, index) => {
          // Draw background for status and time columns
          if (index === 1) { // Status column - background color
            doc.rect(xPos, yPos, colWidths[index], cellHeight).fill(statusBgColor);
            doc.strokeColor('#dee2e6').lineWidth(0.5).rect(xPos, yPos, colWidths[index], cellHeight).stroke();
            doc.fillColor(statusColor).font('Helvetica-Bold');
          } else if (index === 4 && record.status === 'present' && record.time_type === 'IN' && record.created_at.getHours() >= 8) { // Late arrival
            doc.rect(xPos, yPos, colWidths[index], cellHeight).fill(timeBgColor);
            doc.strokeColor('#dee2e6').lineWidth(0.5).rect(xPos, yPos, colWidths[index], cellHeight).stroke();
            doc.fillColor(timeColor).font('Helvetica-Bold');
          } else {
            doc.fillColor('#000000').font('Helvetica');
          }

          doc.text(cellData, xPos + 5, yPos + 7, { width: colWidths[index] - 10, align: 'center' });
          xPos += colWidths[index];
        });

        yPos += cellHeight;
        rowIndex++;

        // Add new page if needed
        if (yPos > pageHeight - 120) {
          // Add page footer before new page
          doc.fillColor('#666666').fontSize(8).font('Helvetica')
            .text(`Continued on next page...`, pageWidth / 2, pageHeight - 30, { align: 'center' });

          doc.addPage();
          yPos = 50;
          rowIndex = 0;

          // Repeat header on new page
          doc.fillColor('#003366').fontSize(14).font('Helvetica-Bold')
            .text(`${data.student.name} - Attendance Record (Continued)`, { align: 'center' });
          doc.moveDown(1);
        }
      });

      // Professional Footer
      const footerY = pageHeight - 50;
      doc.fillColor('#666666').fontSize(9).font('Helvetica')
        .text('This report is generated automatically by the School Attendance Management System', 50, footerY, { align: 'center' });

      doc.fontSize(8).text(`Generated: ${new Date().toLocaleString()}`, 50, footerY + 15, { align: 'center' });
      doc.text(`Student: ${data.student.name}`, 50, footerY + 25, { align: 'center' });

      doc.fillColor('#003366').fontSize(10).font('Helvetica-Bold')
        .text('Page 1', pageWidth - 80, footerY + 10, { align: 'right' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};