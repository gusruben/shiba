import React from 'react';

// Markdown rendering function for one line (basic markdown support)
export const renderMarkdownLine = (text) => {
  if (!text) return text;
  
  // Escape HTML tags
  let result = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  
  const isUnorderedList = /^[-*]\s/.test(result);
  const isOrderedList = /^\d+\.\s/.test(result);
  if (isUnorderedList) {
    result = result.replace(/^[-*]\s/, '&nbsp;&nbsp;&nbsp;&nbsp;• ');
  } else if (isOrderedList) {
    result = result.replace(/^(\d+\.\s)/g, '&nbsp;&nbsp;&nbsp;&nbsp;$1');
  }
  
  // Bold: **text** or __text__
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  result = result.replace(/__(.+?)__/g, '<strong>$1</strong>');
  
  // Italic: *text* or _text_
  result = result.replace(/\*(.+?)\*/g, '<em>$1</em>');
  result = result.replace(/_(.+?)_/g, '<em>$1</em>');
  
  // Bold + Italic: ***text*** or ___text___
  result = result.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  result = result.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');
  
  // Strikethrough: ~~text~~
  result = result.replace(/~~(.+?)~~/g, '<del style="opacity: 0.7;">$1</del>');
  
  // Highlight: ==text==
  result = result.replace(/==(.+?)==/g, '<mark style="background-color: #fff694ff; padding: 2px 4px; border-radius: 3px;">$1</mark>');

  // Code: `code`
  result = result.replace(/`(.+?)`/g, '<code style="background: rgba(0,0,0,0.1); padding: 2px 4px; border-radius: 3px; font-family: monospace; font-size: 0.9em;">$1</code>');
  
  // Links: [text](url)
  result = result.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #ff6fa5; text-decoration: underline; font-weight: 500;">$1</a>');
  
  // Blockquote: > text (check for escaped &gt;)
  if (result.startsWith('&gt; ')) {
    result = result.substring(5);
    result = `<blockquote style="border-left: 3px solid #ff6fa5; background: #ff6fa53b; padding-left: 12px; margin: 8px 0; opacity: 0.8; font-style: italic;">${result}</blockquote>`;
  }
  
  // Horizontal rule: --- or ***
  result = result.replace(/^---$/g, '<hr style="border: none; border-top: 1px solid rgba(0,0,0,0.2); margin: 12px 0;">');
  result = result.replace(/^\*\*\*$/g, '<hr style="border: none; border-top: 1px solid rgba(0,0,0,0.2); margin: 12px 0;">');
  
  // Emoji shortcodes: :emoji:
  const emojiMap = {
    ':smile:': '😊', ':fire:': '🔥', ':star:': '⭐', ':check:': '✅',
    ':x:': '❌', ':warning:': '⚠️', ':thumbsup:': '👍', ':thumbsdown:': '👎', ':eyes:': '👀',
    ':rocket:': '🚀', ':sparkles:': '✨', ':tada:': '🎉', ':100:': '💯', ':thinking:': '🤔',
    ':clap:': '👏', ':muscle:': '💪', ':brain:': '🧠', ':bug:': '🐛'
  };
  Object.keys(emojiMap).forEach(key => {
    result = result.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), emojiMap[key]);
  });
  
  return <span dangerouslySetInnerHTML={{ __html: result }} />;
};

// Render multiline markdown text
export const renderMarkdownText = (text) => {
  if (!text) return null;
  
  const lines = text.split('\n');
  const groups = [];
  let currentGroup = [];
  let isListGroup = false;
  let isCodeBlock = false;
  let codeBlockLines = [];
  
  lines.forEach((line) => {
    // Check for code block delimiters
    if (line.trim() === '```') {
      if (!isCodeBlock) {
        // Starting code block
        if (currentGroup.length > 0) {
          groups.push({ type: isListGroup ? 'list' : 'text', lines: currentGroup });
          currentGroup = [];
          isListGroup = false;
        }
        isCodeBlock = true;
        codeBlockLines = [];
      } else {
        // Ending code block
        groups.push({ type: 'codeblock', lines: codeBlockLines });
        codeBlockLines = [];
        isCodeBlock = false;
      }
      return;
    }
    
    // If inside code block, collect lines
    if (isCodeBlock) {
      codeBlockLines.push(line);
      return;
    }
    
    const isListItem = /^[-*]\s/.test(line) || /^\d+\.\s/.test(line);
    
    if (isListItem) {
      if (!isListGroup) {
        // Starting a new list group
        if (currentGroup.length > 0) {
          groups.push({ type: 'text', lines: currentGroup });
          currentGroup = [];
        }
        isListGroup = true;
      }
      currentGroup.push(line);
    } else {
      if (isListGroup) {
        // Ending a list group
        groups.push({ type: 'list', lines: currentGroup });
        currentGroup = [];
        isListGroup = false;
      }
      currentGroup.push(line);
    }
  });
  
  // Push remaining group
  if (currentGroup.length > 0) {
    groups.push({ type: isListGroup ? 'list' : 'text', lines: currentGroup });
  }
  
  // If code block wasn't closed, add it as code anyway
  if (codeBlockLines.length > 0) {
    groups.push({ type: 'codeblock', lines: codeBlockLines });
  }
  
  return (
    <div>
      {groups.map((group, groupIdx) => {
        if (group.type === 'codeblock') {
          // Render code block
          return (
            <pre key={groupIdx} style={{ 
              background: 'rgba(0,0,0,0.1)', 
              padding: '8px', 
              borderRadius: '4px', 
              overflowX: 'auto', 
              fontFamily: 'monospace', 
              fontSize: '0.9em',
              marginBottom: '8px'
            }}>
              {group.lines.join('\n')}
            </pre>
          );
        } else if (group.type === 'list') {
          // Render list items in a single <p> with <br /> separators
          return (
            <p key={groupIdx} style={{ marginBottom: '8px' }}>
              {group.lines.map((line, i) => (
                <span key={i}>
                  {renderMarkdownLine(line)}
                  {i < group.lines.length - 1 && <br />}
                </span>
              ))}
            </p>
          );
        } else {
          // Render regular text lines
          return group.lines.map((line, i) => (
            <p key={`${groupIdx}-${i}`} style={{ marginBottom: '8px' }}>
              {renderMarkdownLine(line)}
            </p>
          ));
        }
      })}
    </div>
  );
};
