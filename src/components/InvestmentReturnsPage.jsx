import Navbar from "./Navbar";
import InvestorReturns from "./InvestorReturns";
import ValuationUpdate from "./ValuationUpdate";

export default function InvestmentReturnsPage() {
  return <div className="min-h-screen bg-zinc-950 text-zinc-100"><Navbar /><main className="max-w-7xl mx-auto p-6 space-y-6">
    <h1 className="text-3xl font-bold">Investment returns</h1>
    <p className="text-zinc-400">Review your holdings and how much you have gained or lost on them.</p>
    <div className="grid md:grid-cols-2 gap-4">{[
      ["Estimated gain / loss", "Your share of the latest approved property valuation minus the cost of tokens you still hold. This is not a guaranteed sale price."],
      ["Realized gain / loss", "Completed sale proceeds after platform fees minus the average acquisition cost of the tokens sold. Gas is excluded."],
    ].map(([title, text]) => <div key={title} className="rounded-xl bg-zinc-900 border border-zinc-800 p-5"><h2 className="font-semibold mb-2">{title}</h2><p className="text-sm text-zinc-400">{text}</p></div>)}</div>
    <InvestorReturns /><ValuationUpdate />
  </main></div>;
}
