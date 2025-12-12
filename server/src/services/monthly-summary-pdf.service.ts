import PDFDocument from 'pdfkit';

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

export const generateMonthlySummaryPDF = async (data: MonthlySummaryData): Promise<Buffer> => {
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
        .text(`Monthly Attendance Summary - ${data.year}`, { align: 'center' });

      doc.moveDown(1);

      // Summary Statistics
      doc.fontSize(14).font('Helvetica-Bold').text('Summary Statistics', { align: 'left' });
      doc.moveDown(0.5);

      const summaryData = [
        { label: 'Total Students:', value: data.totalStudents },
        { label: 'Total School Days:', value: data.monthlySummaries.reduce((sum, month) => sum + month.schoolDays, 0) },
        { label: 'Total Absences:', value: data.monthlySummaries.reduce((sum, month) => sum + month.absentDays, 0) },
        { label: 'Total Lates:', value: data.monthlySummaries.reduce((sum, month) => sum + month.lateDays, 0) },
      ];

      doc.fontSize(10).font('Helvetica');
      summaryData.forEach(item => {
        doc.text(`${item.label} ${item.value}`);
      });

      doc.moveDown(1);

      // Monthly Summary Table
      doc.fontSize(14).font('Helvetica-Bold').text(`Monthly Attendance Summary - ${data.year}`, { align: 'center' });
      doc.moveDown(0.5);

      const tableTop = doc.y;
      const cellHeight = 20;
      const colWidths = [80, 60, 60, 60, 60, 50, 60, 50]; // Month, Total Students, School Days, Present, Absent, Late, Absence %, Late %

      // Table Headers
      doc.fontSize(10).font('Helvetica-Bold');
      const headers = ['Month', 'Total Students', 'School Days', 'Present Days', 'Absent Days', 'Late Days', 'Absence %', 'Late %'];

      let xPos = 32;
      headers.forEach((header, index) => {
        doc.rect(xPos, tableTop, colWidths[index], cellHeight).stroke();
        doc.text(header, xPos + 2, tableTop + 5, { width: colWidths[index] - 4, align: 'center' });
        xPos += colWidths[index];
      });

      // Table Data
      doc.fontSize(9).font('Helvetica');
      let yPos = tableTop + cellHeight;

      data.monthlySummaries.forEach((month) => {
        xPos = 32;
        const rowData = [
          month.month,
          month.totalStudents.toString(),
          month.schoolDays.toString(),
          month.presentDays.toString(),
          month.absentDays.toString(),
          month.lateDays.toString(),
          `${month.absencePercentage.toFixed(1)}%`,
          `${month.latePercentage.toFixed(1)}%`,
        ];

        rowData.forEach((cellData, index) => {
          doc.rect(xPos, yPos, colWidths[index], cellHeight).stroke();
          doc.text(cellData, xPos + 2, yPos + 5, { width: colWidths[index] - 4, align: 'center' });
          xPos += colWidths[index];
        });

        yPos += cellHeight;
      });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};