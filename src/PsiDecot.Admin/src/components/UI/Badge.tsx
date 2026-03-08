export default function Badge({ active }: { active: boolean }) {
  return (
    <span className={[
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold',
      active
        ? 'bg-accent/12 text-accent'
        : 'bg-muted/10 text-muted',
    ].join(' ')}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-accent' : 'bg-muted/50'}`} />
      {active ? 'Ativo' : 'Inativo'}
    </span>
  )
}
