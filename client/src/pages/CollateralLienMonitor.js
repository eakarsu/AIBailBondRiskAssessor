import React, { useEffect, useState } from 'react';

const empty = { defendant: '', collateral: '', valueUsd: 0, lienStatus: '', custodian: '', status: 'review' };

export default function CollateralLienMonitor() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ total: 0, valueUsd: 0, review: 0 });
  const [form, setForm] = useState(empty);
  const load = async () => { const r = await fetch('/api/collateral-lien-monitor'); const d = await r.json(); setRows(d.rows || []); setSummary(d.summary || { total: 0, valueUsd: 0, review: 0 }); };
  useEffect(() => { load(); }, []);
  const submit = async e => { e.preventDefault(); await fetch('/api/collateral-lien-monitor', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) }); setForm(empty); load(); };
  return <div className="page"><h1>Collateral Lien Monitor</h1><p>Collateral value, lien verification, custodian, and review state.</p><div className="stats-grid">{['total','valueUsd','review'].map(k => <div className="stat-card" key={k}><h3>{k}</h3><div className="stat-value">{summary[k]}</div></div>)}</div><form className="card" onSubmit={submit}>{['defendant','collateral','lienStatus','custodian'].map(f => <input key={f} placeholder={f} value={form[f]} onChange={e=>setForm({...form,[f]:e.target.value})}/>)}<input type="number" value={form.valueUsd} onChange={e=>setForm({...form,valueUsd:e.target.value})}/><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>review</option><option>clear</option><option>blocked</option></select><button>Add Collateral</button></form><table><tbody>{rows.map(r=><tr key={r.id}><td>{r.defendant}</td><td>{r.collateral}</td><td>{r.valueUsd}</td><td>{r.lienStatus}</td><td>{r.custodian}</td><td>{r.status}</td></tr>)}</tbody></table></div>;
}
