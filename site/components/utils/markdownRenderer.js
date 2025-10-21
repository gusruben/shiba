import React from 'react';

function parseMarkdownSegments(text) {
  if (!text) return [{ type: 'text', content: text }];
  
  const segments = [];
  let remaining = text;
  
  const patterns = [
    // Bold + Italic: ***text*** or ___text___
    { regex: /\*\*\*(.+?)\*\*\*/g, type: 'bold-italic' },
    { regex: /___(.+?)___/g, type: 'bold-italic' },
    // Bold: **text** or __text__
    { regex: /\*\*(.+?)\*\*/g, type: 'bold' },
    { regex: /__(.+?)__/g, type: 'bold' },
    // Italic: *text* or _text_
    { regex: /\*(.+?)\*/g, type: 'italic' },
    { regex: /_(.+?)_/g, type: 'italic' },
    // Strikethrough: ~~text~~
    { regex: /~~(.+?)~~/g, type: 'strikethrough' },
    // Highlight: ==text==
    { regex: /==(.+?)==/g, type: 'highlight' },
    // Code: `code`
    { regex: /`(.+?)`/g, type: 'code' },
    // Links: [text](url)
    { regex: /\[(.+?)\]\((.+?)\)/g, type: 'link' },
  ];
  
  let position = 0;
  const matches = [];
  
  patterns.forEach(({ regex, type }) => {
    const re = new RegExp(regex.source, regex.flags);
    let match;
    while ((match = re.exec(text)) !== null) {
      matches.push({
        type,
        start: match.index,
        end: match.index + match[0].length,
        fullMatch: match[0],
        content: match[1],
        url: match[2],
      });
    }
  });
  
  matches.sort((a, b) => a.start - b.start);
  
  const validMatches = [];
  let lastEnd = 0;
  matches.forEach(match => {
    if (match.start >= lastEnd) {
      validMatches.push(match);
      lastEnd = match.end;
    }
  });
  
  position = 0;
  validMatches.forEach(match => {
    if (match.start > position) {
      segments.push({
        type: 'text',
        content: text.substring(position, match.start),
      });
    }
    
    segments.push(match);
    position = match.end;
  });
  
  if (position < text.length) {
    segments.push({
      type: 'text',
      content: text.substring(position),
    });
  }
  
  return segments.length > 0 ? segments : [{ type: 'text', content: text }];
};

function MarkdownSegment({ segment, darkMode }) {
  const codeBg = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const highlightBg = darkMode ? '#fff694ff' : '#fff694ff';
  
  switch (segment.type) {
    case 'bold':
      return <strong>{segment.content}</strong>;
    
    case 'italic':
      return <em>{segment.content}</em>;
    
    case 'bold-italic':
      return <strong><em>{segment.content}</em></strong>;
    
    case 'strikethrough':
      return <del style={{ opacity: 0.7 }}>{segment.content}</del>;
    
    case 'highlight':
      return (
        <mark style={{
          backgroundColor: highlightBg,
          padding: '2px 4px',
          borderRadius: '3px'
        }}>
          {segment.content}
        </mark>
      );
    
    case 'code':
      return (
        <code style={{
          background: codeBg,
          padding: '2px 4px',
          borderRadius: '3px',
          fontFamily: 'monospace'
        }}>
          {segment.content}
        </code>
      );
    
    case 'link':
      return (
        <a
          href={segment.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: '#ff6fa5',
            textDecoration: 'underline',
            fontWeight: 500
          }}
        >
          {segment.content}
        </a>
      );
    
    case 'text':
    default:
      return <span>{segment.content}</span>;
  }
};

function MarkdownLineRenderer({ text, darkMode }) {
  const segments = parseMarkdownSegments(text);
  return (
    <>
      {segments.map((segment, i) => (
        <MarkdownSegment key={i} segment={segment} darkMode={darkMode} />
      ))}
    </>
  );
};

function getListIndentLevel(line) {
  const match = line.match(/^( *)([-*]|\d+\.)\s/);
  if (!match) return -1;
  return Math.floor(match[1].length / 4);
}

function buildNestedListStructure(lines) {
  const items = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const level = getListIndentLevel(line);
    const match = line.match(/^( *)([-*]|\d+\.)\s(.+)/);
    
    if (match) {
      const content = match[3];
      const isOrdered = /^\d+\./.test(match[2]);
      
      items.push({
        level,
        content,
        isOrdered,
        children: [],
      });
    }
  }
  
  const root = { level: -1, children: [] };
  const stack = [root];
  
  items.forEach(item => {
    while (stack.length > 1 && stack[stack.length - 1].level >= item.level) {
      stack.pop();
    }
    
    const parent = stack[stack.length - 1];
    parent.children.push(item);
    stack.push(item);
  });
  
  return root.children;
}

function renderNestedList(items, darkMode, keyPrefix = '') {
  if (!items || items.length === 0) return null;
  
  const groups = [];
  let currentGroup = null;
  
  items.forEach((item, idx) => {
    if (!currentGroup || currentGroup.isOrdered !== item.isOrdered) {
      currentGroup = { isOrdered: item.isOrdered, items: [] };
      groups.push(currentGroup);
    }
    currentGroup.items.push(item);
  });
  
  return groups.map((group, groupIdx) => {
    const ListTag = group.isOrdered ? 'ol' : 'ul';
    const listStyle = group.isOrdered 
      ? { paddingLeft: '25px' }
      : { paddingLeft: '25px', listStyleType: 'disc' };
    
    return (
      <ListTag key={`${keyPrefix}-${groupIdx}`} style={listStyle}>
        {group.items.map((item, itemIdx) => (
          <li key={`${keyPrefix}-${groupIdx}-${itemIdx}`}>
            <MarkdownLineRenderer text={item.content} darkMode={darkMode} />
            {item.children.length > 0 && renderNestedList(item.children, darkMode, `${keyPrefix}-${groupIdx}-${itemIdx}`)}
          </li>
        ))}
      </ListTag>
    );
  });
}

