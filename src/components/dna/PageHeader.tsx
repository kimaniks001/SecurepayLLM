/** The page-title + one-line supporting text pattern already used identically in MoneyExperience
 * and MoneyOperationsExperience: font-display heading in forest, quiet sand-600 supporting line. */
export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <h1 className="font-display text-2xl text-forest-800">{title}</h1>
      {description && <p className="mt-1 text-sm text-sand-600">{description}</p>}
    </div>
  );
}
