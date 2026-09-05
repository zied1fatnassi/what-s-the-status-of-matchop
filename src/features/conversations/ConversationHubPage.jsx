import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
    AlertCircle,
    ArrowLeft,
    Check,
    CheckCheck,
    Clock,
    Download,
    ExternalLink,
    FileText,
    Loader,
    Loader2,
    MessageCircle,
    Paperclip,
    Search,
    Send,
    Sparkles,
    UserCheck
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useMessages } from '../../hooks/useMessages'
import { useConversationThreads } from './useConversationThreads'
import { CandidateProfileModal } from './CandidateProfileModal'
import { supabase } from '../../lib/supabase'
import { getSignedCVUrl } from '../../lib/storage'
import './ConversationHubPage.css'

function formatDateTime(value, locale, withTime = false) {
    if (!value) return ''
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return ''

    if (withTime) {
        return parsed.toLocaleTimeString(locale, {
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    return parsed.toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric'
    })
}

function MessageBubbleContent({ content }) {
    // Detect PDF / CV links inside the message
    const urlRegex = /(https?:\/\/[^\s]+(?:\.pdf|[^\s]*token=[^\s]*|[^\s]*cvs[^\s]*))/i
    const match = content.match(urlRegex)

    if (match) {
        const cvUrl = match[0]
        const prefixText = content.replace(cvUrl, '').trim()

        return (
            <div className="message-card-attachment">
                {prefixText && <p className="message-card-text">{prefixText}</p>}
                <div className="message-attachment-box">
                    <div className="message-attachment-icon">
                        <FileText size={24} />
                    </div>
                    <div className="message-attachment-info">
                        <span className="message-attachment-title">Curriculum Vitae</span>
                        <span className="message-attachment-sub">Document PDF</span>
                    </div>
                    <a
                        href={cvUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="message-attachment-action"
                        aria-label="Ouvrir le document"
                    >
                        <span>Consulter</span>
                        <ExternalLink size={13} />
                    </a>
                </div>
            </div>
        )
    }

    return <p>{content}</p>
}

function ConversationHubPage({ role = 'student', baseRoute, backTo }) {
    const navigate = useNavigate()
    const { matchId } = useParams()
    const { t, i18n } = useTranslation()
    const { user } = useAuth()

    const {
        threads,
        allThreads,
        loading: threadsLoading,
        error: threadsError,
        search,
        statusFilter,
        setSearch,
        setStatusFilter,
        refresh: refreshThreads
    } = useConversationThreads(role)

    const selectedThread = useMemo(
        () => allThreads.find((thread) => thread.id === matchId) || null,
        [allThreads, matchId]
    )

    const [showMobileThread, setShowMobileThread] = useState(() => {
        if (typeof window === 'undefined') return true
        return window.innerWidth >= 1024
    })
    const [draft, setDraft] = useState('')
    const [sendError, setSendError] = useState('')
    const [cvToast, setCvToast] = useState('')
    const [isSharingCv, setIsSharingCv] = useState(false)
    const [showProfileModal, setShowProfileModal] = useState(false)

    const messagesEndRef = useRef(null)
    const textareaRef = useRef(null)

    const {
        messages,
        loading: messagesLoading,
        sendMessage,
        markAsRead
    } = useMessages(selectedThread?.id || null)

    // Auto-scroll to bottom whenever messages list updates
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, selectedThread?.id])

    useEffect(() => {
        const onResize = () => {
            if (window.innerWidth >= 1024) {
                setShowMobileThread(true)
            } else if (!selectedThread) {
                setShowMobileThread(false)
            }
        }

        window.addEventListener('resize', onResize)
        return () => window.removeEventListener('resize', onResize)
    }, [selectedThread])

    useEffect(() => {
        if (!selectedThread?.id) return

        markAsRead()
            .then(() => refreshThreads())
            .catch(() => {})
    }, [markAsRead, refreshThreads, selectedThread?.id])

    const openThread = (threadId) => {
        navigate(`${baseRoute}/${threadId}`)
        setShowMobileThread(true)
        setSendError('')
        setCvToast('')
    }

    const goBackToInbox = () => {
        setShowMobileThread(false)
    }

    const submitMessage = async (event) => {
        if (event) event.preventDefault()
        if (!selectedThread || selectedThread.archived || !draft.trim()) return

        const contentToSend = draft
        setDraft('')
        setSendError('')

        const result = await sendMessage(contentToSend)
        if (result?.error) {
            setSendError(result.error)
            setDraft(contentToSend)
            return
        }

        refreshThreads()
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            submitMessage()
        }
    }

    // Student shortcut: send CV link directly in chat
    const handleShareCv = async () => {
        if (!user?.id || !selectedThread) return
        setIsSharingCv(true)
        setCvToast('')

        try {
            const { data: student, error: studentError } = await supabase
                .from('students')
                .select('cv_url, display_name')
                .eq('id', user.id)
                .maybeSingle()

            if (studentError || !student?.cv_url) {
                setCvToast("Vous n'avez pas encore téléversé de CV sur votre profil. Rendez-vous dans votre Profil pour en ajouter un.")
                return
            }

            const signedUrl = await getSignedCVUrl(student.cv_url, 86400 * 3) // 3 days validity
            if (!signedUrl) {
                setCvToast("Impossible d'accéder au fichier CV pour le moment.")
                return
            }

            const cvMessage = `📄 Voici mon CV (${student.display_name || 'Candidat'}) :\n${signedUrl}`
            const result = await sendMessage(cvMessage)

            if (result?.error) {
                setSendError(result.error)
            } else {
                refreshThreads()
            }
        } catch (err) {
            console.error('[handleShareCv] error:', err)
            setCvToast('Erreur lors du partage du CV.')
        } finally {
            setIsSharingCv(false)
        }
    }

    // Shortcut quick chip appender
    const handleInsertShortcut = (text) => {
        setDraft(text)
        textareaRef.current?.focus()
    }

    const sidebarStateLabel = statusFilter === 'archived'
        ? t('conversationHub.emptyArchived')
        : t('conversationHub.emptyResults')

    // Target student ID for company viewing candidate profile
    const candidateStudentId = role === 'company'
        ? (selectedThread?.studentId || selectedThread?.participant?.id || null)
        : null

    return (
        <div className="conversation-hub">
            <aside className={`conversation-sidebar ${showMobileThread ? 'conversation-sidebar--mobile-hidden' : ''}`}>
                <div className="conversation-sidebar__header">
                    <h1>{t('conversationHub.title')}</h1>
                    <p>{t('conversationHub.subtitle')}</p>
                </div>

                <div className="conversation-sidebar__controls">
                    <label htmlFor="conversation-search" className="conversation-search-label">
                        {t('conversationHub.searchLabel')}
                    </label>
                    <div className="conversation-search">
                        <Search size={16} />
                        <input
                            id="conversation-search"
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder={t('conversationHub.searchPlaceholder')}
                        />
                    </div>

                    <div className="conversation-filter" role="tablist" aria-label={t('conversationHub.filterLabel')}>
                        {[
                            { key: 'all', label: t('conversationHub.filters.all') },
                            { key: 'active', label: t('conversationHub.filters.active') },
                            { key: 'archived', label: t('conversationHub.filters.archived') }
                        ].map((option) => (
                            <button
                                key={option.key}
                                type="button"
                                className={`conversation-filter__btn ${statusFilter === option.key ? 'active' : ''}`}
                                onClick={() => setStatusFilter(option.key)}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="conversation-sidebar__content">
                    {threadsLoading ? (
                        <div className="conversation-state">
                            <Loader className="animate-spin" size={24} />
                            <p>{t('conversationHub.loading')}</p>
                        </div>
                    ) : threadsError ? (
                        <div className="conversation-state conversation-state--error">
                            <AlertCircle size={22} />
                            <p>{threadsError}</p>
                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => refreshThreads()}>
                                {t('conversationHub.retry')}
                            </button>
                        </div>
                    ) : threads.length === 0 ? (
                        <div className="conversation-state">
                            <MessageCircle size={24} />
                            <p>{sidebarStateLabel}</p>
                        </div>
                    ) : (
                        <ul className="conversation-list">
                            {threads.map((thread) => (
                                <li key={thread.id}>
                                    <button
                                        type="button"
                                        className={`conversation-list__item ${thread.id === selectedThread?.id ? 'selected' : ''}`}
                                        onClick={() => openThread(thread.id)}
                                    >
                                        <div className="conversation-list__avatar" aria-hidden="true">
                                            {thread.participant.avatarUrl ? (
                                                <img src={thread.participant.avatarUrl} alt="" />
                                            ) : (
                                                <span>{thread.participant.name.charAt(0)}</span>
                                            )}
                                        </div>

                                        <div className="conversation-list__body">
                                            <div className="conversation-list__top">
                                                <h3>{thread.participant.name}</h3>
                                                <time>{formatDateTime(thread.lastActivityAt, i18n.language)}</time>
                                            </div>
                                            <p className="conversation-list__offer">{thread.offerTitle}</p>
                                            <p className="conversation-list__preview">
                                                {thread.lastMessage || t('conversationHub.noMessagesYet')}
                                            </p>
                                        </div>

                                        <div className="conversation-list__meta">
                                            {thread.archived && (
                                                <span className="conversation-list__badge conversation-list__badge--archived">
                                                    {t('conversationHub.archived')}
                                                </span>
                                            )}
                                            {thread.unreadCount > 0 && (
                                                <span className="conversation-list__badge">{thread.unreadCount}</span>
                                            )}
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </aside>

            <section className={`conversation-thread ${!showMobileThread ? 'conversation-thread--mobile-hidden' : ''}`}>
                {!selectedThread ? (
                    <div className="conversation-thread__empty">
                        <AlertCircle size={28} />
                        <h2>{t('conversationHub.threadNotFoundTitle')}</h2>
                        <p>{matchId ? t('conversationHub.threadNotFound') : t('conversationHub.pickConversation')}</p>
                        <Link to={backTo} className="btn btn-secondary">
                            {t('conversationHub.backToMatches')}
                        </Link>
                    </div>
                ) : (
                    <>
                        <header className="conversation-thread__header">
                            <button
                                type="button"
                                className="conversation-back"
                                onClick={goBackToInbox}
                                aria-label={t('conversationHub.backToInbox')}
                            >
                                <ArrowLeft size={18} />
                            </button>

                            <div
                                className="conversation-thread__profile-trigger"
                                onClick={() => {
                                    if (role === 'company' && candidateStudentId) {
                                        setShowProfileModal(true)
                                    }
                                }}
                                title={role === 'company' ? 'Cliquer pour voir le profil' : undefined}
                                style={{ cursor: role === 'company' ? 'pointer' : 'default' }}
                            >
                                <div className="conversation-thread__avatar-wrap">
                                    {selectedThread.participant.avatarUrl ? (
                                        <img src={selectedThread.participant.avatarUrl} alt="" className="conversation-thread__avatar-img" />
                                    ) : (
                                        <div className="conversation-thread__avatar-fallback">
                                            {selectedThread.participant.name.charAt(0)}
                                        </div>
                                    )}
                                    <span className="conversation-thread__online-dot" />
                                </div>

                                <div className="conversation-thread__title">
                                    <h2>{selectedThread.participant.name}</h2>
                                    <p>{selectedThread.offerTitle}</p>
                                </div>
                            </div>

                            {/* Company action: View Full Candidate Profile */}
                            {role === 'company' && candidateStudentId && (
                                <button
                                    type="button"
                                    className="conversation-header-profile-btn"
                                    onClick={() => setShowProfileModal(true)}
                                    aria-label="Voir le profil complet du candidat"
                                >
                                    <UserCheck size={16} />
                                    <span>Voir le profil</span>
                                </button>
                            )}
                        </header>

                        <div className="conversation-thread__messages">
                            {messagesLoading ? (
                                <div className="conversation-state">
                                    <Loader className="animate-spin" size={24} />
                                    <p>{t('conversationHub.loadingMessages')}</p>
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="conversation-thread-welcome">
                                    <div className="conversation-welcome-icon">
                                        <MessageCircle size={32} />
                                    </div>
                                    <h3>Commencez la conversation</h3>
                                    <p>Échangez directement pour convenir d'un entretien ou poser vos questions.</p>
                                </div>
                            ) : (
                                messages.map((message) => {
                                    const ownMessage = message.sender_id === user?.id
                                    return (
                                        <article
                                            key={message.id}
                                            className={`conversation-message ${ownMessage ? 'conversation-message--own' : ''}`}
                                        >
                                            <MessageBubbleContent content={message.content} />
                                            <div className="conversation-message__footer">
                                                <time>{formatDateTime(message.created_at, i18n.language, true)}</time>
                                                {ownMessage && (
                                                    <span className="conversation-message__tick" title={message.isOptimistic ? 'Envoi en cours...' : message.is_read ? 'Lu' : 'Distribué'}>
                                                        {message.isOptimistic ? (
                                                            <Clock size={12} className="message-clock-icon" />
                                                        ) : message.is_read ? (
                                                            <CheckCheck size={14} className="message-read-icon" />
                                                        ) : (
                                                            <Check size={13} className="message-sent-icon" />
                                                        )}
                                                    </span>
                                                )}
                                            </div>
                                        </article>
                                    )
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {selectedThread.archived && (
                            <div className="conversation-thread__archived">
                                <AlertCircle size={16} />
                                <span>{t('conversationHub.archivedNotice')}</span>
                            </div>
                        )}

                        {sendError && (
                            <div className="conversation-thread__error" role="alert">
                                {sendError}
                            </div>
                        )}

                        {cvToast && (
                            <div className="conversation-thread__toast" role="alert">
                                <AlertCircle size={16} />
                                <span>{cvToast}</span>
                                <button type="button" onClick={() => setCvToast('')} className="conversation-toast-close">×</button>
                            </div>
                        )}

                        {/* Shortcuts Bar */}
                        {!selectedThread.archived && (
                            <div className="conversation-shortcuts-bar">
                                {role === 'student' ? (
                                    <>
                                        <button
                                            type="button"
                                            className="conversation-shortcut-btn conversation-shortcut-btn--accent"
                                            onClick={handleShareCv}
                                            disabled={isSharingCv}
                                            title="Partager le CV officiel déposé sur votre profil"
                                        >
                                            {isSharingCv ? (
                                                <Loader2 size={13} className="animate-spin" />
                                            ) : (
                                                <FileText size={13} />
                                            )}
                                            <span>Partager mon CV</span>
                                        </button>
                                        <button
                                            type="button"
                                            className="conversation-shortcut-btn"
                                            onClick={() => handleInsertShortcut("Bonjour, merci pour votre retour ! Je suis très intéressé par le poste.")}
                                        >
                                            👋 Bonjour !
                                        </button>
                                        <button
                                            type="button"
                                            className="conversation-shortcut-btn"
                                            onClick={() => handleInsertShortcut("Je suis disponible cette semaine pour un échange téléphonique ou visio.")}
                                        >
                                            📅 Disponible pour entretien
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            className="conversation-shortcut-btn conversation-shortcut-btn--accent"
                                            onClick={() => setShowProfileModal(true)}
                                            title="Voir le CV et les détails du candidat"
                                        >
                                            <UserCheck size={13} />
                                            <span>Voir le profil & CV</span>
                                        </button>
                                        <button
                                            type="button"
                                            className="conversation-shortcut-btn"
                                            onClick={() => handleInsertShortcut("Bonjour, votre profil nous intéresse ! Seriez-vous disponible pour un court entretien cette semaine ?")}
                                        >
                                            📅 Proposer un entretien
                                        </button>
                                        <button
                                            type="button"
                                            className="conversation-shortcut-btn"
                                            onClick={() => handleInsertShortcut("Bonjour, pourriez-vous nous partager votre CV complet s'il vous plaît ? Merci !")}
                                        >
                                            📄 Demander le CV
                                        </button>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Composer Form */}
                        <form className="conversation-composer" onSubmit={submitMessage}>
                            <input
                                ref={textareaRef}
                                type="text"
                                value={draft}
                                onChange={(event) => setDraft(event.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={t('conversationHub.typeMessage')}
                                disabled={selectedThread.archived}
                            />
                            <button
                                type="submit"
                                className="btn btn-primary conversation-send-btn"
                                disabled={selectedThread.archived || !draft.trim()}
                                aria-label={t('conversationHub.send')}
                            >
                                <Send size={16} />
                                <span className="send-btn-label">{t('conversationHub.send')}</span>
                            </button>
                        </form>
                    </>
                )}
            </section>

            {/* Candidate Public Profile Modal */}
            {candidateStudentId && (
                <CandidateProfileModal
                    studentId={candidateStudentId}
                    offerId={selectedThread?.offerId}
                    isOpen={showProfileModal}
                    onClose={() => setShowProfileModal(false)}
                />
            )}
        </div>
    )
}

export default ConversationHubPage
