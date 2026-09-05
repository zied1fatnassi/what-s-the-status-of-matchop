// @deno-types="https://esm.sh/v135/@types/react@18.2.0/index.d.ts"
import React from 'https://esm.sh/react@18.2.0'
import {
    Document,
    Page,
    View,
    Text,
    Link,
    StyleSheet,
    Font,
    Svg,
    Circle,
    Path,
} from 'https://esm.sh/@react-pdf/renderer@3.4.5'

// ─── Font Registration ───────────────────────────────────────────────
// Inter from Google Fonts CDN (Regular, SemiBold, Bold)
Font.register({
    family: 'Inter',
    fonts: [
        {
            src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf',
            fontWeight: 400,
        },
        {
            src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYMZhrib2Bg-4.ttf',
            fontWeight: 600,
        },
        {
            src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZhrib2Bg-4.ttf',
            fontWeight: 700,
        },
    ],
})

// ─── Brand Palette ───────────────────────────────────────────────────
const BRAND = {
    primary: '#3b82f6',
    primaryDark: '#2563eb',
    primaryLight: '#dbeafe',
    accentTeal: '#14b8a6',
    textDark: '#0f172a',
    textSecondary: '#475569',
    textTertiary: '#64748b',
    textMuted: '#94a3b8',
    borderLight: '#e2e8f0',
    bgSubtle: '#f8fafc',
    white: '#ffffff',
}

// ─── Styles ──────────────────────────────────────────────────────────
const s = StyleSheet.create({
    page: {
        fontFamily: 'Inter',
        fontSize: 10,
        color: BRAND.textDark,
        backgroundColor: BRAND.white,
        paddingTop: 0,
        paddingBottom: 40,
        paddingHorizontal: 0,
    },

    // ─── Header (Branded Top Bar) ───
    headerBar: {
        backgroundColor: BRAND.primary,
        paddingVertical: 28,
        paddingHorizontal: 40,
        marginBottom: 0,
    },
    headerName: {
        fontSize: 24,
        fontWeight: 700,
        color: BRAND.white,
        marginBottom: 4,
        letterSpacing: -0.5,
    },
    headerHeadline: {
        fontSize: 12,
        color: BRAND.primaryLight,
        marginBottom: 8,
    },
    headerMeta: {
        flexDirection: 'row',
        gap: 16,
        flexWrap: 'wrap',
    },
    headerMetaItem: {
        fontSize: 9,
        color: BRAND.primaryLight,
        opacity: 0.9,
    },

    // ─── Body Container ───
    body: {
        paddingHorizontal: 40,
        paddingTop: 20,
    },

    // ─── Section ───
    section: {
        marginBottom: 18,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        borderBottomWidth: 1.5,
        borderBottomColor: BRAND.primaryLight,
        paddingBottom: 5,
    },
    sectionAccent: {
        width: 4,
        height: 14,
        backgroundColor: BRAND.primary,
        borderRadius: 2,
        marginRight: 8,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: 700,
        color: BRAND.primaryDark,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },

    // ─── Bio ───
    bioText: {
        fontSize: 10,
        lineHeight: 1.6,
        color: BRAND.textSecondary,
    },

    // ─── Skills (Chip Layout) ───
    skillsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    skillChip: {
        backgroundColor: BRAND.primaryLight,
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 12,
    },
    skillText: {
        fontSize: 9,
        color: BRAND.primaryDark,
        fontWeight: 600,
    },

    // ─── Experience / Education Cards ───
    entryCard: {
        marginBottom: 12,
        paddingLeft: 12,
        borderLeftWidth: 2,
        borderLeftColor: BRAND.primary,
    },
    entryTitle: {
        fontSize: 11,
        fontWeight: 700,
        color: BRAND.textDark,
    },
    entrySubtitle: {
        fontSize: 10,
        fontWeight: 600,
        color: BRAND.primary,
        marginTop: 1,
    },
    entryDate: {
        fontSize: 9,
        color: BRAND.textTertiary,
        marginTop: 2,
    },
    entryDescription: {
        fontSize: 9.5,
        lineHeight: 1.5,
        color: BRAND.textSecondary,
        marginTop: 4,
    },

    // ─── Certifications ───
    certRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        paddingVertical: 6,
        paddingHorizontal: 10,
        backgroundColor: BRAND.bgSubtle,
        borderRadius: 6,
    },
    certName: {
        fontSize: 10,
        fontWeight: 600,
        color: BRAND.textDark,
    },
    certOrg: {
        fontSize: 9,
        color: BRAND.textSecondary,
    },
    certDate: {
        fontSize: 9,
        color: BRAND.textTertiary,
    },
    certLink: {
        fontSize: 8,
        color: BRAND.primary,
        textDecoration: 'none',
    },

    // ─── Links Section ───
    linksContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    linkItem: {
        fontSize: 9,
        color: BRAND.primary,
        textDecoration: 'none',
    },

    // ─── Footer ───
    footer: {
        position: 'absolute',
        bottom: 15,
        left: 40,
        right: 40,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 0.5,
        borderTopColor: BRAND.borderLight,
        paddingTop: 8,
    },
    footerBrand: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    footerLogo: {
        fontSize: 8,
        fontWeight: 700,
        color: BRAND.primary,
    },
    footerText: {
        fontSize: 7,
        color: BRAND.textMuted,
    },
})

