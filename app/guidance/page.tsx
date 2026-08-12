export default function GuidancePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-card">
        <h2 className="text-lg font-semibold">Phase 1 pilot guidance</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          USDOT releases about 50–60 competitive NOFOs each year. For each 25–30 page notice, staff currently review 100+
          unfunded Unifier projects against eligibility, evaluation criteria, program priorities, and funding objectives —
          3,500–4,800 evaluations a year. This agent automates the comparison so the Grant Manager can spend time on
          judgment, not document triage.
        </p>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm">
          <li>AI has access to Unifier project data (Phase 1: export).</li>
          <li>Upload a NOFO (or use the SS4A / RAISE / BIP / PROTECT samples).</li>
          <li>AI extracts eligibility, evaluation criteria, priorities, and funding objectives.</li>
          <li>The agent retrieves unfunded projects and compares every project to the NOFO.</li>
          <li>Projects are ranked by match score with explanations.</li>
          <li>The Grant Manager reviews, comments, and finalizes. The final decision remains with the Grant Manager.</li>
          <li>Feedback improves future recommendations.</li>
        </ol>
        <h3 className="mt-5 font-semibold">Safeguards</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          <li>Scores are decision support, not an award recommendation to USDOT.</li>
          <li>Extracted criteria should be spot-checked against the source NOFO.</li>
          <li>Equity, rural, and crash fields depend on Unifier data quality.</li>
          <li>Do not upload documents with controlled unclassified or personally identifiable information beyond project fields needed for matching.</li>
        </ul>
      </section>
    </div>
  );
}
