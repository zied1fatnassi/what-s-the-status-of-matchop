-- =====================================================
-- MATCHOP SEED DATA (FIXED VERSION)
-- This bypasses the auth.users foreign key constraint
-- by temporarily disabling the constraint
-- =====================================================

-- Disable foreign key checks temporarily
SET session_replication_role = 'replica';

-- Clean existing data
TRUNCATE job_offers CASCADE;
TRUNCATE companies CASCADE;
TRUNCATE profiles CASCADE;

-- Insert company profiles (without auth.users requirement in replica mode)
INSERT INTO profiles (id, type, name, email, created_at) VALUES
('11111111-1111-1111-1111-000000000001', 'company', 'InstaDeep', 'contact@instadeep.com', NOW()),
('11111111-1111-1111-1111-000000000002', 'company', 'Kaoun Technologies', 'contact@kaoun.com', NOW()),
('11111111-1111-1111-1111-000000000003', 'company', 'Kumulus Water', 'contact@kumulus-water.com', NOW()),
('11111111-1111-1111-1111-000000000004', 'company', 'Datavizion AI', 'contact@datavizion.ai', NOW()),
('11111111-1111-1111-1111-000000000005', 'company', 'LaFlamme', 'contact@laflamme.tn', NOW()),
('11111111-1111-1111-1111-000000000006', 'company', 'SMOFT ERP', 'contact@smoft.com', NOW()),
('11111111-1111-1111-1111-000000000007', 'company', 'Cynoia', 'contact@cynoia.com', NOW()),
('11111111-1111-1111-1111-000000000008', 'company', 'Kamioun', 'contact@kamioun.com', NOW()),
('11111111-1111-1111-1111-000000000009', 'company', 'Myda', 'contact@myda.tn', NOW()),
('11111111-1111-1111-1111-000000000010', 'company', 'Siladoc', 'contact@siladoc.com', NOW()),
('11111111-1111-1111-1111-000000000011', 'company', 'Next Consult', 'contact@nextconsult.tn', NOW()),
('11111111-1111-1111-1111-000000000012', 'company', 'MedTech Tunisia', 'contact@medtechtunisia.com', NOW()),
('11111111-1111-1111-1111-000000000013', 'company', 'Smart Tunisie', 'contact@smarttunisie.com', NOW()),
('11111111-1111-1111-1111-000000000014', 'company', 'Tunisie Logistique', 'contact@tunisielogistique.com', NOW()),
('11111111-1111-1111-1111-000000000015', 'company', 'EcoTech Tunisia', 'contact@ecotechtunisia.com', NOW()),
('11111111-1111-1111-1111-000000000016', 'company', 'DevOps Tunisia', 'contact@devopstunisia.com', NOW()),
('11111111-1111-1111-1111-000000000017', 'company', 'AgriTech Tunisia', 'contact@agritechtunisia.com', NOW()),
('11111111-1111-1111-1111-000000000018', 'company', 'EdTech Tunisia', 'contact@edtechtunisia.com', NOW()),
('11111111-1111-1111-1111-000000000019', 'company', 'Energy Tunisia', 'contact@energytunisia.com', NOW()),
('11111111-1111-1111-1111-000000000020', 'company', 'Finance Tunisia', 'contact@financetunisia.com', NOW()),
('11111111-1111-1111-1111-000000000021', 'company', 'TELNET HOLDING', 'contact@telnet.com', NOW()),
('11111111-1111-1111-1111-000000000022', 'company', 'Groupe Poulina', 'contact@poulina.com', NOW()),
('11111111-1111-1111-1111-000000000023', 'company', 'Groupe SFBT', 'contact@sfbtnet.com', NOW()),
('11111111-1111-1111-1111-000000000024', 'company', 'TUNISAIR', 'contact@tunisair.com', NOW()),
('11111111-1111-1111-1111-000000000025', 'company', 'STB Bank', 'contact@stb.com', NOW()),
('11111111-1111-1111-1111-000000000026', 'company', 'Groupe One Tech', 'contact@onetech.com', NOW()),
('11111111-1111-1111-1111-000000000027', 'company', 'Groupe Délice', 'contact@delice.com', NOW()),
('11111111-1111-1111-1111-000000000028', 'company', 'El Mouradi Hotels', 'contact@elmouradi.com', NOW()),
('11111111-1111-1111-1111-000000000029', 'company', 'Groupe Chimique Tunisien', 'contact@gct.com.tn', NOW()),
('11111111-1111-1111-1111-000000000030', 'company', 'TUNIS RE', 'contact@tunisre.com', NOW());

