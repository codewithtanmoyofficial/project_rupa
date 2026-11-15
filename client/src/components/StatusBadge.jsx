// Active / Inactive pill
export function StatusBadge({ status }) {
  const active = status === 'Active';
  return (
    <span
      className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full ${
        active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
      }`}
    >
      {status}
    </span>
  );
}

// Present / Pass (green) and Absent / Fail (red) are plain coloured text, as in the prototype
export function OutcomeText({ value }) {
  const good = value === 'Present' || value === 'Pass';
  return <span className={`text-sm font-semibold ${good ? 'text-green-700' : 'text-red-700'}`}>{value}</span>;
}
