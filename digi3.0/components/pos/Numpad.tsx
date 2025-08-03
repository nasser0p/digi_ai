import React from 'react';

interface NumpadProps {
    onInput: (value: string) => void;
    onClear: () => void;
    onBackspace: () => void;
}

const Numpad: React.FC<NumpadProps> = ({ onInput, onClear, onBackspace }) => {
    const buttons = [
        '1', '2', '3',
        '4', '5', '6',
        '7', '8', '9',
        'C', '0', '.'
    ];

    const handleClick = (value: string) => {
        if (value === 'C') {
            onClear();
        } else {
            onInput(value);
        }
    };

    return (
        <div className="grid grid-cols-3 gap-2">
            {buttons.map(btn => (
                <button
                    key={btn}
                    onClick={() => handleClick(btn)}
                    className="py-4 text-2xl font-semibold bg-white dark:bg-brand-gray-700 rounded-lg shadow-sm hover:bg-brand-gray-100 dark:hover:bg-brand-gray-600 transition-colors"
                >
                    {btn}
                </button>
            ))}
            <button
                onClick={onBackspace}
                className="col-span-3 py-3 text-xl font-semibold bg-white dark:bg-brand-gray-700 rounded-lg shadow-sm hover:bg-brand-gray-100 dark:hover:bg-brand-gray-600 transition-colors"
            >
                &larr; Backspace
            </button>
        </div>
    );
};

export default Numpad;