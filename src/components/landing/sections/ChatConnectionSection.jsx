import { useState } from 'react'
import { MessageSquare, Video, Calendar, Send, ShieldCheck } from 'lucide-react'
import { TextReveal } from '../motion/TextReveal'
import { SectionReveal } from '../motion/SectionReveal'
import { useBilingualText } from '../../../lib/useBilingualText'

export function ChatConnectionSection() {
  const tr = useBilingualText()

  const [inputMessage, setInputMessage] = useState('')
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'company',
      name: 'Sarah (Head of Engineering @ Veloce)',
      avatar: 'VL',
      time: '10:42 AM',
      text: tr(
        'Hi Ahmed! We loved your open-source projects and experience with React & vector embeddings. Would you be open for a 30-min architecture chat this Thursday?',
        'Bonjour Ahmed ! Nous avons adoré vos projets open-source et votre maîtrise de React & des embeddings. Seriez-vous disponible pour un échange technique de 30 min ce jeudi ?'
      ),
      actions: [
        { icon: Calendar, label: tr('Thursday, 2:00 PM', 'Jeudi, 14:00') },
        { icon: Video, label: tr('MatchOp Video Room', 'Salle Vidéo MatchOp') },
      ],
    },
    {
      id: 2,
      sender: 'student',
      name: 'Ahmed Ben Ali',
      avatar: 'AB',
      time: '10:45 AM',
      text: tr(
        'Hello Sarah! Thank you for reaching out. Thursday at 2:00 PM works perfectly for me. Looking forward to discussing the platform architecture!',
        'Bonjour Sarah ! Merci beaucoup. Jeudi à 14:00 me convient parfaitement. Hâte d’échanger sur l’architecture de la plateforme !'
      ),
    },
  ])

  const handleSendMessage = (e) => {
    e?.preventDefault()
    if (!inputMessage.trim()) return

    const newMessage = {
      id: Date.now(),
      sender: 'student',
      name: 'Ahmed Ben Ali',
      avatar: 'AB',
      time: 'Just now',
      text: inputMessage.trim(),
    }

    setMessages((prev) => [...prev, newMessage])
    setInputMessage('')
  }

  return (
    <section className="landing-chat-connection" id="chat-connection">
      <div className="container landing-chat-connection__container">
        {/* Section Header */}
        <SectionReveal delay={0.1} yOffset={20} className="landing-section-header">
          <div className="landing-badge">
            <MessageSquare size={14} className="landing-badge__icon" />
            <span className="landing-badge__text">
              {tr('Direct Collaboration', 'Échanges directs')}
            </span>
          </div>

          <h2 className="landing-section-title">
            <TextReveal
              as="span"
              delay={0.2}
              serifWords={['Conversation', 'Direct', 'Seconds', 'Instant']}
            >
              {tr(
                'From match to direct conversation in seconds.',
                'Du match à la discussion directe en quelques secondes.'
              )}
            </TextReveal>
          </h2>

          <p className="landing-section-subtitle">
            {tr(
              'No recruiter middlemen. Direct end-to-end communication with engineering leads, complete with integrated interview scheduling and calendar sync.',
              'Sans intermédiaire. Dialoguez directement avec les responsables techniques avec planification intégrée des entretiens.'
            )}
          </p>
        </SectionReveal>

        {/* Live Chat Mockup */}
        <SectionReveal delay={0.3} yOffset={30} className="landing-chat-mockup-wrapper">
          <div className="chat-mockup-window">
            {/* Window Header */}
            <div className="chat-mockup-header">
              <div className="chat-mockup-header__user">
                <div className="chat-avatar">VL</div>
                <div>
                  <div className="chat-user-name">
                    <span>Veloce Labs • Engineering Team</span>
                    <ShieldCheck size={14} className="verified-icon" />
                  </div>
                  <span className="chat-status-indicator">
                    <span className="status-dot" /> {tr('Active now', 'En ligne')}
                  </span>
                </div>
              </div>

              <div className="chat-mockup-header__actions">
                <button type="button" className="chat-action-pill">
                  <Video size={14} />
                  <span>{tr('Start Video Call', 'Appel Vidéo')}</span>
                </button>
              </div>
            </div>

            {/* Message Stream */}
            <div className="chat-mockup-messages">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`chat-bubble-row chat-bubble-row--${msg.sender}`}
                >
                  <div className={`chat-avatar chat-avatar--${msg.sender}`}>
                    {msg.avatar}
                  </div>
                  <div className="chat-bubble-content">
                    <div className="chat-bubble-meta">
                      <span className="chat-sender-name">{msg.name}</span>
                      <span className="chat-time">{msg.time}</span>
                    </div>

                    <div className="chat-bubble">
                      <p>{msg.text}</p>
                      {msg.actions && (
                        <div className="chat-interactive-chips">
                          {msg.actions.map((act, i) => {
                            const Icon = act.icon
                            return (
                              <div key={i} className="interactive-chip">
                                <Icon size={13} />
                                <span>{act.label}</span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Chat Input Bar */}
            <form onSubmit={handleSendMessage} className="chat-mockup-input-bar">
              <input
                type="text"
                placeholder={tr('Type your reply to Veloce Labs...', 'Écrivez votre réponse à Veloce Labs...')}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                className="chat-input"
              />
              <button
                type="submit"
                className="chat-send-btn"
                disabled={!inputMessage.trim()}
                aria-label="Send message"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </SectionReveal>
      </div>
    </section>
  )
}

export default ChatConnectionSection
