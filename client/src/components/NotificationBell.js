import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function NotificationBell({ isOpen: sidebarOpen }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications', {
        params: { filter_is_read: 'false', limit: 10 }
      });
      const data = res.data.data || res.data;
      const total = res.data.total || data.length;
      setNotifications(Array.isArray(data) ? data : []);
      setUnreadCount(total);
    } catch {
      // silent fail
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const markAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await api.put(`/notifications/${id}`, { is_read: true });
      setNotifications(prev => prev.filter(n => n.id !== id));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      // silent
    }
  };

  const getPriorityColor = (p) => {
    const map = { CRITICAL: '#ef4444', HIGH: '#f87171', MEDIUM: '#fbbf24', LOW: '#34d399' };
    return map[p] || '#64748b';
  };

  return (
    <div className="notification-bell-wrapper" ref={ref}>
      <button
        className="notification-bell-btn"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        title="Notifications"
      >
        <span className="notification-bell-icon">&#128276;</span>
        {unreadCount > 0 && (
          <span className="notification-badge-count">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {dropdownOpen && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <span>Notifications</span>
            {unreadCount > 0 && <span className="notification-dropdown-count">{unreadCount} unread</span>}
          </div>
          <div className="notification-dropdown-list">
            {notifications.length === 0 ? (
              <div className="notification-dropdown-empty">No unread notifications</div>
            ) : (
              notifications.map(n => (
                <div key={n.id} className="notification-dropdown-item">
                  <div className="notification-dropdown-dot" style={{ background: getPriorityColor(n.priority) }} />
                  <div className="notification-dropdown-content">
                    <div className="notification-dropdown-title">{n.title}</div>
                    <div className="notification-dropdown-meta">
                      {n.type && <span>{n.type.replace(/_/g, ' ')}</span>}
                      {n.due_date && <span> &middot; Due {new Date(n.due_date).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <button
                    className="notification-mark-read"
                    onClick={(e) => markAsRead(n.id, e)}
                    title="Mark as read"
                  >
                    &#10003;
                  </button>
                </div>
              ))
            )}
          </div>
          <div
            className="notification-dropdown-footer"
            onClick={() => { setDropdownOpen(false); navigate('/notifications'); }}
          >
            View All Notifications
          </div>
        </div>
      )}
    </div>
  );
}
