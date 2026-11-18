export function SheetHead({ kind, aside }: { kind: React.ReactNode; aside: React.ReactNode }) {
  return (
    <header className="sheet-head">
      <p className="sheet-kind">{kind}</p>
      <p className="sheet-aside">{aside}</p>
    </header>
  );
}
