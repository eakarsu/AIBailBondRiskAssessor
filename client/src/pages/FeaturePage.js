import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import AIResultDisplay from '../components/AIResultDisplay';

const featureConfig = {
  'defendants': {
    columns: ['id', 'first_name', 'last_name', 'risk_level', 'status', 'city', 'state', 'phone'],
    fields: [
      { key: 'first_name', label: 'First Name', type: 'text', required: true },
      { key: 'last_name', label: 'Last Name', type: 'text', required: true },
      { key: 'date_of_birth', label: 'Date of Birth', type: 'date' },
      { key: 'ssn_last4', label: 'SSN (Last 4)', type: 'text' },
      { key: 'address', label: 'Address', type: 'text' },
      { key: 'city', label: 'City', type: 'text' },
      { key: 'state', label: 'State', type: 'text' },
      { key: 'zip_code', label: 'Zip Code', type: 'text' },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'] },
      { key: 'risk_level', label: 'Risk Level', type: 'select', options: ['LOW', 'MEDIUM', 'HIGH', 'VERY HIGH', 'PENDING'] },
      { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Released', 'Incarcerated', 'FTA'] },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
    aiEndpoint: '/ai/assess-risk',
    aiLabel: 'AI Risk Assessment',
    aiDataKey: 'defendantId',
  },
  'bail-bonds': {
    columns: ['id', 'defendant_id', 'bond_amount', 'bond_type', 'status', 'court_date', 'charge'],
    fields: [
      { key: 'defendant_id', label: 'Defendant ID', type: 'number', required: true },
      { key: 'bond_amount', label: 'Bond Amount ($)', type: 'number' },
      { key: 'premium_amount', label: 'Premium Amount ($)', type: 'number' },
      { key: 'bond_type', label: 'Bond Type', type: 'select', options: ['Surety', 'Cash', 'Property', 'Federal', 'Immigration'] },
      { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Completed', 'Forfeited', 'Revoked'] },
      { key: 'court_date', label: 'Court Date', type: 'date' },
      { key: 'court_name', label: 'Court Name', type: 'text' },
      { key: 'case_number', label: 'Case Number', type: 'text' },
      { key: 'charge', label: 'Charge', type: 'text' },
      { key: 'collateral', label: 'Collateral', type: 'textarea' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  'risk-assessments': {
    columns: ['id', 'defendant_id', 'risk_score', 'risk_level', 'overall_recommendation', 'status'],
    fields: [
      { key: 'defendant_id', label: 'Defendant ID', type: 'number', required: true },
      { key: 'risk_score', label: 'Risk Score (0-100)', type: 'number' },
      { key: 'risk_level', label: 'Risk Level', type: 'select', options: ['LOW', 'MEDIUM', 'HIGH', 'VERY HIGH'] },
      { key: 'flight_risk_score', label: 'Flight Risk Score', type: 'number' },
      { key: 'recidivism_score', label: 'Recidivism Score', type: 'number' },
      { key: 'community_ties_score', label: 'Community Ties Score', type: 'number' },
      { key: 'employment_score', label: 'Employment Score', type: 'number' },
      { key: 'financial_score', label: 'Financial Score', type: 'number' },
      { key: 'substance_abuse_score', label: 'Substance Abuse Score', type: 'number' },
      { key: 'mental_health_score', label: 'Mental Health Score', type: 'number' },
      { key: 'criminal_history_score', label: 'Criminal History Score', type: 'number' },
      { key: 'overall_recommendation', label: 'Recommendation', type: 'select', options: ['APPROVE', 'DENY', 'CONDITIONAL'] },
      { key: 'ai_analysis', label: 'AI Analysis', type: 'textarea' },
      { key: 'assessor_notes', label: 'Assessor Notes', type: 'textarea' },
      { key: 'status', label: 'Status', type: 'select', options: ['Completed', 'Pending', 'In Review'] },
    ],
    aiEndpoint: '/ai/assess-risk',
    aiLabel: 'Run AI Assessment',
  },
  'court-cases': {
    columns: ['id', 'defendant_id', 'case_number', 'charge', 'charge_severity', 'next_hearing_date', 'status'],
    fields: [
      { key: 'defendant_id', label: 'Defendant ID', type: 'number', required: true },
      { key: 'case_number', label: 'Case Number', type: 'text' },
      { key: 'court_name', label: 'Court Name', type: 'text' },
      { key: 'judge', label: 'Judge', type: 'text' },
      { key: 'charge', label: 'Charge', type: 'text' },
      { key: 'charge_severity', label: 'Severity', type: 'select', options: ['Misdemeanor', 'Felony', 'Infraction'] },
      { key: 'next_hearing_date', label: 'Next Hearing', type: 'date' },
      { key: 'hearing_type', label: 'Hearing Type', type: 'text' },
      { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'Resolved', 'Dismissed', 'Continued'] },
      { key: 'prosecutor', label: 'Prosecutor', type: 'text' },
      { key: 'defense_attorney', label: 'Defense Attorney', type: 'text' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  'compliance': {
    columns: ['id', 'title', 'report_type', 'status', 'jurisdiction', 'risk_rating', 'due_date'],
    fields: [
      { key: 'report_type', label: 'Report Type', type: 'text' },
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'status', label: 'Status', type: 'select', options: ['Compliant', 'Non-Compliant', 'Pending', 'Under Review'] },
      { key: 'due_date', label: 'Due Date', type: 'date' },
      { key: 'completed_date', label: 'Completed Date', type: 'date' },
      { key: 'jurisdiction', label: 'Jurisdiction', type: 'text' },
      { key: 'regulatory_body', label: 'Regulatory Body', type: 'text' },
      { key: 'findings', label: 'Findings', type: 'textarea' },
      { key: 'corrective_actions', label: 'Corrective Actions', type: 'textarea' },
      { key: 'risk_rating', label: 'Risk Rating', type: 'select', options: ['LOW', 'MEDIUM', 'HIGH'] },
      { key: 'assigned_to', label: 'Assigned To', type: 'text' },
    ],
    aiEndpoint: '/ai/compliance-check',
    aiLabel: 'AI Compliance Check',
  },
  'flight-risk': {
    columns: ['id', 'defendant_id', 'risk_score', 'risk_level', 'passport_status', 'prior_fta', 'employment_stability'],
    fields: [
      { key: 'defendant_id', label: 'Defendant ID', type: 'number', required: true },
      { key: 'passport_status', label: 'Passport Status', type: 'select', options: ['None', 'Valid', 'Expired', 'Surrendered'] },
      { key: 'travel_history', label: 'Travel History', type: 'textarea' },
      { key: 'foreign_connections', label: 'Foreign Connections', type: 'textarea' },
      { key: 'prior_fta', label: 'Prior FTAs', type: 'number' },
      { key: 'community_roots', label: 'Community Roots', type: 'textarea' },
      { key: 'employment_stability', label: 'Employment Stability', type: 'select', options: ['Stable', 'Unstable', 'Unemployed', 'Self-employed', 'Part-time'] },
      { key: 'family_ties', label: 'Family Ties', type: 'textarea' },
      { key: 'financial_resources', label: 'Financial Resources', type: 'text' },
      { key: 'risk_score', label: 'Risk Score (0-100)', type: 'number' },
      { key: 'risk_level', label: 'Risk Level', type: 'select', options: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
      { key: 'ai_assessment', label: 'AI Assessment', type: 'textarea' },
      { key: 'monitoring_recommendation', label: 'Monitoring Rec.', type: 'textarea' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
    aiEndpoint: '/ai/flight-risk',
    aiLabel: 'AI Flight Risk Analysis',
  },
  'criminal-history': {
    columns: ['id', 'defendant_id', 'offense_type', 'severity', 'offense_date', 'disposition', 'jurisdiction'],
    fields: [
      { key: 'defendant_id', label: 'Defendant ID', type: 'number', required: true },
      { key: 'offense_type', label: 'Offense Type', type: 'text' },
      { key: 'offense_date', label: 'Offense Date', type: 'date' },
      { key: 'offense_description', label: 'Description', type: 'textarea' },
      { key: 'severity', label: 'Severity', type: 'select', options: ['Infraction', 'Misdemeanor', 'Felony'] },
      { key: 'disposition', label: 'Disposition', type: 'select', options: ['Convicted', 'Acquitted', 'Dismissed', 'Pending', 'Nolle Prosequi'] },
      { key: 'sentence', label: 'Sentence', type: 'text' },
      { key: 'jurisdiction', label: 'Jurisdiction', type: 'text' },
      { key: 'case_number', label: 'Case Number', type: 'text' },
      { key: 'arresting_agency', label: 'Arresting Agency', type: 'text' },
      { key: 'conviction_date', label: 'Conviction Date', type: 'date' },
      { key: 'release_date', label: 'Release Date', type: 'date' },
      { key: 'probation_status', label: 'Probation Status', type: 'select', options: ['Active', 'Completed', 'Revoked', 'N/A'] },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  'employment': {
    columns: ['id', 'defendant_id', 'employer_name', 'position', 'employment_type', 'monthly_income', 'status'],
    fields: [
      { key: 'defendant_id', label: 'Defendant ID', type: 'number', required: true },
      { key: 'employer_name', label: 'Employer Name', type: 'text' },
      { key: 'position', label: 'Position', type: 'text' },
      { key: 'employment_type', label: 'Type', type: 'select', options: ['Full-time', 'Part-time', 'Self-employed', 'Contract', 'Unemployed'] },
      { key: 'start_date', label: 'Start Date', type: 'date' },
      { key: 'end_date', label: 'End Date', type: 'date' },
      { key: 'monthly_income', label: 'Monthly Income ($)', type: 'number' },
      { key: 'supervisor_name', label: 'Supervisor', type: 'text' },
      { key: 'supervisor_phone', label: 'Supervisor Phone', type: 'text' },
      { key: 'verified', label: 'Verified', type: 'select', options: ['true', 'false'] },
      { key: 'verification_method', label: 'Verification Method', type: 'text' },
      { key: 'status', label: 'Status', type: 'select', options: ['Current', 'Terminated', 'Resigned', 'Unverified'] },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  'community-ties': {
    columns: ['id', 'defendant_id', 'relationship_type', 'contact_name', 'tie_strength', 'years_known', 'verified'],
    fields: [
      { key: 'defendant_id', label: 'Defendant ID', type: 'number', required: true },
      { key: 'relationship_type', label: 'Relationship', type: 'select', options: ['Parent', 'Spouse', 'Sibling', 'Friend', 'Employer', 'Mentor', 'Associate', 'Other'] },
      { key: 'contact_name', label: 'Contact Name', type: 'text' },
      { key: 'contact_phone', label: 'Contact Phone', type: 'text' },
      { key: 'contact_address', label: 'Contact Address', type: 'text' },
      { key: 'years_known', label: 'Years Known', type: 'number' },
      { key: 'frequency_of_contact', label: 'Contact Frequency', type: 'select', options: ['Daily', 'Weekly', 'Monthly', 'Occasionally', 'Rarely'] },
      { key: 'willingness_to_supervise', label: 'Will Supervise', type: 'select', options: ['true', 'false'] },
      { key: 'verified', label: 'Verified', type: 'select', options: ['true', 'false'] },
      { key: 'community_involvement', label: 'Community Involvement', type: 'textarea' },
      { key: 'organization_name', label: 'Organization', type: 'text' },
      { key: 'tie_strength', label: 'Tie Strength', type: 'select', options: ['Very Weak', 'Weak', 'Moderate', 'Strong', 'Very Strong'] },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
    aiEndpoint: '/ai/community-analysis',
    aiLabel: 'AI Community Analysis',
  },
  'financial': {
    columns: ['id', 'defendant_id', 'annual_income', 'credit_score', 'total_assets', 'financial_stability_score'],
    fields: [
      { key: 'defendant_id', label: 'Defendant ID', type: 'number', required: true },
      { key: 'annual_income', label: 'Annual Income ($)', type: 'number' },
      { key: 'monthly_expenses', label: 'Monthly Expenses ($)', type: 'number' },
      { key: 'total_assets', label: 'Total Assets ($)', type: 'number' },
      { key: 'total_liabilities', label: 'Total Liabilities ($)', type: 'number' },
      { key: 'credit_score', label: 'Credit Score', type: 'number' },
      { key: 'bank_accounts', label: 'Bank Accounts', type: 'number' },
      { key: 'property_owned', label: 'Property Owned', type: 'select', options: ['true', 'false'] },
      { key: 'vehicles_owned', label: 'Vehicles Owned', type: 'number' },
      { key: 'outstanding_debts', label: 'Outstanding Debts ($)', type: 'number' },
      { key: 'bankruptcy_history', label: 'Bankruptcy History', type: 'select', options: ['true', 'false'] },
      { key: 'financial_stability_score', label: 'Stability Score (0-100)', type: 'number' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
    aiEndpoint: '/ai/financial-analysis',
    aiLabel: 'AI Financial Analysis',
  },
  'substance-abuse': {
    columns: ['id', 'defendant_id', 'substance_type', 'risk_level', 'usage_frequency', 'compliance_status'],
    fields: [
      { key: 'defendant_id', label: 'Defendant ID', type: 'number', required: true },
      { key: 'substance_type', label: 'Substance Type', type: 'text' },
      { key: 'usage_frequency', label: 'Usage Frequency', type: 'select', options: ['Never', 'Rarely', 'Occasionally', 'Weekly', 'Daily', 'Was daily, now in recovery'] },
      { key: 'last_use_date', label: 'Last Use Date', type: 'date' },
      { key: 'treatment_history', label: 'Treatment History', type: 'textarea' },
      { key: 'current_treatment', label: 'In Treatment', type: 'select', options: ['true', 'false'] },
      { key: 'treatment_facility', label: 'Treatment Facility', type: 'text' },
      { key: 'counselor_name', label: 'Counselor Name', type: 'text' },
      { key: 'sobriety_duration', label: 'Sobriety Duration', type: 'text' },
      { key: 'risk_level', label: 'Risk Level', type: 'select', options: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
      { key: 'drug_test_results', label: 'Drug Test Results', type: 'select', options: ['Negative', 'Positive - Marijuana', 'Positive - Cocaine', 'Positive - Opioids', 'Positive - Multiple', 'Positive - Meth', 'THC Positive', 'BAC positive'] },
      { key: 'compliance_status', label: 'Compliance Status', type: 'select', options: ['Compliant', 'Non-Compliant', 'Partially Compliant'] },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
    aiEndpoint: '/ai/substance-risk',
    aiLabel: 'AI Substance Risk Analysis',
  },
  'mental-health': {
    columns: ['id', 'defendant_id', 'diagnosis', 'severity', 'treatment_status', 'competency_status', 'compliance_level'],
    fields: [
      { key: 'defendant_id', label: 'Defendant ID', type: 'number', required: true },
      { key: 'diagnosis', label: 'Diagnosis', type: 'text' },
      { key: 'severity', label: 'Severity', type: 'select', options: ['None', 'Mild', 'Moderate', 'Severe'] },
      { key: 'treatment_status', label: 'Treatment Status', type: 'select', options: ['N/A', 'Untreated', 'Active treatment', 'In treatment', 'Partially treated', 'Managed', 'New treatment'] },
      { key: 'medication', label: 'Medication', type: 'text' },
      { key: 'therapist_name', label: 'Therapist Name', type: 'text' },
      { key: 'therapy_frequency', label: 'Therapy Frequency', type: 'select', options: ['N/A', 'Weekly', 'Bi-weekly', 'Monthly', 'As needed'] },
      { key: 'last_evaluation_date', label: 'Last Evaluation', type: 'date' },
      { key: 'hospitalization_history', label: 'Hospitalization History', type: 'textarea' },
      { key: 'risk_to_self', label: 'Risk to Self', type: 'select', options: ['None', 'Low', 'Moderate', 'High'] },
      { key: 'risk_to_others', label: 'Risk to Others', type: 'select', options: ['None', 'Low', 'Moderate', 'High', 'Very High'] },
      { key: 'competency_status', label: 'Competency', type: 'select', options: ['Competent', 'Under evaluation', 'Incompetent'] },
      { key: 'compliance_level', label: 'Compliance', type: 'select', options: ['N/A', 'Compliant', 'Non-Compliant', 'Partially Compliant'] },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
    aiEndpoint: '/ai/mental-health-eval',
    aiLabel: 'AI Mental Health Evaluation',
  },
  'recidivism': {
    columns: ['id', 'defendant_id', 'prediction_score', 'risk_level', 'prior_offenses_count', 'offense_type_pattern'],
    fields: [
      { key: 'defendant_id', label: 'Defendant ID', type: 'number', required: true },
      { key: 'prediction_score', label: 'Prediction Score (0-100)', type: 'number' },
      { key: 'risk_level', label: 'Risk Level', type: 'select', options: ['LOW', 'MEDIUM', 'HIGH', 'VERY HIGH'] },
      { key: 'prior_offenses_count', label: 'Prior Offenses', type: 'number' },
      { key: 'age_at_first_offense', label: 'Age at First Offense', type: 'number' },
      { key: 'offense_type_pattern', label: 'Offense Pattern', type: 'text' },
      { key: 'time_since_last_offense', label: 'Time Since Last', type: 'text' },
      { key: 'social_factors', label: 'Social Factors', type: 'textarea' },
      { key: 'economic_factors', label: 'Economic Factors', type: 'textarea' },
      { key: 'behavioral_indicators', label: 'Behavioral Indicators', type: 'textarea' },
      { key: 'protective_factors', label: 'Protective Factors', type: 'textarea' },
      { key: 'ai_prediction', label: 'AI Prediction', type: 'textarea' },
      { key: 'model_version', label: 'Model Version', type: 'text' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
    aiEndpoint: '/ai/recidivism',
    aiLabel: 'AI Recidivism Prediction',
  },
  'surety': {
    columns: ['id', 'defendant_id', 'surety_name', 'relationship', 'collateral_type', 'reliability_score', 'verified'],
    fields: [
      { key: 'defendant_id', label: 'Defendant ID', type: 'number', required: true },
      { key: 'surety_name', label: 'Surety Name', type: 'text' },
      { key: 'relationship', label: 'Relationship', type: 'text' },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'address', label: 'Address', type: 'text' },
      { key: 'occupation', label: 'Occupation', type: 'text' },
      { key: 'annual_income', label: 'Annual Income ($)', type: 'number' },
      { key: 'assets_value', label: 'Assets Value ($)', type: 'number' },
      { key: 'collateral_offered', label: 'Collateral Offered', type: 'textarea' },
      { key: 'collateral_type', label: 'Collateral Type', type: 'select', options: ['Cash', 'Property', 'Vehicle', 'Financial', 'Personal', 'N/A'] },
      { key: 'verified', label: 'Verified', type: 'select', options: ['true', 'false'] },
      { key: 'reliability_score', label: 'Reliability Score (0-100)', type: 'number' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  'notifications': {
    columns: ['id', 'title', 'type', 'priority', 'is_read', 'action_required', 'due_date'],
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'message', label: 'Message', type: 'textarea' },
      { key: 'type', label: 'Type', type: 'select', options: ['court_reminder', 'forfeiture_warning', 'compliance_due', 'treatment_update', 'risk_change', 'assessment_needed', 'payment', 'court_update', 'license_reminder', 'gps_alert', 'checkin_missed', 'surety_review', 'compliance_violation', 'bond_update', 'mh_followup', 'financial_alert'] },
      { key: 'priority', label: 'Priority', type: 'select', options: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
      { key: 'recipient_id', label: 'Recipient ID', type: 'number' },
      { key: 'related_entity_type', label: 'Related Entity Type', type: 'text' },
      { key: 'related_entity_id', label: 'Related Entity ID', type: 'number' },
      { key: 'is_read', label: 'Read', type: 'select', options: ['true', 'false'] },
      { key: 'action_required', label: 'Action Required', type: 'select', options: ['true', 'false'] },
      { key: 'due_date', label: 'Due Date', type: 'date' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
};

function formatValue(val) {
  if (val === null || val === undefined) return '\u2014';
  if (val === true) return 'Yes';
  if (val === false) return 'No';
  if (typeof val === 'number' && !Number.isInteger(val)) return val.toLocaleString(undefined, { minimumFractionDigits: 2 });
  if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}/)) return new Date(val).toLocaleDateString();
  return String(val);
}

function getBadgeClass(value) {
  if (!value) return '';
  const v = String(value).toLowerCase().replace(/\s+/g, '-');
  const map = {
    'low': 'badge-low', 'medium': 'badge-medium', 'high': 'badge-high',
    'very-high': 'badge-very-high', 'critical': 'badge-critical',
    'active': 'badge-active', 'completed': 'badge-completed', 'resolved': 'badge-resolved',
    'pending': 'badge-pending', 'compliant': 'badge-compliant',
    'non-compliant': 'badge-non-compliant', 'under-review': 'badge-under-review',
    'approve': 'badge-approve', 'deny': 'badge-deny', 'conditional': 'badge-conditional',
  };
  return map[v] || '';
}

const badgeColumns = ['risk_level', 'status', 'severity', 'charge_severity', 'priority', 'risk_rating', 'overall_recommendation', 'competency_status', 'compliance_status', 'compliance_level', 'tie_strength'];

export default function FeaturePage({ feature }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // New state for search, pagination, sorting, bulk select
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(() => {
    try {
      const saved = localStorage.getItem('displayPrefs');
      return saved ? JSON.parse(saved).itemsPerPage || 25 : 25;
    } catch { return 25; }
  });
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [sortField, setSortField] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const searchTimer = useRef(null);

  const config = featureConfig[feature.key] || { columns: ['id'], fields: [] };

  // Debounce search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 400);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [searchTerm]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (debouncedSearch) params.search = debouncedSearch;
      if (sortField) {
        params.sort = sortField;
        params.order = sortOrder;
      }
      const res = await api.get(`/${feature.key}`, { params });
      // Handle both paginated and non-paginated responses
      if (res.data && res.data.data && Array.isArray(res.data.data)) {
        setItems(res.data.data);
        setTotalItems(res.data.total || res.data.data.length);
        setTotalPages(res.data.totalPages || 1);
      } else if (Array.isArray(res.data)) {
        setItems(res.data);
        setTotalItems(res.data.length);
        setTotalPages(1);
      } else {
        setItems([]);
        setTotalItems(0);
        setTotalPages(1);
      }
    } catch (err) {
      toast.error('Failed to load data');
    }
    setLoading(false);
  }, [feature.key, page, limit, debouncedSearch, sortField, sortOrder]);

  useEffect(() => {
    fetchItems();
    setSelected(null);
    setShowForm(false);
    setAiResult(null);
    setSelectedIds(new Set());
  }, [feature.key, fetchItems]);

  // Reset page/search on feature change
  useEffect(() => {
    setSearchTerm('');
    setDebouncedSearch('');
    setPage(1);
    setSortField('');
    setSortOrder('asc');
    setSelectedIds(new Set());
  }, [feature.key]);

  const handleSort = (col) => {
    if (sortField === col) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(col);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(i => i.id)));
    }
  };

  const handleSelectRow = (id, e) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} selected items? This cannot be undone.`)) return;
    try {
      await api.delete(`/${feature.key}/batch`, { data: { ids: Array.from(selectedIds) } });
      toast.success(`${selectedIds.size} items deleted`);
      setSelectedIds(new Set());
      fetchItems();
    } catch {
      toast.error('Bulk delete failed');
    }
  };

  const handleExport = async () => {
    try {
      const res = await api.get(`/${feature.key}/export`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${feature.key}-export.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('CSV exported');
    } catch {
      toast.error('Export failed');
    }
  };

  const handleRowClick = (item) => {
    if (feature.key === 'defendants') {
      navigate(`/defendant-profile/${item.id}`);
      return;
    }
    setSelected(item);
    setShowForm(false);
    setAiResult(null);
  };

  const handleNew = () => {
    setFormData({});
    setEditMode(false);
    setShowForm(true);
    setSelected(null);
    setAiResult(null);
  };

  const handleEdit = () => {
    const data = {};
    config.fields.forEach(f => {
      let val = selected[f.key];
      if (f.type === 'date' && val) val = val.substring(0, 10);
      if (val !== null && val !== undefined) data[f.key] = val;
    });
    setFormData(data);
    setEditMode(true);
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      await api.delete(`/${feature.key}/${selected.id}`);
      toast.success('Deleted successfully');
      setSelected(null);
      fetchItems();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editMode) {
        await api.put(`/${feature.key}/${selected.id}`, formData);
        toast.success('Updated successfully');
      } else {
        await api.post(`/${feature.key}`, formData);
        toast.success('Created successfully');
      }
      setShowForm(false);
      setSelected(null);
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Operation failed');
    }
  };

  const handleAI = async () => {
    if (!config.aiEndpoint) return;
    setAiLoading(true);
    setAiResult(null);
    try {
      const data = selected ? { ...selected } : formData;
      if (selected?.defendant_id) data.defendantId = selected.defendant_id;
      else if (selected?.id && feature.key === 'defendants') data.defendantId = selected.id;
      const res = await api.post(config.aiEndpoint, data);
      setAiResult(res.data);
    } catch (err) {
      toast.error('AI analysis failed');
    }
    setAiLoading(false);
  };

  const handleBack = () => {
    setSelected(null);
    setShowForm(false);
    setAiResult(null);
  };

  // Pagination helpers
  const startItem = ((page - 1) * limit) + 1;
  const endItem = Math.min(page * limit, totalItems);

  const renderPagination = () => {
    if (totalPages <= 1 && totalItems <= limit) return null;
    const pages = [];
    const maxVisible = 7;
    for (let i = 0; i < Math.min(totalPages, maxVisible); i++) {
      let pageNum;
      if (totalPages <= maxVisible) {
        pageNum = i + 1;
      } else if (page <= 4) {
        pageNum = i + 1;
      } else if (page >= totalPages - 3) {
        pageNum = totalPages - maxVisible + 1 + i;
      } else {
        pageNum = page - 3 + i;
      }
      pages.push(pageNum);
    }

    return (
      <div className="pagination">
        <div className="pagination-info">
          Showing {totalItems > 0 ? startItem : 0}-{endItem} of {totalItems} results
        </div>
        <div className="pagination-controls">
          <select
            className="form-select pagination-limit"
            value={limit}
            onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
          >
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>
          <button className="btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
          {pages.map(p => (
            <button
              key={p}
              className={`btn-secondary btn-sm ${page === p ? 'pagination-active' : ''}`}
              onClick={() => setPage(p)}
            >
              {p}
            </button>
          ))}
          <button className="btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      </div>
    );
  };

  // Detail View
  if (selected && !showForm) {
    return (
      <div>
        <div className="page-header">
          <div className="page-title-section">
            <span className="page-icon">{feature.icon}</span>
            <h1 className="page-title">{feature.label} Detail</h1>
          </div>
          <div className="page-actions">
            <button className="btn-secondary" onClick={handleBack}>Back to List</button>
            <button className="btn-secondary" onClick={handleEdit}>Edit</button>
            <button className="btn-danger" onClick={handleDelete}>Delete</button>
            {config.aiEndpoint && (
              <button className="btn-ai" onClick={handleAI} disabled={aiLoading}>
                {aiLoading ? 'Analyzing...' : config.aiLabel}
              </button>
            )}
          </div>
        </div>

        <div className="detail-panel">
          <div className="detail-grid">
            {Object.entries(selected).filter(([k]) => k !== 'updated_at').map(([key, value]) => (
              <div key={key} className="detail-field">
                <div className="detail-label">{key.replace(/_/g, ' ')}</div>
                <div className="detail-value">
                  {badgeColumns.includes(key) && value ? (
                    <span className={`badge ${getBadgeClass(value)}`}>{String(value)}</span>
                  ) : (
                    formatValue(value)
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {aiLoading && (
          <div className="loading">
            <div className="spinner" />
            Running AI Analysis...
          </div>
        )}

        {aiResult && <AIResultDisplay result={aiResult} />}
      </div>
    );
  }

  // Form View
  if (showForm) {
    return (
      <div>
        <div className="page-header">
          <div className="page-title-section">
            <span className="page-icon">{feature.icon}</span>
            <h1 className="page-title">{editMode ? 'Edit' : 'New'} {feature.label}</h1>
          </div>
          <button className="btn-secondary" onClick={handleBack}>Cancel</button>
        </div>

        <div className="detail-panel">
          <form onSubmit={handleSubmit}>
            <div className="detail-grid">
              {config.fields.map(field => (
                <div key={field.key} className="form-group">
                  <label className="form-label">{field.label}</label>
                  {field.type === 'textarea' ? (
                    <textarea
                      className="form-textarea"
                      value={formData[field.key] || ''}
                      onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                      required={field.required}
                    />
                  ) : field.type === 'select' ? (
                    <select
                      className="form-select"
                      value={formData[field.key] || ''}
                      onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                      required={field.required}
                    >
                      <option value="">Select...</option>
                      {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      className="form-input"
                      value={formData[field.key] || ''}
                      onChange={(e) => setFormData({ ...formData, [field.key]: field.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value })}
                      required={field.required}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={handleBack}>Cancel</button>
              {config.aiEndpoint && (
                <button type="button" className="btn-ai" onClick={handleAI} disabled={aiLoading}>
                  {aiLoading ? 'Analyzing...' : config.aiLabel}
                </button>
              )}
              <button type="submit" className="btn-primary" style={{ width: 'auto' }}>
                {editMode ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>

        {aiLoading && (
          <div className="loading">
            <div className="spinner" />
            Running AI Analysis...
          </div>
        )}

        {aiResult && <AIResultDisplay result={aiResult} />}
      </div>
    );
  }

  // List View
  return (
    <div>
      <div className="page-header">
        <div className="page-title-section">
          <span className="page-icon">{feature.icon}</span>
          <h1 className="page-title">{feature.label}</h1>
        </div>
        <div className="page-actions">
          {selectedIds.size > 0 && (
            <button className="btn-danger" onClick={handleBulkDelete}>
              Delete {selectedIds.size} Selected
            </button>
          )}
          <button className="btn-secondary" onClick={handleExport}>
            &#128229; Export CSV
          </button>
          <button className="btn-primary" style={{ width: 'auto' }} onClick={handleNew}>
            + New {feature.label.replace(/s$/, '').replace(/ies$/, 'y')}
          </button>
        </div>
      </div>

      <div className="search-bar">
        <span className="search-icon">&#128269;</span>
        <input
          type="text"
          className="search-input"
          placeholder={`Search ${feature.label.toLowerCase()}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button className="search-clear" onClick={() => setSearchTerm('')}>&times;</button>
        )}
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" />Loading...</div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">{feature.icon}</div>
          <div className="empty-state-text">
            {debouncedSearch ? `No results for "${debouncedSearch}"` : `No ${feature.label.toLowerCase()} found`}
          </div>
          {!debouncedSearch && (
            <>
              <p style={{ color: '#475569', marginBottom: 16 }}>Create your first entry to get started</p>
              <button className="btn-primary" style={{ width: 'auto' }} onClick={handleNew}>
                + Add New
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="checkbox-col">
                    <input
                      type="checkbox"
                      className="bulk-checkbox"
                      checked={selectedIds.size === items.length && items.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                  {config.columns.map(col => (
                    <th
                      key={col}
                      className="sortable-th"
                      onClick={() => handleSort(col)}
                    >
                      <span>{col.replace(/_/g, ' ')}</span>
                      {sortField === col && (
                        <span className="sort-indicator">
                          {sortOrder === 'asc' ? ' \u25B2' : ' \u25BC'}
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} onClick={() => handleRowClick(item)} className={selectedIds.has(item.id) ? 'row-selected' : ''}>
                    <td className="checkbox-col" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="bulk-checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={(e) => handleSelectRow(item.id, e)}
                      />
                    </td>
                    {config.columns.map(col => (
                      <td key={col}>
                        {badgeColumns.includes(col) && item[col] ? (
                          <span className={`badge ${getBadgeClass(item[col])}`}>{String(item[col])}</span>
                        ) : col === 'bond_amount' || col === 'premium_amount' || col === 'annual_income' || col === 'monthly_income' || col === 'total_assets' ? (
                          item[col] ? `$${Number(item[col]).toLocaleString()}` : '\u2014'
                        ) : (
                          formatValue(item[col])
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {renderPagination()}
        </>
      )}
    </div>
  );
}
