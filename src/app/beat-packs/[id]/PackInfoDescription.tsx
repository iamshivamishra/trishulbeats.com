interface PackInfoDescriptionProps {
  description?: string;
}

function renderInlineBold(text: string) {
  // **bold** ko <strong> me convert karta hai
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

export default function PackInfoDescription({
  description,
}: PackInfoDescriptionProps) {
  if (!description) return null;

  const lines = description.split("\n");

  const elements: React.ReactNode[] = [];
  let currentList: string[] = [];

  const flushList = (key: string) => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={key} className="mb-3 space-y-1.5 last:mb-0">
          {currentList.map((item, i) => (
            <li
              key={i}
              className="text-sm leading-relaxed text-muted-foreground"
            >
              {renderInlineBold(item)}
            </li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();

    if (!line) {
      flushList(`list-${index}`);
      return;
    }

    // Headings: ### or ##
    const headingMatch = line.match(/^(#{2,3})\s+(.*)$/);
    if (headingMatch) {
      flushList(`list-${index}`);
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      elements.push(
        level === 2 ? (
          <h3
            key={index}
            className="mb-2 mt-3 text-sm font-semibold text-foreground first:mt-0 sm:text-base"
          >
            {renderInlineBold(text)}
          </h3>
        ) : (
          <h4
            key={index}
            className="mb-1.5 mt-2 text-sm font-semibold text-foreground first:mt-0"
          >
            {renderInlineBold(text)}
          </h4>
        )
      );
      return;
    }

    // Bullet: * item
    const bulletMatch = line.match(/^\*\s+(.*)$/);
    if (bulletMatch) {
      currentList.push(bulletMatch[1]);
      return;
    }

    // Plain paragraph line
    flushList(`list-${index}`);
    elements.push(
      <p
        key={index}
        className="mb-2 text-sm leading-relaxed text-muted-foreground last:mb-0"
      >
        {renderInlineBold(line)}
      </p>
    );
  });

  flushList("list-end");

  return (
    <div className="rounded-xl sm:rounded-2xl border border-border/50 bg-card/80 px-4 py-4 sm:px-5 sm:py-5 shadow-sm">
      <h2 className="mb-2 text-sm font-semibold text-foreground sm:text-base">
        Description
      </h2>
      {elements}
    </div>
  );
}