// ─── Helper Components ───────────────────────────────────────────────

function SectionHeading({ title }: { title: string }) {
    return (
        <View style={s.sectionHeader}>
            <View style={s.sectionAccent} />
            <Text style={s.sectionTitle}>{title}</Text>
        </View>
    )
}

function formatDate(start: string, end: string | null, isCurrent: boolean): string {
    const startStr = start || '—'
    const endStr = isCurrent ? 'Present' : end || 'N/A'
    return `${startStr} — ${endStr}`
}

// ─── Logo Component (Simple SVG Mark) ────────────────────────────────
function MatchOpLogo() {
    return (
        <Svg width={12} height={12} viewBox="0 0 24 24">
            <Circle cx="12" cy="12" r="11" fill={BRAND.primary} />
            <Path d="M7 12l3 3 7-7" stroke={BRAND.white} strokeWidth="2.5" fill="none" />
        </Svg>
    )
}

// ─── Types ───────────────────────────────────────────────────────────

interface StudentProfile {
    display_name: string
    bio?: string
    location?: string
    skills?: string[]
    headline?: string
    avatar_url?: string
    linkedin_url?: string
    github_url?: string
    portfolio_url?: string
    behance_url?: string
}

interface Experience {
    job_title: string
    company: string
    start_date: string
    end_date?: string
    is_current: boolean
    description?: string
}

interface Education {
    institution: string
    degree: string
    field_of_study?: string
    start_date: string
    end_date?: string
    is_current: boolean
    grade?: string
}

interface Certification {
    name: string
    issuing_organization: string
    issue_date: string
    expiry_date?: string
    credential_url?: string
}

interface StudentCVProps {
    profile: StudentProfile
    email?: string
    experiences: Experience[]
    education: Education[]
    certifications: Certification[]
    generatedAt: string
}

// ─── Main Document ───────────────────────────────────────────────────

