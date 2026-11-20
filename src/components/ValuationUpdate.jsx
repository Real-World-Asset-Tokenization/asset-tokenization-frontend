import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
export default function ValuationUpdate() {
  const { user } = useAuth();
  return <section className="p-6 border border-zinc-800 rounded-xl space-y-3">
    <h2 className="text-xl font-semibold">How property values are updated</h2>
    <p className="text-sm text-zinc-400">An authorized proposer submits a new appraisal and supporting evidence in Property Revaluation. An authorized approver reviews it in Valuation Approvals and selects Approve &amp; publish. The official value changes only after blockchain publication succeeds. Refresh your dashboard to see the recorded change.</p>
    <p className="text-sm text-zinc-400">Reference value per token = approved property valuation / total token supply. Revaluation does not mint more tokens, change your token balance, pay dividends or change existing sale offers.</p>
    {["admin", "compliance_officer"].includes(user?.role) && <div className="flex gap-4"><Link className="text-blue-300" to="/valuations/revalue">Propose a valuation</Link><Link className="text-blue-300" to="/valuations/approvals">Review approvals</Link></div>}
  </section>;
}
