import React from 'react';

interface FormattedMessageContentProps {
  content: string;
  className?: string;
}

export function FormattedMessageContent({ content, className = '' }: FormattedMessageContentProps) {
  const renderLabelColonBold = (text: string) => {
    const idx = text.indexOf(':');
    if (idx > 0 && idx < 40) {
      const label = text.slice(0, idx + 1);
      const rest = text.slice(idx + 1);
      // If label is reasonably short, treat as a "label: description" pattern.
      if (label.trim().length <= 30) {
        return (
          <>
            <strong className="font-semibold">{label}</strong>
            {rest}
          </>
        );
      }
    }
    return text;
  };

  const lines = content.split('\n');

  const blocks: React.ReactNode[] = [];
  let i = 0;

  const isBulletLine = (line: string) => /^[\s]*[•\-]\s+/.test(line);

  while (i < lines.length) {
    // skip empty lines
    while (i < lines.length && !lines[i].trim()) i++;
    if (i >= lines.length) break;

    const line = lines[i];

    // Bullet list block
    if (isBulletLine(line)) {
      const items: string[] = [];
      while (i < lines.length && isBulletLine(lines[i])) {
        items.push(lines[i].replace(/^[\s]*[•\-]\s+/, ''));
        i++;
      }
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="list-disc list-outside ml-5 space-y-1 mb-3">
          {items.map((item, idx) => (
            <li key={idx} className="text-sm">
              {renderLabelColonBold(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Paragraph / heading block (consume until blank line or bullet list starts)
    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() && !isBulletLine(lines[i])) {
      paraLines.push(lines[i]);
      i++;
    }

    const paragraph = paraLines.join(' ').trim();
    const isHeading = paragraph.endsWith(':') && paragraph.length <= 40;

    blocks.push(
      <p
        key={`p-${blocks.length}`}
        className={
          isHeading
            ? 'mb-2 text-sm font-semibold'
            : 'mb-3 last:mb-0 text-sm'
        }
      >
        {paragraph}
      </p>
    );
  }

  return <div className={className}>{blocks}</div>;
}
