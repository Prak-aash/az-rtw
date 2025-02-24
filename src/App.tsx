import { useState, useRef, useEffect } from 'react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameMonth, isToday, addMonths, subMonths, isWeekend, setMonth, setYear } from 'date-fns';
import { Contact, Calendar, Clock, Building, Percent, Coffee, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { attendanceDB } from './Data';
import { YearlyReport } from './Report';

function App() {
  console.clear(); console.info("Crafted By Prakaash Murugesan! ❤️ : https://prakaash.netlify.app/")

  const [selectedDates, setSelectedDates] = useState<{
    workingDays: Set<string>;
    holidays: Set<string>;
  }>({
    workingDays: new Set(),
    holidays: new Set(),
  });

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const lastClickTime = useRef<{ [key: string]: number }>({});
  const datePickerRef = useRef<HTMLDivElement>(null);
  const DOUBLE_CLICK_DELAY = 300;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const totalWorkingDays = daysInMonth.filter(date => !isWeekend(date)).length;
  const holidays = Array.from(selectedDates.holidays).filter(dateStr => {
    const date = new Date(dateStr);
    return !isWeekend(date) && isSameMonth(date, currentMonth);
  }).length;
  const requiredWorkingDays = Math.ceil((totalWorkingDays - holidays) * 0.6);
  const currentAttendance = Array.from(selectedDates.workingDays).filter(dateStr => {
    const date = new Date(dateStr);
    return !isWeekend(date) && isSameMonth(date, currentMonth);
  }).length;
  const attendancePercentage = Math.round(
    (currentAttendance / (totalWorkingDays - holidays)) * 100
  ) || 0;
  const remainingDays = Math.max(requiredWorkingDays - currentAttendance, 0);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setIsDatePickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const loadMonthData = async () => {
      try {
        const monthKey = format(currentMonth, 'yyyy-MM');
        const record = await attendanceDB.getMonthlyRecord(monthKey);
        
        if (record) {
          setSelectedDates({
            workingDays: new Set(record.workingDays),
            holidays: new Set(record.holidays),
          });
        } else {
          setSelectedDates({ workingDays: new Set(), holidays: new Set() });
        }
      } catch (error) {
        console.error('Error loading month data:', error);
      }
    };

    loadMonthData();
  }, [currentMonth]);

  useEffect(() => {
    const saveData = async () => {
      const monthKey = format(currentMonth, 'yyyy-MM');
      setSaveStatus('saving');
      
      try {
        const monthData = {
          month: monthKey,
          workingDays: Array.from(selectedDates.workingDays).filter(dateStr => {
            const date = new Date(dateStr);
            return isSameMonth(date, currentMonth);
          }),
          holidays: Array.from(selectedDates.holidays).filter(dateStr => {
            const date = new Date(dateStr);
            return isSameMonth(date, currentMonth);
          }),
          attendancePercentage
        };

        if (monthData.workingDays.length > 0 || monthData.holidays.length > 0) {
          await attendanceDB.saveMonthlyRecord(monthData);
          console.log('Saved data for month:', monthKey, monthData);
        } else {
          await attendanceDB.deleteMonthlyRecord(monthKey);
          console.log('Deleted data for month:', monthKey);
        }

        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
        
        window.dispatchEvent(new Event('attendance-updated'));
      } catch (error) {
        console.error('Error saving attendance:', error);
        setSaveStatus('idle');
      }
    };

    const timeoutId = setTimeout(saveData, 300);
    return () => clearTimeout(timeoutId);
  }, [selectedDates, currentMonth, attendancePercentage]);

  const handleDateClick = (date: Date) => {
    if (isWeekend(date) || !isSameMonth(date, currentMonth)) return;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    const currentTime = new Date().getTime();
    const lastClick = lastClickTime.current[dateStr] || 0;

    if (currentTime - lastClick < DOUBLE_CLICK_DELAY) {
      setSelectedDates(prev => {
        const newWorkingDays = new Set(prev.workingDays);
        const newHolidays = new Set(prev.holidays);

        if (newHolidays.has(dateStr)) {
          newHolidays.delete(dateStr);
        } else {
          newHolidays.add(dateStr);
          newWorkingDays.delete(dateStr);
        }

        return {
          workingDays: newWorkingDays,
          holidays: newHolidays,
        };
      });
      lastClickTime.current[dateStr] = 0;
    } else {
      setSelectedDates(prev => {
        const newWorkingDays = new Set(prev.workingDays);
        const newHolidays = new Set(prev.holidays);

        if (newWorkingDays.has(dateStr)) {
          newWorkingDays.delete(dateStr);
        } else {
          newWorkingDays.add(dateStr);
          newHolidays.delete(dateStr);
        }

        return {
          workingDays: newWorkingDays,
          holidays: newHolidays,
        };
      });
      lastClickTime.current[dateStr] = currentTime;
    }
  };

  const handleClear = async () => {
    const monthKey = format(currentMonth, 'yyyy-MM');
    setSelectedDates({ workingDays: new Set(), holidays: new Set() });
    try {
      await attendanceDB.deleteMonthlyRecord(monthKey);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
      
      window.dispatchEvent(new Event('attendance-updated'));
    } catch (error) {
      console.error('Error clearing attendance:', error);
      setSaveStatus('idle');
    }
  };

  const stats = [
    {
      icon: Calendar,
      label: 'Total Working Days',
      value: totalWorkingDays,
    },
    {
      icon: Clock,
      label: 'Total Holidays',
      value: holidays,
    },
    {
      icon: Building,
      label: 'Required Office Days',
      value: requiredWorkingDays,
    },
    {
      icon: Percent,
      label: 'Attendance',
      value: `${attendancePercentage}%`,
    },
  ];

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const years = [2024, 2025];

  return (
    <div className="min-h-screen bg-gray-50 p-5">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Contact className="w-8 h-8 text-indigo-600" />
            Attendance Tracker
          </h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
            <div className="select-none">
              <div className="flex items-center justify-between mb-6">
                <div className="relative" ref={datePickerRef}>
                  <button
                    onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                    className="text-lg font-semibold text-gray-900 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                  >
                    {format(currentMonth, 'MMMM yyyy')}
                    <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${isDatePickerOpen ? 'transform rotate-180' : ''}`} />
                  </button>

                  {isDatePickerOpen && (
                    <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-10 w-64">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h3 className="text-sm font-medium text-gray-500 mb-2">Month</h3>
                          <div className="space-y-1">
                            {months.map((month, index) => (
                              <button
                                key={month}
                                onClick={() => {
                                  setCurrentMonth(setMonth(currentMonth, index));
                                  setIsDatePickerOpen(false);
                                }}
                                className={`w-full text-left px-3 py-1 rounded text-sm ${
                                  currentMonth.getMonth() === index
                                    ? 'bg-indigo-100 text-indigo-700 font-medium'
                                    : 'hover:bg-gray-100'
                                }`}
                              >
                                {month}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-500 mb-2">Year</h3>
                          <div className="space-y-1">
                            {years.map(year => (
                              <button
                                key={year}
                                onClick={() => {
                                  setCurrentMonth(setYear(currentMonth, year));
                                  setIsDatePickerOpen(false);
                                }}
                                className={`w-full text-left px-3 py-1 rounded text-sm ${
                                  currentMonth.getFullYear() === year
                                    ? 'bg-indigo-100 text-indigo-700 font-medium'
                                    : 'hover:bg-gray-100'
                                }`}
                              >
                                {year}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    className="p-2 hover:bg-gray-200 rounded-full transition-colors duration-200"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="p-2 hover:bg-gray-200 rounded-full transition-colors duration-200"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                    {day}
                  </div>
                ))}

                {days.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const isWorkingDay = selectedDates.workingDays.has(dateStr);
                  const isHoliday = selectedDates.holidays.has(dateStr);
                  const isWeekendDay = isWeekend(day);
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  
                  return (
                    <div
                      key={day.toString()}
                      onClick={() => handleDateClick(day)}
                      className={`aspect-square p-2 border rounded-lg transition-all duration-200
                        ${!isCurrentMonth ? 'text-gray-300 cursor-not-allowed' : ''}
                        ${isWorkingDay && isCurrentMonth ? 'bg-green-100 border-green-300 hover:bg-green-200' : ''}
                        ${isHoliday && isCurrentMonth ? 'bg-red-100 border-red-300 hover:bg-red-200' : ''}
                        ${isToday(day) ? 'ring-2 ring-indigo-400' : ''}
                        ${isWeekendDay || !isCurrentMonth ? 'bg-gray-100 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}
                      `}>
                      <div className="h-full flex items-center justify-center">
                        {format(day, 'd')}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center justify-between text-sm">
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
                    <span title='Single Click'>Working Day</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
                    <span title='Double Click'>Holiday</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
                    <span>Weekend</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {saveStatus === 'saving' && (
                    <span className="text-sm text-gray-500">Saving...</span>
                  )}
                  {saveStatus === 'saved' && (
                    <span className="text-sm text-green-600">Saved!</span>
                  )}
                  <button 
                    onClick={handleClear}
                    className="px-3 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-300 transition-colors duration-200"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              Attendance Stats
            </h2>

            <div className="space-y-6">
              {stats.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-4">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Icon className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{label}</p>
                    <p className="text-lg font-semibold text-gray-900">{value}</p>
                  </div>
                </div>
              ))}

              <div className="pt-4 border-t">
                <div className={`p-4 rounded-lg transition-colors duration-300 ${remainingDays > 0 ? 'bg-yellow-50' : 'bg-green-50'}`}>
                  <p className={`text-sm ${remainingDays > 0 ? 'text-yellow-800' : 'text-green-800'}`}>
                    {remainingDays > 0
                      ? `You need ${remainingDays} more office day${
                          remainingDays === 1 ? '' : 's'
                        } to meet the 60% requirement.`
                      : 'You have met the attendance requirement for this month! 🎉'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <YearlyReport />
      </div>
      <footer className="text-center text-gray-500 text-sm opacity-0 hover:opacity-100 transition-opacity duration-300 flex justify-center items-center gap-1">
        Crafted With <Coffee size={16} className="inline-block" /> n By <a href="https://prakaash.netlify.app/" className="hover:text-indigo-600">Prakaash Murugesan </a>!
      </footer>
    </div>
  );
}

export default App;
