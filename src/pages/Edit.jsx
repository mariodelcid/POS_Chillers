import React, { useEffect, useState, useMemo } from 'react';

function formatDateTime(dateString) { return new Date(dateString).toLocaleString(); }
function formatDate(dateString) { return new Date(dateString).toLocaleDateString(); }
function formatTime(dateString) { return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
function getStartOfWeek(date) { const d = new Date(date); const day = d.getDay(); d.setDate(d.getDate() - day); d.setHours(0,0,0,0); return d; }
function getEndOfWeek(date) { const d = new Date(date); const day = d.getDay(); d.setDate(d.getDate() - day + 6); d.setHours(23,59,59,999); return d; }
function calculateHours(clockIn, clockOut) { if (!clockIn || !clockOut) return 0; return (new Date(clockOut) - new Date(clockIn)) / (1000 * 60 * 60); }

// ---- INVENTORY MANAGEMENT SECTION ----
function InventoryManager() {
  const [packaging, setPackaging] = useState([]);
  const [items, setItems] = useState([]);
  const [loadingPkg, setLoadingPkg] = useState(true);
  const [loadingItems, setLoadingItems] = useState(true);
  const [editingPkgId, setEditingPkgId] = useState(null);
  const [editPkgValue, setEditPkgValue] = useState('');
  const [editingItemId, setEditingItemId] = useState(null);
  const [editItemData, setEditItemData] = useState({});
  const [invTab, setInvTab] = useState('packaging');

  useEffect(() => { fetchPackaging(); fetchItems(); }, []);

  const fetchPackaging = async () => {
    try {
      const r = await fetch('/api/packaging');
      const data = await r.json();
      const packagingOrder = ['24clear','20clear','16clear','nievecup','elote grande','elote chico','elote','charolas','chetos','conchitas','sopas','takis','tostitos','doritos'];
      setPackaging(data.sort((a,b) => { const ai=packagingOrder.indexOf(a.name),bi=packagingOrder.indexOf(b.name); if(ai!==-1&&bi!==-1) return ai-bi; if(ai!==-1) return -1; if(bi!==-1) return 1; return a.name.localeCompare(b.name); }));
    } catch(e) { console.error(e); }
    setLoadingPkg(false);
  };

  const fetchItems = async () => {
    try {
      const r = await fetch('/api/items');
      const data = await r.json();
      setItems(data);
    } catch(e) { console.error(e); }
    setLoadingItems(false);
  };

  const savePkgEdit = async (id) => {
    const stock = parseInt(editPkgValue);
    if (isNaN(stock) || stock < 0) { alert('Please enter a valid stock number'); return; }
    const r = await fetch('/api/packaging/'+id, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({stock}) });
    if (r.ok) { await fetchPackaging(); setEditingPkgId(null); setEditPkgValue(''); }
    else alert('Failed to update');
  };

  const saveItemEdit = async (id) => {
    const r = await fetch('/api/items/'+id, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(editItemData) });
    if (r.ok) { await fetchItems(); setEditingItemId(null); setEditItemData({}); }
    else alert('Failed to update item');
  };

  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:16, borderBottom:'2px solid #e5e7eb' }}>
        {[{id:'packaging',label:'Packaging Stock'},{id:'menu',label:'Menu Items'}].map(t => (
          <button key={t.id} onClick={()=>setInvTab(t.id)} style={{ padding:'10px 20px', backgroundColor: invTab===t.id?'#2563eb':'transparent', color: invTab===t.id?'white':'#6b7280', border:'none', borderRadius:'8px 8px 0 0', cursor:'pointer', fontWeight:600 }}>{t.label}</button>
        ))}
      </div>

      {invTab === 'packaging' && (
        <div>
          <h4 style={{marginBottom:12}}>Packaging & Containers Stock</h4>
          {loadingPkg ? <div>Loading...</div> : (
            <div style={{ display:'grid', gap:8 }}>
              <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr auto', gap:16, padding:'8px 16px', fontWeight:600, borderBottom:'1px solid #eee' }}>
                <div>Material</div><div>Stock</div><div>Actions</div>
              </div>
              {packaging.map(item => (
                <div key={item.id} style={{ display:'grid', gridTemplateColumns:'2fr 1fr auto', gap:16, padding:'8px 16px', alignItems:'center', borderBottom:'1px solid #f3f4f6' }}>
                  <div style={{fontWeight:600}}>{item.name}</div>
                  <div style={{textAlign:'center'}}>
                    {editingPkgId===item.id ? (
                      <input type="number" value={editPkgValue} onChange={e=>setEditPkgValue(e.target.value)} style={{ width:'80px', padding:'4px 8px', border:'1px solid #ddd', borderRadius:4, textAlign:'center' }} min="0" autoFocus />
                    ) : (
                      <span style={{ fontWeight:600, color: item.stock<50?'#dc2626':item.stock<100?'#f59e0b':'#059669' }}>
                        {item.name==='elote' ? (item.stock/480).toFixed(2)+' boxes' : item.stock}
                      </span>
                    )}
                  </div>
                  <div style={{textAlign:'center'}}>
                    {editingPkgId===item.id ? (
                      <div style={{display:'flex',gap:8}}>
                        <button onClick={()=>savePkgEdit(item.id)} style={{ padding:'4px 8px', background:'#059669', color:'white', border:'none', borderRadius:4, cursor:'pointer', fontSize:'0.8em' }}>Save</button>
                        <button onClick={()=>{setEditingPkgId(null);setEditPkgValue('');}} style={{ padding:'4px 8px', background:'#6b7280', color:'white', border:'none', borderRadius:4, cursor:'pointer', fontSize:'0.8em' }}>Cancel</button>
                      </div>
                    ) : (
                      <button onClick={()=>{setEditingPkgId(item.id);setEditPkgValue(item.stock.toString());}} style={{ padding:'6px 12px', background:'#2563eb', color:'white', border:'none', borderRadius:4, cursor:'pointer', fontSize:'0.8em' }}>Edit Stock</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {invTab === 'menu' && (
        <div>
          <h4 style={{marginBottom:12}}>Menu Items</h4>
          {loadingItems ? <div>Loading...</div> : (
            <div style={{ display:'grid', gap:8 }}>
              <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr auto', gap:12, padding:'8px 16px', fontWeight:600, borderBottom:'1px solid #eee', fontSize:'0.9em' }}>
                <div>Name</div><div>Category</div><div>Price</div><div>Stock</div><div>Actions</div>
              </div>
              {items.map(item => (
                <div key={item.id} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr auto', gap:12, padding:'8px 16px', alignItems:'center', borderBottom:'1px solid #f3f4f6', fontSize:'0.9em' }}>
                  {editingItemId===item.id ? (
                    <>
                      <input value={editItemData.name||''} onChange={e=>setEditItemData({...editItemData,name:e.target.value})} style={{ padding:'4px 8px', border:'1px solid #ddd', borderRadius:4 }} />
                      <input value={editItemData.category||''} onChange={e=>setEditItemData({...editItemData,category:e.target.value})} style={{ padding:'4px 8px', border:'1px solid #ddd', borderRadius:4 }} />
                      <input type="number" value={(editItemData.priceCents||0)/100} onChange={e=>setEditItemData({...editItemData,priceCents:Math.round(parseFloat(e.target.value||0)*100)})} style={{ padding:'4px 8px', border:'1px solid #ddd', borderRadius:4, width:'80px' }} step="0.01" min="0" />
                      <input type="number" value={editItemData.stock||0} onChange={e=>setEditItemData({...editItemData,stock:parseInt(e.target.value)||0})} style={{ padding:'4px 8px', border:'1px solid #ddd', borderRadius:4, width:'80px' }} min="0" />
                      <div style={{display:'flex',gap:4}}>
                        <button onClick={()=>saveItemEdit(item.id)} style={{ padding:'4px 8px', background:'#059669', color:'white', border:'none', borderRadius:4, cursor:'pointer', fontSize:'0.8em' }}>Save</button>
                        <button onClick={()=>{setEditingItemId(null);setEditItemData({});}} style={{ padding:'4px 8px', background:'#6b7280', color:'white', border:'none', borderRadius:4, cursor:'pointer', fontSize:'0.8em' }}>Cancel</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{fontWeight:500}}>{item.name}</div>
                      <div style={{color:'#6b7280'}}>{item.category}</div>
                      <div style={{fontWeight:600,color:'#059669'}}>${(item.priceCents/100).toFixed(2)}</div>
                      <div style={{fontWeight:600,color:item.stock<10?'#dc2626':item.stock<50?'#f59e0b':'#059669'}}>{item.stock}</div>
                      <button onClick={()=>{setEditingItemId(item.id);setEditItemData({name:item.name,category:item.category,priceCents:item.priceCents,stock:item.stock});}} style={{ padding:'6px 12px', background:'#2563eb', color:'white', border:'none', borderRadius:4, cursor:'pointer', fontSize:'0.8em' }}>Edit</button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---- HOURS MANAGEMENT SECTION ----
function HoursManager() {
  const [timeEntries, setTimeEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('payroll');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedWeek, setSelectedWeek] = useState(new Date().toISOString().split('T')[0]);
  const [hourlyRate, setHourlyRate] = useState(15);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/time-entries');
        const data = await r.json();
        setTimeEntries(data.map(entry => {
          const d = new Date(entry.timestamp);
          return { ...entry, date: d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0') };
        }));
      } catch(e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  const employeeNames = useMemo(() => [...new Set(timeEntries.map(e=>e.employeeName))].sort(), [timeEntries]);

  const payrollData = useMemo(() => {
    const map = new Map();
    timeEntries.forEach(entry => {
      if (!map.has(entry.employeeName)) map.set(entry.employeeName, { name:entry.employeeName, clockIns:[], clockOuts:[], totalHours:0, totalPay:0, lastActivity:null });
      const emp = map.get(entry.employeeName);
      if (entry.type==='clock_in') emp.clockIns.push(entry);
      else emp.clockOuts.push(entry);
      if (!emp.lastActivity || entry.timestamp > emp.lastActivity) emp.lastActivity = entry.timestamp;
    });
    map.forEach(emp => {
      let hrs = 0;
      for (let i=0; i<Math.min(emp.clockIns.length,emp.clockOuts.length); i++) {
        if (new Date(emp.clockOuts[i].timestamp) > new Date(emp.clockIns[i].timestamp))
          hrs += calculateHours(emp.clockIns[i].timestamp, emp.clockOuts[i].timestamp);
      }
      emp.totalHours = hrs; emp.totalPay = hrs * hourlyRate;
    });
    return Array.from(map.values()).sort((a,b) => new Date(b.lastActivity) - new Date(a.lastActivity));
  }, [timeEntries, hourlyRate]);

  const dailyData = useMemo(() => {
    if (!selectedEmployee || !selectedDate) return null;
    const dayEntries = timeEntries.filter(e => e.employeeName===selectedEmployee && e.date===selectedDate).sort((a,b) => new Date(a.timestamp)-new Date(b.timestamp));
    const cis = dayEntries.filter(e=>e.type==='clock_in'), cos = dayEntries.filter(e=>e.type==='clock_out');
    let totalHours=0; const shifts=[];
    for (let i=0; i<Math.min(cis.length,cos.length); i++) {
      if (new Date(cos[i].timestamp)>new Date(cis[i].timestamp)) { const h=calculateHours(cis[i].timestamp,cos[i].timestamp); totalHours+=h; shifts.push({clockIn:cis[i].timestamp,clockOut:cos[i].timestamp,hours:h}); }
    }
    return { employee:selectedEmployee, date:selectedDate, shifts, totalHours, totalPay:totalHours*hourlyRate };
  }, [timeEntries, selectedEmployee, selectedDate, hourlyRate]);

  const weeklyData = useMemo(() => {
    if (!selectedEmployee || !selectedWeek) return null;
    const ws = getStartOfWeek(selectedWeek), we = getEndOfWeek(selectedWeek);
    const wsd = ws.toISOString().split('T')[0], wed = we.toISOString().split('T')[0];
    const weekEntries = timeEntries.filter(e => e.employeeName===selectedEmployee && e.date>=wsd && e.date<=wed).sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp));
    const daily={}; let totalWk=0;
    for (let d=new Date(ws); d<=we; d.setDate(d.getDate()+1)) {
      const key=d.toISOString().split('T')[0];
      const de=weekEntries.filter(e=>e.date===key);
      const cis=de.filter(e=>e.type==='clock_in'), cos=de.filter(e=>e.type==='clock_out');
      let h=0; const shifts=[];
      for (let i=0; i<Math.min(cis.length,cos.length); i++) {
        if (new Date(cos[i].timestamp)>new Date(cis[i].timestamp)) { const hrs=calculateHours(cis[i].timestamp,cos[i].timestamp); h+=hrs; shifts.push({clockIn:cis[i].timestamp,clockOut:cos[i].timestamp,hours:hrs}); }
      }
      daily[key]={ date:key, dayName:new Date(d).toLocaleDateString('en-US',{weekday:'long'}), shifts, hours:h, pay:h*hourlyRate };
      totalWk+=h;
    }
    return { employee:selectedEmployee, weekStart:wsd, weekEnd:wed, dailyData:daily, totalWeekHours:totalWk, totalWeekPay:totalWk*hourlyRate };
  }, [timeEntries, selectedEmployee, selectedWeek, hourlyRate]);

  if (loading) return <div style={{padding:16}}>Loading payroll data...</div>;

  return (
    <div>
      <div style={{ display:'flex', gap:16, marginBottom:24, padding:'16px', backgroundColor:'#f8fafc', borderRadius:'8px', alignItems:'center', flexWrap:'wrap' }}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <label style={{fontWeight:600,fontSize:'0.9em'}}>Employee:</label>
          <select value={selectedEmployee} onChange={e=>setSelectedEmployee(e.target.value)} style={{ padding:'8px 12px', border:'1px solid #d1d5db', borderRadius:'6px', fontSize:'0.9em', minWidth:'150px' }}>
            <option value="">Select Employee</option>
            {employeeNames.map(n=><option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <label style={{fontWeight:600,fontSize:'0.9em'}}>Hourly Rate ($):</label>
          <input type="number" step="0.01" min="0" value={hourlyRate} onChange={e=>setHourlyRate(parseFloat(e.target.value)||0)} style={{ padding:'8px 12px', border:'1px solid #d1d5db', borderRadius:'6px', fontSize:'0.9em', width:'80px' }} />
        </div>
      </div>

      <div style={{ display:'flex', gap:16, marginBottom:24, borderBottom:'1px solid #eee' }}>
        {[{id:'payroll',label:'Payroll Summary'},{id:'daily',label:'Daily View'},{id:'weekly',label:'Weekly View'},{id:'entries',label:'All Entries'}].map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{ padding:'8px 16px', border:'none', background:'none', borderBottom: activeTab===t.id?'2px solid #2563eb':'2px solid transparent', color:activeTab===t.id?'#2563eb':'#666', fontWeight:activeTab===t.id?600:400, cursor:'pointer' }}>{t.label}</button>
        ))}
      </div>

      {activeTab==='payroll' && (
        <div>
          <h4>Payroll Summary</h4>
          {payrollData.length===0 ? <div style={{opacity:0.7}}>No employee data</div> : (
            <div style={{display:'grid',gap:12}}>
              {payrollData.map(emp=>(
                <div key={emp.name} style={{border:'1px solid #ddd',borderRadius:8,padding:16}}>
                  <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr',gap:12,alignItems:'center'}}>
                    <div><strong>{emp.name}</strong><div style={{fontSize:'0.9em',opacity:0.7}}>Last: {formatDateTime(emp.lastActivity)}</div></div>
                    <div style={{textAlign:'center'}}><div style={{fontWeight:600,color:'#059669'}}>Clock Ins</div><div>{emp.clockIns.length}</div></div>
                    <div style={{textAlign:'center'}}><div style={{fontWeight:600,color:'#dc2626'}}>Clock Outs</div><div>{emp.clockOuts.length}</div></div>
                    <div style={{textAlign:'center'}}><div style={{fontWeight:600,color:'#7c3aed'}}>Total Hours</div><div>{emp.totalHours.toFixed(2)}</div></div>
                    <div style={{textAlign:'center'}}><div style={{fontWeight:600,color:'#059669'}}>Total Pay</div><div style={{fontSize:'1.1em',fontWeight:'700',color:'#059669'}}>${emp.totalPay.toFixed(2)}</div></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab==='daily' && (
        <div>
          <h4>Daily View</h4>
          {!selectedEmployee ? <div style={{opacity:0.7}}>Please select an employee first</div> : (
            <div>
              <div style={{marginBottom:16}}>
                <label style={{fontWeight:600,fontSize:'0.9em',marginRight:8}}>Date:</label>
                <input type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)} max={new Date().toISOString().split('T')[0]} style={{padding:'8px 12px',border:'1px solid #d1d5db',borderRadius:'6px',fontSize:'0.9em'}} />
              </div>
              {dailyData && (
                <div style={{border:'1px solid #ddd',borderRadius:8,padding:16}}>
                  <h5 style={{margin:'0 0 16px 0'}}>{dailyData.employee} - {formatDate(dailyData.date)}</h5>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
                    <div style={{textAlign:'center'}}><div style={{fontWeight:600,color:'#7c3aed'}}>Total Hours</div><div style={{fontSize:'1.5em',fontWeight:'700',color:'#7c3aed'}}>{dailyData.totalHours.toFixed(2)}</div></div>
                    <div style={{textAlign:'center'}}><div style={{fontWeight:600,color:'#059669'}}>Total Pay</div><div style={{fontSize:'1.5em',fontWeight:'700',color:'#059669'}}>${dailyData.totalPay.toFixed(2)}</div></div>
                  </div>
                  {dailyData.shifts.length>0 ? (
                    <div style={{display:'grid',gap:8}}>
                      {dailyData.shifts.map((s,i)=>(
                        <div key={i} style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,padding:'8px 12px',backgroundColor:'#f9fafb',borderRadius:'6px'}}>
                          <div><strong>In:</strong> {formatTime(s.clockIn)}</div>
                          <div><strong>Out:</strong> {formatTime(s.clockOut)}</div>
                          <div><strong>Hours:</strong> {s.hours.toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  ) : <div style={{opacity:0.7}}>No completed shifts</div>}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab==='weekly' && (
        <div>
          <h4>Weekly View</h4>
          {!selectedEmployee ? <div style={{opacity:0.7}}>Please select an employee first</div> : (
            <div>
              <div style={{marginBottom:16}}>
                <label style={{fontWeight:600,fontSize:'0.9em',marginRight:8}}>Week of:</label>
                <input type="date" value={selectedWeek} onChange={e=>setSelectedWeek(e.target.value)} max={new Date().toISOString().split('T')[0]} style={{padding:'8px 12px',border:'1px solid #d1d5db',borderRadius:'6px',fontSize:'0.9em'}} />
              </div>
              {weeklyData && (
                <div>
                  <div style={{border:'1px solid #ddd',borderRadius:8,padding:16,marginBottom:16,backgroundColor:'#f0fdf4'}}>
                    <h5 style={{margin:'0 0 16px 0'}}>{weeklyData.employee} - Week of {formatDate(weeklyData.weekStart)}</h5>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                      <div style={{textAlign:'center'}}><div style={{fontWeight:600,color:'#7c3aed'}}>Total Hours</div><div style={{fontSize:'1.5em',fontWeight:'700',color:'#7c3aed'}}>{weeklyData.totalWeekHours.toFixed(2)}</div></div>
                      <div style={{textAlign:'center'}}><div style={{fontWeight:600,color:'#059669'}}>Total Pay</div><div style={{fontSize:'1.5em',fontWeight:'700',color:'#059669'}}>${weeklyData.totalWeekPay.toFixed(2)}</div></div>
                    </div>
                  </div>
                  <div style={{display:'grid',gap:8}}>
                    {Object.values(weeklyData.dailyData).map(day=>(
                      <div key={day.date} style={{border:'1px solid #ddd',borderRadius:8,padding:12,backgroundColor:day.hours>0?'#f0fdf4':'#f9fafb'}}>
                        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr',gap:12,alignItems:'center'}}>
                          <div><strong>{day.dayName}</strong><div style={{fontSize:'0.9em',opacity:0.7}}>{formatDate(day.date)}</div></div>
                          <div style={{textAlign:'center'}}><div style={{fontWeight:600,color:'#7c3aed'}}>Hours</div><div>{day.hours.toFixed(2)}</div></div>
                          <div style={{textAlign:'center'}}><div style={{fontWeight:600,color:'#059669'}}>Pay</div><div>${day.pay.toFixed(2)}</div></div>
                          <div style={{textAlign:'center'}}><div style={{fontWeight:600,color:'#dc2626'}}>Shifts</div><div>{day.shifts.length}</div></div>
                        </div>
                        {day.shifts.length>0 && <div style={{marginTop:8,paddingTop:8,borderTop:'1px solid #eee'}}>{day.shifts.map((s,i)=><div key={i} style={{fontSize:'0.9em',color:'#666',marginBottom:4}}>{formatTime(s.clockIn)} - {formatTime(s.clockOut)} ({s.hours.toFixed(2)}h)</div>)}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab==='entries' && (
        <div>
          <h4>All Time Entries</h4>
          {timeEntries.length===0 ? <div style={{opacity:0.7}}>No time entries</div> : (
            <div style={{display:'grid',gap:8}}>
              <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:16,padding:'8px 16px',fontWeight:600,borderBottom:'1px solid #eee'}}><div>Employee</div><div style={{textAlign:'center'}}>Type</div><div style={{textAlign:'center'}}>Time</div></div>
              {timeEntries.filter(e=>!selectedEmployee||e.employeeName===selectedEmployee).sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp)).map(entry=>(
                <div key={entry.id} style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:16,padding:'8px 16px',alignItems:'center',borderBottom:'1px solid #f3f4f6'}}>
                  <div>{entry.employeeName}</div>
                  <div style={{textAlign:'center',fontWeight:600,color:entry.type==='clock_in'?'#059669':'#dc2626'}}>{entry.type==='clock_in'?'CLOCK IN':'CLOCK OUT'}</div>
                  <div style={{textAlign:'center',fontSize:'0.9em'}}>{formatDateTime(entry.timestamp)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---- MAIN MANAGEMENT PAGE ----
export default function Edit() {
  const [tab, setTab] = useState('inventory');

  return (
    <div style={{ fontFamily:'system-ui,sans-serif', minHeight:'100vh', backgroundColor:'#f1f5f9' }}>
      {/* Header */}
      <header style={{ backgroundColor:'#1e293b', color:'white', padding:'16px 24px', display:'flex', alignItems:'center', gap:16 }}>
        <div>
          <h2 style={{ margin:0, fontSize:'20px', fontWeight:700 }}>Chillers POS — Management</h2>
          <div style={{ fontSize:'12px', color:'#94a3b8', marginTop:2 }}>Restricted access — management only</div>
        </div>
        <a href="/" style={{ marginLeft:'auto', padding:'8px 16px', backgroundColor:'#334155', color:'white', textDecoration:'none', borderRadius:'6px', fontSize:'14px' }}>Back to POS</a>
      </header>

      {/* Tab navigation */}
      <div style={{ backgroundColor:'white', borderBottom:'2px solid #e2e8f0', padding:'0 24px' }}>
        <div style={{ display:'flex', gap:0 }}>
          {[{id:'inventory',label:'Inventory & Menu'},{id:'hours',label:'Employee Hours & Payroll'}].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{ padding:'16px 24px', backgroundColor:'transparent', color: tab===t.id?'#2563eb':'#64748b', border:'none', borderBottom: tab===t.id?'3px solid #2563eb':'3px solid transparent', cursor:'pointer', fontWeight: tab===t.id?700:500, fontSize:'15px', marginBottom:'-2px' }}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding:'24px', maxWidth:'1200px', margin:'0 auto' }}>
        <div style={{ backgroundColor:'white', borderRadius:'12px', padding:'24px', boxShadow:'0 1px 3px rgba(0,0,0,0.1)' }}>
          {tab==='inventory' && <InventoryManager />}
          {tab==='hours' && <HoursManager />}
        </div>
      </div>
    </div>
  );
}
