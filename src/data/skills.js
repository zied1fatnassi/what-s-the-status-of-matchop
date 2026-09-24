export const SKILL_CATEGORIES = {
    TECHNICAL: [
        'Python', 'Java', 'C++', 'JavaScript', 'SQL', 'Ruby', 'Go', 'Rust',
        'HTML', 'CSS', 'React', 'Angular', 'Vue.js', 'Next.js', 'Node.js',
        'Android', 'iOS', 'Flutter', 'React Native', 'Swift', 'Kotlin',
        'Excel', 'Power BI', 'Tableau', 'R', 'SAS', 'SPSS', 'Data Analysis',
        'TensorFlow', 'PyTorch', 'scikit-learn', 'Machine Learning', 'Artificial Intelligence',
        'Cybersecurity', 'Network Security', 'Ethical Hacking', 'Penetration Testing',
        'AWS', 'Google Cloud', 'Azure', 'Kubernetes', 'Docker', 'Cloud Computing',
        'MySQL', 'PostgreSQL', 'MongoDB', 'Oracle', 'Database Management',
        'DevOps', 'Jenkins', 'Git', 'CI/CD',
        'Linux', 'Windows Server', 'System Administration',
        'IT Support', 'Troubleshooting', 'Network Engineering',
        'Software Testing', 'QA', 'Automation Testing',
        'UI/UX Design', 'Figma', 'Adobe XD',
        'Graphic Design', 'Photoshop', 'Illustrator', 'InDesign',
        'Video Editing', 'Premiere Pro', 'Final Cut Pro', 'DaVinci Resolve',
        'Audio Editing', 'Audacity', 'Pro Tools',
        'AutoCAD', 'SolidWorks', 'CAD Design',
        'Robotics', 'Automation',
        'Blockchain', 'Solidity', 'Smart Contracts',
        'Game Development', 'Unity', 'Unreal Engine'
    ],
    SOFT: [
        'Communication', 'Verbal Communication', 'Written Communication',
        'Leadership', 'Teamwork', 'Collaboration',
        'Problem-Solving', 'Critical Thinking',
        'Time Management', 'Adaptability', 'Flexibility',
        'Emotional Intelligence', 'Conflict Resolution', 'Negotiation',
        'Active Listening', 'Creativity', 'Presentation Skills',
        'Customer Service', 'Empathy', 'Patience',
        'Decision Making', 'Stress Management',
        'Self-Motivation', 'Organization', 'Attention to Detail'
    ],
    MANAGERIAL: [
        'Project Management', 'Agile', 'Scrum', 'Waterfall', 'Kanban',
        'Strategic Planning', 'Budgeting', 'Financial Management',
        'Marketing', 'Digital Marketing', 'Content Marketing', 'Social Media Marketing', 'SEO', 'PPC',
        'Sales', 'B2B Sales', 'B2C Sales', 'Business Development',
        'Business Analysis', 'Human Resources', 'HR Management',
        'Change Management', 'Risk Management', 'Operations Management',
        'Supply Chain Management', 'Logistics',
        'Entrepreneurship', 'Public Relations', 'Event Planning',
        'CRM', 'Salesforce', 'HubSpot', 'Market Research'
    ],
    SPECIALIZED: [
        'Nursing', 'Clinical Skills', 'Emergency Medicine', 'Medical Terminology',
        'Contract Law', 'Legal Research', 'Compliance',
        'Teaching', 'Curriculum Development', 'Training',
        'Translation', 'Interpretation', 'Content Writing', 'Journalism',
        'Photography', 'Music Production', 'Sound Engineering',
        'Cooking', 'Culinary Arts', 'Food Safety',
        'Carpentry', 'Construction', 'Plumbing', 'Electrical Work',
        'Automotive Repair', 'Mechanics',
        'Aviation', 'Piloting', 'Navigation',
        'Agriculture', 'Farming', 'Sustainability', 'Environmental Science',
        'Surveying', 'Mapping', 'GIS'
    ],
    DIGITAL: [
        'Generative AI', 'ChatGPT', 'Prompt Engineering',
        'Data Literacy', 'Analytics',
        'E-commerce', 'Shopify', 'WooCommerce',
        'Community Management', 'Discord', 'Slack', 'Zoom', 'Microsoft Teams',
        'Cryptocurrency', 'DeFi', 'NFTs',
        'IoT', 'Arduino', 'Raspberry Pi',
        'AR/VR Development', '3D Modeling', 'Blender', '3D Printing'
    ]
}

// Flattened list for easy autocomplete
export const ALL_SKILLS = [
    ...new Set([
        ...SKILL_CATEGORIES.TECHNICAL,
        ...SKILL_CATEGORIES.SOFT,
        ...SKILL_CATEGORIES.MANAGERIAL,
        ...SKILL_CATEGORIES.SPECIALIZED,
        ...SKILL_CATEGORIES.DIGITAL
    ])
].sort()
