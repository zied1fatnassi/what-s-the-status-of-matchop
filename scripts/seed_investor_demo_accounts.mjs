import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

// Load .env
const envText = fs.readFileSync('.env', 'utf-8')
const env = {}
for (const line of envText.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx !== -1) {
        const k = trimmed.slice(0, idx).trim()
        const v = trimmed.slice(idx + 1).trim()
        env[k] = v
    }
}

const supabaseUrl = env.VITE_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
const DEMO_PASSWORD = 'MatchOp2026!'

if (!supabaseUrl || !serviceKey) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
})

// ============================================================================
// 10 REAL COMPANIES WITH HIGH-QUALITY OFFERS
// ============================================================================
const COMPANIES_DATA = [
    {
        email: 'instadeep@test.matchop.tn',
        company_name: 'InstaDeep Tunisia',
        industry: 'Artificial Intelligence & Deep Tech',
        location: 'Tunis, Tunis',
        governorate: 'Tunis',
        company_size: '201-500 employees',
        website: 'https://instadeep.com',
        logo_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
        description: 'InstaDeep delivers AI-powered systems for enterprise decision-making, leveraging deep reinforcement learning to solve complex real-world problems in logistics, mobility, and genomics.',
        culture: 'Research-first environment, scientific rigor, cross-border collaboration with AI labs worldwide.',
        benefits: 'Competitive stipend, access to high-performance GPU clusters, mentorship from AI PhDs, full-time hire opportunities.',
        offers: [
            {
                title: 'Deep Reinforcement Learning Intern (PFE)',
                description: `## About the role\nJoin our AI Research team in Tunis to develop and benchmark state-of-the-art reinforcement learning algorithms for industrial decision-making and route optimization.\n\n## Key Responsibilities\n- Design and implement novel RL algorithms in PyTorch and JAX\n- Run experiments on distributed GPU clusters\n- Analyze performance metrics and contribute to scientific research reports\n- Collaborate with international teams in London and Paris\n\n## Qualifications\n- Strong foundation in linear algebra, probability, and algorithms\n- Proficiency in Python and PyTorch\n- Passion for deep learning research`,
                req_skills: ['Python', 'PyTorch', 'Reinforcement Learning', 'Algorithms', 'Git'],
                location: 'Tunis, Tunis',
                salary_range: '1,200 - 1,600 TND / month',
            },
            {
                title: 'Machine Learning Engineer (Junior / PFE)',
                description: `## About the role\nDevelop, package, and deploy scalable ML models for enterprise clients. You will work on productionizing AI pipelines and integrating RESTful inference services.\n\n## Key Responsibilities\n- Build high-throughput data processing and inference pipelines\n- Containerize models with Docker and deploy on Kubernetes\n- Optimize latency and throughput for real-time applications\n\n## Qualifications\n- Solid software engineering in Python & modern C++\n- Experience with Docker, FastAPI, and CI/CD pipelines`,
                req_skills: ['Python', 'FastAPI', 'Docker', 'Machine Learning', 'PostgreSQL'],
                location: 'Tunis, Tunis',
                salary_range: '1,000 - 1,400 TND / month',
            }
        ]
    },
    {
        email: 'vermeg@test.matchop.tn',
        company_name: 'Vermeg Software',
        industry: 'FinTech & Regulatory Banking Software',
        location: 'Tunis, Tunis',
        governorate: 'Tunis',
        company_size: '1000+ employees',
        website: 'https://vermeg.com',
        logo_url: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=200&auto=format&fit=crop&q=80',
        description: 'Vermeg is a specialized software house providing solutions for banking, securities processing, regulatory reporting, and insurance institutions across 40+ countries.',
        culture: 'Enterprise engineering excellence, continuous professional certifications, hybrid work balance.',
        benefits: 'Performance bonus, comprehensive health insurance, gym membership, sponsored certification programs.',
        offers: [
            {
                title: 'Full-Stack Java / Angular Developer (PFE)',
                description: `## About the role\nWork on core banking and collateral management microservices. Build robust APIs and modern financial dashboards.\n\n## Key Responsibilities\n- Develop Spring Boot microservices and secure REST APIs\n- Build responsive UI modules using Angular and TypeScript\n- Write unit and integration tests with JUnit and Jasmine\n\n## Qualifications\n- Good understanding of Java, Spring Boot, and SQL\n- Familiarity with Angular or modern frontend frameworks`,
                req_skills: ['Java', 'Spring Boot', 'Angular', 'TypeScript', 'SQL'],
                location: 'Tunis, Tunis',
                salary_range: '900 - 1,200 TND / month',
            },
            {
                title: 'QA Automation & Security Testing Intern',
                description: `## About the role\nImplement automated test suites and participate in vulnerability assessments for mission-critical financial applications.\n\n## Key Responsibilities\n- Design automated testing pipelines using Selenium and Playwright\n- Perform security auditing and API contract testing\n- Integrate testing gates into Azure DevOps CI/CD\n\n## Qualifications\n- Knowledge of test automation frameworks\n- Basic understanding of web security and OWASP standards`,
                req_skills: ['Selenium', 'Playwright', 'Java', 'CI/CD', 'Web Security'],
                location: 'Tunis, Tunis',
                salary_range: '800 - 1,100 TND / month',
            }
        ]
    },
    {
        email: 'expensya@test.matchop.tn',
        company_name: 'Expensya',
        industry: 'Spend Management SaaS & FinTech',
        location: 'Ariana, Tunis',
        governorate: 'Ariana',
        company_size: '100-250 employees',
        website: 'https://expensya.com',
        logo_url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=200&auto=format&fit=crop&q=80',
        description: 'Expensya is an intelligent business spend management platform serving thousands of corporate clients in Europe and North Africa, acquired by Medius.',
        culture: 'Agile startup vibe with scale-up stability, autonomous squads, modern frontend and cloud stacks.',
        benefits: 'MacBook Pro workstation, remote flexibility, meal vouchers, team retreats.',
        offers: [
            {
                title: 'Frontend React & Mobile React Native Intern',
                description: `## About the role\nCraft slick, user-friendly expense management experiences for web and mobile. Build modular UI components and optimize app performance.\n\n## Key Responsibilities\n- Develop React and React Native features\n- Implement smooth micro-interactions and offline data caching\n- Collaborate with product designers in Figma\n\n## Qualifications\n- Hands-on experience with React / React Native\n- Strong CSS and responsive layout skills`,
                req_skills: ['React', 'React Native', 'TypeScript', 'Redux', 'TailwindCSS'],
                location: 'Ariana, Tunis',
                salary_range: '900 - 1,300 TND / month',
            },
            {
                title: 'Cloud & DevOps Junior Engineer',
                description: `## About the role\nMaintain and scale our AWS cloud infrastructure supporting hundreds of thousands of daily receipts and payment transactions.\n\n## Key Responsibilities\n- Automate deployment pipelines using GitHub Actions and Terraform\n- Monitor Kubernetes clusters with Prometheus & Grafana\n- Enhance system security and disaster recovery\n\n## Qualifications\n- Experience with Linux, Docker, and AWS basics\n- Familiarity with Infrastructure-as-Code (Terraform)`,
                req_skills: ['AWS', 'Docker', 'Kubernetes', 'Terraform', 'Linux'],
                location: 'Ariana, Tunis',
                salary_range: '1,000 - 1,400 TND / month',
            }
        ]
    },
    {
        email: 'cognira@test.matchop.tn',
        company_name: 'Cognira',
        industry: 'Retail AI & Big Data Analytics',
        location: 'Tunis, Tunis',
        governorate: 'Tunis',
        company_size: '51-200 employees',
        website: 'https://cognira.com',
        logo_url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=200&auto=format&fit=crop&q=80',
        description: 'Cognira helps leading global retailers optimize merchandising, promotion planning, and supply chain forecasting using advanced data science.',
        culture: 'Data-driven, international team, merit-based growth, strong mentorship culture.',
        benefits: 'High compensation stipends, international exchange projects, US-client exposure.',
        offers: [
            {
                title: 'Data Scientist / Algorithm Engineer Intern',
                description: `## About the role\nDevelop predictive models for retail promotion optimization and demand forecasting.\n\n## Key Responsibilities\n- Perform exploratory data analysis on massive retail datasets\n- Build time-series forecasting models (Prophet, XGBoost, LightGBM)\n- Evaluate models and present insights to engineering leads\n\n## Qualifications\n- Strong proficiency in Python, Pandas, Scikit-learn\n- Solid knowledge of statistics and time-series modeling`,
                req_skills: ['Python', 'Pandas', 'Scikit-Learn', 'SQL', 'Time Series'],
                location: 'Tunis, Tunis',
                salary_range: '1,000 - 1,500 TND / month',
            },
            {
                title: 'Big Data & Data Platform Intern',
                description: `## About the role\nBuild high-scale data ingestion and transformation pipelines using PySpark and cloud data warehouses.\n\n## Key Responsibilities\n- Design ETL/ELT pipelines processing millions of daily transactions\n- Optimize Spark SQL queries and data partitioning\n- Implement automated data quality checks\n\n## Qualifications\n- Experience with Python and SQL\n- Familiarity with Apache Spark or Databricks`,
                req_skills: ['Apache Spark', 'Python', 'SQL', 'BigQuery', 'ETL'],
                location: 'Tunis, Tunis',
                salary_range: '950 - 1,300 TND / month',
            }
        ]
    },
    {
        email: 'sofrecom@test.matchop.tn',
        company_name: 'Sofrecom Tunisia',
        industry: 'Telecom & Cloud Digital Services',
        location: 'Ariana, Tunis',
        governorate: 'Ariana',
        company_size: '501-1000 employees',
        website: 'https://sofrecom.com',
        logo_url: 'https://images.unsplash.com/photo-1542744094-3a31f272c490?w=200&auto=format&fit=crop&q=80',
        description: 'Sofrecom is an Orange Group subsidiary providing business consulting, systems integration, and engineering services to telecom operators and international enterprises.',
        culture: 'Enterprise standards, structured training pathways, Orange Group ecosystem.',
        benefits: 'Orange Group benefits, health coverage, shuttle transport, annual performance reviews.',
        offers: [
            {
                title: 'Cloud Infrastructure & Kubernetes Intern',
                description: `## About the role\nSupport the migration and automation of telecommunications platforms to hybrid cloud infrastructure.\n\n## Key Responsibilities\n- Deploy and manage Kubernetes clusters on OpenStack & AWS\n- Configure Helm charts, ingress controllers, and service meshes\n- Build CI/CD automation with GitLab CI\n\n## Qualifications\n- Strong knowledge of Linux networking and containerization\n- Understanding of Kubernetes architecture`,
                req_skills: ['Kubernetes', 'Docker', 'Linux', 'GitLab CI', 'Bash'],
                location: 'Ariana, Tunis',
                salary_range: '900 - 1,250 TND / month',
            },
            {
                title: 'Backend Python / FastAPI Engineer Intern',
                description: `## About the role\nDevelop microservices for next-generation network management and self-service customer portals.\n\n## Key Responsibilities\n- Build REST and GraphQL APIs with FastAPI and async Python\n- Integrate PostgreSQL and Redis caching layers\n- Document APIs with OpenAPI / Swagger specifications\n\n## Qualifications\n- Python 3, asynchronous programming, and REST APIs\n- Relational databases and SQL optimization`,
                req_skills: ['Python', 'FastAPI', 'PostgreSQL', 'Redis', 'Docker'],
                location: 'Ariana, Tunis',
                salary_range: '850 - 1,200 TND / month',
            }
        ]
    },
    {
        email: 'actia@test.matchop.tn',
        company_name: 'Actia Engineering Services',
        industry: 'Embedded Systems & Automotive IoT',
        location: 'Ariana, Tunis',
        governorate: 'Ariana',
        company_size: '501-1000 employees',
        website: 'https://actia.com',
        logo_url: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=200&auto=format&fit=crop&q=80',
        description: 'Actia is an international group specializing in embedded electronic systems for automotive, commercial vehicles, rail, and telecommunications.',
        culture: 'Hardware-software symbiosis, automotive safety standards (ISO 26262), high engineering standards.',
        benefits: 'Advanced electronic labs, automotive test benches, transport shuttle, permanent contract opportunities.',
        offers: [
            {
                title: 'Embedded Systems & Firmware Developer (C/C++)',
                description: `## About the role\nDevelop low-level firmware for connected vehicle electronic control units (ECU) and telematics gateways.\n\n## Key Responsibilities\n- Write efficient C/C++ code for STM32 / ARM Cortex microcontrollers\n- Implement CAN bus, LIN, and Ethernet communication protocols\n- Perform hardware-in-the-loop (HIL) testing and debugging\n\n## Qualifications\n- Strong C/C++ programming skills\n- Knowledge of RTOS (FreeRTOS / Zephyr) and embedded peripherals`,
                req_skills: ['C', 'C++', 'FreeRTOS', 'STM32', 'CAN Bus', 'Embedded Systems'],
                location: 'Ariana, Tunis',
                salary_range: '900 - 1,300 TND / month',
            },
            {
                title: 'IoT Solutions & Connectivity Intern',
                description: `## About the role\nDevelop cloud-connected embedded software transmitting diagnostic telemetry via 4G/5G and MQTT.\n\n## Key Responsibilities\n- Implement secure IoT protocols (MQTT, CoAP, TLS 1.3)\n- Develop edge analytics scripts on Embedded Linux\n- Optimize power consumption for remote battery-operated devices\n\n## Qualifications\n- Embedded Linux and Python/C development\n- Familiarity with IoT protocols and cloud endpoints`,
                req_skills: ['Embedded Linux', 'Python', 'MQTT', 'IoT', 'Networking'],
                location: 'Ariana, Tunis',
                salary_range: '850 - 1,200 TND / month',
            }
        ]
    },
    {
        email: 'talan@test.matchop.tn',
        company_name: 'Talan Tunisia',
        industry: 'Management & Tech Consulting',
        location: 'Tunis, Tunis',
        governorate: 'Tunis',
        company_size: '501-1000 employees',
        website: 'https://talan.com',
        logo_url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=200&auto=format&fit=crop&q=80',
        description: 'Talan advises companies, identifies and implements digital solutions, and guides their transformation journeys across Europe, North America, and Africa.',
        culture: 'Consulting rigor, diverse industry missions, innovation lab (Talan Labs), creative problem solving.',
        benefits: 'Top-tier training programs, internal mobility to Paris/Geneva, vibrant community events.',
        offers: [
            {
                title: 'Junior Data & BI Consultant (PowerBI, SQL)',
                description: `## About the role\nDesign decision-support dashboards and dimensional data models for international banking and insurance clients.\n\n## Key Responsibilities\n- Gather reporting requirements from business stakeholders\n- Model data warehouses (Star Schema) and write complex SQL\n- Create interactive, storytelling dashboards in Power BI and Tableau\n\n## Qualifications\n- Strong SQL proficiency and business acumen\n- Experience with Power BI, DAX, or Tableau`,
                req_skills: ['Power BI', 'SQL', 'DAX', 'Data Modeling', 'Business Intelligence'],
                location: 'Tunis, Tunis',
                salary_range: '850 - 1,200 TND / month',
            },
            {
                title: 'Salesforce & Cloud Solutions Intern',
                description: `## About the role\nConfigure and customize Salesforce CRM solutions for enterprise sales and customer service operations.\n\n## Key Responsibilities\n- Configure custom objects, flows, and validation rules\n- Develop Apex triggers and Lightning Web Components (LWC)\n- Assist in data migration and integration with third-party ERPs\n\n## Qualifications\n- Understanding of object-oriented programming (Java/Apex)\n- Interest in enterprise cloud platforms`,
                req_skills: ['Salesforce', 'Apex', 'JavaScript', 'CRM', 'Cloud Solutions'],
                location: 'Tunis, Tunis',
                salary_range: '800 - 1,150 TND / month',
            }
        ]
    },
    {
        email: 'medianet@test.matchop.tn',
        company_name: 'Medianet Digital',
        industry: 'Digital Engineering & E-Commerce',
        location: 'Tunis, Tunis',
        governorate: 'Tunis',
        company_size: '51-200 employees',
        website: 'https://medianet.tn',
        logo_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=200&auto=format&fit=crop&q=80',
        description: 'Medianet is a pioneer digital agency and software solutions provider in Tunisia, building e-commerce platforms, web portals, and custom web applications for over 25 years.',
        culture: 'Creative freedom, fast delivery cycles, collaborative agency atmosphere, high client impact.',
        benefits: 'Skill workshops, flexible hours, team sports activities, rapid promotion paths.',
        offers: [
            {
                title: 'UI/UX & Product Design Intern',
                description: `## About the role\nDesign seamless digital user experiences for mobile apps and web platforms. Create design systems, user flows, and high-fidelity prototypes.\n\n## Key Responsibilities\n- Conduct user research and wireframing for client projects\n- Build high-fidelity interactive prototypes in Figma\n- Maintain UI component libraries and ensure WCAG accessibility\n\n## Qualifications\n- Portfolio showcasing UI/UX mobile or web projects\n- Mastery of Figma and design system principles`,
                req_skills: ['Figma', 'UI/UX Design', 'Wireframing', 'Prototyping', 'Design Systems'],
                location: 'Tunis, Tunis',
                salary_range: '750 - 1,100 TND / month',
            },
            {
                title: 'Full-Stack JavaScript (React & Node.js) Intern',
                description: `## About the role\nBuild dynamic, SEO-optimized web applications and scalable RESTful backends.\n\n## Key Responsibilities\n- Develop user interfaces with React, Next.js, and TailwindCSS\n- Build backend APIs using Node.js, Express, and PostgreSQL\n- Optimize web performance, Core Web Vitals, and responsive layouts\n\n## Qualifications\n- Strong JavaScript/TypeScript fundamentals\n- Experience building full-stack web apps`,
                req_skills: ['React', 'Node.js', 'Next.js', 'PostgreSQL', 'TailwindCSS'],
                location: 'Tunis, Tunis',
                salary_range: '800 - 1,150 TND / month',
            }
        ]
    },
    {
        email: 'focus@test.matchop.tn',
        company_name: 'Focus Corporation',
        industry: 'IT Services & Cloud Infrastructure',
        location: 'Ariana, Tunis',
        governorate: 'Ariana',
        company_size: '201-500 employees',
        website: 'https://focus-corporation.com',
        logo_url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=200&auto=format&fit=crop&q=80',
        description: 'Focus Corporation provides software engineering, cloud infrastructure management, and telecom network support services for tier-1 multinational partners.',
        culture: 'Deep engineering standards, cloud certifications, transparent management.',
        benefits: 'Comprehensive health plan, certification bonuses, on-site cafeteria, team building.',
        offers: [
            {
                title: 'Linux & Systems Administration Intern',
                description: `## About the role\nAssist in managing enterprise Linux server fleets, storage clusters, and automated system monitoring.\n\n## Key Responsibilities\n- Administer Red Hat / Ubuntu server environments\n- Write automation scripts in Bash and Ansible\n- Monitor system performance and troubleshoot incident tickets\n\n## Qualifications\n- Strong Linux command line proficiency\n- Basic knowledge of networking (TCP/IP, DNS, SSH, firewalls)`,
                req_skills: ['Linux', 'Bash', 'Ansible', 'Networking', 'System Administration'],
                location: 'Ariana, Tunis',
                salary_range: '800 - 1,150 TND / month',
            },
            {
                title: 'Cyber Security Analyst Intern',
                description: `## About the role\nPerform vulnerability scans, security baseline reviews, and assist the SOC team in threat detection.\n\n## Key Responsibilities\n- Conduct automated vulnerability assessments with Nessus and OpenVAS\n- Analyze SIEM logs and investigate anomalous security events\n- Document security procedures and assist in ISO 27001 audits\n\n## Qualifications\n- Knowledge of network protocols and security fundamentals\n- Familiarity with OWASP, SIEM tools, or penetration testing`,
                req_skills: ['Cybersecurity', 'SIEM', 'Vulnerability Scanning', 'Network Security', 'Linux'],
                location: 'Ariana, Tunis',
                salary_range: '850 - 1,200 TND / month',
            }
        ]
    },
    {
        email: 'satoripop@test.matchop.tn',
        company_name: 'Satoripop',
        industry: 'Creative Tech & Digital Experience',
        location: 'Sousse, Sousse',
        governorate: 'Sousse',
        company_size: '51-200 employees',
        website: 'https://satoripop.com',
        logo_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=200&auto=format&fit=crop&q=80',
        description: 'Satoripop is an agile digital agency and innovation lab based in Sousse, delivering award-winning digital experiences, gamification, and Web3 applications worldwide.',
        culture: 'Innovation lab spirit, creative experimental hack days, beachfront office lifestyle.',
        benefits: 'Creative lab time (20% project time), beachfront tech campus, English & French language coaching.',
        offers: [
            {
                title: 'Creative Frontend & Interactive UI Developer',
                description: `## About the role\nBuild visually stunning, high-performance web experiences featuring 3D graphics, smooth scroll animations, and micro-interactions.\n\n## Key Responsibilities\n- Implement smooth animations with GSAP and Framer Motion\n- Experiment with Three.js / WebGL for interactive 3D web features\n- Collaborate closely with creative directors and motion designers\n\n## Qualifications\n- Excellent JavaScript and modern CSS/animations\n- Eye for visual design details, typography, and motion`,
                req_skills: ['JavaScript', 'React', 'GSAP', 'Three.js', 'CSS Animations'],
                location: 'Sousse, Sousse',
                salary_range: '850 - 1,200 TND / month',
            },
            {
                title: 'Junior Product Management & Agile Intern',
                description: `## About the role\nCoordinate sprint ceremonies, define product requirements, and track delivery for innovative digital client products.\n\n## Key Responsibilities\n- Write clear user stories and acceptance criteria in Jira\n- Facilitate sprint planning, daily standups, and retrospectives\n- Track sprint velocity and report project milestones\n\n## Qualifications\n- Understanding of Scrum and Agile methodologies\n- Excellent written and verbal communication in English & French`,
                req_skills: ['Agile', 'Scrum', 'Jira', 'Product Management', 'User Stories'],
                location: 'Sousse, Sousse',
                salary_range: '750 - 1,100 TND / month',
            }
        ]
    }
]

