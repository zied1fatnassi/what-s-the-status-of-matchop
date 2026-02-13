import React from 'react'
import { Target, Globe, Sparkles } from 'lucide-react'

const About = () => {
    return (
        <div className="container" style={{ padding: '4rem 1rem' }}>
            <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>About MatchOp</h1>
                <p style={{ fontSize: '1.25rem', color: 'var(--primary)', fontWeight: 600, marginBottom: '1.5rem' }}>
                    Revolutionizing opportunities for Tunisian talent.
                </p>
                <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', maxWidth: '800px', margin: '0 auto', lineHeight: 1.7 }}>
                    Founded by full-stack developers and leadership speakers <strong>Iheb Massabi</strong> and <strong>Zied Fatnassi</strong>, MatchOp bridges the gap between ambitious Tunisian graduates and high-quality internships worldwide. We built this AI-driven platform from our own frustrations—struggling to find meaningful opportunities despite our skills and drive.
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                <div className="glass-card hover-lift" style={{ padding: '2rem' }}>
                    <div style={{ background: 'rgba(37, 99, 235, 0.1)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', color: 'var(--primary)' }}>
                        <Target size={30} />
                    </div>
                    <h3>Our Mission</h3>
                    <p>Empower every Tunisian student to unlock their potential through bias-free, skill-focused matching. No more endless applications or gatekeepers—just real connections with companies that value excellence.</p>
                </div>

                <div className="glass-card hover-lift" style={{ padding: '2rem' }}>
                    <div style={{ background: 'rgba(139, 92, 246, 0.1)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', color: 'var(--accent-purple)' }}>
                        <Sparkles size={30} />
                    </div>
                    <h3>Why We Started</h3>
                    <p>As entrepreneurs who've spoken on stages about leadership and innovation, we mastered full-stack development but hit roadblocks finding roles that matched our potential. Today, MatchOp delivers verified, high-quality job offers so new graduates land internships and jobs faster—locally and globally.</p>
                </div>

                <div className="glass-card hover-lift" style={{ padding: '2rem' }}>
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', color: 'var(--accent-teal)' }}>
                        <Globe size={30} />
                    </div>
                    <h3>Global Reach, Local Impact</h3>
                    <p>We connect Tunisia's brightest minds with remote international opportunities. Skills know no borders, and neither do we. Every student and company on our platform is verified for trust and quality.</p>
                </div>
            </div>

            <div className="glass-card" style={{ padding: '2.5rem', textAlign: 'center', marginTop: '3rem' }}>
                <p style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Join the movement.</p>
                <p style={{ fontSize: '1.1rem', color: 'var(--primary)' }}>Swipe your way to success.</p>
            </div>
        </div>
    )
}

export default About
