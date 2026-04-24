import React from 'react';

function getScoreColor(score) {
  if (score === undefined || score === null) return '';
  const n = Number(score);
  if (n <= 30) return 'score-low';
  if (n <= 60) return 'score-medium';
  if (n <= 80) return 'score-high';
  return 'score-critical';
}

function getScoreBarColor(score) {
  const n = Number(score);
  if (n <= 30) return '#34d399';
  if (n <= 60) return '#fbbf24';
  if (n <= 80) return '#f87171';
  return '#ef4444';
}

function getRiskBadgeClass(level) {
  if (!level) return '';
  const l = String(level).toLowerCase();
  if (l.includes('low')) return 'badge-low';
  if (l.includes('medium') || l.includes('moderate')) return 'badge-medium';
  if (l.includes('very high') || l.includes('critical') || l.includes('extreme')) return 'badge-very-high';
  if (l.includes('high')) return 'badge-high';
  if (l.includes('approve') || l.includes('compliant') || l.includes('strong')) return 'badge-low';
  if (l.includes('deny') || l.includes('non-compliant')) return 'badge-high';
  if (l.includes('conditional') || l.includes('needs review')) return 'badge-medium';
  return 'badge-medium';
}

function renderValue(value, depth = 0) {
  if (value === null || value === undefined) return <span style={{ color: '#475569' }}>N/A</span>;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return (
      <ul className="ai-list">
        {value.map((item, i) => (
          <li key={i}>{typeof item === 'object' ? JSON.stringify(item) : String(item)}</li>
        ))}
      </ul>
    );
  }
  if (typeof value === 'object') {
    return (
      <div style={{ paddingLeft: depth > 0 ? 16 : 0 }}>
        {Object.entries(value).map(([k, v]) => (
          <div key={k} className="ai-section">
            <div className="ai-section-title">{k.replace(/_/g, ' ')}</div>
            <div className="ai-section-content">{renderValue(v, depth + 1)}</div>
          </div>
        ))}
      </div>
    );
  }
  return String(value);
}

// Score fields we want to display as score cards
const scoreFields = [
  'overall_risk_score', 'risk_score', 'flight_risk_score', 'recidivism_score',
  'community_ties_score', 'employment_score', 'financial_score', 'substance_abuse_risk',
  'substance_risk_score', 'mental_health_risk', 'mental_health_risk_score',
  'financial_stability_score', 'ability_to_pay_score', 'compliance_score',
  'prediction_score', 'confidence_level', 'treatment_compliance_likelihood',
  'community_ties_score'
];

// Badge fields
const badgeFields = ['risk_level', 'recommendation', 'status', 'strength_level', 'predicted_timeframe'];

// List fields
const listFields = [
  'conditions', 'key_risk_factors', 'mitigating_factors', 'key_indicators',
  'monitoring_recommendations', 'travel_restrictions', 'risk_factors',
  'protective_factors', 'intervention_recommendations', 'program_recommendations',
  'violations_found', 'recommendations', 'regulatory_references', 'action_items',
  'primary_concerns', 'treatment_recommendations', 'monitoring_requirements',
  'compliance_conditions', 'areas_of_concern', 'recommended_evaluations',
  'supervision_recommendations', 'positive_ties', 'concerns', 'stability_indicators'
];

// Text fields
const textFields = [
  'detailed_analysis', 'analysis', 'flight_risk_mitigation', 'net_worth_assessment',
  'income_stability', 'collateral_adequacy', 'competency_assessment',
  'ai_prediction', 'overall_recommendation'
];

export default function AIResultDisplay({ result }) {
  if (!result) return null;

  const scores = [];
  const badges = [];
  const lists = [];
  const texts = [];
  const other = [];

  Object.entries(result).forEach(([key, value]) => {
    if (key === 'model' || key === 'usage') return;
    if (scoreFields.includes(key) && typeof value === 'number') {
      scores.push({ key, value });
    } else if (badgeFields.includes(key) && typeof value === 'string') {
      badges.push({ key, value });
    } else if (listFields.includes(key) && Array.isArray(value)) {
      lists.push({ key, value });
    } else if (textFields.includes(key) && typeof value === 'string') {
      texts.push({ key, value });
    } else if (key !== 'model' && key !== 'usage') {
      other.push({ key, value });
    }
  });

  return (
    <div className="ai-result">
      <div className="ai-result-header">
        <div className="ai-result-icon">🤖</div>
        <div>
          <div className="ai-result-title">AI Analysis Results</div>
          <div className="ai-result-model">
            Powered by {result.model || 'OpenRouter AI'}
            {result.usage && ` • ${result.usage.total_tokens || 0} tokens`}
          </div>
        </div>
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div style={{ marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {badges.map(({ key, value }) => (
            <div key={key} style={{ textAlign: 'center' }}>
              <div className="ai-score-label" style={{ marginBottom: 4 }}>{key.replace(/_/g, ' ')}</div>
              <span className={`ai-badge badge ${getRiskBadgeClass(value)}`}>{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Score Cards */}
      {scores.length > 0 && (
        <div className="ai-score-grid">
          {scores.map(({ key, value }) => (
            <div key={key} className="ai-score-item">
              <div className="ai-score-label">{key.replace(/_/g, ' ').replace('score', '').trim()}</div>
              <div className={`ai-score-value ${getScoreColor(value)}`}>{value}</div>
              <div className="score-bar-container">
                <div
                  className="score-bar"
                  style={{
                    width: `${Math.min(100, value)}%`,
                    background: getScoreBarColor(value),
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Text Analysis Sections */}
      {texts.map(({ key, value }) => (
        <div key={key} className="ai-section">
          <div className="ai-section-title">{key.replace(/_/g, ' ')}</div>
          <div className="ai-section-content">{value}</div>
        </div>
      ))}

      {/* List Sections */}
      {lists.map(({ key, value }) => (
        <div key={key} className="ai-section">
          <div className="ai-section-title">{key.replace(/_/g, ' ')}</div>
          <ul className="ai-list">
            {value.map((item, i) => (
              <li key={i}>{typeof item === 'object' ? JSON.stringify(item) : String(item)}</li>
            ))}
          </ul>
        </div>
      ))}

      {/* Other Fields */}
      {other.map(({ key, value }) => (
        <div key={key} className="ai-section">
          <div className="ai-section-title">{key.replace(/_/g, ' ')}</div>
          <div className="ai-section-content">{renderValue(value)}</div>
        </div>
      ))}
    </div>
  );
}