const GROUP_TYPES = {
  codeblock: {
    delimiter: '```',
    isStartDelimiter: (line) => line.trim() === '```',
    isEndDelimiter: (line) => line.trim() === '```',
    matcher: null,
    priority: 100,
    canContinue: (line, currentType) => currentType === 'codeblock',
  },
  list: {
    delimiter: null,
    matcher: (line) => /^( *)([-*]|\d+\.)\s/.test(line),
    priority: 80,
    canContinue: (line, currentType) => currentType === 'list',
  },
  blockquote: {
    delimiter: null,
    matcher: (line) => /^>\s/.test(line),
    priority: 70,
    canContinue: (line, currentType) => currentType === 'blockquote',
  },
  text: {
    delimiter: null,
    matcher: () => true,
    priority: 0,
    canContinue: () => false,
  },
};

const GROUP_RENDERERS = {
  codeblock: (group, groupIdx, darkMode) => {
    const codeBlockBg = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    return (
      <pre key={groupIdx} style={{ 
        background: codeBlockBg, 
        padding: '8px', 
        borderRadius: '4px', 
        overflowX: 'auto', 
        fontFamily: 'monospace',
        marginBottom: '8px'
      }}>
        {group.lines.join('\n')}
      </pre>
    );
  },
  list: (group, groupIdx, darkMode) => {
    const structure = buildNestedListStructure(group.lines);
    return (
      <div key={groupIdx} style={{ marginBottom: '8px' }}>
        {renderNestedList(structure, darkMode, `list-${groupIdx}`)}
      </div>
    );
  },
  blockquote: (group, groupIdx, darkMode) => (
    <blockquote key={groupIdx} style={{
      borderLeft: '3px solid #ff6fa5',
      background: '#ff6fa53b',
      paddingLeft: '12px',
      margin: '8px 0',
      opacity: 0.8,
      fontStyle: 'italic'
    }}>
      {group.lines.map((line, i) => (
        <span key={i}>
          <MarkdownLineRenderer text={line.replace(/^>\s/, '')} darkMode={darkMode} />
          {i < group.lines.length - 1 && <br />}
        </span>
      ))}
    </blockquote>
  ),
  text: (group, groupIdx, darkMode) => 
    group.lines.map((line, i) => (
      <p key={`${groupIdx}-${i}`} style={{ marginBottom: '8px' }}>
        <MarkdownLineRenderer text={line} darkMode={darkMode} />
      </p>
    )),
};

function getLineGroupType(line, currentGroupType, isDelimiterBlock) {
  if (isDelimiterBlock) {
    return currentGroupType;
  }

  const sortedTypes = Object.entries(GROUP_TYPES)
    .sort(([, a], [, b]) => b.priority - a.priority);

  for (const [type, config] of sortedTypes) {
    if (config.delimiter) {
      if (config.isStartDelimiter && config.isStartDelimiter(line)) {
        return type;
      }
    } else if (config.matcher && config.matcher(line)) {
      return type;
    }
  }

  return 'text';
}

export default function MarkdownRenderer({ text, darkMode = false }) {
  if (!text) return null;
  
  const lines = text.split('\n');
  const groups = [];
  let currentGroup = [];
  let currentGroupType = null;
  let isDelimiterBlock = false;
  let delimiterConfig = null;
  
  lines.forEach((line) => {
    if (currentGroupType && delimiterConfig && delimiterConfig.isEndDelimiter) {
      if (delimiterConfig.isEndDelimiter(line)) {
        groups.push({ type: currentGroupType, lines: currentGroup });
        currentGroup = [];
        currentGroupType = null;
        isDelimiterBlock = false;
        delimiterConfig = null;
        return;
      }
      
      currentGroup.push(line);
      return;
    }

    const lineType = getLineGroupType(line, currentGroupType, isDelimiterBlock);
    const lineConfig = GROUP_TYPES[lineType];
    
    if (lineConfig.delimiter && lineConfig.isStartDelimiter && lineConfig.isStartDelimiter(line)) {
      if (currentGroup.length > 0) {
        groups.push({ type: currentGroupType, lines: currentGroup });
      }
      currentGroup = [];
      currentGroupType = lineType;
      isDelimiterBlock = true;
      delimiterConfig = lineConfig;
      return;
    }

    const shouldContinue = currentGroupType && lineType === currentGroupType && GROUP_TYPES[currentGroupType].canContinue(line, currentGroupType);
    if (shouldContinue) {
      currentGroup.push(line);
    } else {
      if (currentGroup.length > 0) {
        groups.push({ type: currentGroupType, lines: currentGroup });
      }
      currentGroup = [line];
      currentGroupType = lineType;
    }
  });
  
  if (currentGroup.length > 0) {
    groups.push({ type: currentGroupType, lines: currentGroup });
  }
  
  return (
    <div>
      {groups.map((group, groupIdx) => {
        const renderer = GROUP_RENDERERS[group.type];
        if (renderer) {
          return renderer(group, groupIdx, darkMode);
        }
        return GROUP_RENDERERS.text(group, groupIdx, darkMode);
      })}
    </div>
  );
};
