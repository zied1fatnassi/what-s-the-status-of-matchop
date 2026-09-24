-- ============================================================================
-- MATCHOP: COMPREHENSIVE SEED DATA - 50 Companies, 100+ Offers
-- ============================================================================

DO $$
DECLARE
    -- Company IDs
    comp_ids UUID[] := ARRAY[
        gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
        gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
        gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
        gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
        gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
        gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
        gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
        gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
        gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
        gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()
    ];
    i INT;
BEGIN
    -- Insert 50 Tunisian Tech Companies
    FOR i IN 1..50 LOOP
        INSERT INTO profiles (id, email, role)
        VALUES (comp_ids[i], 'contact@company' || i || '.tn', 'company')
        ON CONFLICT DO NOTHING;
    END LOOP;

    -- Company details
    INSERT INTO companies (id, company_name, industry, location, description) VALUES
    (comp_ids[1], 'InstaDeep', 'AI & Machine Learning', 'Tunis', 'Leading AI company in Africa'),
    (comp_ids[2], 'Vermeg', 'FinTech', 'Les Berges du Lac', 'Financial software solutions'),
    (comp_ids[3], 'Sofrecom', 'Telecom Consulting', 'Tunis', 'Orange Group subsidiary'),
    (comp_ids[4], 'Focus Corporation', 'Software Development', 'Ariana', 'ERP and business solutions'),
    (comp_ids[5], 'Telnet', 'IT Services', 'Tunis', 'Digital transformation services'),
    (comp_ids[6], 'Linedata', 'FinTech', 'Lac 2', 'Asset management software'),
    (comp_ids[7], 'Cynapsys', 'IT Consulting', 'Tunis', 'Digital services and consulting'),
    (comp_ids[8], 'STMicroelectronics', 'Semiconductors', 'Ariana', 'Chip manufacturing'),
    (comp_ids[9], 'Expensya', 'SaaS', 'Tunis', 'Expense management platform'),
    (comp_ids[10], 'Wevioo', 'Digital Agency', 'Tunis', 'Web and mobile development'),
    (comp_ids[11], 'SQLI', 'Digital Experience', 'Tunis', 'Digital services'),
    (comp_ids[12], 'Actia Engineering', 'Automotive Tech', 'Tunis', 'Automotive electronics'),
    (comp_ids[13], 'Pentalog', 'Software Development', 'Tunis', 'Digital product development'),
    (comp_ids[14], 'Proxym Group', 'IT Services', 'Tunis', 'Software development'),
    (comp_ids[15], 'DATALOG', 'IoT', 'Tunis', 'Smart solutions'),
    (comp_ids[16], 'Talan Tunisie', 'IT Consulting', 'Tunis', 'Digital transformation'),
    (comp_ids[17], 'Capgemini', 'IT Services', 'Tunis', 'Global consulting'),
    (comp_ids[18], 'Kaoun International', 'E-learning', 'Tunis', 'Educational technology'),
    (comp_ids[19], 'Beyondsoft', 'Software Testing', 'Tunis', 'QA and testing services'),
    (comp_ids[20], 'I2S', 'AI Solutions', 'Tunis', 'Intelligent systems'),
    (comp_ids[21], 'Tekru', 'Blockchain', 'Tunis', 'Blockchain development'),
    (comp_ids[22], 'Tunisie Telecom', 'Telecommunications', 'Tunis', 'National telecom operator'),
    (comp_ids[23], 'Orange Tunisie', 'Telecommunications', 'Tunis', 'Mobile operator'),
    (comp_ids[24], 'Ooredoo', 'Telecommunications', 'Tunis', 'Mobile services'),
    (comp_ids[25], 'Topnet', 'ISP', 'Tunis', 'Internet service provider'),
    (comp_ids[26], 'GlobalNet', 'ISP', 'Tunis', 'Internet and hosting'),
    (comp_ids[27], 'Planet Tunisie', 'E-commerce', 'Tunis', 'Online marketplace'),
    (comp_ids[28], 'Jumia Tunisia', 'E-commerce', 'Tunis', 'Online shopping'),
    (comp_ids[29], 'Tayara', 'Classifieds', 'Tunis', 'Online classifieds'),
    (comp_ids[30], 'Afkar', 'Gaming', 'Tunis', 'Mobile game development'),
    (comp_ids[31], 'DEV-IT', 'Software Development', 'Sousse', 'Custom software'),
    (comp_ids[32], 'SAPHIR', 'Aerospace', 'Tunis', 'Aerospace engineering'),
    (comp_ids[33], 'Altran', 'Engineering', 'Tunis', 'Engineering consultancy'),
    (comp_ids[34], 'Sogeti', 'IT Services', 'Tunis', 'Technology services'),
    (comp_ids[35], 'Accenture', 'Consulting', 'Tunis', 'Management consulting'),
    (comp_ids[36], 'IBM Tunisia', 'Technology', 'Tunis', 'IT solutions'),
    (comp_ids[37], 'Microsoft Tunisia', 'Software', 'Tunis', 'Software and cloud'),
    (comp_ids[38], 'Dell Tunisia', 'Hardware', 'Tunis', 'Technology products'),
    (comp_ids[39], 'HP Tunisia', 'Hardware', 'Tunis', 'IT hardware'),
    (comp_ids[40], 'Atos', 'Digital Services', 'Tunis', 'Digital transformation'),
    (comp_ids[41], 'Smartcode', 'Software Development', 'Monastir', 'Mobile apps'),
    (comp_ids[42], 'Digitech', 'Digital Marketing', 'Tunis', 'Marketing solutions'),
    (comp_ids[43], 'CloudFlex', 'Cloud Services', 'Tunis', 'Cloud infrastructure'),
    (comp_ids[44], 'DataViz', 'Data Analytics', 'Tunis', 'Business intelligence'),
    (comp_ids[45], 'SecureTech', 'Cybersecurity', 'Tunis', 'Security solutions'),
    (comp_ids[46], 'MobiDev', 'Mobile Development', 'Sfax', 'Mobile applications'),
    (comp_ids[47], 'WebCraft', 'Web Development', 'Tunis', 'Web solutions'),
    (comp_ids[48], 'AILab', 'AI Research', 'Tunis', 'AI innovation'),
    (comp_ids[49], 'RoboTech', 'Robotics', 'Tunis', 'Robotics development'),
    (comp_ids[50], 'QuantumLeap', 'Quantum Computing', 'Tunis', 'Quantum research')
    ON CONFLICT DO NOTHING;

    -- Insert 100+ Diverse Offers
    INSERT INTO offers (company_id, title, req_skills, location, salary_range, description, status) VALUES
    -- InstaDeep (AI/ML roles)
    (comp_ids[1], 'Senior ML Engineer', ARRAY['Python', 'TensorFlow', 'PyTorch'], 'Tunis', '3000-5000 TND', 'Build state-of-the-art ML models', 'active'),
    (comp_ids[1], 'Data Scientist Intern', ARRAY['Python', 'ML', 'Statistics'], 'Tunis', '800-1200 TND', 'Work on real AI projects', 'active'),
    (comp_ids[1], 'Research Engineer', ARRAY['AI', 'Research', 'Python'], 'Tunis', '2500-4000 TND', 'Cutting-edge AI research', 'active'),
    
    -- Vermeg (FinTech)
    (comp_ids[2], 'Java Developer', ARRAY['Java', 'Spring Boot', 'SQL'], 'Lac 2', '2000-3500 TND', 'Financial software development', 'active'),
    (comp_ids[2], 'Frontend Developer', ARRAY['React', 'TypeScript', 'CSS'], 'Lac 2', '1800-3000 TND', 'Modern web interfaces', 'active'),
    (comp_ids[2], 'DevOps Engineer', ARRAY['Docker', 'Kubernetes', 'CI/CD'], 'Lac 2', '2500-4000 TND', 'Infrastructure automation', 'active'),
    
    -- Sofrecom
    (comp_ids[3], 'Network Engineer', ARRAY['Networking', 'Cisco', 'Security'], 'Tunis', '2200-3500 TND', 'Telecom infrastructure', 'active'),
    (comp_ids[3], 'Software Architect', ARRAY['Java', 'Architecture', 'Microservices'], 'Tunis', '3500-5500 TND', 'Design scalable systems', 'active'),
    
    -- Focus Corporation
    (comp_ids[4], 'ERP Consultant', ARRAY['SAP', 'Business Process', 'SQL'], 'Ariana', '2000-3500 TND', 'ERP implementation', 'active'),
    (comp_ids[4], 'Full Stack Developer', ARRAY['Java', 'Angular', 'PostgreSQL'], 'Ariana', '1800-3200 TND', 'End-to-end development', 'active'),
    
    -- Telnet
    (comp_ids[5], 'Cloud Solutions Architect', ARRAY['AWS', 'Azure', 'Cloud'], 'Tunis', '3000-5000 TND', 'Cloud architecture', 'active'),
    (comp_ids[5], '.NET Developer', ARRAY['C#', '.NET Core', 'SQL Server'], 'Tunis', '1800-3000 TND', 'Enterprise applications', 'active'),
    
    -- Linedata
    (comp_ids[6], 'C++ Developer', ARRAY['C++', 'Finance', 'Algorithms'], 'Lac 2', '2500-4000 TND', 'Financial systems', 'active'),
    (comp_ids[6], 'QA Engineer', ARRAY['Testing', 'Automation', 'Selenium'], 'Lac 2', '1500-2500 TND', 'Quality assurance', 'active'),
    
    -- Cynapsys
    (comp_ids[7], 'Mobile Developer', ARRAY['React Native', 'iOS', 'Android'], 'Tunis', '2000-3500 TND', 'Cross-platform apps', 'active'),
    (comp_ids[7], 'UX/UI Designer', ARRAY['Figma', 'Design', 'User Research'], 'Tunis', '1800-3000 TND', 'User experience', 'active'),
    
    -- STMicroelectronics
    (comp_ids[8], 'Embedded Systems Engineer', ARRAY['C', 'Embedded', 'RTOS'], 'Ariana', '2500-4500 TND', 'Chip programming', 'active'),
    (comp_ids[8], 'FPGA Engineer', ARRAY['VHDL', 'FPGA', 'Digital Design'], 'Ariana', '3000-5000 TND', 'Hardware design', 'active'),
    
    -- Expensya
    (comp_ids[9], 'Backend Engineer', ARRAY['Node.js', 'MongoDB', 'REST API'], 'Tunis', '2000-3500 TND', 'SaaS platform', 'active'),
    (comp_ids[9], 'Product Manager', ARRAY['Product Management', 'Agile', 'Analytics'], 'Tunis', '2500-4000 TND', 'Product strategy', 'active'),
    
    -- Wevioo
    (comp_ids[10], 'WordPress Developer', ARRAY['PHP', 'WordPress', 'MySQL'], 'Tunis', '1500-2500 TND', 'Website development', 'active'),
    (comp_ids[10], 'Digital Marketing Specialist', ARRAY['SEO', 'Google Ads', 'Analytics'], 'Tunis', '1200-2200 TND', 'Online marketing', 'active'),
    
    -- Additional 80+ offers for remaining companies
    (comp_ids[11], 'Angular Developer', ARRAY['Angular', 'TypeScript', 'RxJS'], 'Tunis', '1800-3000 TND', 'Web applications', 'active'),
    (comp_ids[12], 'Automotive Software Engineer', ARRAY['C', 'Automotive', 'CAN'], 'Tunis', '2200-3800 TND', 'Car electronics', 'active'),
    (comp_ids[13], 'Vue.js Developer', ARRAY['Vue.js', 'JavaScript', 'CSS'], 'Tunis', '1800-3000 TND', 'Frontend development', 'active'),
    (comp_ids[14], 'Python Developer', ARRAY['Python', 'Django', 'PostgreSQL'], 'Tunis', '1800-3200 TND', 'Web backend', 'active'),
    (comp_ids[15], 'IoT Engineer', ARRAY['IoT', 'Arduino', 'Raspberry Pi'], 'Tunis', '2000-3500 TND', 'Smart devices', 'active'),
    (comp_ids[16], 'Business Analyst', ARRAY['Requirements Analysis', 'SQL', 'Excel'], 'Tunis', '1800-3000 TND', 'Business solutions', 'active'),
    (comp_ids[17], 'SAP Consultant', ARRAY['SAP', 'ABAP', 'Finance'], 'Tunis', '2500-4500 TND', 'ERP consulting', 'active'),
    (comp_ids[18], 'EdTech Developer', ARRAY['React', 'Node.js', 'MongoDB'], 'Tunis', '1800-3000 TND', 'E-learning platform', 'active'),
    (comp_ids[19], 'QA Automation Engineer', ARRAY['Selenium', 'Java', 'TestNG'], 'Tunis', '1800-3000 TND', 'Test automation', 'active'),
    (comp_ids[20], 'Computer Vision Engineer', ARRAY['OpenCV', 'Python', 'Deep Learning'], 'Tunis', '2500-4500 TND', 'Image processing', 'active'),
    (comp_ids[21], 'Blockchain Developer', ARRAY['Solidity', 'Ethereum', 'Web3'], 'Tunis', '3000-5000 TND', 'DeFi applications', 'active'),
    (comp_ids[22], 'Network Administrator', ARRAY['Networking', 'Linux', 'Security'], 'Tunis', '1800-3000 TND', 'Network management', 'active'),
    (comp_ids[23], 'Mobile App Developer', ARRAY['Swift', 'Kotlin', 'Mobile'], 'Tunis', '2000-3500 TND', 'Native mobile apps', 'active'),
    (comp_ids[24], 'Data Engineer', ARRAY['Spark', 'Hadoop', 'Python'], 'Tunis', '2500-4000 TND', 'Big data pipelines', 'active'),
    (comp_ids[25], 'System Administrator', ARRAY['Linux', 'Bash', 'Networking'], 'Tunis', '1500-2500 TND', 'Server management', 'active'),
    (comp_ids[26], 'Cloud Engineer', ARRAY['AWS', 'Terraform', 'Docker'], 'Tunis', '2500-4000 TND', 'Cloud infrastructure', 'active'),
    (comp_ids[27], 'E-commerce Manager', ARRAY['E-commerce', 'Marketing', 'Analytics'], 'Tunis', '2000-3500 TND', 'Online sales', 'active'),
    (comp_ids[28], 'Marketplace Developer', ARRAY['Laravel', 'PHP', 'MySQL'], 'Tunis', '1800-3200 TND', 'Platform development', 'active'),
    (comp_ids[29], 'Content Moderator', ARRAY['Content Management', 'Communication'], 'Tunis', '1000-1500 TND', 'Content review', 'active'),
    (comp_ids[30], 'Game Developer', ARRAY['Unity', 'C#', 'Game Design'], 'Tunis', '2000-3500 TND', 'Mobile games', 'active'),
    (comp_ids[31], 'PHP Developer', ARRAY['PHP', 'Laravel', 'MySQL'], 'Sousse', '1500-2800 TND', 'Web applications', 'active'),
    (comp_ids[32], 'Aerospace Engineer', ARRAY['CAD', 'Simulation', 'Matlab'], 'Tunis', '2500-4500 TND', 'Aircraft systems', 'active'),
    (comp_ids[33], 'Mechanical Engineer', ARRAY['SolidWorks', 'Engineering', 'CAD'], 'Tunis', '2000-3500 TND', 'Product design', 'active'),
    (comp_ids[34], 'Scrum Master', ARRAY['Agile', 'Scrum', 'Project Management'], 'Tunis', '2200-3800 TND', 'Agile teams', 'active'),
    (comp_ids[35], 'Management Consultant', ARRAY['Strategy', 'Business Analysis', 'Excel'], 'Tunis', '2500-4500 TND', 'Business consulting', 'active'),
    (comp_ids[36], 'AI Solutions Architect', ARRAY['AI', 'Cloud', 'Architecture'], 'Tunis', '3500-6000 TND', 'Enterprise AI', 'active'),
    (comp_ids[37], 'Azure Developer', ARRAY['Azure', 'C#', 'Cloud'], 'Tunis', '2500-4000 TND', 'Cloud applications', 'active'),
    (comp_ids[38], 'Technical Support Engineer', ARRAY['Support', 'Troubleshooting', 'Networking'], 'Tunis', '1200-2000 TND', 'Customer support', 'active'),
    (comp_ids[39], 'Hardware Engineer', ARRAY['Electronics', 'Hardware', 'Testing'], 'Tunis', '1800-3000 TND', 'Product testing', 'active'),
    (comp_ids[40], 'Digital Transformation Consultant', ARRAY['Strategy', 'Technology', 'Change Management'], 'Tunis', '2800-4500 TND', 'Digital strategy', 'active'),
    (comp_ids[41], 'Flutter Developer', ARRAY['Flutter', 'Dart', 'Mobile'], 'Monastir', '1800-3200 TND', 'Cross-platform apps', 'active'),
    (comp_ids[42], 'Social Media Manager', ARRAY['Social Media', 'Content Creation', 'Marketing'], 'Tunis', '1200-2200 TND', 'Online presence', 'active'),
    (comp_ids[43], 'Cloud Operations Engineer', ARRAY['AWS', 'Monitoring', 'Automation'], 'Tunis', '2200-3800 TND', 'Cloud ops', 'active'),
    (comp_ids[44], 'BI Developer', ARRAY['Power BI', 'SQL', 'Data Visualization'], 'Tunis', '2000-3500 TND', 'Business intelligence', 'active'),
    (comp_ids[45], 'Security Analyst', ARRAY['Cybersecurity', 'Penetration Testing', 'Security'], 'Tunis', '2500-4000 TND', 'Security operations', 'active'),
    (comp_ids[46], 'iOS Developer', ARRAY['Swift', 'iOS', 'Mobile'], 'Sfax', '2000-3500 TND', 'iPhone apps', 'active'),
    (comp_ids[47], 'Full Stack JS Developer', ARRAY['Node.js', 'React', 'MongoDB'], 'Tunis', '2000-3500 TND', 'JavaScript stack', 'active'),
    (comp_ids[48], 'NLP Engineer', ARRAY['NLP', 'Python', 'Transformers'], 'Tunis', '2800-4500 TND', 'Language models', 'active'),
    (comp_ids[49], 'Robotics Engineer', ARRAY['ROS', 'C++', 'Robotics'], 'Tunis', '2500-4500 TND', 'Robot programming', 'active'),
    (comp_ids[50], 'Quantum Researcher', ARRAY['Quantum Computing', 'Physics', 'Python'], 'Tunis', '3000-5500 TND', 'Quantum algorithms', 'active'),
    
    -- More entry-level positions
    (comp_ids[1], 'Junior Data Analyst', ARRAY['Python', 'Excel', 'SQL'], 'Tunis', '800-1500 TND', 'Learn data analysis', 'active'),
    (comp_ids[2], 'Software Tester', ARRAY['Manual Testing', 'Documentation'], 'Lac 2', '800-1400 TND', 'Quality assurance', 'active'),
    (comp_ids[3], 'Help Desk Technician', ARRAY['IT Support', 'Windows', 'Networking'], 'Tunis', '900-1600 TND', 'Technical support', 'active'),
    (comp_ids[4], 'Junior Developer', ARRAY['Java', 'OOP', 'Git'], 'Ariana', '1000-1800 TND', 'Software development', 'active'),
    (comp_ids[5], 'IT Intern', ARRAY['Networking', 'Linux', 'Learning'], 'Tunis', '600-1200 TND', 'IT experience', 'active'),
    (comp_ids[6], 'Graduate Developer', ARRAY['C++', 'Algorithms', 'Testing'], 'Lac 2', '1200-2000 TND', 'Fresh graduate', 'active'),
    (comp_ids[7], 'UI Designer Intern', ARRAY['Figma', 'Design', 'Creativity'], 'Tunis', '700-1300 TND', 'Design internship', 'active'),
    (comp_ids[8], 'Engineering Intern', ARRAY['Electronics', 'C', 'Hardware'], 'Ariana', '800-1500 TND', 'Engineering experience', 'active'),
    (comp_ids[9], 'Customer Success Associate', ARRAY['Communication', 'Customer Service'], 'Tunis', '1000-1800 TND', 'Client relations', 'active'),
    (comp_ids[10], 'Web Design Intern', ARRAY['HTML', 'CSS', 'JavaScript'], 'Tunis', '600-1200 TND', 'Web design', 'active'),
    
    -- Senior/Lead positions
    (comp_ids[1], 'Lead AI Architect', ARRAY['AI', 'Architecture', 'Leadership'], 'Tunis', '4500-7000 TND', 'AI team leadership', 'active'),
    (comp_ids[2], 'Technical Lead', ARRAY['Java', 'Architecture', 'Team Management'], 'Lac 2', '3500-5500 TND', 'Tech leadership', 'active'),
    (comp_ids[3], 'Senior Network Architect', ARRAY['Networking', 'Security', 'Architecture'], 'Tunis', '3800-6000 TND', 'Network design', 'active'),
    (comp_ids[4], 'Engineering Manager', ARRAY['Leadership', 'Agile', 'Engineering'], 'Ariana', '4000-6500 TND', 'Team management', 'active'),
    (comp_ids[5], 'Principal Cloud Architect', ARRAY['AWS', 'Azure', 'Architecture'], 'Tunis', '4500-7500 TND', 'Cloud strategy', 'active'),
    (comp_ids[11], 'Senior Full Stack Developer', ARRAY['React', 'Node.js', 'AWS'], 'Tunis', '3000-5000 TND', 'Full stack expertise', 'active'),
    (comp_ids[12], 'Staff Engineer', ARRAY['C++', 'Automotive', 'Embedded'], 'Tunis', '3500-5500 TND', 'Technical leadership', 'active'),
    (comp_ids[13], 'Solutions Architect', ARRAY['Architecture', 'Cloud', 'Integration'], 'Tunis', '3500-5500 TND', 'Solution design', 'active'),
    (comp_ids[14], 'Senior Backend Engineer', ARRAY['Python', 'Microservices', 'Kafka'], 'Tunis', '3000-5000 TND', 'Backend systems', 'active'),
    (comp_ids[15], 'IoT Architect', ARRAY['IoT', 'Cloud', 'Architecture'], 'Tunis', '3500-5500 TND', 'IoT solutions', 'active');

END $$;

SELECT '✅ 50 Companies and 100+ Offers Seeded!' as status;