// ============================================================================
// 20 REALISTIC STUDENT PROFILES FROM TOP TUNISIAN INSTITUTIONS
// ============================================================================
const STUDENTS_DATA = [
    {
        email: 'yasmine.trabelsi@student.matchop.tn',
        name: 'Yasmine Trabelsi',
        display_name: 'Yasmine Trabelsi',
        headline: 'Software Engineering Student @ INSAT | Full-Stack React & Node.js Developer',
        bio: 'Final-year software engineering student at INSAT passionate about building high-performance web applications and cloud-native services. Experienced in React, Node.js, and PostgreSQL with a strong track record of competitive programming and hackathon wins.',
        location: 'Tunis, Tunis',
        skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker', 'Git'],
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
        education: {
            school: 'INSAT - National Institute of Applied Science and Technology',
            degree: "National Diploma of Engineering (Diplôme d'Ingénieur)",
            field_of_study: 'Software Engineering & Distributed Systems',
            start_date: '2022',
            end_date: '2026',
            is_current: true,
            grade: 'High Honors (16.8/20)',
            activities: 'IEEE Computer Society, Lead Organizer at INSAT Competitive Programming Club',
            description: 'Major coursework in Algorithms, Distributed Systems, Software Design Patterns, Database Architecture.'
        },
        experience: {
            job_title: 'Frontend Developer Intern',
            company: 'InstaDeep',
            start_date: '2025-06',
            end_date: '2025-09',
            is_current: false,
            description: 'Developed responsive data visualization dashboards for molecular analytics using React, D3.js, and TypeScript.'
        }
    },
    {
        email: 'mohamed.benamor@student.matchop.tn',
        name: 'Mohamed Aziz Ben Amor',
        display_name: 'Mohamed Aziz Ben Amor',
        headline: 'AI & Data Science Student @ ENSI | Deep Learning & NLP Enthusiast',
        bio: 'Master and engineering student at ENSI focused on Deep Learning, Natural Language Processing, and LLM orchestration. Love translating complex mathematical formulations into clean, production-ready PyTorch code.',
        location: 'Ariana, Tunis',
        skills: ['Python', 'PyTorch', 'NLP', 'Scikit-Learn', 'FastAPI', 'SQL'],
        avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
        education: {
            school: 'ENSI - National School of Computer Sciences',
            degree: 'Engineering Degree in Computer Science',
            field_of_study: 'Artificial Intelligence & Data Science',
            start_date: '2022',
            end_date: '2026',
            is_current: true,
            grade: '16.2/20',
            activities: 'ENSI AI Club, Kaggle Competitor (Expert tier)',
            description: 'Specialization in Deep Learning, Computer Vision, Transformers, and Big Data Processing.'
        },
        experience: {
            job_title: 'Machine Learning Intern',
            company: 'Cognira',
            start_date: '2025-06',
            end_date: '2025-08',
            is_current: false,
            description: 'Built demand forecasting models using XGBoost and Prophet, improving promotional sales predictions by 14%.'
        }
    },
    {
        email: 'sarra.bouazizi@student.matchop.tn',
        name: 'Sarra Bouazizi',
        display_name: 'Sarra Bouazizi',
        headline: 'Mobile & Cross-Platform Developer @ ESPRIT | Flutter & React Native',
        bio: 'Dedicated mobile engineer at ESPRIT with 2+ years of hands-on experience building fluid, native-feel iOS and Android applications. Active open-source contributor and mobile UI perfectionist.',
        location: 'Ariana, Tunis',
        skills: ['Flutter', 'Dart', 'React Native', 'Firebase', 'State Management', 'REST APIs'],
        avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80',
        education: {
            school: 'ESPRIT - Private Higher School of Engineering & Technology',
            degree: 'Software Engineering Diploma',
            field_of_study: 'Mobile Computing & Embedded Solutions',
            start_date: '2021',
            end_date: '2026',
            is_current: true,
            grade: 'Honors',
            activities: 'Google Developer Student Clubs (GDSC) Mobile Lead',
            description: 'Focused on mobile architecture patterns (BLoC, Riverpod), mobile security, and cross-platform UI engineering.'
        },
        experience: {
            job_title: 'Mobile Application Intern',
            company: 'Medianet',
            start_date: '2025-06',
            end_date: '2025-09',
            is_current: false,
            description: 'Implemented mobile payment flows and push notifications in Flutter for a top retail e-commerce application.'
        }
    },
    {
        email: 'khalil.mansour@student.matchop.tn',
        name: 'Khalil Mansour',
        display_name: 'Khalil Mansour',
        headline: 'DevOps & Cloud Systems Engineer @ ENIT | Kubernetes, Terraform & AWS',
        bio: 'Engineering student at ENIT specializing in telecommunications and cloud computing. Passionate about automating CI/CD pipelines, container orchestration, and Infrastructure as Code.',
        location: 'Tunis, Tunis',
        skills: ['AWS', 'Kubernetes', 'Terraform', 'Docker', 'GitLab CI', 'Linux'],
        avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
        education: {
            school: 'ENIT - National Engineering School of Tunis',
            degree: 'Engineering Degree in Telecommunications',
            field_of_study: 'Cloud Infrastructure & Networks',
            start_date: '2022',
            end_date: '2026',
            is_current: true,
            grade: '15.9/20',
            activities: 'ENIT Junior Enterprise Tech Team',
            description: 'Network protocols, cloud virtualization, DevOps automation, and scalable systems.'
        },
        experience: {
            job_title: 'Cloud Infrastructure Intern',
            company: 'Sofrecom Tunisia',
            start_date: '2025-06',
            end_date: '2025-08',
            is_current: false,
            description: 'Automated Kubernetes cluster provisioning with Terraform and Helm charts for internal testing environments.'
        }
    },
    {
        email: 'nourhene.gharbi@student.matchop.tn',
        name: 'Nourhene Gharbi',
        display_name: 'Nourhene Gharbi',
        headline: 'UI/UX & Product Designer @ MSB | Human-Centered Digital Products',
        bio: 'Product design and user experience student at Mediterranean School of Business. Obsessed with user empathy, structured design systems, and converting complex user journeys into delightful interfaces.',
        location: 'Tunis, Tunis',
        skills: ['Figma', 'User Research', 'Wireframing', 'Design Systems', 'Prototyping', 'UI Design'],
        avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
        education: {
            school: 'MSB - Mediterranean School of Business',
            degree: 'Master in Digital Business & Design Thinking',
            field_of_study: 'UX/UI Design & Product Strategy',
            start_date: '2023',
            end_date: '2026',
            is_current: true,
            grade: 'Summa Cum Laude',
            activities: 'Design Club President, UX Mentor for Seedstars Tunisia',
            description: 'Product discovery, heuristic evaluation, quantitative UX benchmarking, design system tokens.'
        },
        experience: {
            job_title: 'UX Design Intern',
            company: 'Expensya',
            start_date: '2025-05',
            end_date: '2025-09',
            is_current: false,
            description: 'Redesigned mobile receipt scanning interface, reducing user error rates by 22% and improving task completion speed.'
        }
    },
    {
        email: 'amine.dridi@student.matchop.tn',
        name: 'Amine Dridi',
        display_name: 'Amine Dridi',
        headline: 'Full-Stack Web Developer @ INSAT | Next.js, React & Cloud Architectures',
        bio: 'Senior year student at INSAT with a deep passion for modern web technologies. Experienced in building full-stack products from scratch with Next.js, Supabase, and TailwindCSS.',
        location: 'Tunis, Tunis',
        skills: ['Next.js', 'React', 'TypeScript', 'TailwindCSS', 'Node.js', 'PostgreSQL'],
        avatar_url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=300&auto=format&fit=crop&q=80',
        education: {
            school: 'INSAT - National Institute of Applied Science and Technology',
            degree: "Diplôme d'Ingénieur en Informatique",
            field_of_study: 'Web & Mobile Distributed Architecture',
            start_date: '2021',
            end_date: '2026',
            is_current: true,
            grade: '16.4/20',
            activities: 'Hackathon finalist at Smart Capital Challenge 2025',
            description: 'Comprehensive software engineering with focus on real-time web, serverless, and relational databases.'
        },
        experience: {
            job_title: 'Full-Stack Intern',
            company: 'Satoripop',
            start_date: '2025-06',
            end_date: '2025-09',
            is_current: false,
            description: 'Engineered web portal microservices and interactive client dashboards using Next.js and PostgreSQL.'
        }
    },
    {
        email: 'mariem.karray@student.matchop.tn',
        name: 'Mariem Karray',
        display_name: 'Mariem Karray',
        headline: "Embedded Systems & IoT Engineer @ SUP'COM | C/C++, FreeRTOS & ARM",
        bio: "SUP'COM telecommunications engineering student focused on low-level firmware, real-time operating systems, and connected IoT sensors. Eager to solve hardware-software co-design challenges.",
        location: 'Ariana, Tunis',
        skills: ['C', 'C++', 'FreeRTOS', 'STM32', 'IoT', 'Embedded Linux'],
        avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80',
        education: {
            school: "SUP'COM - Higher School of Communications of Tunis",
            degree: 'National Engineering Diploma in Telecommunications',
            field_of_study: 'Embedded Systems & Connected Devices',
            start_date: '2022',
            end_date: '2026',
            is_current: true,
            grade: '15.8/20',
            activities: "SUP'COM Robotics Club Vice-President",
            description: 'Microcontroller architecture, digital signal processing, wireless sensor networks (LoRa, BLE).'
        },
        experience: {
            job_title: 'Firmware Intern',
            company: 'Actia Engineering Services',
            start_date: '2025-06',
            end_date: '2025-09',
            is_current: false,
            description: 'Developed diagnostic telemetry firmware for automotive ECUs over CAN bus and FreeRTOS.'
        }
    },
    {
        email: 'bilel.jouini@student.matchop.tn',
        name: 'Bilel Jouini',
        display_name: 'Bilel Jouini',
        headline: 'Cybersecurity Specialist @ ENSI | Ethical Hacking & Security Auditing',
        bio: 'Cybersecurity student at ENSI with active participation in national and global CTF competitions. Experienced in web vulnerability assessment, network penetration testing, and secure code reviews.',
        location: 'Tunis, Tunis',
        skills: ['Penetration Testing', 'Network Security', 'OWASP', 'Python', 'Linux', 'Wireshark'],
        avatar_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&auto=format&fit=crop&q=80',
        education: {
            school: 'ENSI - National School of Computer Sciences',
            degree: 'Computer Science Engineering Degree',
            field_of_study: 'Cybersecurity & Network Defense',
            start_date: '2022',
            end_date: '2026',
            is_current: true,
            grade: '16.0/20',
            activities: 'Securinets ENSI Core Member, SecNumAcad certified',
            description: 'Cryptography, offensive security, reverse engineering, application security.'
        },
        experience: {
            job_title: 'Security Analyst Intern',
            company: 'Focus Corporation',
            start_date: '2025-06',
            end_date: '2025-08',
            is_current: false,
            description: 'Conducted automated and manual vulnerability scans for enterprise client infrastructure, patching 15 critical CVEs.'
        }
    },
    {
        email: 'salma.chebbi@student.matchop.tn',
        name: 'Salma Chebbi',
        display_name: 'Salma Chebbi',
        headline: 'Data Analyst & Business Intelligence @ TBS | Power BI, SQL & Analytics',
        bio: 'Business analytics senior at Tunis Business School (TBS). Skilled in data modeling, interactive dashboard design, and generating actionable insights from complex commercial datasets.',
        location: 'Tunis, Tunis',
        skills: ['SQL', 'Power BI', 'Python', 'Tableau', 'DAX', 'Data Modeling'],
        avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&auto=format&fit=crop&q=80',
        education: {
            school: 'TBS - Tunis Business School',
            degree: 'Bachelor of Science in Business Administration',
            field_of_study: 'Business Analytics & Big Data',
            start_date: '2022',
            end_date: '2026',
            is_current: true,
            grade: '3.8/4.0 GPA',
            activities: 'TBS Analytics Club, Enactus TBS Member',
            description: 'Data warehousing, quantitative decision analysis, econometric modeling, predictive analytics.'
        },
        experience: {
            job_title: 'BI Analyst Intern',
            company: 'Talan Tunisia',
            start_date: '2025-06',
            end_date: '2025-09',
            is_current: false,
            description: 'Built executive KPI dashboards in Power BI tracking portfolio profitability across European accounts.'
        }
    },
    {
        email: 'rayen.jaziri@student.matchop.tn',
        name: 'Rayen Jaziri',
        display_name: 'Rayen Jaziri',
        headline: 'Backend Engineer @ ESPRIT | Go, Java Spring Boot & Microservices',
        bio: 'Backend-focused software engineering student at ESPRIT. Passionate about distributed systems, message queues, and high-concurrency server applications using Go and Spring Boot.',
        location: 'Ariana, Tunis',
        skills: ['Go', 'Java', 'Spring Boot', 'Kafka', 'PostgreSQL', 'Docker'],
        avatar_url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=300&auto=format&fit=crop&q=80',
        education: {
            school: 'ESPRIT - Private Higher School of Engineering & Technology',
            degree: 'Engineering Diploma in Computer Science',
            field_of_study: 'Cloud & Distributed Backend Systems',
            start_date: '2021',
            end_date: '2026',
            is_current: true,
            grade: 'Honors',
            activities: 'Open Source Contributor (Golang tools), ESPRIT Cloud Lab',
            description: 'Microservices architecture, asynchronous messaging, transactional consistency, database indexing.'
        },
        experience: {
            job_title: 'Backend Intern',
            company: 'Vermeg',
            start_date: '2025-06',
            end_date: '2025-09',
            is_current: false,
            description: 'Implemented high-throughput financial transaction messaging services with Kafka and Spring Boot.'
        }
    },
    {
        email: 'eya.hammami@student.matchop.tn',
        name: 'Eya Hammami',
        display_name: 'Eya Hammami',
        headline: 'Machine Learning & Generative AI @ INSAT | PyTorch, Transformers & RAG',
        bio: 'INSAT engineering student focused on Generative AI, Retrieval-Augmented Generation (RAG), and open-source LLM fine-tuning. Passionate about applying AI to education and productivity.',
        location: 'Tunis, Tunis',
        skills: ['Python', 'PyTorch', 'Transformers', 'LangChain', 'HuggingFace', 'FastAPI'],
        avatar_url: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=300&auto=format&fit=crop&q=80',
        education: {
            school: 'INSAT - National Institute of Applied Science and Technology',
            degree: "Diplôme National d'Ingénieur",
            field_of_study: 'Data Science & Applied AI',
            start_date: '2022',
            end_date: '2026',
            is_current: true,
            grade: '16.7/20',
            activities: 'AI Research Reading Group Lead at INSAT',
            description: 'Advanced Natural Language Processing, Vector Databases, Parameter-Efficient Fine-Tuning (PEFT).'
        },
        experience: {
            job_title: 'AI Research Intern',
            company: 'InstaDeep',
            start_date: '2025-06',
            end_date: '2025-09',
            is_current: false,
            description: 'Assisted in fine-tuning domain-specific transformer models for biomedical entity extraction.'
        }
    },
    {
        email: 'karim.sassi@student.matchop.tn',
        name: 'Karim Sassi',
        display_name: 'Karim Sassi',
        headline: 'QA Engineer & Test Automation @ FST | Playwright, Selenium & CI/CD',
        bio: 'Master student in Software Engineering at Faculty of Sciences of Tunis (FST). Dedicated to software quality assurance, automated end-to-end testing, and continuous deployment validation.',
        location: 'Tunis, Tunis',
        skills: ['Playwright', 'Selenium', 'Jest', 'JavaScript', 'Python', 'CI/CD'],
        avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&auto=format&fit=crop&q=80',
        education: {
            school: 'FST - Faculty of Sciences of Tunis',
            degree: 'Master in Software Quality & Engineering',
            field_of_study: 'Software Quality Assurance',
            start_date: '2023',
            end_date: '2026',
            is_current: true,
            grade: '15.5/20',
            activities: 'FST Tech Club, ISTQB Foundation Level Certified',
            description: 'Test automation design, performance profiling, load testing, regression coverage.'
        },
        experience: {
            job_title: 'QA Automation Intern',
            company: 'Expensya',
            start_date: '2025-06',
            end_date: '2025-09',
            is_current: false,
            description: 'Automated end-to-end regression suites using Playwright in GitHub Actions, reducing manual QA time by 60%.'
        }
    },
    {
        email: 'ines.miled@student.matchop.tn',
        name: 'Ines Miled',
        display_name: 'Ines Miled',
        headline: 'FinTech & Financial Modeling @ IHEC Carthage | Quantitative Analysis',
        bio: 'Master of Finance student at IHEC Carthage combining financial theory with programming. Experienced in valuation modeling, quantitative risk management, and algorithmic trading scripts in Python.',
        location: 'Tunis, Tunis',
        skills: ['Financial Modeling', 'Python', 'SQL', 'Excel VBA', 'Risk Analysis', 'Bloomberg'],
        avatar_url: 'https://images.unsplash.com/photo-1548142813-c348350df52b?w=300&auto=format&fit=crop&q=80',
        education: {
            school: 'IHEC Carthage - Institute of High Commercial Studies',
            degree: 'Master in Corporate Finance & FinTech',
            field_of_study: 'Financial Markets & Banking Technologies',
            start_date: '2023',
            end_date: '2026',
            is_current: true,
            grade: 'Top 5% of graduating class',
            activities: 'IHEC Finance & Investment Club, CFA Level 1 Candidate',
            description: 'Portfolio theory, asset pricing, quantitative methods, regulatory financial reporting.'
        },
        experience: {
            job_title: 'Financial Analyst Intern',
            company: 'Vermeg',
            start_date: '2025-06',
            end_date: '2025-09',
            is_current: false,
            description: 'Assisted in risk compliance algorithms validation for European central banking clients.'
        }
    },
    {
        email: 'skander.romdhane@student.matchop.tn',
        name: 'Skander Ben Romdhane',
        display_name: 'Skander Ben Romdhane',
        headline: 'Systems & Cloud Infrastructure @ ENIT | Linux, Ansible & Networks',
        bio: 'Engineering student at ENIT passionate about enterprise computing, network architecture, and automated server configuration. Red Hat Certified System Administrator (RHCSA).',
        location: 'Tunis, Tunis',
        skills: ['Linux', 'Ansible', 'Bash', 'Cisco Networking', 'Virtualization', 'Docker'],
        avatar_url: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=300&auto=format&fit=crop&q=80',
        education: {
            school: 'ENIT - National Engineering School of Tunis',
            degree: 'Engineering Degree in Computer Engineering',
            field_of_study: 'Network & System Architecture',
            start_date: '2022',
            end_date: '2026',
            is_current: true,
            grade: '15.7/20',
            activities: 'ENIT Linux Users Group, Cisco NetAcad Certified (CCNA)',
            description: 'Operating systems internals, enterprise switching & routing, cloud networking.'
        },
        experience: {
            job_title: 'Systems Administration Intern',
            company: 'Focus Corporation',
            start_date: '2025-06',
            end_date: '2025-08',
            is_current: false,
            description: 'Created automated Ansible playbooks for server hardening and vulnerability patching across 80+ nodes.'
        }
    },
    {
        email: 'hiba.zribi@student.matchop.tn',
        name: 'Hiba Zribi',
        display_name: 'Hiba Zribi',
        headline: 'Frontend Engineer @ ESPRIT | React, Next.js & Web Performance',
        bio: 'ESPRIT software student specializing in fast, accessible, and responsive frontend architectures. Deep knowledge of modern React patterns, Web Vitals optimization, and CSS layout algorithms.',
        location: 'Ariana, Tunis',
        skills: ['React', 'TypeScript', 'Next.js', 'CSS Modules', 'TailwindCSS', 'Web Vitals'],
        avatar_url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=300&auto=format&fit=crop&q=80',
        education: {
            school: 'ESPRIT - Private Higher School of Engineering & Technology',
            degree: 'Software Engineering Degree',
            field_of_study: 'Interactive Frontend Systems',
            start_date: '2021',
            end_date: '2026',
            is_current: true,
            grade: 'Honors',
            activities: 'Women in Tech ESPRIT Chapter Mentor',
            description: 'State management, frontend performance engineering, client-side caching, modern CSS.'
        },
        experience: {
            job_title: 'Frontend Intern',
            company: 'Medianet',
            start_date: '2025-05',
            end_date: '2025-09',
            is_current: false,
            description: 'Optimized Core Web Vitals (LCP improved by 45%) and modernized legacy UI components into React.'
        }
    },
    {
        email: 'omar.belhaj@student.matchop.tn',
        name: 'Omar Belhaj',
        display_name: 'Omar Belhaj',
        headline: 'Computer Vision & AI Engineer @ INSAT | OpenCV, YOLO & Edge AI',
        bio: 'INSAT engineering student focused on computer vision, real-time object tracking, and edge AI deployment. Experienced in optimizing neural network models for embedded platforms.',
        location: 'Tunis, Tunis',
        skills: ['OpenCV', 'Python', 'PyTorch', 'C++', 'YOLO', 'Edge AI'],
        avatar_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80',
        education: {
            school: 'INSAT - National Institute of Applied Science and Technology',
            degree: 'Engineering Diploma in Computer Science',
            field_of_study: 'Computer Vision & Intelligent Robotics',
            start_date: '2021',
            end_date: '2026',
            is_current: true,
            grade: '16.5/20',
            activities: 'National Robotic Competition (NRB) INSAT Team Captain',
            description: 'Image processing, convolutional neural networks, model quantization (TensorRT, ONNX).'
        },
        experience: {
            job_title: 'Computer Vision Intern',
            company: 'Actia Engineering Services',
            start_date: '2025-06',
            end_date: '2025-09',
            is_current: false,
            description: 'Implemented driver drowsiness detection prototype on edge devices using OpenCV and PyTorch.'
        }
    },
    {
        email: 'farah.oueslati@student.matchop.tn',
        name: 'Farah Oueslati',
        display_name: 'Farah Oueslati',
        headline: 'Product Manager & Agile Leader @ MSB | Digital Transformation',
        bio: 'Dual-background student in Business & Tech at MSB. Certified Scrum Master (PSM I) with experience aligning business goals, engineering velocity, and user feedback.',
        location: 'Tunis, Tunis',
        skills: ['Agile', 'Scrum', 'Jira', 'Product Roadmap', 'User Stories', 'User Testing'],
        avatar_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=300&auto=format&fit=crop&q=80',
        education: {
            school: 'MSB - Mediterranean School of Business',
            degree: 'Master in Management & Digital Innovation',
            field_of_study: 'Product Management & Agile Practices',
            start_date: '2023',
            end_date: '2026',
            is_current: true,
            grade: 'Summa Cum Laude',
            activities: 'President of MSB Consulting Club',
            description: 'Product lifecycle management, agile ceremonies, product-market fit metrics, stakeholder communication.'
        },
        experience: {
            job_title: 'Associate PM Intern',
            company: 'Expensya',
            start_date: '2025-05',
            end_date: '2025-09',
            is_current: false,
            description: 'Managed user feedback triage and feature prioritization for expense approval flows across 3 engineering squads.'
        }
    },
    {
        email: 'youssef.ayadi@student.matchop.tn',
        name: 'Youssef Ayadi',
        display_name: 'Youssef Ayadi',
        headline: 'Blockchain & Distributed Systems @ ESPRIT | Solidity, Rust & Web3',
        bio: 'Software engineering student at ESPRIT exploring decentralized protocols, smart contract security, and cryptographic algorithms. Creator of multiple Web3 hackathon projects.',
        location: 'Ariana, Tunis',
        skills: ['Solidity', 'Rust', 'TypeScript', 'Ethereum', 'Web3.js', 'Node.js'],
        avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80',
        education: {
            school: 'ESPRIT - Private Higher School of Engineering & Technology',
            degree: "Diplôme d'Ingénieur en Informatique",
            field_of_study: 'Distributed Systems & Smart Contracts',
            start_date: '2021',
            end_date: '2026',
            is_current: true,
            grade: 'Honors',
            activities: 'Tunisia Web3 Builders Community Co-founder',
            description: 'Consensus mechanisms, peer-to-peer networks, EVM architecture, zero-knowledge proofs basics.'
        },
        experience: {
            job_title: 'Web3 Developer Intern',
            company: 'Satoripop',
            start_date: '2025-06',
            end_date: '2025-09',
            is_current: false,
            description: 'Built and audited ERC-721 smart contracts and Web3 wallet connectors for interactive digital loyalty platform.'
        }
    },
    {
        email: 'rania.bensalem@student.matchop.tn',
        name: 'Rania Ben Salem',
        display_name: 'Rania Ben Salem',
        headline: 'Tech Marketing & Growth Hacker @ IHEC Carthage | B2B SaaS Marketing',
        bio: 'Marketing and business intelligence student at IHEC Carthage. Passionate about inbound marketing funnels, data-driven acquisition, SEO, and product-led growth strategies for tech startups.',
        location: 'Tunis, Tunis',
        skills: ['SEO', 'Google Analytics', 'HubSpot', 'Growth Hacking', 'Content Strategy', 'SQL'],
        avatar_url: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=300&auto=format&fit=crop&q=80',
        education: {
            school: 'IHEC Carthage - Institute of High Commercial Studies',
            degree: 'Master in Digital Marketing & Growth',
            field_of_study: 'Marketing Technologies & Data Analytics',
            start_date: '2023',
            end_date: '2026',
            is_current: true,
            grade: '16.1/20',
            activities: 'IHEC Marketing Club President, Google Ads Certified',
            description: 'Growth loops, performance advertising, cohort retention analysis, customer journey mapping.'
        },
        experience: {
            job_title: 'Growth Marketing Intern',
            company: 'Cognira',
            start_date: '2025-06',
            end_date: '2025-09',
            is_current: false,
            description: 'Executed technical SEO audit and LinkedIn thought-leadership campaigns, driving 40% organic traffic growth.'
        }
    },
    {
        email: 'tarek.meddeb@student.matchop.tn',
        name: 'Tarek Meddeb',
        display_name: 'Tarek Meddeb',
        headline: "IoT & Robotics Engineer @ SUP'COM | ROS, Sensors & Telemetry",
        bio: "SUP'COM telecommunications and robotics student. Experienced with ROS (Robot Operating System), embedded microcontrollers, and wireless mesh networks for autonomous robotic systems.",
        location: 'Ariana, Tunis',
        skills: ['ROS', 'Python', 'C++', 'Arduino', 'Raspberry Pi', 'MQTT'],
        avatar_url: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=300&auto=format&fit=crop&q=80',
        education: {
            school: "SUP'COM - Higher School of Communications of Tunis",
            degree: 'Engineering Degree in Telecommunications & Robotics',
            field_of_study: 'Robotics & Connected Systems',
            start_date: '2022',
            end_date: '2026',
            is_current: true,
            grade: '15.9/20',
            activities: 'IEEE Student Branch Robotics & Automation Chapter Chair',
            description: 'Autonomous robotics navigation, sensor fusion, LiDAR integration, wireless protocols.'
        },
        experience: {
            job_title: 'Robotics Intern',
            company: 'Actia Engineering Services',
            start_date: '2025-06',
            end_date: '2025-09',
            is_current: false,
            description: 'Developed autonomous obstacle-avoidance navigation routines for warehouse robotic transport units.'
        }
    }
]

