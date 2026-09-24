import UpgradeModal from './UpgradeModal'

function PremiumUpsellModal({
    isOpen,
    reason = 'generic',
    onClose,
    onUpgrade
}) {
    return (
        <UpgradeModal
            isOpen={isOpen}
            reason={reason}
            onClose={onClose}
            onUpgrade={onUpgrade}
        />
    )
}

export default PremiumUpsellModal
