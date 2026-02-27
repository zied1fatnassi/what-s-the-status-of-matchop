import ConversationHubPage from '../../features/conversations/ConversationHubPage'

function CompanyChat() {
    return (
        <ConversationHubPage
            role="company"
            baseRoute="/company/chat"
            backTo="/company/candidates"
        />
    )
}

export default CompanyChat
