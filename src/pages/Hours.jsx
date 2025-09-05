import React, { useEffect, useState, useMemo } from 'react';

function formatDateTime(dateString) {
  return new Date(dateString).toLocaleString();
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString();
}

function formatTime(dateString) {
  return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Helper function to get the start of week (Sunday)
function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day; // Adjust to Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0); // Set to start of day
  return d;
}

// Helper function to get the end of week (Saturday)
function getEndOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + 6; // Adjust to Saturday
  d.setDate(diff);
  d.setHours(23, 59, 59, 999); // Set to end of day
  return d;
}

// Helper function to calculate hours between two timestamps
function calculateHours(clockIn, clockOut) {
  if (!clockIn || !clockOut) return 0;
  const diff = new Date(clockOut) - new Date(clockIn);
  return diff / (1000 * 60 * 60); // Convert to hours
}

export default function Hours() {
  const [timeEntries, setTimeEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('payroll'); // 'payroll', 'daily', 'weekly', 'entries'
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedWeek, setSelectedWeek] = useState(new Date().toISOString().split('T')[0]);
  const [hourlyRate, setHourlyRate] = useState(15); // Default hourly rate

  // Function to fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/time-entries');
      const data = await response.json();
      
      // Add date field to each entry for easier filtering (using local timezone)
      const processedData = data.map(entry => {
        const localDate = new Date(entry.timestamp);
        // Convert to local date string (YYYY-MM-DD format)
        const year = localDate.getFullYear();
        const month = String(localDate.getMonth() + 1).padStart(2, '0');
        const day = String(localDate.getDate()).padStart(2, '0');
        return {
          ...entry,
          date: `${year}-${month}-${day}`
        };
      });
      
      setTimeEntries(processedData);
    } catch (err) {
      console.error(err);
      // Mock data for demonstration
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      setTimeEntries([
        {
          id: 1,
          employeeName: 'Maria Garcia',
          type: 'clock_in',
          timestamp: new Date(today.getTime() + 8 * 60 * 60 * 1000).toISOString(), // 8 AM
          date: today.toISOString().split('T')[0]
        },
        {
          id: 2,
          employeeName: 'Maria Garcia',
          type: 'clock_out',
          timestamp: new Date(today.getTime() + 16 * 60 * 60 * 1000).toISOString(), // 4 PM
          date: today.toISOString().split('T')[0]
        },
        {
          id: 3,
          employeeName: 'Carlos Rodriguez',
          type: 'clock_in',
          timestamp: new Date(today.getTime() + 9 * 60 * 60 * 1000).toISOString(), // 9 AM
          date: today.toISOString().split('T')[0]
        },
        {
          id: 4,
          employeeName: 'Carlos Rodriguez',
          type: 'clock_out',
          timestamp: new Date(today.getTime() + 17 * 60 * 60 * 1000).toISOString(), // 5 PM
          date: today.toISOString().split('T')[0]
        },
        {
          id: 5,
          employeeName: 'Maria Garcia',
          type: 'clock_in',
          timestamp: new Date(yesterday.getTime() + 8 * 60 * 60 * 1000).toISOString(),
          date: yesterday.toISOString().split('T')[0]
        },
        {
          id: 6,
          employeeName: 'Maria Garcia',
          type: 'clock_out',
          timestamp: new Date(yesterday.getTime() + 16 * 60 * 60 * 1000).toISOString(),
          date: yesterday.toISOString().split('T')[0]
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when component mounts
  useEffect(() => {
    fetchData();
  }, []);

  // Get unique employee names
  const employeeNames = useMemo(() => {
    const names = [...new Set(timeEntries.map(entry => entry.employeeName))];
    return names.sort();
  }, [timeEntries]);

  // Calculate payroll data
  const payrollData = useMemo(() => {
    const employeeMap = new Map();
    
    timeEntries.forEach((entry) => {
      if (!employeeMap.has(entry.employeeName)) {
        employeeMap.set(entry.employeeName, {
          name: entry.employeeName,
          clockIns: [],
          clockOuts: [],
          totalHours: 0,
          totalPay: 0,
          lastActivity: null
        });
      }
      
      const employee = employeeMap.get(entry.employeeName);
      if (entry.type === 'clock_in') {
        employee.clockIns.push(entry);
      } else if (entry.type === 'clock_out') {
        employee.clockOuts.push(entry);
      }
      
      if (entry.timestamp > employee.lastActivity || !employee.lastActivity) {
        employee.lastActivity = entry.timestamp;
      }
    });

    // Calculate hours and pay for each employee
    employeeMap.forEach((employee) => {
      let totalHours = 0;
      
      // Match clock ins with clock outs
      for (let i = 0; i < Math.min(employee.clockIns.length, employee.clockOuts.length); i++) {
        const clockIn = employee.clockIns[i];
        const clockOut = employee.clockOuts[i];
        
        if (new Date(clockOut.timestamp) > new Date(clockIn.timestamp)) {
          const hours = calculateHours(clockIn.timestamp, clockOut.timestamp);
          totalHours += hours;
        }
      }
      
      employee.totalHours = totalHours;
      employee.totalPay = totalHours * hourlyRate;
    });

    return Array.from(employeeMap.values())
      .sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
  }, [timeEntries, hourlyRate]);

  // Calculate daily data for selected employee and date
  const dailyData = useMemo(() => {
    if (!selectedEmployee || !selectedDate) return null;
    
    const dayEntries = timeEntries.filter(entry => 
      entry.employeeName === selectedEmployee && 
      entry.date === selectedDate
    ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    const clockIns = dayEntries.filter(entry => entry.type === 'clock_in');
    const clockOuts = dayEntries.filter(entry => entry.type === 'clock_out');
    
    let totalHours = 0;
    const shifts = [];
    
    for (let i = 0; i < Math.min(clockIns.length, clockOuts.length); i++) {
      const clockIn = clockIns[i];
      const clockOut = clockOuts[i];
      
      if (new Date(clockOut.timestamp) > new Date(clockIn.timestamp)) {
        const hours = calculateHours(clockIn.timestamp, clockOut.timestamp);
        totalHours += hours;
        shifts.push({
          clockIn: clockIn.timestamp,
          clockOut: clockOut.timestamp,
          hours: hours
        });
      }
    }
    
    return {
      employee: selectedEmployee,
      date: selectedDate,
      clockIns,
      clockOuts,
      shifts,
      totalHours,
      totalPay: totalHours * hourlyRate
    };
  }, [timeEntries, selectedEmployee, selectedDate, hourlyRate]);

  // Calculate weekly data for selected employee and week
  const weeklyData = useMemo(() => {
    if (!selectedEmployee || !selectedWeek) return null;
    
    const weekStart = getStartOfWeek(selectedWeek);
    const weekEnd = getEndOfWeek(selectedWeek);
    
    const weekEntries = timeEntries.filter(entry => {
      // Compare date strings directly since both are in YYYY-MM-DD format
      return entry.employeeName === selectedEmployee && 
             entry.date >= weekStart.toISOString().split('T')[0] && 
             entry.date <= weekEnd.toISOString().split('T')[0];
    }).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    const dailyData = {};
    let totalWeekHours = 0;
    
    // Group by day
    for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
      const dayKey = d.toISOString().split('T')[0];
      const dayEntries = weekEntries.filter(entry => entry.date === dayKey);
      
      const clockIns = dayEntries.filter(entry => entry.type === 'clock_in');
      const clockOuts = dayEntries.filter(entry => entry.type === 'clock_out');
      
      let dayHours = 0;
      const shifts = [];
      
      for (let i = 0; i < Math.min(clockIns.length, clockOuts.length); i++) {
        const clockIn = clockIns[i];
        const clockOut = clockOuts[i];
        
        if (new Date(clockOut.timestamp) > new Date(clockIn.timestamp)) {
          const hours = calculateHours(clockIn.timestamp, clockOut.timestamp);
          dayHours += hours;
          shifts.push({
            clockIn: clockIn.timestamp,
            clockOut: clockOut.timestamp,
            hours: hours
          });
        }
      }
      
      dailyData[dayKey] = {
        date: dayKey,
        dayName: d.toLocaleDateString('en-US', { weekday: 'long' }),
        clockIns,
        clockOuts,
        shifts,
        hours: dayHours,
        pay: dayHours * hourlyRate
      };
      
      totalWeekHours += dayHours;
    }
    
    return {
      employee: selectedEmployee,
      weekStart: weekStart.toISOString().split('T')[0],
      weekEnd: weekEnd.toISOString().split('T')[0],
      dailyData,
      totalWeekHours,
      totalWeekPay: totalWeekHours * hourlyRate
    };
  }, [timeEntries, selectedEmployee, selectedWeek, hourlyRate]);

  if (loading) return <div style={{ padding: 16 }}>Loading payroll data...</div>;

  return (
    <div style={{ padding: 16 }}>
      <h3 style={{ marginTop: 0 }}>Employee Payroll System</h3>
      
      {/* Employee Selection */}
      <div style={{ 
        display: 'flex', 
        gap: 16, 
        marginBottom: 24, 
        padding: '16px', 
        backgroundColor: '#f8fafc', 
        borderRadius: '8px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label htmlFor="employeeSelect" style={{ fontWeight: 600, fontSize: '0.9em' }}>Employee:</label>
          <select
            id="employeeSelect"
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.9em',
              minWidth: '150px'
            }}
          >
            <option value="">Select Employee</option>
            {employeeNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label htmlFor="hourlyRate" style={{ fontWeight: 600, fontSize: '0.9em' }}>Hourly Rate ($):</label>
          <input
            id="hourlyRate"
            type="number"
            step="0.01"
            min="0"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.9em',
              width: '80px'
            }}
          />
        </div>
        
        {/* Timezone Info */}
        <div style={{ 
          fontSize: '0.8em', 
          color: '#6b7280', 
          backgroundColor: '#f3f4f6',
          padding: '4px 8px',
          borderRadius: '4px',
          marginLeft: 'auto'
        }}>
          Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
        </div>
      </div>
      
      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, borderBottom: '1px solid #eee' }}>
        {[
          { id: 'payroll', label: 'Payroll Summary' },
          { id: 'daily', label: 'Daily View' },
          { id: 'weekly', label: 'Weekly View' },
          { id: 'entries', label: 'All Time Entries' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #2563eb' : '2px solid transparent',
              color: activeTab === tab.id ? '#2563eb' : '#666',
              fontWeight: activeTab === tab.id ? 600 : 400,
              cursor: 'pointer'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Payroll Summary Tab */}
      {activeTab === 'payroll' && (
        <div>
          <h4>Payroll Summary</h4>
          {payrollData.length === 0 ? (
            <div style={{ opacity: 0.7 }}>No employee data</div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {payrollData.map((employee) => (
                <div key={employee.name} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 12, alignItems: 'center' }}>
                    <div>
                      <strong>{employee.name}</strong>
                      <div style={{ fontSize: '0.9em', opacity: 0.7 }}>
                        Last activity: {formatDateTime(employee.lastActivity)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 600, color: '#059669' }}>Clock Ins</div>
                      <div>{employee.clockIns.length}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 600, color: '#dc2626' }}>Clock Outs</div>
                      <div>{employee.clockOuts.length}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 600, color: '#7c3aed' }}>Total Hours</div>
                      <div>{employee.totalHours.toFixed(2)}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 600, color: '#059669' }}>Total Pay</div>
                      <div style={{ fontSize: '1.1em', fontWeight: '700', color: '#059669' }}>
                        ${employee.totalPay.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Daily View Tab */}
      {activeTab === 'daily' && (
        <div>
          <h4>Daily View</h4>
          
          {!selectedEmployee ? (
            <div style={{ opacity: 0.7 }}>Please select an employee first</div>
          ) : (
            <div>
              <div style={{ marginBottom: 16 }}>
                <label htmlFor="dailyDate" style={{ fontWeight: 600, fontSize: '0.9em', marginRight: 8 }}>Date:</label>
                <input
                  id="dailyDate"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.9em'
                  }}
                />
              </div>
              
              {dailyData ? (
                <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
                  <h5 style={{ margin: '0 0 16px 0' }}>
                    {dailyData.employee} - {formatDate(dailyData.date)}
                  </h5>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 600, color: '#7c3aed' }}>Total Hours</div>
                      <div style={{ fontSize: '1.5em', fontWeight: '700', color: '#7c3aed' }}>
                        {dailyData.totalHours.toFixed(2)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 600, color: '#059669' }}>Total Pay</div>
                      <div style={{ fontSize: '1.5em', fontWeight: '700', color: '#059669' }}>
                        ${dailyData.totalPay.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  
                  {dailyData.shifts.length > 0 ? (
                    <div>
                      <h6 style={{ margin: '0 0 12px 0' }}>Shifts:</h6>
                      <div style={{ display: 'grid', gap: 8 }}>
                        {dailyData.shifts.map((shift, index) => (
                          <div key={index} style={{ 
                            display: 'grid', 
                            gridTemplateColumns: '1fr 1fr 1fr', 
                            gap: 12, 
                            padding: '8px 12px',
                            backgroundColor: '#f9fafb',
                            borderRadius: '6px'
                          }}>
                            <div>
                              <strong>Clock In:</strong> {formatTime(shift.clockIn)}
                            </div>
                            <div>
                              <strong>Clock Out:</strong> {formatTime(shift.clockOut)}
                            </div>
                            <div>
                              <strong>Hours:</strong> {shift.hours.toFixed(2)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ opacity: 0.7 }}>No completed shifts for this day</div>
                  )}
                </div>
              ) : (
                <div style={{ opacity: 0.7 }}>No data for selected date</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Weekly View Tab */}
      {activeTab === 'weekly' && (
        <div>
          <h4>Weekly View</h4>
          
          {!selectedEmployee ? (
            <div style={{ opacity: 0.7 }}>Please select an employee first</div>
          ) : (
            <div>
              <div style={{ marginBottom: 16 }}>
                <label htmlFor="weeklyDate" style={{ fontWeight: 600, fontSize: '0.9em', marginRight: 8 }}>Week Starting:</label>
                <input
                  id="weeklyDate"
                  type="date"
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.9em'
                  }}
                />
              </div>
              
              {weeklyData ? (
                <div>
                  <div style={{ 
                    border: '1px solid #ddd', 
                    borderRadius: 8, 
                    padding: 16, 
                    marginBottom: 16,
                    backgroundColor: '#f0fdf4'
                  }}>
                    <h5 style={{ margin: '0 0 16px 0' }}>
                      {weeklyData.employee} - Week of {formatDate(weeklyData.weekStart)}
                    </h5>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 600, color: '#7c3aed' }}>Total Week Hours</div>
                        <div style={{ fontSize: '1.5em', fontWeight: '700', color: '#7c3aed' }}>
                          {weeklyData.totalWeekHours.toFixed(2)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 600, color: '#059669' }}>Total Week Pay</div>
                        <div style={{ fontSize: '1.5em', fontWeight: '700', color: '#059669' }}>
                          ${weeklyData.totalWeekPay.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gap: 8 }}>
                    {Object.values(weeklyData.dailyData).map((day) => (
                      <div key={day.date} style={{ 
                        border: '1px solid #ddd', 
                        borderRadius: 8, 
                        padding: 12,
                        backgroundColor: day.hours > 0 ? '#f0fdf4' : '#f9fafb'
                      }}>
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: '2fr 1fr 1fr 1fr', 
                          gap: 12, 
                          alignItems: 'center' 
                        }}>
                          <div>
                            <strong>{day.dayName}</strong>
                            <div style={{ fontSize: '0.9em', opacity: 0.7 }}>
                              {formatDate(day.date)}
                            </div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontWeight: 600, color: '#7c3aed' }}>Hours</div>
                            <div>{day.hours.toFixed(2)}</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontWeight: 600, color: '#059669' }}>Pay</div>
                            <div>${day.pay.toFixed(2)}</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontWeight: 600, color: '#dc2626' }}>Shifts</div>
                            <div>{day.shifts.length}</div>
                          </div>
                        </div>
                        
                        {day.shifts.length > 0 && (
                          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #eee' }}>
                            {day.shifts.map((shift, index) => (
                              <div key={index} style={{ 
                                fontSize: '0.9em', 
                                color: '#666',
                                marginBottom: 4
                              }}>
                                {formatTime(shift.clockIn)} - {formatTime(shift.clockOut)} ({shift.hours.toFixed(2)}h)
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ opacity: 0.7 }}>No data for selected week</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* All Time Entries Tab */}
      {activeTab === 'entries' && (
        <div>
          <h4>All Time Entries</h4>
          {timeEntries.length === 0 ? (
            <div style={{ opacity: 0.7 }}>No time entries</div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16, padding: '8px 16px', fontWeight: 600, borderBottom: '1px solid #eee' }}>
                <div>Employee</div>
                <div style={{ textAlign: 'center' }}>Type</div>
                <div style={{ textAlign: 'center' }}>Time</div>
              </div>
              {timeEntries
                .filter(entry => !selectedEmployee || entry.employeeName === selectedEmployee)
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .map((entry) => (
                <div key={entry.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16, padding: '8px 16px', alignItems: 'center', borderBottom: '1px solid #f3f4f6' }}>
                  <div>{entry.employeeName}</div>
                  <div style={{ 
                    textAlign: 'center', 
                    fontWeight: 600,
                    color: entry.type === 'clock_in' ? '#059669' : '#dc2626'
                  }}>
                    {entry.type === 'clock_in' ? 'CLOCK IN' : 'CLOCK OUT'}
                  </div>
                  <div style={{ textAlign: 'center', fontSize: '0.9em' }}>
                    {formatDateTime(entry.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
