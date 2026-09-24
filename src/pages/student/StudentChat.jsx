import ConversationHubPage from '../../features/conversations/ConversationHubPage'

function StudentChat() {
    return (
        <ConversationHubPage
            role="student"
            baseRoute="/student/chat"
            backTo="/student/matches"
        />
    )
}

export default StudentChat