export function StudentCV({
    profile,
    email,
    experiences,
    education,
    certifications,
    generatedAt,
}: StudentCVProps) {
    const links: { label: string; url: string }[] = []
    if (profile.linkedin_url) links.push({ label: 'LinkedIn', url: profile.linkedin_url })
    if (profile.github_url) links.push({ label: 'GitHub', url: profile.github_url })
    if (profile.portfolio_url) links.push({ label: 'Portfolio', url: profile.portfolio_url })
    if (profile.behance_url) links.push({ label: 'Behance', url: profile.behance_url })

    return (
        <Document
            title={`${profile.display_name} — CV`}
            author="MatchOp"
            subject="Student CV"
            creator="MatchOp PDF Generator"
        >
            <Page size="A4" style={s.page}>
                {/* ── Branded Header ── */}
                <View style={s.headerBar}>
                    <Text style={s.headerName}>{profile.display_name || 'Student Profile'}</Text>
                    {profile.headline && (
                        <Text style={s.headerHeadline}>{profile.headline}</Text>
                    )}
                    <View style={s.headerMeta}>
                        {profile.location && (
                            <Text style={s.headerMetaItem}>📍 {profile.location}</Text>
                        )}
                        {email && (
                            <Text style={s.headerMetaItem}>✉ {email}</Text>
                        )}
                    </View>
                </View>

                <View style={s.body}>
                    {/* ── About ── */}
                    {profile.bio && (
                        <View style={s.section}>
                            <SectionHeading title="About" />
                            <Text style={s.bioText}>{profile.bio}</Text>
                        </View>
                    )}

                    {/* ── Links ── */}
                    {links.length > 0 && (
                        <View style={s.section}>
                            <SectionHeading title="Links" />
                            <View style={s.linksContainer}>
                                {links.map((link, i) => (
                                    <Link key={i} src={link.url} style={s.linkItem}>
                                        {link.label}: {link.url}
                                    </Link>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* ── Skills ── */}
                    {profile.skills && profile.skills.length > 0 && (
                        <View style={s.section}>
                            <SectionHeading title="Skills" />
                            <View style={s.skillsContainer}>
                                {profile.skills.map((skill, i) => (
                                    <View key={i} style={s.skillChip}>
                                        <Text style={s.skillText}>{skill}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* ── Experience ── */}
                    {experiences.length > 0 && (
                        <View style={s.section}>
                            <SectionHeading title="Experience" />
                            {experiences.map((exp, i) => (
                                <View key={i} style={s.entryCard}>
                                    <Text style={s.entryTitle}>{exp.job_title}</Text>
                                    <Text style={s.entrySubtitle}>{exp.company}</Text>
                                    <Text style={s.entryDate}>
                                        {formatDate(exp.start_date, exp.end_date ?? null, exp.is_current)}
                                    </Text>
                                    {exp.description && (
                                        <Text style={s.entryDescription}>{exp.description}</Text>
                                    )}
                                </View>
                            ))}
                        </View>
                    )}

                    {/* ── Education ── */}
                    {education.length > 0 && (
                        <View style={s.section}>
                            <SectionHeading title="Education" />
                            {education.map((edu, i) => (
                                <View key={i} style={s.entryCard}>
                                    <Text style={s.entryTitle}>
                                        {edu.degree}
                                        {edu.field_of_study ? ` — ${edu.field_of_study}` : ''}
                                    </Text>
                                    <Text style={s.entrySubtitle}>{edu.institution}</Text>
                                    <Text style={s.entryDate}>
                                        {formatDate(edu.start_date, edu.end_date ?? null, edu.is_current)}
                                        {edu.grade ? `  •  Grade: ${edu.grade}` : ''}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* ── Certifications ── */}
                    {certifications.length > 0 && (
                        <View style={s.section}>
                            <SectionHeading title="Certifications" />
                            {certifications.map((cert, i) => (
                                <View key={i} style={s.certRow}>
                                    <View>
                                        <Text style={s.certName}>{cert.name}</Text>
                                        <Text style={s.certOrg}>
                                            {cert.issuing_organization} • Issued {cert.issue_date}
                                        </Text>
                                    </View>
                                    {cert.credential_url && (
                                        <Link src={cert.credential_url} style={s.certLink}>
                                            View Credential →
                                        </Link>
                                    )}
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                {/* ── Footer ── */}
                <View style={s.footer} fixed>
                    <View style={s.footerBrand}>
                        <MatchOpLogo />
                        <Text style={s.footerLogo}>MatchOp</Text>
                        <Text style={s.footerText}> — Match the Opportunity</Text>
                    </View>
                    <Text style={s.footerText}>Generated {generatedAt}</Text>
                </View>
            </Page>
        </Document>
    )
}

export default StudentCV
