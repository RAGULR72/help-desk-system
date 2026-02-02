import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const exportToExcel = (data, filename = 'export.xlsx') => {
    // 1. Convert JSON to Worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);

    // 2. Create Workbook and Append Worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

    // 3. Save File
    XLSX.writeFile(workbook, filename);
};

export const exportToPDF = (headers, data, title = 'Report', filename = 'report.pdf') => {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);

    // Table
    doc.autoTable({
        head: [headers],
        body: data,
        startY: 40,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [79, 70, 229] } // Indigo-600
    });

    doc.save(filename);
};
