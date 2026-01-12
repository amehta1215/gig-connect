import React from 'react';

interface FormattedMessageContentProps {
  content: string;
  className?: string;
}

export function FormattedMessageContent({ content, className = '' }: FormattedMessageContentProps) {
  // Parse and render formatted content (bold, bullets, paragraphs)
  const renderContent = () => {
    // Split by double newlines for paragraphs
    const paragraphs = content.split(/\n\n+/);
    
    return paragraphs.map((paragraph, pIndex) => {
      // Check if this paragraph contains bullet points (lines starting with •, -, or *)
      const lines = paragraph.split('\n');
      const hasBullets = lines.some(line => /^[\s]*[•\-\*]/.test(line));
      
      if (hasBullets) {
        // Render as list
        const listItems: React.ReactNode[] = [];
        let currentText = '';
        
        lines.forEach((line, lineIndex) => {
          const bulletMatch = line.match(/^[\s]*[•\-\*]\s*(.*)/);
          if (bulletMatch) {
            // If there was text before this bullet, render it
            if (currentText.trim()) {
              listItems.push(
                <p key={`text-${lineIndex}`} className="mb-2">
                  {renderFormattedText(currentText.trim())}
                </p>
              );
              currentText = '';
            }
            listItems.push(
              <li key={`li-${lineIndex}`} className="ml-4 mb-1">
                {renderFormattedText(bulletMatch[1])}
              </li>
            );
          } else if (line.trim()) {
            currentText += (currentText ? ' ' : '') + line;
          }
        });
        
        // Render any remaining text
        if (currentText.trim()) {
          listItems.push(
            <p key="text-end" className="mb-2">
              {renderFormattedText(currentText.trim())}
            </p>
          );
        }
        
        return (
          <div key={pIndex} className="mb-3">
            <ul className="list-disc list-outside ml-4 space-y-1">
              {listItems}
            </ul>
          </div>
        );
      }
      
      // Render as regular paragraph with formatted text
      return (
        <p key={pIndex} className="mb-3 last:mb-0">
          {renderFormattedText(paragraph.replace(/\n/g, ' '))}
        </p>
      );
    });
  };
  
  // Handle **bold** text formatting
  const renderFormattedText = (text: string): React.ReactNode => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    
    return parts.map((part, index) => {
      // Check for bold (** or __)
      const boldMatch = part.match(/^\*\*([^*]+)\*\*$/);
      if (boldMatch) {
        return <strong key={index} className="font-semibold">{boldMatch[1]}</strong>;
      }
      return part;
    });
  };
  
  return (
    <div className={`text-sm ${className}`}>
      {renderContent()}
    </div>
  );
}
