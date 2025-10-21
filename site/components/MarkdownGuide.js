import { useState, useRef, useEffect } from 'react';

export default function MarkdownGuide({ darkMode = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const guideRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (guideRef.current && !guideRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  const theme = darkMode
    ? {
        text: '#e5e7eb',
        subtext: '#cbd5e1',
        buttonText: '#e5e7eb',
        buttonBg: 'rgba(255, 255, 255, 0.06)',
        buttonBorder: 'rgba(255, 255, 255, 0.16)',
        popoverBg: '#1a1a1a',
        border: 'rgba(255, 255, 255, 0.16)',
        shadow: '0 8px 24px rgba(0, 0, 0, 0.8)',
        codeBg: 'rgba(255, 255, 255, 0.08)'
      }
    : {
        text: '#111827',
        subtext: '#666',
        buttonText: '#666',
        buttonBg: 'rgba(255, 255, 255, 0.5)',
        buttonBorder: 'rgba(0, 0, 0, 0.1)',
        popoverBg: '#ffffff',
        border: 'rgba(0, 0, 0, 0.18)',
        shadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        codeBg: 'rgba(0, 0, 0, 0.05)'
      };

  const codeStyle = {
    background: theme.codeBg,
    padding: '0 4px',
    borderRadius: '4px'
  };

  return (
    <div
      ref={guideRef}
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'end',
        position: 'relative'
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          cursor: 'pointer',
          fontSize: '11px',
          color: theme.buttonText,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '2px 6px',
          borderRadius: '4px',
          background: theme.buttonBg,
          border: `1px solid ${theme.buttonBorder}`,
          userSelect: 'none'
        }}
      >
        ℹ️ Markdown Guide
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            zIndex: 100,
            marginBottom: '24px',
            padding: '12px',
            background: theme.popoverBg,
            border: `1px solid ${theme.border}`,
            borderRadius: '8px',
            boxShadow: theme.shadow,
            fontSize: '11px',
            lineHeight: '1.6',
            minWidth: '300px',
            maxHeight: '300px',
            overflowY: 'auto',
            color: theme.text
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '12px', color: theme.text }}>
            Markdown Features:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', color: theme.subtext }}>
            <div>
              <code style={codeStyle}>**Bold text**</code> or <code style={codeStyle}>__also bold__</code>
            </div>
            <div>
              <code style={codeStyle}>*Italic text*</code> or <code style={codeStyle}>_also italic_</code>
            </div>
            <div>
              <code style={codeStyle}>***Bold and italic***</code>
            </div>
            <div>
              <code style={codeStyle}>~~Strikethrough~~</code>
            </div>
            <div>
              <code style={codeStyle}>==Highlighted text==</code>
            </div>
            <div>
              <code style={codeStyle}>`inline code`</code>
            </div>
            <div>
              <code style={codeStyle}>[Link text](https://url.com)</code>
            </div>
            <div>
              <code style={codeStyle}>&gt; Blockquote</code>
            </div>
            <div style={{ marginTop: '4px' }}>
              <strong style={{ color: theme.text }}>Lists:</strong>
              <br />
              <code style={codeStyle}>- Item 1</code>
              <br />
              <code style={codeStyle}>- Item 2</code>
            </div>
            <div style={{ marginTop: '4px' }}>
              <strong style={{ color: theme.text }}>Numbered:</strong>
              <br />
              <code style={codeStyle}>1. First</code>
              <br />
              <code style={codeStyle}>2. Second</code>
            </div>
            <div style={{ marginTop: '4px' }}>
              <strong style={{ color: theme.text }}>Code block:</strong>
              <br />
              <div style={codeStyle}>```<br />&nbsp;&nbsp;&nbsp;&nbsp;code here<br />```</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