-- Insert companies
INSERT INTO companies (id, website, sector, size, description, location, contact_email) VALUES
('11111111-1111-1111-1111-000000000001', 'https://instadeep.com', 'AI', '500+', 'AI solutions for global enterprises', 'Tunis', 'contact@instadeep.com'),
('11111111-1111-1111-1111-000000000002', 'https://kaoun.com', 'Fintech', '100+', 'Mobile banking & digital payments', 'Tunis', 'contact@kaoun.com'),
('11111111-1111-1111-1111-000000000003', 'https://kumulus-water.com', 'Cleantech', '50+', 'Water-from-air solutions', 'Sousse', 'contact@kumulus-water.com'),
('11111111-1111-1111-1111-000000000004', 'https://datavizion.ai', 'Big Data', '50+', 'Data analytics platform', 'Tunis', 'contact@datavizion.ai'),
('11111111-1111-1111-1111-000000000005', 'https://laflamme.tn', 'HealthTech', '20+', 'Mental health platform', 'Tunis', 'contact@laflamme.tn'),
('11111111-1111-1111-1111-000000000006', 'https://smoft.com', 'ERP', '100+', 'ERP software solutions', 'Tunis', 'contact@smoft.com'),
('11111111-1111-1111-1111-000000000007', 'https://cynoia.com', 'Productivity', '50+', 'Productivity apps', 'Tunis', 'contact@cynoia.com'),
('11111111-1111-1111-1111-000000000008', 'https://kamioun.com', 'FMCG', '100+', 'B2B retail marketplace', 'Tunis', 'contact@kamioun.com'),
('11111111-1111-1111-1111-000000000009', 'https://myda.tn', 'AI', '30+', 'AI for food artisans', 'Tunis', 'contact@myda.tn'),
('11111111-1111-1111-1111-000000000010', 'https://siladoc.com', 'HealthTech', '50+', 'Teleconsultation platform', 'Tunis', 'contact@siladoc.com'),
('11111111-1111-1111-1111-000000000011', 'https://nextconsult.tn', 'Web Development', '50+', 'Web & mobile development', 'Tunis', 'contact@nextconsult.tn'),
('11111111-1111-1111-1111-000000000012', 'https://medtechtunisia.com', 'HealthTech', '20+', 'Medical technology', 'Tunis', 'contact@medtechtunisia.com'),
('11111111-1111-1111-1111-000000000013', 'https://smarttunisie.com', 'Smart Cities', '50+', 'Smart city solutions', 'Tunis', 'contact@smarttunisie.com'),
('11111111-1111-1111-1111-000000000014', 'https://tunisielogistique.com', 'Logistics', '100+', 'Logistics & transport', 'Tunis', 'contact@tunisielogistique.com'),
('11111111-1111-1111-1111-000000000015', 'https://ecotechtunisia.com', 'Cleantech', '30+', 'Environmental technology', 'Tunis', 'contact@ecotechtunisia.com'),
('11111111-1111-1111-1111-000000000016', 'https://devopstunisia.com', 'IT', '50+', 'DevOps & cloud services', 'Tunis', 'contact@devopstunisia.com'),
('11111111-1111-1111-1111-000000000017', 'https://agritechtunisia.com', 'Agriculture', '30+', 'AgriTech solutions', 'Tunis', 'contact@agritechtunisia.com'),
('11111111-1111-1111-1111-000000000018', 'https://edtechtunisia.com', 'EdTech', '20+', 'Education platform', 'Tunis', 'contact@edtechtunisia.com'),
('11111111-1111-1111-1111-000000000019', 'https://energytunisia.com', 'Energy', '50+', 'Energy solutions', 'Tunis', 'contact@energytunisia.com'),
('11111111-1111-1111-1111-000000000020', 'https://financetunisia.com', 'Finance', '100+', 'Financial services', 'Tunis', 'contact@financetunisia.com'),
('11111111-1111-1111-1111-000000000021', 'https://www.telnet.com', 'IT', '500+', 'IT services & offshore', 'Tunis', 'contact@telnet.com'),
('11111111-1111-1111-1111-000000000022', 'https://www.poulina.com', 'Agro-food', '1000+', 'Food processing conglomerate', 'Tunis', 'contact@poulina.com'),
('11111111-1111-1111-1111-000000000023', 'https://www.sfbtnet.com', 'Agro-food', '1000+', 'Food & beverage processing', 'Tunis', 'contact@sfbtnet.com'),
('11111111-1111-1111-1111-000000000024', 'https://www.tunisair.com', 'Airline', '1000+', 'National airline', 'Tunis', 'contact@tunisair.com'),
('11111111-1111-1111-1111-000000000025', 'https://www.stb.com', 'Banking', '500+', 'Banking services', 'Tunis', 'contact@stb.com'),
('11111111-1111-1111-1111-000000000026', 'https://www.onetech.com', 'Electronics', '500+', 'Electronics manufacturing', 'Tunis', 'contact@onetech.com'),
('11111111-1111-1111-1111-000000000027', 'https://www.delice.com', 'Agro-food', '500+', 'Dairy products', 'Tunis', 'contact@delice.com'),
('11111111-1111-1111-1111-000000000028', 'https://www.elmouradi.com', 'Hotels', '500+', 'Hotel chain', 'Tunis', 'contact@elmouradi.com'),
('11111111-1111-1111-1111-000000000029', 'https://www.gct.com.tn', 'Chemical', '1000+', 'Industrial chemical production', 'Tunis', 'contact@gct.com.tn'),
('11111111-1111-1111-1111-000000000030', 'https://www.tunisre.com', 'Insurance', '500+', 'Reinsurance company', 'Tunis', 'contact@tunisre.com');

