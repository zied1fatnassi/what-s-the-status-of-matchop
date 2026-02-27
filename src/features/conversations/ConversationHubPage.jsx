import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertCircle, ArrowLeft, Loader, MessageCircle, Search, Send } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useMessages } from '../../hooks/useMessages'
import { useConversationThreads } from './useConversationThreads'
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

    const {
        messages,
        loading: messagesLoading,
        sendMessage,
        markAsRead
    } = useMessages(selectedThread?.id || null)

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
    }

    const goBackToInbox = () => {
        setShowMobileThread(false)
    }

    const submitMessage = async (event) => {
        event.preventDefault()
        if (!selectedThread || selectedThread.archived || !draft.trim()) return

        const result = await sendMessage(draft)
        if (result?.error) {
            setSendError(result.error)
            return
        }

        setDraft('')
        setSendError('')
        refreshThreads()
    }

    const sidebarStateLabel = statusFilter === 'archived'
        ? t('conversationHub.emptyArchived')
        : t('conversationHub.emptyResults')

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
                            <div className="conversation-thread__title">
                                <h2>{selectedThread.participant.name}</h2>
                                <p>{selectedThread.offerTitle}</p>
                            </div>
                        </header>

                        <div className="conversation-thread__messages">
                            {messagesLoading ? (
                                <div className="conversation-state">
                                    <Loader className="animate-spin" size={24} />
                                    <p>{t('conversationHub.loadingMessages')}</p>
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="conversation-state">
                                    <MessageCircle size={24} />
                                    <p>{t('conversationHub.noMessagesYet')}</p>
                                </div>
                            ) : (
                                messages.map((message) => {
                                    const ownMessage = message.sender_id === user?.id
                                    return (
                                        <article
                                            key={message.id}
                                            className={`conversation-message ${ownMessage ? 'conversation-message--own' : ''}`}
                                        >
                                            <p>{message.content}</p>
                                            <time>{formatDateTime(message.created_at, i18n.language, true)}</time>
                                        </article>
                                    )
                                })
                            )}
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

                        <form className="conversation-composer" onSubmit={submitMessage}>
                            <input
                                type="text"
                                value={draft}
                                onChange={(event) => setDraft(event.target.value)}
                                placeholder={t('conversationHub.typeMessage')}
                                disabled={selectedThread.archived}
                            />
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={selectedThread.archived || !draft.trim()}
                            >
                                <Send size={16} />
                                <span>{t('conversationHub.send')}</span>
                            </button>
                        </form>
                    </>
                )}
            </section>
        </div>
    )
}

export default ConversationHubPage
