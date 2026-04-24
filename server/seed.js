require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'bail_bond_risk_assessor',
  user: process.env.DB_USER || process.env.USER,
};
if (process.env.DB_PASSWORD) dbConfig.password = process.env.DB_PASSWORD;
const pool = new Pool(dbConfig);

async function seed() {
  // Clear existing data
  await pool.query(`
    TRUNCATE notifications, sureties, recidivism_predictions, mental_health_evaluations,
    substance_abuse_assessments, financial_analyses, community_ties, employment_records,
    criminal_histories, flight_risk_analyses, compliance_reports, court_cases,
    risk_assessments, bail_bonds, defendants, users RESTART IDENTITY CASCADE
  `);

  // Seed Users
  const hash = await bcrypt.hash('admin123', 10);
  await pool.query(`INSERT INTO users (email, password_hash, name, role) VALUES
    ('admin@bailbond.com', $1, 'John Administrator', 'admin'),
    ('assessor@bailbond.com', $1, 'Sarah Assessor', 'assessor'),
    ('manager@bailbond.com', $1, 'Mike Manager', 'manager')
  `, [hash]);
  console.log('Users seeded');

  // Seed 16 Defendants
  await pool.query(`INSERT INTO defendants (first_name, last_name, date_of_birth, ssn_last4, address, city, state, zip_code, phone, email, gender, risk_level, status, notes) VALUES
    ('James', 'Rodriguez', '1985-03-15', '4521', '123 Oak Street', 'Los Angeles', 'CA', '90001', '310-555-0101', 'jrodriguez@email.com', 'Male', 'HIGH', 'Active', 'Prior FTA history, substance abuse concerns'),
    ('Maria', 'Chen', '1992-07-22', '8834', '456 Pine Avenue', 'San Francisco', 'CA', '94102', '415-555-0202', 'mchen@email.com', 'Female', 'LOW', 'Active', 'First offense, strong community ties'),
    ('Robert', 'Williams', '1978-11-08', '2267', '789 Elm Drive', 'Houston', 'TX', '77001', '713-555-0303', 'rwilliams@email.com', 'Male', 'MEDIUM', 'Active', 'Employed, moderate criminal history'),
    ('Jennifer', 'Martinez', '1990-01-30', '5543', '321 Maple Lane', 'Phoenix', 'AZ', '85001', '602-555-0404', 'jmartinez@email.com', 'Female', 'LOW', 'Active', 'Stable employment, family support'),
    ('Michael', 'Thompson', '1983-06-17', '9912', '654 Cedar Road', 'Chicago', 'IL', '60601', '312-555-0505', 'mthompson@email.com', 'Male', 'VERY HIGH', 'Active', 'Multiple priors, flight risk indicators'),
    ('Sarah', 'Johnson', '1995-09-03', '7788', '987 Birch Street', 'Miami', 'FL', '33101', '305-555-0606', 'sjohnson@email.com', 'Female', 'MEDIUM', 'Active', 'Drug-related charges, in treatment'),
    ('David', 'Brown', '1988-12-25', '3345', '147 Walnut Ave', 'New York', 'NY', '10001', '212-555-0707', 'dbrown@email.com', 'Male', 'HIGH', 'Active', 'Domestic violence history, unstable housing'),
    ('Lisa', 'Garcia', '1993-04-11', '6679', '258 Spruce Court', 'Dallas', 'TX', '75201', '214-555-0808', 'lgarcia@email.com', 'Female', 'LOW', 'Released', 'Bond completed successfully'),
    ('Kevin', 'Davis', '1980-08-19', '1123', '369 Ash Boulevard', 'Seattle', 'WA', '98101', '206-555-0909', 'kdavis@email.com', 'Male', 'MEDIUM', 'Active', 'White collar crime, financial resources'),
    ('Amanda', 'Wilson', '1987-02-14', '4456', '741 Hickory Way', 'Denver', 'CO', '80201', '303-555-1010', 'awilson@email.com', 'Female', 'HIGH', 'Active', 'Repeat DUI offender, treatment non-compliant'),
    ('Thomas', 'Anderson', '1975-10-05', '7789', '852 Redwood Place', 'Portland', 'OR', '97201', '503-555-1111', 'tanderson@email.com', 'Male', 'LOW', 'Active', 'First offense, long-term resident'),
    ('Nicole', 'Taylor', '1991-05-28', '2234', '963 Cypress Lane', 'Atlanta', 'GA', '30301', '404-555-1212', 'ntaylor@email.com', 'Female', 'MEDIUM', 'Active', 'Fraud charges, cooperative with court'),
    ('Christopher', 'Lee', '1986-07-14', '5567', '159 Magnolia Dr', 'Boston', 'MA', '02101', '617-555-1313', 'clee@email.com', 'Male', 'VERY HIGH', 'Active', 'Gang affiliation, witness intimidation'),
    ('Rachel', 'Harris', '1994-03-09', '8890', '267 Willow Street', 'Nashville', 'TN', '37201', '615-555-1414', 'rharris@email.com', 'Female', 'LOW', 'Active', 'Misdemeanor, stable life situation'),
    ('Daniel', 'Clark', '1982-11-21', '1156', '378 Poplar Road', 'Las Vegas', 'NV', '89101', '702-555-1515', 'dclark@email.com', 'Male', 'HIGH', 'Active', 'Drug trafficking, prior FTA'),
    ('Emily', 'Lewis', '1996-08-07', '3389', '489 Juniper Ave', 'San Diego', 'CA', '92101', '619-555-1616', 'elewis@email.com', 'Female', 'MEDIUM', 'Active', 'Theft charges, young offender')
  `);
  console.log('Defendants seeded');

  // Seed 16 Bail Bonds
  await pool.query(`INSERT INTO bail_bonds (defendant_id, bond_amount, premium_amount, bond_type, status, court_date, court_name, case_number, charge, collateral, notes) VALUES
    (1, 50000.00, 5000.00, 'Surety', 'Active', '2024-04-15', 'LA Superior Court', 'LA-2024-0001', 'Aggravated Assault', 'Vehicle title - 2019 Honda Accord', 'High risk - GPS monitoring required'),
    (2, 10000.00, 1000.00, 'Cash', 'Active', '2024-03-20', 'SF Municipal Court', 'SF-2024-0023', 'Petty Theft', 'None', 'Low risk defendant'),
    (3, 25000.00, 2500.00, 'Surety', 'Active', '2024-05-10', 'Harris County Court', 'HC-2024-0145', 'Burglary 2nd Degree', 'Property lien - residence', 'Employed, moderate risk'),
    (4, 5000.00, 500.00, 'Cash', 'Active', '2024-03-25', 'Maricopa County Court', 'MC-2024-0078', 'DUI First Offense', 'None', 'First offense, family posted bail'),
    (5, 100000.00, 10000.00, 'Surety', 'Active', '2024-06-01', 'Cook County Court', 'CC-2024-0234', 'Armed Robbery', 'Real estate deed + jewelry', 'Maximum monitoring required'),
    (6, 15000.00, 1500.00, 'Surety', 'Active', '2024-04-05', 'Miami-Dade Court', 'MD-2024-0067', 'Drug Possession', 'Vehicle title', 'Treatment program condition'),
    (7, 75000.00, 7500.00, 'Surety', 'Active', '2024-05-20', 'NY Supreme Court', 'NY-2024-0189', 'Domestic Violence', 'Property lien', 'Protection order in place'),
    (8, 8000.00, 800.00, 'Cash', 'Completed', '2024-02-15', 'Dallas County Court', 'DC-2024-0045', 'Shoplifting', 'None', 'Bond exonerated, case resolved'),
    (9, 200000.00, 20000.00, 'Surety', 'Active', '2024-07-10', 'King County Court', 'KC-2024-0312', 'Securities Fraud', 'Investment portfolio', 'Financial crime - high bond'),
    (10, 30000.00, 3000.00, 'Surety', 'Active', '2024-04-30', 'Denver County Court', 'DV-2024-0156', 'DUI - 3rd Offense', 'Vehicle title + savings', 'Repeat offender'),
    (11, 12000.00, 1200.00, 'Cash', 'Active', '2024-03-28', 'Multnomah County Court', 'MU-2024-0089', 'Trespassing', 'None', 'Low flight risk'),
    (12, 40000.00, 4000.00, 'Surety', 'Active', '2024-05-15', 'Fulton County Court', 'FC-2024-0201', 'Wire Fraud', 'Property deed', 'Cooperating with investigation'),
    (13, 500000.00, 50000.00, 'Surety', 'Active', '2024-08-20', 'Suffolk County Court', 'SC-2024-0567', 'RICO Conspiracy', 'Multiple properties', 'Highest risk - strict conditions'),
    (14, 3000.00, 300.00, 'Cash', 'Active', '2024-03-22', 'Davidson County Court', 'DV-2024-0034', 'Simple Assault', 'None', 'Minor charge, stable defendant'),
    (15, 150000.00, 15000.00, 'Surety', 'Active', '2024-06-15', 'Clark County Court', 'CL-2024-0278', 'Drug Trafficking', 'Real estate + vehicles', 'High flight risk'),
    (16, 20000.00, 2000.00, 'Surety', 'Active', '2024-04-10', 'San Diego Court', 'SD-2024-0123', 'Grand Theft', 'Vehicle title', 'Young offender, first felony')
  `);
  console.log('Bail bonds seeded');

  // Seed 16 Risk Assessments
  await pool.query(`INSERT INTO risk_assessments (defendant_id, risk_score, risk_level, flight_risk_score, recidivism_score, community_ties_score, employment_score, financial_score, substance_abuse_score, mental_health_score, criminal_history_score, overall_recommendation, ai_analysis, assessor_notes, status) VALUES
    (1, 78, 'HIGH', 82, 71, 35, 45, 40, 75, 50, 80, 'CONDITIONAL', 'Subject presents elevated risk due to prior FTA and substance abuse history. Community ties are weak.', 'Recommend GPS monitoring and weekly check-ins', 'Completed'),
    (2, 22, 'LOW', 15, 10, 85, 80, 75, 5, 10, 5, 'APPROVE', 'Low risk profile. Strong community connections and stable employment.', 'Standard conditions sufficient', 'Completed'),
    (3, 55, 'MEDIUM', 45, 60, 55, 70, 50, 30, 25, 65, 'CONDITIONAL', 'Moderate risk. Stable employment mitigates some concerns.', 'Bi-weekly reporting recommended', 'Completed'),
    (4, 18, 'LOW', 10, 15, 90, 85, 80, 20, 10, 10, 'APPROVE', 'First offense with strong support system. Very low flight risk.', 'Minimal conditions needed', 'Completed'),
    (5, 92, 'VERY HIGH', 95, 88, 15, 20, 60, 45, 40, 90, 'DENY', 'Extremely high risk. Multiple violent priors and very weak community ties.', 'Recommend denial or maximum security conditions', 'Completed'),
    (6, 52, 'MEDIUM', 35, 45, 60, 55, 45, 80, 40, 50, 'CONDITIONAL', 'Drug-related concerns but showing willingness to seek treatment.', 'Treatment compliance as condition', 'Completed'),
    (7, 75, 'HIGH', 65, 70, 40, 50, 55, 35, 60, 75, 'CONDITIONAL', 'DV history concerning. Moderate flight risk.', 'No-contact order and GPS monitoring', 'Completed'),
    (8, 15, 'LOW', 10, 12, 80, 75, 70, 5, 5, 15, 'APPROVE', 'Minimal risk. Case resolved favorably.', 'Bond exonerated', 'Completed'),
    (9, 65, 'MEDIUM', 70, 40, 50, 90, 95, 5, 15, 35, 'CONDITIONAL', 'Financial crime, resources to flee. Employment strong.', 'Passport surrender recommended', 'Completed'),
    (10, 72, 'HIGH', 50, 75, 55, 60, 50, 85, 30, 70, 'CONDITIONAL', 'Repeat DUI shows pattern. Substance issues primary concern.', 'Mandatory treatment and testing', 'Completed'),
    (11, 20, 'LOW', 12, 18, 88, 82, 65, 8, 12, 15, 'APPROVE', 'Long-term community resident. Minor charge.', 'Standard release conditions', 'Completed'),
    (12, 48, 'MEDIUM', 55, 35, 65, 70, 60, 10, 20, 40, 'CONDITIONAL', 'White collar crime. Cooperating but flight capacity exists.', 'Financial monitoring and travel restrictions', 'Completed'),
    (13, 95, 'VERY HIGH', 98, 90, 10, 30, 80, 60, 45, 95, 'DENY', 'Organized crime involvement. Extreme flight risk.', 'Strong recommendation for denial', 'Completed'),
    (14, 12, 'LOW', 8, 10, 92, 88, 70, 5, 8, 8, 'APPROVE', 'Very low risk. Isolated incident.', 'Personal recognizance considered', 'Completed'),
    (15, 85, 'HIGH', 90, 78, 25, 35, 65, 70, 30, 82, 'CONDITIONAL', 'Drug trafficking with flight indicators.', 'Maximum monitoring and surrender passport', 'Completed'),
    (16, 42, 'MEDIUM', 30, 38, 65, 45, 40, 15, 20, 35, 'CONDITIONAL', 'Young offender, first felony. Potential for rehabilitation.', 'Community service and mentoring program', 'Completed')
  `);
  console.log('Risk assessments seeded');

  // Seed 16 Court Cases
  await pool.query(`INSERT INTO court_cases (defendant_id, case_number, court_name, judge, charge, charge_severity, next_hearing_date, hearing_type, status, prosecutor, defense_attorney, notes) VALUES
    (1, 'LA-2024-0001', 'LA Superior Court', 'Hon. Patricia Wells', 'Aggravated Assault', 'Felony', '2024-04-15', 'Preliminary Hearing', 'Pending', 'ADA Robert Kim', 'James Foster, Esq.', 'Victim recovering, witness statements pending'),
    (2, 'SF-2024-0023', 'SF Municipal Court', 'Hon. David Chang', 'Petty Theft', 'Misdemeanor', '2024-03-20', 'Arraignment', 'Pending', 'ADA Lisa Park', 'Maria Santos, Esq.', 'First offense, plea deal likely'),
    (3, 'HC-2024-0145', 'Harris County Court', 'Hon. Michael Rivera', 'Burglary 2nd Degree', 'Felony', '2024-05-10', 'Trial', 'Pending', 'ADA William Chen', 'Thomas Reed, Esq.', 'Evidence review in progress'),
    (4, 'MC-2024-0078', 'Maricopa County Court', 'Hon. Sarah Mitchell', 'DUI First Offense', 'Misdemeanor', '2024-03-25', 'Sentencing', 'Pending', 'ADA James White', 'Public Defender Office', 'BAC 0.12, no accident'),
    (5, 'CC-2024-0234', 'Cook County Court', 'Hon. Robert Franklin', 'Armed Robbery', 'Felony', '2024-06-01', 'Grand Jury', 'Pending', 'ADA Maria Gonzalez', 'Richard Hayes, Esq.', 'Multiple victims, surveillance evidence'),
    (6, 'MD-2024-0067', 'Miami-Dade Court', 'Hon. Carlos Ramirez', 'Drug Possession', 'Felony', '2024-04-05', 'Pre-Trial Conference', 'Pending', 'ADA Angela Brown', 'Public Defender Office', 'Drug court referral possible'),
    (7, 'NY-2024-0189', 'NY Supreme Court', 'Hon. Elizabeth Warren', 'Domestic Violence', 'Felony', '2024-05-20', 'Preliminary Hearing', 'Pending', 'ADA Daniel Kim', 'Sarah O''Brien, Esq.', 'Protection order active'),
    (8, 'DC-2024-0045', 'Dallas County Court', 'Hon. Thomas Bailey', 'Shoplifting', 'Misdemeanor', '2024-02-15', 'Disposition', 'Resolved', 'ADA Rachel Green', 'Public Defender Office', 'Community service completed'),
    (9, 'KC-2024-0312', 'King County Court', 'Hon. Amanda Foster', 'Securities Fraud', 'Felony', '2024-07-10', 'Trial', 'Pending', 'ADA Kevin Wright', 'Morrison & Associates', 'Complex financial evidence'),
    (10, 'DV-2024-0156', 'Denver County Court', 'Hon. Richard Bloom', 'DUI 3rd Offense', 'Felony', '2024-04-30', 'Sentencing', 'Pending', 'ADA Susan Hill', 'Public Defender Office', 'Mandatory minimum applies'),
    (11, 'MU-2024-0089', 'Multnomah County Court', 'Hon. Jennifer Lee', 'Criminal Trespass', 'Misdemeanor', '2024-03-28', 'Arraignment', 'Pending', 'ADA Mark Davis', 'Public Defender Office', 'Minor charge, diversion possible'),
    (12, 'FC-2024-0201', 'Fulton County Court', 'Hon. William Harris', 'Wire Fraud', 'Felony', '2024-05-15', 'Pre-Trial Conference', 'Pending', 'ADA Jennifer Adams', 'White & Associates', 'Federal referral pending'),
    (13, 'SC-2024-0567', 'Suffolk County Court', 'Hon. Margaret Brown', 'RICO Conspiracy', 'Felony', '2024-08-20', 'Grand Jury', 'Pending', 'AUSA Robert Martinez', 'Cohen Defense Group', 'Multi-defendant case'),
    (14, 'DV-2024-0034', 'Davidson County Court', 'Hon. Christopher Paul', 'Simple Assault', 'Misdemeanor', '2024-03-22', 'Arraignment', 'Pending', 'ADA Lisa Taylor', 'Public Defender Office', 'Bar fight, no serious injury'),
    (15, 'CL-2024-0278', 'Clark County Court', 'Hon. Diana Rodriguez', 'Drug Trafficking', 'Felony', '2024-06-15', 'Preliminary Hearing', 'Pending', 'ADA Steven Clark', 'Henderson Law Firm', 'Interstate trafficking alleged'),
    (16, 'SD-2024-0123', 'San Diego Court', 'Hon. Paul Anderson', 'Grand Theft', 'Felony', '2024-04-10', 'Arraignment', 'Pending', 'ADA Nancy White', 'Public Defender Office', 'Retail theft ring alleged')
  `);
  console.log('Court cases seeded');

  // Seed 16 Compliance Reports
  await pool.query(`INSERT INTO compliance_reports (report_type, title, description, status, due_date, completed_date, jurisdiction, regulatory_body, findings, corrective_actions, risk_rating, assigned_to) VALUES
    ('Annual Audit', 'Q1 2024 Compliance Audit', 'Quarterly compliance review of bail bond operations', 'Compliant', '2024-03-31', '2024-03-15', 'California', 'CA DOI', 'All records properly maintained', 'None required', 'LOW', 'John Administrator'),
    ('License Review', 'License Renewal Review', 'Annual license renewal compliance check', 'Compliant', '2024-06-30', NULL, 'California', 'CA DOI', 'License current, all requirements met', 'Continue CE credits', 'LOW', 'Sarah Assessor'),
    ('Financial Audit', 'Trust Account Audit', 'Required trust account reconciliation', 'Pending', '2024-04-15', NULL, 'California', 'CA DOI', 'Pending review', 'Reconciliation in progress', 'MEDIUM', 'Mike Manager'),
    ('Record Keeping', 'Document Retention Review', 'Review of document retention policies', 'Compliant', '2024-03-01', '2024-02-28', 'Texas', 'TX DOI', 'Records maintained per requirements', 'Updated digital backup schedule', 'LOW', 'John Administrator'),
    ('Bond Forfeiture', 'Forfeiture Compliance Review', 'Review of bond forfeiture procedures', 'Non-Compliant', '2024-02-28', NULL, 'Illinois', 'IL DOI', 'Two forfeitures not reported within required timeframe', 'Implement automated forfeiture alerts', 'HIGH', 'Sarah Assessor'),
    ('Continuing Ed', 'CE Credit Verification', 'Annual continuing education compliance', 'Compliant', '2024-12-31', NULL, 'Florida', 'FL DBPR', 'All agents current on CE requirements', 'Schedule Q3 training sessions', 'LOW', 'Mike Manager'),
    ('Consumer Complaint', 'Complaint #2024-001 Investigation', 'Consumer complaint regarding premium disclosure', 'Under Review', '2024-04-01', NULL, 'New York', 'NY DFS', 'Premium disclosure may have been incomplete', 'Review disclosure forms and retrain agents', 'MEDIUM', 'John Administrator'),
    ('Anti-Money Laundering', 'AML Compliance Check', 'Annual AML/KYC compliance review', 'Compliant', '2024-06-30', NULL, 'Federal', 'FinCEN', 'CTR and SAR filings current', 'Continue monitoring large transactions', 'LOW', 'Sarah Assessor'),
    ('Collateral Review', 'Collateral Management Audit', 'Review of collateral handling procedures', 'Pending', '2024-05-15', NULL, 'Washington', 'WA OIC', 'Review in progress', 'Pending field inspection', 'MEDIUM', 'Mike Manager'),
    ('Rate Filing', 'Premium Rate Filing Review', 'Compliance with approved rate schedules', 'Compliant', '2024-03-15', '2024-03-10', 'Arizona', 'AZ DOI', 'All premiums within approved ranges', 'None required', 'LOW', 'John Administrator'),
    ('Privacy Audit', 'Data Privacy Compliance', 'CCPA/privacy regulation compliance review', 'Under Review', '2024-04-30', NULL, 'California', 'CA AG', 'Data handling practices under review', 'Update privacy policy and consent forms', 'MEDIUM', 'Sarah Assessor'),
    ('Surety Review', 'Surety Company Relationship Audit', 'Review of surety company agreements', 'Compliant', '2024-07-31', NULL, 'Multiple', 'Various', 'All agreements current', 'Renegotiate two expiring contracts', 'LOW', 'Mike Manager'),
    ('Operational Review', 'Operational Compliance Assessment', 'Comprehensive operational review', 'Non-Compliant', '2024-03-31', NULL, 'Colorado', 'CO DORA', 'Office hours signage missing, incomplete file', 'Immediate corrective action required', 'HIGH', 'John Administrator'),
    ('Agent Licensing', 'Agent License Verification', 'Verification of all agent licenses', 'Compliant', '2024-04-15', '2024-04-01', 'Oregon', 'OR DCBS', 'All agents properly licensed', 'Two renewals due in Q3', 'LOW', 'Sarah Assessor'),
    ('Court Reporting', 'Court Appearance Reporting Audit', 'Review of court reporting compliance', 'Pending', '2024-05-01', NULL, 'Georgia', 'GA DOI', 'Pending court records review', 'Automate court date tracking', 'MEDIUM', 'Mike Manager'),
    ('Advertising Review', 'Marketing Material Compliance', 'Review of all advertising and marketing materials', 'Under Review', '2024-04-30', NULL, 'Nevada', 'NV DOI', 'Website claims under review', 'Legal review of all marketing copy', 'MEDIUM', 'John Administrator')
  `);
  console.log('Compliance reports seeded');

  // Seed 16 Flight Risk Analyses
  await pool.query(`INSERT INTO flight_risk_analyses (defendant_id, passport_status, travel_history, foreign_connections, prior_fta, community_roots, employment_stability, family_ties, financial_resources, risk_score, risk_level, ai_assessment, monitoring_recommendation, notes) VALUES
    (1, 'Valid', 'Mexico - 3 trips in 2 years', 'Family in Guadalajara', 2, 'Weak - moved 3 times in 2 years', 'Unstable', 'Divorced, no children locally', 'Moderate savings', 82, 'HIGH', 'High flight risk due to prior FTAs and foreign connections', 'GPS ankle monitor, passport surrender', 'Two prior FTAs flagged'),
    (2, 'None', 'No international travel', 'None', 0, 'Strong - 10 year resident', 'Stable', 'Parents and siblings in area', 'Limited', 15, 'LOW', 'Very low flight risk. Deep community roots', 'Standard check-ins', 'Excellent community ties'),
    (3, 'Expired', 'Canada once in 2020', 'None significant', 0, 'Moderate - 5 year resident', 'Stable', 'Married with 2 children', 'Moderate', 45, 'MEDIUM', 'Moderate risk. Family ties provide anchor', 'Bi-weekly reporting', 'Family mitigates flight risk'),
    (4, 'None', 'No international travel', 'None', 0, 'Strong - lifelong resident', 'Stable', 'Large local family network', 'Good', 10, 'LOW', 'Minimal flight risk', 'Phone check-ins', 'Very stable situation'),
    (5, 'Valid', 'Multiple countries - frequent traveler', 'Associates in 3 countries', 3, 'Weak - no fixed address history', 'None', 'Estranged from family', 'Significant', 95, 'CRITICAL', 'Critical flight risk. Resources and connections to flee', 'Maximum security, electronic monitoring', 'Highest flight risk in caseload'),
    (6, 'None', 'No travel history', 'None', 0, 'Moderate - 3 year resident', 'Part-time', 'Mother in area', 'Limited', 35, 'MEDIUM', 'Low-moderate risk. Treatment compliance is key', 'Weekly check-ins', 'Treatment attendance monitoring'),
    (7, 'Valid', 'Europe - 2 trips', 'Business contacts abroad', 1, 'Moderate', 'Self-employed', 'Children from prior relationship', 'Good', 65, 'HIGH', 'Elevated risk due to resources and prior FTA', 'GPS monitoring, travel restrictions', 'Protect victim safety'),
    (8, 'None', 'None', 'None', 0, 'Strong', 'Stable', 'Spouse and children', 'Limited', 10, 'LOW', 'No flight risk identified', 'None needed - case resolved', 'Bond successfully completed'),
    (9, 'Valid', 'Frequent international business travel', 'Business in multiple countries', 0, 'Moderate', 'High-level professional', 'Married', 'Very significant', 70, 'HIGH', 'High risk due to resources and international connections', 'Passport surrender mandatory', 'White collar flight pattern'),
    (10, 'Expired', 'Mexico once', 'None significant', 1, 'Moderate', 'Employed', 'Girlfriend, no children', 'Limited', 50, 'MEDIUM', 'Moderate risk. Prior FTA concerning', 'Bi-weekly reporting, substance testing', 'Alcohol-related flight risk'),
    (11, 'None', 'None', 'None', 0, 'Very strong - 30 year resident', 'Stable - 15 years', 'Extensive family network', 'Moderate', 12, 'LOW', 'Extremely low flight risk', 'Monthly check-ins', 'Pillar of community'),
    (12, 'Valid', 'Caribbean - multiple trips', 'Some overseas contacts', 0, 'Moderate', 'Recently terminated', 'Married with children', 'Under investigation', 55, 'MEDIUM', 'Moderate risk. Financial assets may be frozen', 'Weekly reporting, financial monitoring', 'Monitor asset movement'),
    (13, 'Valid - multiple passports', 'Extensive international travel', 'Criminal network in 5+ countries', 4, 'Very weak', 'Alleged criminal enterprise', 'Distant family', 'Very significant', 98, 'CRITICAL', 'Extreme flight risk. Maximum detention recommended', 'Detention recommended over bail', 'Organized crime connections'),
    (14, 'None', 'None', 'None', 0, 'Strong', 'Stable', 'Large family locally', 'Limited', 8, 'LOW', 'Negligible flight risk', 'Phone check-ins sufficient', 'Very stable'),
    (15, 'Valid', 'South America - frequent', 'Drug network connections', 2, 'Weak', 'Unknown employment', 'Some family', 'Significant cash resources', 90, 'CRITICAL', 'Very high flight risk due to trafficking network', 'GPS monitor, passport surrender, curfew', 'DEA coordination needed'),
    (16, 'None', 'None', 'None', 0, 'Moderate - 5 year resident', 'Part-time student', 'Parents in area', 'Very limited', 30, 'LOW', 'Low flight risk. Youth and limited resources', 'Weekly check-ins', 'School enrollment as condition')
  `);
  console.log('Flight risk analyses seeded');

  // Seed 16 Criminal Histories
  await pool.query(`INSERT INTO criminal_histories (defendant_id, offense_type, offense_date, offense_description, severity, disposition, sentence, jurisdiction, case_number, arresting_agency, conviction_date, release_date, probation_status, notes) VALUES
    (1, 'Assault', '2020-06-15', 'Simple assault at bar', 'Misdemeanor', 'Convicted', '6 months probation', 'Los Angeles', 'LA-2020-4521', 'LAPD', '2020-08-10', '2021-02-10', 'Completed', 'Bar fight altercation'),
    (1, 'FTA', '2021-03-20', 'Failure to appear for hearing', 'Misdemeanor', 'Convicted', 'Additional bond conditions', 'Los Angeles', 'LA-2021-0892', 'LAPD', '2021-04-15', NULL, 'Active', 'Missed court date'),
    (3, 'Theft', '2018-11-10', 'Shoplifting merchandise over $500', 'Misdemeanor', 'Convicted', '1 year probation', 'Houston', 'HC-2018-3345', 'HPD', '2019-01-20', '2020-01-20', 'Completed', 'Successfully completed probation'),
    (5, 'Robbery', '2015-08-22', 'Armed robbery of convenience store', 'Felony', 'Convicted', '5 years prison', 'Chicago', 'CC-2015-7891', 'CPD', '2016-02-10', '2020-08-10', 'Completed', 'Served full sentence'),
    (5, 'Assault', '2012-04-30', 'Aggravated assault with weapon', 'Felony', 'Convicted', '3 years prison', 'Chicago', 'CC-2012-2234', 'CPD', '2012-10-15', '2015-04-15', 'Completed', 'Prior violent offense'),
    (5, 'Drug Possession', '2021-12-05', 'Possession of controlled substance', 'Felony', 'Convicted', '2 years probation', 'Chicago', 'CC-2021-5567', 'CPD', '2022-03-10', NULL, 'Active', 'Ongoing supervision'),
    (6, 'Drug Possession', '2022-05-18', 'Possession of marijuana over 1oz', 'Misdemeanor', 'Convicted', 'Drug court program', 'Miami', 'MD-2022-3892', 'MDPD', '2022-07-20', NULL, 'Active', 'In drug court program'),
    (7, 'Domestic Violence', '2021-09-14', 'DV assault against partner', 'Misdemeanor', 'Convicted', '1 year probation + anger management', 'New York', 'NY-2021-6723', 'NYPD', '2021-12-01', '2022-12-01', 'Completed', 'Completed anger management'),
    (7, 'Violation of Protection Order', '2022-06-30', 'Contact with protected person', 'Misdemeanor', 'Convicted', '30 days jail', 'New York', 'NY-2022-1145', 'NYPD', '2022-08-15', '2022-09-14', 'N/A', 'Served jail time'),
    (10, 'DUI', '2019-07-04', 'DUI - BAC 0.14', 'Misdemeanor', 'Convicted', 'License suspension + DUI school', 'Denver', 'DV-2019-4456', 'DPD', '2019-09-20', '2020-03-20', 'Completed', 'First DUI offense'),
    (10, 'DUI', '2021-12-31', 'DUI - BAC 0.18', 'Misdemeanor', 'Convicted', '10 days jail + 2 year probation', 'Denver', 'DV-2021-7789', 'DPD', '2022-03-15', NULL, 'Active', 'Second offense, escalating BAC'),
    (12, 'Fraud', '2023-03-15', 'Wire fraud scheme targeting elderly', 'Felony', 'Pending', 'N/A', 'Atlanta', 'FC-2023-8834', 'FBI', NULL, NULL, 'N/A', 'Federal investigation ongoing'),
    (13, 'Assault', '2010-05-20', 'Gang-related assault', 'Felony', 'Convicted', '4 years prison', 'Boston', 'SC-2010-2267', 'BPD', '2010-11-30', '2014-05-30', 'Completed', 'Gang affiliation noted'),
    (13, 'Drug Distribution', '2017-09-10', 'Distribution of controlled substances', 'Felony', 'Convicted', '6 years prison', 'Boston', 'SC-2017-5543', 'DEA', '2018-02-15', '2023-02-15', 'Completed', 'Major drug operation'),
    (15, 'Drug Possession', '2019-04-22', 'Possession with intent to distribute', 'Felony', 'Convicted', '3 years prison', 'Las Vegas', 'CL-2019-9912', 'LVMPD', '2019-10-01', '2022-04-01', 'Completed', 'Large quantity seized'),
    (15, 'FTA', '2022-11-15', 'Failure to appear for probation hearing', 'Misdemeanor', 'Convicted', 'Probation revoked', 'Las Vegas', 'CL-2022-1123', 'LVMPD', '2022-12-20', '2023-06-20', 'N/A', 'Apprehended after 2 weeks')
  `);
  console.log('Criminal histories seeded');

  // Seed 16 Employment Records
  await pool.query(`INSERT INTO employment_records (defendant_id, employer_name, position, employment_type, start_date, end_date, monthly_income, supervisor_name, supervisor_phone, verified, verification_date, verification_method, status, notes) VALUES
    (1, 'City Auto Repair', 'Mechanic', 'Full-time', '2023-01-15', NULL, 3200.00, 'Carlos Mendez', '310-555-2001', true, '2024-02-01', 'Phone verification', 'Current', 'Employed 1+ year, good standing'),
    (2, 'TechStar Solutions', 'Software Developer', 'Full-time', '2021-06-01', NULL, 7500.00, 'David Park', '415-555-2002', true, '2024-01-15', 'Written verification', 'Current', 'Stable professional employment'),
    (3, 'Gulf Coast Construction', 'Foreman', 'Full-time', '2019-08-01', NULL, 4800.00, 'Robert Garcia', '713-555-2003', true, '2024-02-10', 'Phone verification', 'Current', 'Long-term employment, promoted'),
    (4, 'Desert Hills Hospital', 'Registered Nurse', 'Full-time', '2018-03-15', NULL, 5500.00, 'Patricia Adams', '602-555-2004', true, '2024-01-20', 'HR department verification', 'Current', 'Stable career professional'),
    (5, 'Quick Stop Market', 'Cashier', 'Part-time', '2023-09-01', '2024-01-15', 1600.00, 'Mike Johnson', '312-555-2005', true, '2024-02-05', 'In-person visit', 'Terminated', 'Terminated after arrest'),
    (6, 'Sunshine Cafe', 'Server', 'Part-time', '2023-06-01', NULL, 2200.00, 'Anna Rodriguez', '305-555-2006', true, '2024-02-01', 'Phone verification', 'Current', 'Part-time while in treatment'),
    (7, 'Self-Employed', 'Freelance Photographer', 'Self-employed', '2020-01-01', NULL, 4000.00, 'N/A', 'N/A', false, NULL, 'Tax returns reviewed', 'Current', 'Variable income, hard to verify'),
    (8, 'Dallas Morning News', 'Delivery Driver', 'Full-time', '2022-04-01', NULL, 2800.00, 'Tom Wilson', '214-555-2008', true, '2024-01-10', 'Phone verification', 'Current', 'Reliable employment'),
    (9, 'Pacific Northwest Financial', 'Vice President', 'Full-time', '2017-01-15', '2024-01-20', 15000.00, 'Board of Directors', '206-555-2009', true, '2024-02-01', 'Company records', 'Terminated', 'Terminated following charges'),
    (10, 'Mountain View Landscaping', 'Crew Lead', 'Full-time', '2021-04-01', NULL, 3500.00, 'Steve Brown', '303-555-2010', true, '2024-02-15', 'Phone verification', 'Current', 'Seasonal variation in hours'),
    (11, 'Portland Public Schools', 'Teacher', 'Full-time', '2009-08-15', NULL, 5200.00, 'Dr. Karen Lee', '503-555-2011', true, '2024-01-25', 'HR verification', 'Current', '15 years stable employment'),
    (12, 'Peachtree Consulting', 'Senior Consultant', 'Full-time', '2019-02-01', '2023-12-01', 9500.00, 'Jennifer Adams', '404-555-2012', true, '2024-02-01', 'Written verification', 'Terminated', 'Left before charges filed'),
    (13, 'Unknown', 'Unknown', 'Unknown', NULL, NULL, 0.00, 'N/A', 'N/A', false, NULL, 'N/A', 'Unverified', 'Claims self-employment, no records'),
    (14, 'Nashville Music Row Studios', 'Sound Engineer', 'Full-time', '2020-09-01', NULL, 4200.00, 'Chris Martin', '615-555-2014', true, '2024-02-01', 'Phone verification', 'Current', 'Creative professional, stable'),
    (15, 'Unemployed', 'N/A', 'Unemployed', NULL, NULL, 0.00, 'N/A', 'N/A', false, NULL, 'N/A', 'Unemployed', 'Claims cash employment, unverifiable'),
    (16, 'Student/Part-time', 'Retail Associate', 'Part-time', '2023-08-01', NULL, 1200.00, 'Lisa Green', '619-555-2016', true, '2024-02-10', 'Phone verification', 'Current', 'College student, part-time work')
  `);
  console.log('Employment records seeded');

  // Seed 16 Community Ties
  await pool.query(`INSERT INTO community_ties (defendant_id, relationship_type, contact_name, contact_phone, contact_address, years_known, frequency_of_contact, willingness_to_supervise, verified, community_involvement, organization_name, tie_strength, notes) VALUES
    (1, 'Friend', 'Miguel Torres', '310-555-3001', '234 Oak St, Los Angeles, CA', 5, 'Weekly', false, true, 'None', 'N/A', 'Weak', 'Limited community connections'),
    (2, 'Parent', 'Linda Chen', '415-555-3002', '456 Pine Ave, San Francisco, CA', 32, 'Daily', true, true, 'Church volunteer, PTA member', 'First Baptist Church', 'Very Strong', 'Extensive family support'),
    (3, 'Spouse', 'Maria Williams', '713-555-3003', '789 Elm Dr, Houston, TX', 12, 'Daily', true, true, 'Youth soccer coach', 'YMCA', 'Strong', 'Married with children, community active'),
    (4, 'Parent', 'Rosa Martinez', '602-555-3004', '321 Maple Ln, Phoenix, AZ', 34, 'Daily', true, true, 'Hospital volunteer', 'St. Joseph Hospital', 'Very Strong', 'Close family support network'),
    (5, 'Associate', 'Unknown', '312-555-3005', 'Unknown', 2, 'Occasionally', false, false, 'None identified', 'N/A', 'Very Weak', 'No verifiable community ties'),
    (6, 'Mother', 'Carmen Garcia', '305-555-3006', '987 Birch St, Miami, FL', 28, 'Weekly', true, true, 'AA sponsor relationship', 'Miami AA Chapter', 'Moderate', 'Mother supportive of recovery'),
    (7, 'Business Partner', 'Alex Romano', '212-555-3007', '147 Walnut Ave, New York, NY', 8, 'Daily', false, true, 'Photography guild member', 'NYC Photo Guild', 'Moderate', 'Professional connections only'),
    (8, 'Spouse', 'Maria Garcia', '214-555-3008', '258 Spruce Ct, Dallas, TX', 15, 'Daily', true, true, 'Church choir, school volunteer', 'St. Anthony Parish', 'Very Strong', 'Strong family and church ties'),
    (9, 'Spouse', 'Katherine Davis', '206-555-3009', '369 Ash Blvd, Seattle, WA', 20, 'Daily', true, true, 'Country club member', 'Seattle Golf Club', 'Strong', 'High-society connections'),
    (10, 'Girlfriend', 'Ashley Moore', '303-555-3010', '741 Hickory Way, Denver, CO', 2, 'Daily', true, false, 'None significant', 'N/A', 'Moderate', 'Relatively new relationship'),
    (11, 'Spouse', 'Margaret Anderson', '503-555-3011', '852 Redwood Pl, Portland, OR', 35, 'Daily', true, true, 'School board, Rotary Club, church elder', 'Portland Rotary Club', 'Very Strong', 'Pillar of community'),
    (12, 'Spouse', 'David Taylor', '404-555-3012', '963 Cypress Ln, Atlanta, GA', 10, 'Daily', true, true, 'Junior League member', 'Atlanta Junior League', 'Strong', 'Supportive spouse, community active'),
    (13, 'Associate', 'Unknown', '617-555-3013', 'Unknown', 0, 'Unknown', false, false, 'Gang affiliation suspected', 'N/A', 'Very Weak', 'No legitimate community ties identified'),
    (14, 'Parent', 'Robert Harris', '615-555-3014', '267 Willow St, Nashville, TN', 28, 'Daily', true, true, 'Music community active', 'Nashville Musicians Association', 'Very Strong', 'Strong family, professional network'),
    (15, 'Acquaintance', 'Jose Ramos', '702-555-3015', '378 Poplar Rd, Las Vegas, NV', 3, 'Monthly', false, false, 'None verified', 'N/A', 'Weak', 'Limited verifiable connections'),
    (16, 'Parent', 'Sandra Lewis', '619-555-3016', '489 Juniper Ave, San Diego, CA', 20, 'Daily', true, true, 'School activities', 'SDSU Alumni Assoc', 'Strong', 'Supportive parents, college student')
  `);
  console.log('Community ties seeded');

  // Seed 16 Financial Analyses
  await pool.query(`INSERT INTO financial_analyses (defendant_id, annual_income, monthly_expenses, total_assets, total_liabilities, credit_score, bank_accounts, property_owned, vehicles_owned, investment_accounts, outstanding_debts, bankruptcy_history, financial_stability_score, notes) VALUES
    (1, 38400.00, 2800.00, 15000.00, 8000.00, 580, 1, false, 1, 0, 8000.00, false, 40, 'Limited savings, living paycheck to paycheck'),
    (2, 90000.00, 3500.00, 85000.00, 25000.00, 720, 2, false, 1, 1, 25000.00, false, 75, 'Good financial standing, student loans'),
    (3, 57600.00, 3200.00, 120000.00, 95000.00, 650, 2, true, 2, 0, 95000.00, false, 55, 'Homeowner, mortgage is primary liability'),
    (4, 66000.00, 2500.00, 95000.00, 30000.00, 710, 2, false, 1, 1, 30000.00, false, 70, 'Stable finances, manageable debt'),
    (5, 19200.00, 1500.00, 5000.00, 2000.00, 450, 1, false, 0, 0, 2000.00, false, 20, 'Very limited financial resources'),
    (6, 26400.00, 2000.00, 8000.00, 5000.00, 550, 1, false, 0, 0, 5000.00, false, 30, 'Limited income, treatment costs'),
    (7, 48000.00, 3000.00, 45000.00, 15000.00, 640, 2, false, 1, 0, 15000.00, false, 50, 'Variable freelance income'),
    (8, 33600.00, 2200.00, 20000.00, 10000.00, 620, 1, false, 1, 0, 10000.00, false, 45, 'Modest but stable finances'),
    (9, 180000.00, 8000.00, 2500000.00, 500000.00, 780, 5, true, 3, 4, 500000.00, false, 90, 'Significant wealth, assets may be frozen'),
    (10, 42000.00, 2600.00, 25000.00, 12000.00, 590, 1, false, 1, 0, 12000.00, false, 45, 'Seasonal income variation'),
    (11, 62400.00, 2800.00, 350000.00, 150000.00, 750, 3, true, 2, 2, 150000.00, false, 80, 'Strong financial position, homeowner'),
    (12, 114000.00, 5500.00, 450000.00, 200000.00, 700, 3, true, 2, 2, 200000.00, false, 70, 'Good finances but under investigation'),
    (13, 0.00, 0.00, 0.00, 0.00, 0, 0, false, 0, 0, 0.00, false, 5, 'No verifiable financial information'),
    (14, 50400.00, 2200.00, 40000.00, 15000.00, 680, 2, false, 1, 0, 15000.00, false, 60, 'Stable creative professional income'),
    (15, 0.00, 3500.00, 0.00, 0.00, 0, 0, false, 2, 0, 0.00, false, 10, 'No legitimate income verified, lifestyle inconsistent'),
    (16, 14400.00, 1000.00, 3000.00, 12000.00, 520, 1, false, 0, 0, 12000.00, false, 25, 'Student with limited resources')
  `);
  console.log('Financial analyses seeded');

  // Seed 16 Substance Abuse Assessments
  await pool.query(`INSERT INTO substance_abuse_assessments (defendant_id, substance_type, usage_frequency, last_use_date, treatment_history, current_treatment, treatment_facility, counselor_name, sobriety_duration, risk_level, drug_test_results, compliance_status, notes) VALUES
    (1, 'Alcohol/Cocaine', 'Weekly', '2024-01-10', 'One prior rehab attempt in 2022', false, 'N/A', 'N/A', 'None', 'HIGH', 'Positive - Cocaine', 'Non-Compliant', 'Active substance use, refused treatment'),
    (2, 'None', 'Never', NULL, 'None', false, 'N/A', 'N/A', 'N/A', 'LOW', 'Negative', 'Compliant', 'No substance issues identified'),
    (3, 'Marijuana', 'Occasionally', '2023-12-01', 'None', false, 'N/A', 'N/A', 'N/A', 'LOW', 'Negative', 'Compliant', 'Recreational use only, not current'),
    (4, 'Alcohol', 'Social', '2024-01-20', 'None', false, 'N/A', 'N/A', 'N/A', 'LOW', 'Negative', 'Compliant', 'DUI was isolated incident'),
    (5, 'Multiple substances', 'Daily', '2024-02-01', 'Two rehab stays, both incomplete', false, 'N/A', 'N/A', 'None', 'CRITICAL', 'Positive - Multiple', 'Non-Compliant', 'Severe poly-substance abuse'),
    (6, 'Heroin/Opioids', 'Was daily, now in recovery', '2023-08-15', 'Current MAT program', true, 'Sunrise Recovery Center', 'Dr. Angela Morrison', '5 months', 'MEDIUM', 'Negative', 'Compliant', 'Good progress in treatment'),
    (7, 'Alcohol', 'Heavy weekends', '2024-02-10', 'Completed anger management with alcohol component', false, 'N/A', 'N/A', 'None current', 'MEDIUM', 'Negative', 'Partially Compliant', 'Alcohol linked to DV incidents'),
    (8, 'None', 'Never', NULL, 'None', false, 'N/A', 'N/A', 'N/A', 'LOW', 'Negative', 'Compliant', 'No substance issues'),
    (9, 'None', 'Social alcohol only', NULL, 'None', false, 'N/A', 'N/A', 'N/A', 'LOW', 'Negative', 'Compliant', 'Social drinker only'),
    (10, 'Alcohol', 'Daily heavy', '2024-02-15', 'Two prior treatment attempts', false, 'N/A', 'N/A', 'None', 'HIGH', 'BAC positive', 'Non-Compliant', 'Chronic alcohol dependency'),
    (11, 'None', 'Never', NULL, 'None', false, 'N/A', 'N/A', 'N/A', 'LOW', 'Negative', 'Compliant', 'No substance issues'),
    (12, 'Wine/social', 'Social occasions', NULL, 'None', false, 'N/A', 'N/A', 'N/A', 'LOW', 'Negative', 'Compliant', 'Moderate social drinking only'),
    (13, 'Cocaine/Marijuana', 'Frequent', '2024-01-30', 'None', false, 'N/A', 'N/A', 'None', 'HIGH', 'Positive - Cocaine', 'Non-Compliant', 'Active use, no treatment interest'),
    (14, 'Alcohol', 'Social', '2024-02-01', 'None', false, 'N/A', 'N/A', 'N/A', 'LOW', 'Negative', 'Compliant', 'Incident was alcohol-related but not pattern'),
    (15, 'Methamphetamine', 'Regular', '2024-02-10', 'One incomplete rehab', false, 'N/A', 'N/A', 'None', 'CRITICAL', 'Positive - Meth', 'Non-Compliant', 'Active meth use, distribution suspected'),
    (16, 'Marijuana', 'Occasional', '2024-01-15', 'None', false, 'N/A', 'N/A', 'N/A', 'LOW', 'THC Positive', 'Partially Compliant', 'Recreational marijuana use')
  `);
  console.log('Substance abuse assessments seeded');

  // Seed 16 Mental Health Evaluations
  await pool.query(`INSERT INTO mental_health_evaluations (defendant_id, diagnosis, severity, treatment_status, medication, therapist_name, therapy_frequency, last_evaluation_date, hospitalization_history, risk_to_self, risk_to_others, competency_status, compliance_level, notes) VALUES
    (1, 'PTSD, Anger Management Issues', 'Moderate', 'Untreated', 'None', 'N/A', 'None', '2024-01-15', 'None', 'Low', 'Moderate', 'Competent', 'Non-Compliant', 'Refuses mental health treatment'),
    (2, 'None diagnosed', 'None', 'N/A', 'None', 'N/A', 'N/A', '2024-01-10', 'None', 'None', 'None', 'Competent', 'N/A', 'No mental health concerns'),
    (3, 'Mild anxiety', 'Mild', 'Managed', 'Sertraline 50mg', 'Dr. Sarah Kim', 'Monthly', '2024-01-20', 'None', 'None', 'None', 'Competent', 'Compliant', 'Well-managed anxiety'),
    (4, 'None diagnosed', 'None', 'N/A', 'None', 'N/A', 'N/A', '2024-01-12', 'None', 'None', 'None', 'Competent', 'N/A', 'No concerns identified'),
    (5, 'Antisocial Personality Disorder', 'Severe', 'Untreated', 'None', 'N/A', 'None', '2024-02-01', '1 psychiatric hold', 'Low', 'High', 'Competent', 'Non-Compliant', 'Significant personality disorder concerns'),
    (6, 'Depression, Anxiety', 'Moderate', 'Active treatment', 'Lexapro 20mg, Buspar 10mg', 'Dr. Michael Torres', 'Weekly', '2024-01-25', '1 voluntary admission', 'Moderate', 'Low', 'Competent', 'Compliant', 'Improving with treatment'),
    (7, 'Intermittent Explosive Disorder', 'Moderate', 'In treatment', 'Mood stabilizer', 'Dr. Lisa Wang', 'Bi-weekly', '2024-02-05', 'None', 'Low', 'Moderate', 'Competent', 'Partially Compliant', 'Anger issues linked to DV'),
    (8, 'None diagnosed', 'None', 'N/A', 'None', 'N/A', 'N/A', '2024-01-08', 'None', 'None', 'None', 'Competent', 'N/A', 'No concerns'),
    (9, 'Narcissistic traits', 'Mild', 'Untreated', 'None', 'N/A', 'None', '2024-02-01', 'None', 'None', 'None', 'Competent', 'N/A', 'Personality traits noted, not diagnosable'),
    (10, 'Depression, Alcohol Use Disorder', 'Moderate', 'Partially treated', 'Antabuse', 'Dr. James Reed', 'Monthly', '2024-02-10', 'None', 'Moderate', 'Low', 'Competent', 'Partially Compliant', 'Depression linked to alcohol use'),
    (11, 'None diagnosed', 'None', 'N/A', 'None', 'N/A', 'N/A', '2024-01-05', 'None', 'None', 'None', 'Competent', 'N/A', 'Mentally healthy'),
    (12, 'Adjustment Disorder', 'Mild', 'New treatment', 'None', 'Dr. Karen Black', 'Weekly', '2024-02-01', 'None', 'Low', 'None', 'Competent', 'Compliant', 'Stress response to legal situation'),
    (13, 'Possible psychopathy indicators', 'Severe', 'Untreated', 'None', 'N/A', 'None', '2024-02-01', 'None', 'Low', 'Very High', 'Under evaluation', 'Non-Compliant', 'Full evaluation needed'),
    (14, 'None diagnosed', 'None', 'N/A', 'None', 'N/A', 'N/A', '2024-01-18', 'None', 'None', 'None', 'Competent', 'N/A', 'No concerns'),
    (15, 'Paranoid ideation', 'Moderate', 'Untreated', 'None', 'N/A', 'None', '2024-02-05', 'None', 'Low', 'Moderate', 'Competent', 'Non-Compliant', 'Drug-induced paranoia possible'),
    (16, 'ADHD, Mild anxiety', 'Mild', 'Treated', 'Adderall 20mg', 'Dr. Emily Ross', 'Monthly', '2024-01-22', 'None', 'None', 'None', 'Competent', 'Compliant', 'Well-managed with medication')
  `);
  console.log('Mental health evaluations seeded');

  // Seed 16 Recidivism Predictions
  await pool.query(`INSERT INTO recidivism_predictions (defendant_id, prediction_score, risk_level, prior_offenses_count, age_at_first_offense, offense_type_pattern, time_since_last_offense, social_factors, economic_factors, behavioral_indicators, protective_factors, ai_prediction, model_version, notes) VALUES
    (1, 72, 'HIGH', 3, 28, 'Violent/substance-related', '2 months', 'Limited support network', 'Low income, unstable housing', 'Substance use, anger issues', 'Employment', 'High likelihood of reoffense within 1 year', 'v2.1', 'Pattern of escalating violence'),
    (2, 8, 'LOW', 0, 32, 'First offense', 'N/A', 'Strong family and social network', 'Stable professional career', 'None identified', 'Career, family, education', 'Very low recidivism risk', 'v2.1', 'Excellent prognosis'),
    (3, 45, 'MEDIUM', 1, 29, 'Property crime', '5 years', 'Family support', 'Stable employment', 'Prior theft history', 'Employment, family, homeownership', 'Moderate risk, declining over time', 'v2.1', 'Time since last offense favorable'),
    (4, 15, 'LOW', 0, 34, 'First offense - DUI', 'N/A', 'Strong support', 'Professional career', 'Isolated alcohol incident', 'Career, family, community', 'Low recidivism risk', 'v2.1', 'Situational offense'),
    (5, 92, 'VERY HIGH', 5, 24, 'Violent/drug/property', '3 months', 'Gang associations', 'Unemployed', 'Violence, substance abuse, prior FTAs', 'None identified', 'Very high recidivism risk, escalating pattern', 'v2.1', 'Highest risk in caseload'),
    (6, 55, 'MEDIUM', 1, 27, 'Drug offenses', '1.5 years', 'Mother supportive', 'Low income', 'Active treatment seeking', 'Treatment compliance, family', 'Moderate risk, treatment reduces significantly', 'v2.1', 'Treatment is key factor'),
    (7, 68, 'HIGH', 2, 32, 'Violence/DV pattern', '1 year', 'Limited support', 'Self-employed, variable', 'DV pattern, anger issues', 'Employment, treatment engagement', 'Elevated risk for DV recurrence', 'v2.1', 'DV-specific risk factors'),
    (8, 10, 'LOW', 1, 35, 'Minor property', '2 years', 'Strong family', 'Stable employment', 'None current', 'Family, employment, church', 'Very low risk', 'v2.1', 'Isolated incident, resolved'),
    (9, 35, 'MEDIUM', 0, 48, 'White collar', 'N/A', 'Professional network', 'High income (was)', 'Financial crime motivation', 'Family, community standing', 'Low-moderate for violent crime, higher for financial', 'v2.1', 'Financial crime specialist risk'),
    (10, 75, 'HIGH', 3, 32, 'DUI pattern - escalating', '2 months', 'Moderate support', 'Stable employment', 'Alcohol dependency, escalating BAC', 'Employment', 'High risk for repeat DUI', 'v2.1', 'Alcohol-specific recidivism'),
    (11, 5, 'LOW', 0, 49, 'First offense - minor', 'N/A', 'Exceptional community ties', 'Stable career and finances', 'None', 'Everything - career, family, community, finances', 'Negligible recidivism risk', 'v2.1', 'Model citizen profile'),
    (12, 40, 'MEDIUM', 0, 45, 'White collar - fraud', 'N/A', 'Professional background', 'Was high income', 'Financial crime pattern', 'Family, community involvement', 'Moderate risk for financial crimes', 'v2.1', 'Specialized financial crime risk'),
    (13, 95, 'VERY HIGH', 4, 18, 'Organized crime/violence/drugs', '6 months', 'Criminal network', 'Criminal enterprise income', 'Gang membership, violence, intimidation', 'None identified', 'Extreme recidivism risk', 'v2.1', 'Organized crime embedded'),
    (14, 12, 'LOW', 0, 28, 'First offense - minor violence', 'N/A', 'Strong family network', 'Stable professional career', 'Isolated incident', 'Career, family, community', 'Low recidivism risk', 'v2.1', 'Situational, not patterned'),
    (15, 88, 'VERY HIGH', 3, 25, 'Drug trafficking/FTA', '4 months', 'Criminal associates', 'No legitimate income', 'Drug trade involvement, FTAs', 'None identified', 'Very high risk - trafficking network', 'v2.1', 'Entrenched in drug trade'),
    (16, 35, 'MEDIUM', 0, 20, 'First felony - theft', 'N/A', 'Family support', 'Student, limited income', 'Peer influence suspected', 'Youth, family support, education', 'Moderate - youth is both risk and protective', 'v2.1', 'Age appropriate intervention critical')
  `);
  console.log('Recidivism predictions seeded');

  // Seed 16 Sureties
  await pool.query(`INSERT INTO sureties (defendant_id, surety_name, relationship, phone, email, address, occupation, annual_income, assets_value, collateral_offered, collateral_type, verified, verification_date, reliability_score, notes) VALUES
    (1, 'Carlos Rodriguez', 'Brother', '310-555-4001', 'crodriguez@email.com', '234 Oak St, Los Angeles, CA', 'Restaurant Manager', 45000.00, 60000.00, '2019 Honda Accord title', 'Vehicle', true, '2024-02-01', 55, 'Willing but limited resources'),
    (2, 'William Chen', 'Father', '415-555-4002', 'wchen@email.com', '456 Pine Ave, San Francisco, CA', 'Retired Engineer', 80000.00, 500000.00, 'N/A - cash bond', 'Cash', true, '2024-01-15', 95, 'Highly reliable, strong finances'),
    (3, 'Maria Williams', 'Spouse', '713-555-4003', 'mwilliams@email.com', '789 Elm Dr, Houston, TX', 'Office Manager', 42000.00, 180000.00, 'House lien', 'Property', true, '2024-02-10', 80, 'Homeowner, stable income'),
    (4, 'Rosa Martinez', 'Mother', '602-555-4004', 'rmartinez@email.com', '321 Maple Ln, Phoenix, AZ', 'Retired Nurse', 55000.00, 300000.00, 'N/A - cash bond', 'Cash', true, '2024-01-20', 90, 'Strong financial position'),
    (5, 'Angela Thompson', 'Mother', '312-555-4005', 'athompson@email.com', '654 Cedar Rd, Chicago, IL', 'Social Worker', 52000.00, 150000.00, 'Property deed + jewelry', 'Property/Personal', true, '2024-02-05', 50, 'Motivated but defendant high risk'),
    (6, 'Carmen Garcia', 'Mother', '305-555-4006', 'cgarcia@email.com', '987 Birch St, Miami, FL', 'Retail Manager', 38000.00, 40000.00, '2020 Toyota Camry title', 'Vehicle', true, '2024-02-01', 65, 'Supportive of treatment'),
    (7, 'Patricia Brown', 'Sister', '212-555-4007', 'pbrown@email.com', '147 Walnut Ave, New York, NY', 'Attorney', 120000.00, 400000.00, 'Investment account', 'Financial', true, '2024-02-05', 85, 'Professional, reliable surety'),
    (8, 'Maria Garcia', 'Spouse', '214-555-4008', 'mgarcia@email.com', '258 Spruce Ct, Dallas, TX', 'Teacher', 48000.00, 80000.00, 'N/A - case resolved', 'N/A', true, '2024-01-10', 90, 'Bond completed successfully'),
    (9, 'Katherine Davis', 'Spouse', '206-555-4009', 'kdavis@email.com', '369 Ash Blvd, Seattle, WA', 'Marketing Executive', 95000.00, 800000.00, 'Investment portfolio', 'Financial', true, '2024-02-01', 85, 'Significant resources available'),
    (10, 'Ashley Moore', 'Girlfriend', '303-555-4010', 'amoore@email.com', '741 Hickory Way, Denver, CO', 'Dental Hygienist', 55000.00, 70000.00, 'Savings account + vehicle', 'Financial/Vehicle', true, '2024-02-15', 60, 'Willing but relationship is new'),
    (11, 'Margaret Anderson', 'Spouse', '503-555-4011', 'manderson@email.com', '852 Redwood Pl, Portland, OR', 'School Counselor', 58000.00, 400000.00, 'N/A - cash bond likely', 'Cash', true, '2024-01-25', 95, 'Excellent surety candidate'),
    (12, 'David Taylor', 'Spouse', '404-555-4012', 'dtaylor@email.com', '963 Cypress Ln, Atlanta, GA', 'Engineer', 85000.00, 300000.00, 'Property deed', 'Property', true, '2024-02-01', 80, 'Stable and cooperative'),
    (13, 'No surety available', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 0.00, 0.00, 'N/A', 'N/A', false, NULL, 0, 'No viable surety identified'),
    (14, 'Robert Harris', 'Father', '615-555-4014', 'rharris@email.com', '267 Willow St, Nashville, TN', 'Music Producer', 90000.00, 350000.00, 'N/A - cash bond', 'Cash', true, '2024-02-01', 92, 'Very reliable, involved parent'),
    (15, 'Elena Clark', 'Sister', '702-555-4015', 'eclark@email.com', '378 Poplar Rd, Las Vegas, NV', 'Casino Dealer', 45000.00, 60000.00, 'Property deed + vehicles', 'Property/Vehicle', true, '2024-02-10', 40, 'Limited resources for bond amount'),
    (16, 'Sandra Lewis', 'Mother', '619-555-4016', 'slewis@email.com', '489 Juniper Ave, San Diego, CA', 'Real Estate Agent', 75000.00, 250000.00, 'Vehicle title', 'Vehicle', true, '2024-02-10', 85, 'Supportive parent, good resources')
  `);
  console.log('Sureties seeded');

  // Seed 16 Notifications
  await pool.query(`INSERT INTO notifications (title, message, type, priority, recipient_id, related_entity_type, related_entity_id, is_read, action_required, action_url, due_date, notes) VALUES
    ('Court Date Reminder', 'James Rodriguez has a court hearing on April 15, 2024', 'court_reminder', 'HIGH', 1, 'defendant', 1, false, true, '/defendants/1', '2024-04-15', 'Preliminary hearing - ensure appearance'),
    ('Bond Forfeiture Warning', 'Bond #5 for Michael Thompson approaching forfeiture deadline', 'forfeiture_warning', 'CRITICAL', 1, 'bail_bond', 5, false, true, '/bail-bonds/5', '2024-06-01', 'Defendant showing flight risk indicators'),
    ('Compliance Report Due', 'Q1 Trust Account Audit due April 15', 'compliance_due', 'HIGH', 1, 'compliance', 3, false, true, '/compliance/3', '2024-04-15', 'Quarterly requirement'),
    ('Treatment Update', 'Sarah Johnson completed 5 months of sobriety', 'treatment_update', 'MEDIUM', 1, 'defendant', 6, false, false, '/defendants/6', NULL, 'Positive progress in treatment'),
    ('Risk Level Change', 'Amanda Wilson risk level increased to HIGH after failed drug test', 'risk_change', 'HIGH', 1, 'defendant', 10, false, true, '/defendants/10', NULL, 'DUI 3rd offense defendant'),
    ('New Assessment Required', 'Christopher Lee requires updated risk assessment for RICO case', 'assessment_needed', 'CRITICAL', 1, 'defendant', 13, false, true, '/risk-assessments', '2024-03-30', 'Organized crime case - priority'),
    ('Payment Received', 'Premium payment received for Bond #3 - Robert Williams', 'payment', 'LOW', 1, 'bail_bond', 3, true, false, '/bail-bonds/3', NULL, 'Payment on schedule'),
    ('Court Date Change', 'Kevin Davis hearing rescheduled to July 10, 2024', 'court_update', 'MEDIUM', 1, 'court_case', 9, false, true, '/court-cases/9', '2024-07-10', 'Securities fraud trial postponed'),
    ('License Renewal', 'Agent license renewal due in 90 days', 'license_reminder', 'MEDIUM', 2, 'compliance', 2, false, true, '/compliance/2', '2024-06-30', 'Start renewal process'),
    ('GPS Alert', 'GPS monitoring alert for Daniel Clark - left designated area', 'gps_alert', 'CRITICAL', 1, 'defendant', 15, false, true, '/defendants/15', NULL, 'Possible flight attempt'),
    ('Check-In Missed', 'James Rodriguez missed weekly check-in', 'checkin_missed', 'HIGH', 1, 'defendant', 1, false, true, '/defendants/1', NULL, 'Follow up immediately'),
    ('Surety Review', 'Surety verification needed for Emily Lewis bond', 'surety_review', 'MEDIUM', 2, 'surety', 16, false, true, '/surety/16', '2024-04-10', 'Mother as surety, verify assets'),
    ('Compliance Violation', 'Forfeiture reporting non-compliance flagged in Illinois', 'compliance_violation', 'CRITICAL', 1, 'compliance', 5, false, true, '/compliance/5', '2024-03-15', 'Immediate corrective action needed'),
    ('Bond Exoneration', 'Bond #8 for Lisa Garcia successfully exonerated', 'bond_update', 'LOW', 1, 'bail_bond', 8, true, false, '/bail-bonds/8', NULL, 'Case resolved favorably'),
    ('Mental Health Follow-Up', 'David Brown due for mental health reassessment', 'mh_followup', 'MEDIUM', 2, 'defendant', 7, false, true, '/mental-health', '2024-04-05', 'DV-related anger management review'),
    ('Financial Review Alert', 'Kevin Davis assets may be frozen - update financial analysis', 'financial_alert', 'HIGH', 1, 'defendant', 9, false, true, '/financial/9', NULL, 'Securities fraud asset freeze pending')
  `);
  console.log('Notifications seeded');

  console.log('\n✅ All seed data inserted successfully!');
  await pool.end();
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
