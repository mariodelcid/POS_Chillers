import React, { useEffect, useState, useMemo } from 'react';

function formatDateTime(dateString) {
  return new Date(dateString).toLocaleString();
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString();
}

export default function Hours() {
  const [timeEntries, setTimeEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary'); // 'summary', 'employees', 'entries'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Function to fetch data with date filters
  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await fetch(`/api/time-entries?${params.toString()}`);
      const data = await response.json();
      
      setTimeEntries(data);
    } catch (err) {
      console.error(err);
      // For now, use mock data since we haven't implemented the backend yet
      setTimeEntries([
        {
          id: 1,
          employeeName: 'John Doe',
          type: 'clock_in',
          timestamp: new Date().toISOString(),
          date: new Date().toLocaleDateString()
        },
        {
          id: 2,
          employeeName: 'Jane Smith',
          type: 'clock_out',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          date: new Date().toLocaleDateString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when component mounts or date filters change
  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  // Handle date filter changes
  const handleDateChange = (type, value) => {
    if (type === 'start') {
      setStartDate(value);
    } else {
      setEndDate(value);
    }
  };

  // Reset date filters
  const resetFilters = () => {
    setStartDate('');
    setEndDate('');
  };

  // Get today's date in YYYY-MM-DD format for max attribute
  const today = new Date().toISOString().split('T')[0];

  // Calculate employee summaries
  const employeeSummary = useMemo(() => {
    const employeeMap = new Map();
    
    timeEntries.forEach((entry) => {
      if (!employeeMap.has(entry.employeeName)) {
        employeeMap.set(entry.employeeName, {
          name: entry.employeeName,
          clockIns: 0,
          clockOuts: 0,
          totalHours: 0,
          lastActivity: null
        });
      }
      
      const employee = employeeMap.get(entry.employeeName);
      if (entry.type === 'clock_in') {
        employee.clockIns++;
      } else if (entry.type === 'clock_out') {
        employee.clockOuts++;
      }
      
      if (entry.timestamp > employee.lastActivity || !employee.lastActivity) {
        employee.lastActivity = entry.timestamp;
      }
    });

    return Array.from(employeeMap.values())
      .sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
  }, [timeEntries]);

  if (loading) return <div style={{ padding: 16 }}>Loading time tracking data...</div>;

  return (
    <div style={{ padding: 16 }}>
      <h3 style={{ marginTop: 0 }}>Employee Time Tracking</h3>
      
      {/* Date Filters */}
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
          <label htmlFor="startDate" style={{ fontWeight: 600, fontSize: '0.9em' }}>From:</label>
          <input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => handleDateChange('start', e.target.value)}
            max={today}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.9em'
            }}
          />
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label htmlFor="endDate" style={{ fontWeight: 600, fontSize: '0.9em' }}>To:</label>
          <input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => handleDateChange('end', e.target.value)}
            max={today}
            min={startDate}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.9em'
            }}
          />
        </div>
        
        <button
          onClick={resetFilters}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.9em'
          }}
        >
          Reset Filters
        </button>
        
        {(startDate || endDate) && (
          <div style={{ 
            fontSize: '0.9em', 
            color: '#059669', 
            fontWeight: 600,
            backgroundColor: '#d1fae5',
            padding: '4px 12px',
            borderRadius: '6px'
          }}>
            Filtered by date range
          </div>
        )}
        
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
          { id: 'summary', label: 'Employee Summary' },
          { id: 'employees', label: 'Employee Details' },
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

      {timeEntries.length === 0 && <div style={{ opacity: 0.7 }}>No time tracking data yet</div>}

      {/* Employee Summary Tab */}
      {activeTab === 'summary' && (
        <div>
          <h4>Employee Summary</h4>
          {employeeSummary.length === 0 ? (
            <div style={{ opacity: 0.7 }}>No employee data</div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {employeeSummary.map((employee) => (
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
                      <div>{employee.clockIns}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 600, color: '#dc2626' }}>Clock Outs</div>
                      <div>{employee.clockOuts}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 600, color: '#7c3aed' }}>Total Hours</div>
                      <div>{employee.totalHours.toFixed(2)}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 600, color: employee.clockIns > employee.clockOuts ? '#dc2626' : '#059669' }}>
                        Status
                      </div>
                      <div style={{ 
                        color: employee.clockIns > employee.clockOuts ? '#dc2626' : '#059669',
                        fontWeight: '700'
                      }}>
                        {employee.clockIns > employee.clockOuts ? 'CLOCKED IN' : 'CLOCKED OUT'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Employee Details Tab */}
      {activeTab === 'employees' && (
        <div>
          <h4>Employee Details</h4>
          {employeeSummary.length === 0 ? (
            <div style={{ opacity: 0.7 }}>No employee data</div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 16, padding: '8px 16px', fontWeight: 600, borderBottom: '1px solid #eee' }}>
                <div>Employee</div>
                <div style={{ textAlign: 'center' }}>Clock Ins</div>
                <div style={{ textAlign: 'center' }}>Clock Outs</div>
                <div style={{ textAlign: 'center' }}>Total Hours</div>
                <div style={{ textAlign: 'center' }}>Status</div>
              </div>
              {employeeSummary.map((employee) => (
                <div key={employee.name} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 16, padding: '8px 16px', alignItems: 'center', borderBottom: '1px solid #f3f4f6' }}>
                  <div>{employee.name}</div>
                  <div style={{ textAlign: 'center', fontWeight: 600 }}>{employee.clockIns}</div>
                  <div style={{ textAlign: 'center', fontWeight: 600 }}>{employee.clockOuts}</div>
                  <div style={{ textAlign: 'center', fontWeight: 600 }}>{employee.totalHours.toFixed(2)}</div>
                  <div style={{ 
                    textAlign: 'center', 
                    fontWeight: 600,
                    color: employee.clockIns > employee.clockOuts ? '#dc2626' : '#059669'
                  }}>
                    {employee.clockIns > employee.clockOuts ? 'CLOCKED IN' : 'CLOCKED OUT'}
                  </div>
                </div>
              ))}
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
              {timeEntries.map((entry) => (
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
