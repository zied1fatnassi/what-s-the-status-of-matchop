import { useState, useRef, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Send, Paperclip, Phone, Video, MoreVertical, Loader, Sparkles } from 'lucide-react'
import ChatBubble from '../../components/ChatBubble'
import { useMessages } from '../../hooks/useMessages'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import './StudentChat.css'

function StudentChat() {
    const { matchId } = useParams()
    const { user } = useAuth()
    const { messages, sendMessage, subscribeToMessages, loading: messagesLoading } = useMessages(matchId)
    const [newMessage, setNewMessage] = useState('')
    const [matchDetails, setMatchDetails] = useState(null)
    const [loadingDetails, setLoadingDetails] = useState(true)
    const messagesEndRef = useRef(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    // Fetch match details (company info)
    useEffect(() => {
        const fetchMatchDetails = async () => {
            if (!matchId) return

            try {
                // Get match info including company details (name is in profiles, not companies)
                const { data: matchData, error } = await supabase
                    .from('matches')
                    .select(`
                        *,
                        companies (
                            id, logo_url, company_name
                        ),
                        offers (
                            title
                        )
                    `)
                    .eq('id', matchId)
                    .single()

                if (error) throw error

                // Get company name from joined data
                const companyName = matchData.companies?.company_name || 'Company'

                setMatchDetails({
                    id: matchData.id,
                    company: companyName,
                    logo: matchData.companies?.logo_url,
                    title: matchData.offers?.title || 'Job Offer',
                    isOnline: false
                })
            } catch (err) {
                console.error("Error fetching match:", err)
            } finally {
                setLoadingDetails(false)
            }
        }

        fetchMatchDetails()
    }, [matchId])

    const handleSend = async (e) => {
        e.preventDefault()
        if (!newMessage.trim()) return

        await sendMessage(newMessage)
        setNewMessage('')
    }

    if (loadingDetails) {
        return (
            <div className="chat-page flex items-center justify-center">
                <Loader className="animate-spin text-primary" size={40} />
            </div>
        )
    }

    if (!matchDetails) {
        return (
            <div className="chat-page flex flex-col items-center justify-center">
                <h3>Match not found</h3>
                <Link to="/student/matches" className="btn btn-primary mt-4">Go Back</Link>
            </div>
        )
    }

    return (
        <div className="chat-page">
            {/* Chat Header */}
            <div className="chat-header glass-card">
                <Link to="/student/matches" className="back-btn" aria-label="Back to matches">
                    <ArrowLeft size={24} />
                </Link>

                <div className="chat-user">
                    <div className="chat-avatar">
                        {matchDetails.logo ? (
                            <img src={matchDetails.logo} alt={matchDetails.company} />
                        ) : (
                            <span>{matchDetails.company.charAt(0)}</span>
                        )}
                        {matchDetails.isOnline && <span className="online-indicator" />}
                    </div>
                    <div className="chat-user-info">
                        <h3>{matchDetails.company}</h3>
                        <span className="status">
                            {matchDetails.title}
                        </span>
                    </div>
                </div>

                <div className="chat-actions">
                    <button type="button" className="action-icon" aria-label="Call company">
                        <Phone size={20} />
                    </button>
                    <button type="button" className="action-icon" aria-label="Start video call">
                        <Video size={20} />
                    </button>
                    <button type="button" className="action-icon" aria-label="More actions">
                        <MoreVertical size={20} />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="chat-messages">
                <div className="messages-container">
                    <div className="chat-date">Today</div>

                    {messages.map(message => (
                        <ChatBubble
                            key={message.id}
                            message={message.content}
                            isOwn={message.sender_id === user?.id}
                            timestamp={new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        />
                    ))}

                    {messages.length === 0 && (
                        <div className="empty-chat-state">
                            <div className="text-center opacity-50 py-6">
                                No messages yet. Start the conversation!
                            </div>

                            {/* AI Icebreakers */}
                            <IcebreakerSuggestions matchId={matchId} onSelect={setNewMessage} />
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input */}
            <form className="chat-input-container" onSubmit={handleSend}>
                <button type="button" className="attach-btn" aria-label="Attach file">
                    <Paperclip size={20} />
                </button>
                <input
                    type="text"
                    className="chat-input"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                />
                <button
                    type="submit"
                    className="send-btn"
                    aria-label="Send message"
                    disabled={!newMessage.trim()}
                >
                    <Send size={20} />
                </button>
            </form>
        </div>
    )
}

function IcebreakerSuggestions({ matchId, onSelect }) {
    const [suggestions, setSuggestions] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchSuggestions = async () => {
            try {
                const { data, error } = await supabase.functions.invoke('suggest-icebreakers', {
                    body: { match_id: matchId }
                })

                if (error) throw error
                if (data?.suggestions) setSuggestions(data.suggestions)
            } catch (err) {
                console.error("Failed to load icebreakers:", err)
            } finally {
                setLoading(false)
            }
        }

        fetchSuggestions()
    }, [matchId])

    if (loading) return (
        <div className="icebreakers-loading">
            <Sparkles size={16} className="animate-pulse text-purple-500" />
            <span>AI is brainstorming openers...</span>
        </div>
    )

    if (suggestions.length === 0) return null

    return (
        <div className="icebreakers-container">
            <div className="icebreakers-header">
                <Sparkles size={16} className="text-purple-500" />
                <span>AI Suggestions</span>
            </div>
            <div className="icebreakers-list">
                {suggestions.map((text, i) => (
                    <button
                        key={i}
                        className="icebreaker-chip"
                        onClick={() => onSelect(text)}
                    >
                        {text}
                    </button>
                ))}
            </div>
        </div>
    )
}

export default StudentChat
