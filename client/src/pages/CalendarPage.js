import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const EVENT_COLORS = {
  court: '#f59e0b',
  compliance: '#10b981',
  notification: '#a855f7',
  bond: '#6366f1',
  default: '#64748b',
};

function getEventColor(type) {
  if (!type) return EVENT_COLORS.default;
  const t = type.toLowerCase();
  if (t.includes('court') || t.includes('hearing')) return EVENT_COLORS.court;
  if (t.includes('compliance') || t.includes('due')) return EVENT_COLORS.compliance;
  if (t.includes('notification') || t.includes('reminder')) return EVENT_COLORS.notification;
  if (t.includes('bond')) return EVENT_COLORS.bond;
  return EVENT_COLORS.default;
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    setLoading(true);
    const start = new Date(year, month, 1).toISOString().split('T')[0];
    const end = new Date(year, month + 1, 0).toISOString().split('T')[0];
    api.get('/calendar', { params: { start, end } })
      .then(r => setEvents(Array.isArray(r.data) ? r.data : r.data.data || []))
      .catch(() => toast.error('Failed to load calendar events'))
      .finally(() => setLoading(false));
  }, [year, month]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isToday = (d) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;

  const getEventsForDay = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => {
      const eDate = (e.date || e.event_date || e.due_date || e.next_hearing_date || e.court_date || '').substring(0, 10);
      return eDate === dateStr;
    });
  };

  const selectedEvents = selectedDate ? getEventsForDay(selectedDate) : [];

  const cells = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push(<div key={`empty-${i}`} className="calendar-cell empty" />);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dayEvents = getEventsForDay(d);
    const isSelected = selectedDate === d;
    cells.push(
      <div
        key={d}
        className={`calendar-cell ${isToday(d) ? 'today' : ''} ${isSelected ? 'selected' : ''} ${dayEvents.length > 0 ? 'has-events' : ''}`}
        onClick={() => setSelectedDate(d === selectedDate ? null : d)}
      >
        <div className="calendar-day-number">{d}</div>
        <div className="calendar-day-events">
          {dayEvents.slice(0, 3).map((ev, i) => (
            <div key={i} className="calendar-event-dot" style={{ background: getEventColor(ev.type || ev.event_type) }} title={ev.title || ev.description || ev.charge || 'Event'} />
          ))}
          {dayEvents.length > 3 && <span className="calendar-more">+{dayEvents.length - 3}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="calendar-page">
      <div className="page-header">
        <div className="page-title-section">
          <span className="page-icon">&#128197;</span>
          <h1 className="page-title">Calendar</h1>
        </div>
        <div className="page-actions">
          <button className="btn-secondary" onClick={goToday}>Today</button>
        </div>
      </div>

      <div className="calendar-legend">
        {Object.entries(EVENT_COLORS).filter(([k]) => k !== 'default').map(([k, c]) => (
          <div key={k} className="calendar-legend-item">
            <span className="calendar-legend-dot" style={{ background: c }} />
            <span>{k.charAt(0).toUpperCase() + k.slice(1)}</span>
          </div>
        ))}
      </div>

      <div className="calendar-nav">
        <button className="btn-secondary" onClick={prevMonth}>&larr; Prev</button>
        <h2 className="calendar-month-title">{MONTHS[month]} {year}</h2>
        <button className="btn-secondary" onClick={nextMonth}>Next &rarr;</button>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" />Loading calendar...</div>
      ) : (
        <div className="calendar-grid-wrapper">
          <div className="calendar-grid">
            {DAYS.map(d => (
              <div key={d} className="calendar-header-cell">{d}</div>
            ))}
            {cells}
          </div>
        </div>
      )}

      {selectedDate && (
        <div className="calendar-detail-panel">
          <h3 className="calendar-detail-title">
            Events for {MONTHS[month]} {selectedDate}, {year}
          </h3>
          {selectedEvents.length === 0 ? (
            <div className="calendar-no-events">No events on this date</div>
          ) : (
            <div className="calendar-event-list">
              {selectedEvents.map((ev, i) => (
                <div key={i} className="calendar-event-card" style={{ borderLeftColor: getEventColor(ev.type || ev.event_type) }}>
                  <div className="calendar-event-title">{ev.title || ev.description || ev.charge || 'Event'}</div>
                  <div className="calendar-event-meta">
                    {(ev.type || ev.event_type) && <span className="calendar-event-type">{(ev.type || ev.event_type).replace(/_/g, ' ')}</span>}
                    {ev.defendant_name && <span>Defendant: {ev.defendant_name}</span>}
                    {ev.court_name && <span>Court: {ev.court_name}</span>}
                    {ev.case_number && <span>Case: {ev.case_number}</span>}
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
