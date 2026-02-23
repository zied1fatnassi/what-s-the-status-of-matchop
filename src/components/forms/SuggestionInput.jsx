import { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import './SuggestionInput.css';

export default function SuggestionInput({ value, onChange, options = [], placeholder, className = '' }) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Filter options based on input value
    const filteredOptions = options.filter(opt =>
        opt.toLowerCase().includes((value || '').toLowerCase())
    );

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (option) => {
        onChange(option);
        setIsOpen(false);
    };

    const handleOther = () => {
        setIsOpen(false);
        // We keep the current value (or clear it if user prefers, but typically "Other" implies "I will type now")
        // If the current value was empty, user can just type.
        // If it was "Engineer" matches "Software Engineer", picking other implies "Engineer" is what I want.
        // So actually, just closing the dropdown is sufficient.
    };

    return (
        <div className={`suggestion-input-container ${className}`} ref={containerRef}>
            <div className="input-wrapper">
                <input
                    type="text"
                    value={value}
                    onChange={(e) => {
                        onChange(e.target.value);
                        if (!isOpen) setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    placeholder={placeholder}
                    className="form-input"
                />
            </div>

            {isOpen && (
                <ul className="suggestion-dropdown">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((opt, index) => (
                            <li
                                key={index}
                                className="suggestion-item"
                                onClick={() => handleSelect(opt)}
                            >
                                {opt}
                            </li>
                        ))
                    ) : (
                        <li className="suggestion-item no-match">
                            No exact matches found
                        </li>
                    )}

                    <li
                        className="suggestion-item other-option"
                        onClick={handleOther}
                    >
                        <Plus size={14} /> Other (Type manually)
                    </li>
                </ul>
            )}
        </div>
    );
}
