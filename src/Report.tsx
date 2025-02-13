import { useState, useEffect } from 'react';
import { format, parse, setMonth } from 'date-fns';
import { BarChart, TrendingUp, Download, Calendar } from 'lucide-react';
import { attendanceDB } from './Data';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface MonthlyData {
  month: string;
  attendancePercentage: number;
  workingDays: string[];
  holidays: string[];
}

export function YearlyReport() {
  const [yearlyData, setYearlyData] = useState<MonthlyData[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  const loadYearlyData = async () => {
    setLoading(true);
    try {
      const records = await attendanceDB.getAllRecords();
      const yearRecords = records.filter(record => {
        const recordYear = parse(record.month, 'yyyy-MM', new Date()).getFullYear();
        return recordYear === selectedYear;
      });

      const allMonths = Array.from({ length: 12 }, (_, index) => {
        const date = setMonth(new Date(selectedYear, 0), index);
        const monthKey = format(date, 'yyyy-MM');
        const existingRecord = yearRecords.find(record => record.month === monthKey);
        
        return existingRecord || {
          month: monthKey,
          attendancePercentage: 0,
          workingDays: [],
          holidays: [],
        };
      });
      
      setYearlyData(allMonths);
    } catch (error) {
      console.error('Error loading yearly data:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadYearlyData();
  }, [selectedYear]);

  useEffect(() => {
    const handleDataUpdate = () => {
      loadYearlyData();
    };

    window.addEventListener('attendance-updated', handleDataUpdate);
    return () => {
      window.removeEventListener('attendance-updated', handleDataUpdate);
    };
  }, [selectedYear]);

  const averageAttendance = Math.round(
    yearlyData.reduce((sum, month) => sum + month.attendancePercentage, 0) / 12
  );

  const monthsAboveTarget = yearlyData.filter(
    month => month.attendancePercentage >= 60
  ).length;

  const getMonthStatus = (month: MonthlyData) => {
    if (month.workingDays.length === 0) {
      return <span className="text-gray-400">-</span>;
    }
    return month.attendancePercentage >= 60 ? (
      <span className="text-green-600">Met</span>
    ) : (
      <span className="text-red-600">Not Met</span>
    );
  };

  const downloadReport = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text(`Attendance Report - ${selectedYear}`, 14, 20);
    
    // Add generation date
    doc.setFontSize(10);
    doc.text(`Generated on: ${format(new Date(), 'PPP')}`, 14, 30);
    
    // Add summary
    doc.setFontSize(12);
    doc.text('Summary:', 14, 40);
    doc.setFontSize(10);
    doc.text(`Average Attendance: ${averageAttendance}%`, 20, 48);
    doc.text(`Target Achievement: ${monthsAboveTarget} out of 12 months`, 20, 56);
    
    // Add monthly data table
    const tableData = yearlyData.map(month => [
      format(parse(month.month, 'yyyy-MM', new Date()), 'MMMM'),
      month.workingDays.length > 0 ? `${month.attendancePercentage}%` : '-',
      month.workingDays.length || '-',
      month.holidays.length || '-',
      month.workingDays.length > 0 
        ? (month.attendancePercentage >= 60 ? 'Met' : 'Not Met')
        : '-'
    ]);

    autoTable(doc, {
      startY: 65,
      head: [['Month', 'Attendance', 'Working Days', 'Holidays', 'Target Status']],
      body: tableData,
      theme: 'grid',
      headStyles: { 
        fillColor: [79, 70, 229],
        textColor: 255,
        fontSize: 10,
        fontStyle: 'bold'
      },
      styles: { 
        fontSize: 9,
        cellPadding: 3
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250]
      }
    });
    
    doc.save(`attendance-report-${selectedYear}.pdf`);
  };

  const currentYear = new Date().getFullYear();
  const years = [2024, currentYear];
  if (currentYear < 2025) {
    years.push(2025);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <BarChart className="w-6 h-6 text-indigo-600" />
          Yearly Report
        </h2>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="px-3 py-2 border rounded-md"
        >
          {years.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-indigo-100 p-4 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                <h3 className="font-medium text-gray-900">Average Attendance</h3>
              </div>
              <p className="text-2xl font-bold text-indigo-600">{averageAttendance}%</p>
            </div>
            <div className="bg-green-100 p-4 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="w-5 h-5 text-green-600" />
                <h3 className="font-medium text-gray-900">Target Achievement</h3>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {monthsAboveTarget} / 12
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="py-3 text-left">Month</th>
                  <th className="py-3 text-right">Attendance</th>
                  <th className="py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {yearlyData.map(month => (
                  <tr
                    key={month.month} 
                    className="border-b transition-all duration-200 hover:bg-gray-50 cursor-default group"
                  >
                    <td className="py-3 group-hover:pl-2 transition-all duration-200">
                      {format(parse(month.month, 'yyyy-MM', new Date()), 'MMMM')}
                    </td>
                    <td className="py-3 text-right font-medium group-hover:scale-105 transition-all duration-200 origin-right">
                      {month.workingDays.length > 0 ? `${month.attendancePercentage}%` : '-'}
                    </td>
                    <td className="py-3 text-right group-hover:font-medium transition-all duration-200">
                      {getMonthStatus(month)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={downloadReport}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center gap-2 transition-colors duration-200"
            >
              <Download className="w-4 h-4" />
              Download Report
            </button>
          </div>
        </>
      )}
    </div>
  );
}