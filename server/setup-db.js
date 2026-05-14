require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');

async function setup() {
  // Connect to postgres default db to create our database
  const adminConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: 'postgres',
    user: process.env.DB_USER || process.env.USER,
  };
  if (process.env.DB_PASSWORD) adminConfig.password = process.env.DB_PASSWORD;
  const adminPool = new Pool(adminConfig);

  try {
    const dbName = process.env.DB_NAME || 'bail_bond_risk_assessor';
    const exists = await adminPool.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
    if (exists.rows.length === 0) {
      await adminPool.query(`CREATE DATABASE ${dbName}`);
      console.log(`Database ${dbName} created`);
    } else {
      console.log(`Database ${dbName} already exists`);
    }
  } catch (err) {
    if (err.code !== '42P04') console.error('DB creation error:', err.message);
  }
  await adminPool.end();

  // Now connect to our database and create tables
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'bail_bond_risk_assessor',
    user: process.env.DB_USER || process.env.USER,
  };
  if (process.env.DB_PASSWORD) dbConfig.password = process.env.DB_PASSWORD;
  const pool = new Pool(dbConfig);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'assessor',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS defendants (
      id SERIAL PRIMARY KEY,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      date_of_birth DATE,
      ssn_last4 VARCHAR(4),
      address TEXT,
      city VARCHAR(100),
      state VARCHAR(50),
      zip_code VARCHAR(10),
      phone VARCHAR(20),
      email VARCHAR(255),
      gender VARCHAR(20),
      risk_level VARCHAR(20) DEFAULT 'PENDING',
      status VARCHAR(50) DEFAULT 'Active',
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS bail_bonds (
      id SERIAL PRIMARY KEY,
      defendant_id INTEGER REFERENCES defendants(id) ON DELETE CASCADE,
      bond_amount DECIMAL(12,2),
      premium_amount DECIMAL(12,2),
      bond_type VARCHAR(50),
      status VARCHAR(50) DEFAULT 'Active',
      court_date DATE,
      court_name VARCHAR(255),
      case_number VARCHAR(100),
      charge TEXT,
      collateral TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS risk_assessments (
      id SERIAL PRIMARY KEY,
      defendant_id INTEGER REFERENCES defendants(id) ON DELETE CASCADE,
      risk_score INTEGER,
      risk_level VARCHAR(20),
      flight_risk_score INTEGER,
      recidivism_score INTEGER,
      community_ties_score INTEGER,
      employment_score INTEGER,
      financial_score INTEGER,
      substance_abuse_score INTEGER,
      mental_health_score INTEGER,
      criminal_history_score INTEGER,
      overall_recommendation VARCHAR(50),
      ai_analysis TEXT,
      assessor_notes TEXT,
      status VARCHAR(50) DEFAULT 'Completed',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS court_cases (
      id SERIAL PRIMARY KEY,
      defendant_id INTEGER REFERENCES defendants(id) ON DELETE CASCADE,
      case_number VARCHAR(100),
      court_name VARCHAR(255),
      judge VARCHAR(255),
      judge_name VARCHAR(255),
      courtroom VARCHAR(100),
      charge TEXT,
      charge_severity VARCHAR(50),
      next_hearing_date DATE,
      hearing_type VARCHAR(100),
      status VARCHAR(50) DEFAULT 'Pending',
      prosecutor VARCHAR(255),
      defense_attorney VARCHAR(255),
      reminder_sent BOOLEAN DEFAULT false,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS compliance_reports (
      id SERIAL PRIMARY KEY,
      defendant_id INTEGER REFERENCES defendants(id) ON DELETE CASCADE,
      report_type VARCHAR(100),
      title VARCHAR(255),
      description TEXT,
      status VARCHAR(50) DEFAULT 'Pending',
      due_date DATE,
      completed_date DATE,
      jurisdiction VARCHAR(100),
      regulatory_body VARCHAR(255),
      findings TEXT,
      corrective_actions TEXT,
      risk_rating VARCHAR(50),
      assigned_to VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS flight_risk_analyses (
      id SERIAL PRIMARY KEY,
      defendant_id INTEGER REFERENCES defendants(id) ON DELETE CASCADE,
      passport_status VARCHAR(50),
      travel_history TEXT,
      foreign_connections TEXT,
      prior_fta INTEGER DEFAULT 0,
      community_roots TEXT,
      employment_stability VARCHAR(50),
      family_ties TEXT,
      financial_resources TEXT,
      risk_score INTEGER,
      risk_level VARCHAR(20),
      ai_assessment TEXT,
      monitoring_recommendation TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS criminal_histories (
      id SERIAL PRIMARY KEY,
      defendant_id INTEGER REFERENCES defendants(id) ON DELETE CASCADE,
      offense_type VARCHAR(100),
      offense_date DATE,
      offense_description TEXT,
      severity VARCHAR(50),
      disposition VARCHAR(100),
      sentence TEXT,
      jurisdiction VARCHAR(100),
      case_number VARCHAR(100),
      arresting_agency VARCHAR(255),
      conviction_date DATE,
      release_date DATE,
      probation_status VARCHAR(50),
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS employment_records (
      id SERIAL PRIMARY KEY,
      defendant_id INTEGER REFERENCES defendants(id) ON DELETE CASCADE,
      employer_name VARCHAR(255),
      position VARCHAR(255),
      employment_type VARCHAR(50),
      start_date DATE,
      end_date DATE,
      monthly_income DECIMAL(10,2),
      supervisor_name VARCHAR(255),
      supervisor_phone VARCHAR(20),
      verified BOOLEAN DEFAULT false,
      verification_date DATE,
      verification_method VARCHAR(100),
      status VARCHAR(50) DEFAULT 'Current',
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS community_ties (
      id SERIAL PRIMARY KEY,
      defendant_id INTEGER REFERENCES defendants(id) ON DELETE CASCADE,
      relationship_type VARCHAR(100),
      contact_name VARCHAR(255),
      contact_phone VARCHAR(20),
      contact_address TEXT,
      years_known INTEGER,
      frequency_of_contact VARCHAR(50),
      willingness_to_supervise BOOLEAN DEFAULT false,
      verified BOOLEAN DEFAULT false,
      community_involvement TEXT,
      organization_name VARCHAR(255),
      tie_strength VARCHAR(50),
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS financial_analyses (
      id SERIAL PRIMARY KEY,
      defendant_id INTEGER REFERENCES defendants(id) ON DELETE CASCADE,
      annual_income DECIMAL(12,2),
      monthly_expenses DECIMAL(10,2),
      total_assets DECIMAL(12,2),
      total_liabilities DECIMAL(12,2),
      credit_score INTEGER,
      bank_accounts INTEGER,
      property_owned BOOLEAN DEFAULT false,
      vehicles_owned INTEGER DEFAULT 0,
      investment_accounts INTEGER DEFAULT 0,
      outstanding_debts DECIMAL(12,2),
      bankruptcy_history BOOLEAN DEFAULT false,
      financial_stability_score INTEGER,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS substance_abuse_assessments (
      id SERIAL PRIMARY KEY,
      defendant_id INTEGER REFERENCES defendants(id) ON DELETE CASCADE,
      substance_type VARCHAR(100),
      usage_frequency VARCHAR(50),
      last_use_date DATE,
      treatment_history TEXT,
      current_treatment BOOLEAN DEFAULT false,
      treatment_facility VARCHAR(255),
      counselor_name VARCHAR(255),
      sobriety_duration VARCHAR(100),
      risk_level VARCHAR(20),
      drug_test_results VARCHAR(50),
      compliance_status VARCHAR(50),
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS mental_health_evaluations (
      id SERIAL PRIMARY KEY,
      defendant_id INTEGER REFERENCES defendants(id) ON DELETE CASCADE,
      diagnosis VARCHAR(255),
      severity VARCHAR(50),
      treatment_status VARCHAR(50),
      medication TEXT,
      therapist_name VARCHAR(255),
      therapy_frequency VARCHAR(50),
      last_evaluation_date DATE,
      hospitalization_history TEXT,
      risk_to_self VARCHAR(20),
      risk_to_others VARCHAR(20),
      competency_status VARCHAR(50),
      compliance_level VARCHAR(50),
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS recidivism_predictions (
      id SERIAL PRIMARY KEY,
      defendant_id INTEGER REFERENCES defendants(id) ON DELETE CASCADE,
      prediction_score INTEGER,
      risk_level VARCHAR(20),
      prior_offenses_count INTEGER,
      age_at_first_offense INTEGER,
      offense_type_pattern VARCHAR(255),
      time_since_last_offense VARCHAR(100),
      social_factors TEXT,
      economic_factors TEXT,
      behavioral_indicators TEXT,
      protective_factors TEXT,
      ai_prediction TEXT,
      model_version VARCHAR(50),
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sureties (
      id SERIAL PRIMARY KEY,
      defendant_id INTEGER REFERENCES defendants(id) ON DELETE CASCADE,
      surety_name VARCHAR(255),
      relationship VARCHAR(100),
      phone VARCHAR(20),
      email VARCHAR(255),
      address TEXT,
      occupation VARCHAR(255),
      annual_income DECIMAL(12,2),
      assets_value DECIMAL(12,2),
      collateral_offered TEXT,
      collateral_type VARCHAR(100),
      verified BOOLEAN DEFAULT false,
      verification_date DATE,
      reliability_score INTEGER,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      action VARCHAR(10) NOT NULL,
      entity_type VARCHAR(100) NOT NULL,
      entity_id INTEGER,
      details JSONB,
      ip_address VARCHAR(45),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS bail_bond_status_history (
      id SERIAL PRIMARY KEY,
      bail_bond_id INTEGER REFERENCES bail_bonds(id) ON DELETE CASCADE,
      old_status VARCHAR(50),
      new_status VARCHAR(50) NOT NULL,
      changed_by INTEGER REFERENCES users(id),
      notes TEXT,
      changed_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ai_results (
      id SERIAL PRIMARY KEY,
      feature VARCHAR(100) NOT NULL,
      entity_type VARCHAR(100),
      entity_id INTEGER,
      user_email VARCHAR(255),
      request_payload JSONB,
      response JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_ai_results_feature ON ai_results(feature);
    CREATE INDEX IF NOT EXISTS idx_ai_results_entity ON ai_results(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_ai_results_created ON ai_results(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_defendants_risk_level ON defendants(risk_level);
    CREATE INDEX IF NOT EXISTS idx_bail_bonds_defendant ON bail_bonds(defendant_id);
    CREATE INDEX IF NOT EXISTS idx_bail_bonds_status ON bail_bonds(status);
    CREATE INDEX IF NOT EXISTS idx_court_cases_hearing_date ON court_cases(next_hearing_date);

    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255),
      message TEXT,
      type VARCHAR(50),
      priority VARCHAR(20) DEFAULT 'MEDIUM',
      recipient_id INTEGER,
      related_entity_type VARCHAR(50),
      related_entity_id INTEGER,
      is_read BOOLEAN DEFAULT false,
      action_required BOOLEAN DEFAULT false,
      action_url VARCHAR(255),
      due_date DATE,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Migration: add missing columns to existing tables (idempotent)
  const migrations = [
    `ALTER TABLE court_cases ADD COLUMN IF NOT EXISTS judge_name VARCHAR(255)`,
    `ALTER TABLE court_cases ADD COLUMN IF NOT EXISTS courtroom VARCHAR(100)`,
    `ALTER TABLE court_cases ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false`,
    `ALTER TABLE compliance_reports ADD COLUMN IF NOT EXISTS defendant_id INTEGER REFERENCES defendants(id) ON DELETE CASCADE`,
    `ALTER TABLE bail_bonds ADD COLUMN IF NOT EXISTS collateral_value DECIMAL(12,2)`,
  ];

  for (const sql of migrations) {
    try {
      await pool.query(sql);
    } catch (err) {
      if (err.code !== '42701') { // 42701 = column already exists
        console.warn('Migration warning:', err.message);
      }
    }
  }

  console.log('All tables created and migrations applied successfully');
  await pool.end();
}

setup().catch(console.error);