-- Insert job offers (30 offers)
INSERT INTO job_offers (company_id, title, description, location, salary_min, salary_max, skills, requirements, is_active) VALUES
('11111111-1111-1111-1111-000000000001', 'Machine Learning Engineer Intern', 'Work on cutting-edge AI projects with our research team.', 'Tunis', 2000, 3000, ARRAY['Python', 'TensorFlow', 'PyTorch', 'ML'], ARRAY['CS/ML background', 'Python proficiency'], true),
('11111111-1111-1111-1111-000000000002', 'Mobile Developer Intern', 'Develop features for mobile fintech applications.', 'Tunis', 1800, 2800, ARRAY['React Native', 'JavaScript', 'Mobile Dev'], ARRAY['Mobile development experience'], true),
('11111111-1111-1111-1111-000000000003', 'IoT Engineer Intern', 'Work on atmospheric water generation systems.', 'Sousse', 1700, 2500, ARRAY['IoT', 'Embedded C', 'Arduino'], ARRAY['Electronics background'], true),
('11111111-1111-1111-1111-000000000004', 'Data Scientist Intern', 'Analyze large datasets and build predictive models.', 'Tunis', 1900, 2800, ARRAY['Python', 'SQL', 'Spark', 'ML'], ARRAY['Statistics background'], true),
('11111111-1111-1111-1111-000000000005', 'Full Stack Developer Intern', 'Build mental health platform features.', 'Tunis', 1500, 2300, ARRAY['React', 'Node.js', 'MongoDB'], ARRAY['Full stack experience'], true),
('11111111-1111-1111-1111-000000000006', 'Software Developer Intern', 'Develop ERP modules for businesses.', 'Tunis', 1600, 2400, ARRAY['Java', 'SQL', 'ERP Systems'], ARRAY['Java proficiency'], true),
('11111111-1111-1111-1111-000000000007', 'Frontend Developer Intern', 'Build beautiful UIs for productivity apps.', 'Tunis', 1500, 2300, ARRAY['React', 'TypeScript', 'CSS'], ARRAY['Frontend experience'], true),
('11111111-1111-1111-1111-000000000008', 'DevOps Engineer Intern', 'Manage infrastructure for B2B marketplace.', 'Tunis', 1800, 2700, ARRAY['Docker', 'Kubernetes', 'AWS'], ARRAY['Linux knowledge'], true),
('11111111-1111-1111-1111-000000000009', 'AI Research Intern', 'Develop AI solutions for food industry.', 'Tunis', 1500, 2500, ARRAY['Python', 'Deep Learning', 'NLP'], ARRAY['AI/ML coursework'], true),
('11111111-1111-1111-1111-000000000010', 'UX Designer Intern', 'Design healthcare interfaces.', 'Tunis', 1600, 2400, ARRAY['Figma', 'UX Research', 'Prototyping'], ARRAY['Design portfolio'], true),
('11111111-1111-1111-1111-000000000011', 'Full Stack Developer Intern', 'Build web and mobile applications.', 'Tunis', 1700, 2600, ARRAY['React', 'Node.js', 'PostgreSQL'], ARRAY['Portfolio required'], true),
('11111111-1111-1111-1111-000000000012', 'Mobile Developer Intern', 'Develop medical apps.', 'Tunis', 1500, 2200, ARRAY['Flutter', 'Dart', 'Mobile Dev'], ARRAY['Mobile experience'], true),
('11111111-1111-1111-1111-000000000013', 'IoT Developer Intern', 'Build smart city solutions.', 'Tunis', 1600, 2400, ARRAY['IoT', 'Python', 'Data Analytics'], ARRAY['IoT experience'], true),
('11111111-1111-1111-1111-000000000014', 'Operations Analyst Intern', 'Optimize logistics operations.', 'Tunis', 1500, 2200, ARRAY['Excel', 'SQL', 'Data Analysis'], ARRAY['Analytical skills'], true),
('11111111-1111-1111-1111-000000000015', 'Hardware Engineer Intern', 'Design environmental monitoring systems.', 'Tunis', 1600, 2400, ARRAY['PCB Design', 'Embedded Systems'], ARRAY['EE degree'], true),
('11111111-1111-1111-1111-000000000016', 'Cloud Engineer Intern', 'Build and maintain cloud infrastructure.', 'Tunis', 1800, 2700, ARRAY['AWS', 'Azure', 'Terraform'], ARRAY['Cloud certifications'], true),
('11111111-1111-1111-1111-000000000017', 'AgriTech Developer Intern', 'Build technology for modern farming.', 'Tunis', 1400, 2100, ARRAY['Python', 'IoT', 'Mobile Dev'], ARRAY['Tech skills'], true),
('11111111-1111-1111-1111-000000000018', 'Content Developer Intern', 'Create educational content.', 'Tunis', 1400, 2000, ARRAY['Content Creation', 'LMS'], ARRAY['Education background'], true),
('11111111-1111-1111-1111-000000000019', 'Energy Analyst Intern', 'Analyze energy data.', 'Tunis', 1500, 2200, ARRAY['Data Analysis', 'Excel'], ARRAY['Engineering background'], true),
('11111111-1111-1111-1111-000000000020', 'Backend Developer Intern', 'Build scalable financial systems.', 'Tunis', 1800, 2600, ARRAY['Node.js', 'PostgreSQL', 'REST APIs'], ARRAY['Backend experience'], true),
('11111111-1111-1111-1111-000000000021', 'Software Engineer Intern', 'Join TELNET offshore team.', 'Tunis', 2000, 3000, ARRAY['Java', 'Spring Boot', 'Microservices'], ARRAY['Strong programming skills'], true),
('11111111-1111-1111-1111-000000000022', 'Production Engineer Intern', 'Support food production at Poulina.', 'Tunis', 1600, 2400, ARRAY['Food Engineering', 'Production'], ARRAY['Engineering degree'], true),
('11111111-1111-1111-1111-000000000023', 'Quality Control Intern', 'Ensure food safety at SFBT.', 'Tunis', 1500, 2200, ARRAY['Food Science', 'Quality Control'], ARRAY['Food science background'], true),
('11111111-1111-1111-1111-000000000024', 'Airline Operations Intern', 'Support flight operations at TunisAir.', 'Tunis', 1700, 2500, ARRAY['Aviation', 'Operations'], ARRAY['Aviation background'], true),
('11111111-1111-1111-1111-000000000025', 'Banking Operations Intern', 'Learn banking operations at STB.', 'Tunis', 1600, 2300, ARRAY['Banking', 'Finance'], ARRAY['Finance degree'], true),
('11111111-1111-1111-1111-000000000026', 'Electronics Technician Intern', 'Support electronics manufacturing.', 'Tunis', 1500, 2200, ARRAY['Electronics', 'Testing'], ARRAY['Electronics background'], true),
('11111111-1111-1111-1111-000000000027', 'Marketing Intern', 'Support dairy marketing at Délice.', 'Tunis', 1400, 2000, ARRAY['Marketing', 'Consumer Goods'], ARRAY['Marketing student'], true),
('11111111-1111-1111-1111-000000000028', 'Hotel Management Intern', 'Learn hotel operations.', 'Tunis', 1400, 2000, ARRAY['Hospitality', 'Customer Service'], ARRAY['Hospitality degree'], true),
('11111111-1111-1111-1111-000000000029', 'Chemical Engineer Intern', 'Support industrial processes at GCT.', 'Tunis', 1700, 2500, ARRAY['Chemical Engineering'], ARRAY['ChemE degree'], true),
('11111111-1111-1111-1111-000000000030', 'Underwriting Intern', 'Learn reinsurance at Tunisia RE.', 'Tunis', 1600, 2300, ARRAY['Risk Analysis', 'Finance'], ARRAY['Finance background'], true);

-- Re-enable foreign key checks
SET session_replication_role = 'origin';

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('avatars', 'avatars', true),
    ('cvs', 'cvs', false),
    ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

SELECT '✅ Seed complete! 30 companies, 30 job offers, 3 storage buckets!' as status;