// ============================================================================
// HELPER: ENSURE AUTH USER
// ============================================================================
async function ensureAuthUser(email, password, role, metadata = {}) {
    // 1. Check if user already exists
    const { data: listData, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 100 })
    if (listErr) throw listErr

    const existingUser = listData.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
    if (existingUser) {
        console.log(`[Auth] User already exists: ${email} (${existingUser.id})`)
        // Update user metadata and password if needed
        await supabase.auth.admin.updateUserById(existingUser.id, {
            password: password,
            email_confirm: true,
            user_metadata: { ...existingUser.user_metadata, type: role, role: role, ...metadata }
        })
        return existingUser.id
    }

    // 2. Create new user with confirmed email
    const { data: createData, error: createErr } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
            type: role,
            role: role,
            ...metadata
        }
    })

    if (createErr) {
        throw new Error(`Failed to create auth user ${email}: ${createErr.message}`)
    }

    console.log(`[Auth] Created user: ${email} (${createData.user.id})`)
    return createData.user.id
}

// ============================================================================
// SEED EXECUTION
// ============================================================================
async function runSeed() {
    console.log('====================================================================')
    console.log('🚀 MATCHOP INVESTOR DEMO SEEDING SCRIPT')
    console.log('Targeting:', supabaseUrl)
    console.log('Password for all accounts:', DEMO_PASSWORD)
    console.log('====================================================================\n')

    // ------------------------------------------------------------------------
    // 1. SEED COMPANIES & OFFERS
    // ------------------------------------------------------------------------
    console.log('--- SEEDING 10 COMPANIES AND OFFERS ---')
    let totalOffersCreated = 0
    const companySummary = []

    for (const c of COMPANIES_DATA) {
        try {
            const userId = await ensureAuthUser(c.email, DEMO_PASSWORD, 'company', {
                name: c.company_name,
                company_name: c.company_name,
                sector: c.industry,
                industry: c.industry,
                location: c.location,
                website: c.website
            })

            // Base profile
            await supabase.from('profiles').upsert({
                id: userId,
                email: c.email,
                name: c.company_name,
                type: 'company',
                avatar_url: c.logo_url,
                verified: true,
                verification_method: 'admin',
                active_profile_id: userId,
                suspended: false
            }, { onConflict: 'id' })

            // Multi-profile link
            await supabase.from('user_profiles').upsert({
                id: userId,
                user_id: userId,
                profile_type: 'company',
                is_default: true
            }, { onConflict: 'id' })

            // Company profile
            await supabase.from('companies').upsert({
                id: userId,
                company_name: c.company_name,
                industry: c.industry,
                description: c.description,
                location: c.location,
                governorate: c.governorate,
                website: c.website,
                website_url: c.website,
                logo_url: c.logo_url,
                company_size: c.company_size,
                culture: c.culture,
                benefits: c.benefits,
                verified: true
            }, { onConflict: 'id' })

            // Delete old test offers for this company to avoid duplicates on reruns
            await supabase.from('offers').delete().eq('company_id', userId)

            // Insert new offers
            for (const off of c.offers) {
                const { data: offerData, error: offErr } = await supabase.from('offers').insert({
                    company_id: userId,
                    title: off.title,
                    description: off.description,
                    req_skills: off.req_skills,
                    location: off.location,
                    salary_range: off.salary_range,
                    status: 'active',
                    is_exclusive: false,
                    is_global: false
                }).select('id').single()

                if (offErr) {
                    console.error(`  ❌ Error inserting offer "${off.title}":`, offErr.message)
                } else {
                    totalOffersCreated++
                }
            }

            companySummary.push({
                name: c.company_name,
                email: c.email,
                industry: c.industry,
                offersCount: c.offers.length
            })

            console.log(`✅ Company seeded: ${c.company_name} (${c.offers.length} offers)`)
        } catch (err) {
            console.error(`❌ Failed to seed company ${c.company_name}:`, err.message)
        }
    }

    // ------------------------------------------------------------------------
    // 2. SEED STUDENTS, EDUCATION & EXPERIENCES
    // ------------------------------------------------------------------------
    console.log('\n--- SEEDING 20 STUDENT ACCOUNTS ---')
    const studentSummary = []

    for (const s of STUDENTS_DATA) {
        try {
            const userId = await ensureAuthUser(s.email, DEMO_PASSWORD, 'student', {
                name: s.name,
                display_name: s.display_name,
                location: s.location,
                university: s.education.school,
                major: s.education.field_of_study,
                graduationYear: s.education.end_date,
                skills: s.skills
            })

            // Base profile
            await supabase.from('profiles').upsert({
                id: userId,
                email: s.email,
                name: s.name,
                type: 'student',
                avatar_url: s.avatar_url,
                verified: true,
                verification_method: 'admin',
                active_profile_id: userId,
                suspended: false
            }, { onConflict: 'id' })

            // Multi-profile link
            await supabase.from('user_profiles').upsert({
                id: userId,
                user_id: userId,
                profile_type: 'student',
                is_default: true
            }, { onConflict: 'id' })

            // Student profile
            await supabase.from('students').upsert({
                id: userId,
                display_name: s.display_name,
                headline: s.headline,
                bio: s.bio,
                location: s.location,
                skills: s.skills,
                avatar_url: s.avatar_url,
                open_to_work: true,
                cv_url: 'https://matchop.tn/sample-cv.pdf',
                original_docx_url: ''
            }, { onConflict: 'id' })

            // Clean old experiences & education for clean idempotency
            await supabase.from('experiences').delete().eq('student_id', userId)
            await supabase.from('student_education').delete().eq('student_id', userId)

            // Insert experience
            if (s.experience) {
                await supabase.from('experiences').insert({
                    student_id: userId,
                    job_title: s.experience.job_title,
                    company: s.experience.company,
                    start_date: s.experience.start_date,
                    end_date: s.experience.end_date,
                    is_current: s.experience.is_current,
                    description: s.experience.description
                })
            }

            // Insert education
            if (s.education) {
                await supabase.from('student_education').insert({
                    student_id: userId,
                    school: s.education.school,
                    degree: s.education.degree,
                    field_of_study: s.education.field_of_study,
                    start_date: s.education.start_date,
                    end_date: s.education.end_date,
                    is_current: s.education.is_current,
                    grade: s.education.grade,
                    activities: s.education.activities,
                    description: s.education.description
                })
            }

            studentSummary.push({
                name: s.name,
                email: s.email,
                school: s.education.school.split(' - ')[0],
                field: s.education.field_of_study,
                topSkills: s.skills.slice(0, 3).join(', ')
            })

            console.log(`✅ Student seeded: ${s.name} (${s.education.school.split(' - ')[0]})`)
        } catch (err) {
            console.error(`❌ Failed to seed student ${s.name}:`, err.message)
        }
    }

    // ------------------------------------------------------------------------
    // 3. AUTHENTICATION SMOKE TEST
    // ------------------------------------------------------------------------
    console.log('\n--- TESTING AUTHENTICATION WITH SUPABASE CLIENT ---')
    const testCompany = COMPANIES_DATA[0].email
    const testStudent = STUDENTS_DATA[0].email

    const clientSupabase = createClient(supabaseUrl, env.VITE_SUPABASE_ANON_KEY)

    const companyAuth = await clientSupabase.auth.signInWithPassword({
        email: testCompany,
        password: DEMO_PASSWORD
    })
    if (companyAuth.error) {
        console.error('❌ Company sign-in test failed:', companyAuth.error.message)
    } else {
        console.log(`✅ Company sign-in test PASSED: ${testCompany} (User ID: ${companyAuth.data.user.id})`)
    }

    const studentAuth = await clientSupabase.auth.signInWithPassword({
        email: testStudent,
        password: DEMO_PASSWORD
    })
    if (studentAuth.error) {
        console.error('❌ Student sign-in test failed:', studentAuth.error.message)
    } else {
        console.log(`✅ Student sign-in test PASSED: ${testStudent} (User ID: ${studentAuth.data.user.id})`)
    }

    console.log('\n====================================================================')
    console.log(`🎉 COMPLETED: ${companySummary.length} Companies, ${totalOffersCreated} Offers, ${studentSummary.length} Students seeded!`)
    console.log('====================================================================')
}

runSeed()
