interface PackInfoDescriptionProps {
  description?: string;
}

export default function PackInfoDescription({
  description,
}: PackInfoDescriptionProps) {
  if (!description) return null;

  return (
    <div className="rounded-xl sm:rounded-2xl border border-border/50 bg-card/80 px-4 py-4 sm:px-5 sm:py-5 shadow-sm">
      <h2 className="mb-2 text-sm font-semibold text-foreground sm:text-base">
        Description
      </h2>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}