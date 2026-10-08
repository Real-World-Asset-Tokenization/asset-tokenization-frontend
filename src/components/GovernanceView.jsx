import React, { useState } from "react";
import {
  Vote,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  ShieldCheck,
  Coins,
  AlertCircle,
  FileText,
  User,
  ChevronLeft,
  Sparkles,
  BarChart3
} from "lucide-react";

export default function GovernanceView({ wallet, assets, userBalances }) {
  const [selectedProposalId, setSelectedProposalId] = useState(1);
  const [userVoted, setUserVoted] = useState({});
  const [voteModalOpen, setVoteModalOpen] = useState(false);
  const [selectedVoteDecision, setSelectedVoteDecision] = useState("YES");
  const [voteSuccessMessage, setVoteSuccessMessage] = useState("");

  // Seeded RWA Governance Proposals matching the tokenized properties
  const [proposals, setProposals] = useState([
    {
      id: 1,
      assetId: 1,
      propertyName: "Colombo Oceanfront Residence (COR-01)",
      title: "[RWA-01] Authorize 12-Month Corporate Long-Term Lease at LKR 500,000/mo",
      author: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      forumUrl: "https://research.assettoken.io/proposals/1",
      ipfsHash: "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      startDate: "Oct 01, 2026, 09:00 UTC",
      endDate: "Oct 15, 2026, 23:59 UTC",
      status: "Active",
      summary:
        "Proposal to approve a multi-national corporate tenant lease for the 3-bedroom luxury penthouse in Colombo. The tenant offers a guaranteed 12-month lock-in at LKR 500,000 monthly rental yield with a 3-month security deposit.",
      motivation:
        "Securing this corporate lease will elevate the annualized rental return for COR-01 token holders from 8.2% to 9.8% APY. The lease terms include full property upkeep insurance and automated bi-monthly dividend disbursements directly to token holder wallets.",
      yesVotes: 850,
      noVotes: 120,
      abstainVotes: 30,
      voters: [
        { address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", decision: "YES", power: 600, tx: "0x8a9b...12c4" },
        { address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", decision: "YES", power: 250, tx: "0x3f5a...77e9" },
        { address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", decision: "NO", power: 120, tx: "0x1d2e...99b0" },
        { address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906", decision: "ABSTAIN", power: 30, tx: "0x4c5d...66a1" },
      ]
    },
    {
      id: 2,
      assetId: 2,
      propertyName: "Kandy Royal Commercial Plaza (KRP-02)",
      title: "[RWA-02] Capital Expenditure for Solar Rooftop Grid Installation (LKR 2.8M)",
      author: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      forumUrl: "https://research.assettoken.io/proposals/2",
      ipfsHash: "ipfs://bafybeihkoviema7g3gx4e2lrtqfop4x42m66x4o2j2v65p3zldu54nhe2y",
      startDate: "Oct 04, 2026, 12:00 UTC",
      endDate: "Oct 18, 2026, 18:00 UTC",
      status: "Active",
      summary:
        "Proposal to utilize accumulated reserve funds for installing a 30kW rooftop solar power system at the Kandy commercial retail center to decrease common area energy expenses by 65%.",
      motivation:
        "Electricity tariffs have increased by 28% in Central Province. Investing in commercial solar will permanently reduce operational costs, directly boosting net operating income (NOI) and increasing quarterly fractional dividend yields.",
      yesVotes: 3200,
      noVotes: 400,
      abstainVotes: 100,
      voters: [
        { address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", decision: "YES", power: 2500, tx: "0x77b1...55a2" },
        { address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906", decision: "YES", power: 700, tx: "0x99c2...44f3" },
        { address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65", decision: "NO", power: 400, tx: "0x22a3...11c4" },
      ]
    },
    {
      id: 3,
      assetId: 3,
      propertyName: "Galle Dutch Fort Heritage Villa (GFV-03)",
      title: "[RWA-03] Increase Peak Season Boutique Rental Dividend Payout to 11.5% APY",
      author: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      forumUrl: "https://research.assettoken.io/proposals/3",
      ipfsHash: "ipfs://bafybeicg4f3qpm5u3vx6z7h4h7q2x6o2q4f5o6z7a8b9c0d1e2f3a4b5c6",
      startDate: "Oct 06, 2026, 08:00 UTC",
      endDate: "Oct 20, 2026, 20:00 UTC",
      status: "Active",
      summary:
        "Authorize the distribution of excess tourist booking revenue generated during the high season at the UNESCO heritage villa in Galle to verified token holders.",
      motivation:
        "Occupancy exceeded forecasts at 94% across Q1/Q2. Distributing the surplus earnings demonstrates high yields for fractional real estate investors without compromising maintenance escrow accounts.",
      yesVotes: 1900,
      noVotes: 150,
      abstainVotes: 50,
      voters: [
        { address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", decision: "YES", power: 1500, tx: "0x55d4...33b1" },
        { address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", decision: "YES", power: 400, tx: "0x44c3...22a2" },
        { address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", decision: "NO", power: 150, tx: "0x33b2...11f3" },
      ]
    }
  ]);

  const currentProposal = proposals.find((p) => p.id === selectedProposalId) || proposals[0];

  // User's token-weighted voting power for this property
  const userVotingPower = userBalances[currentProposal.assetId] || 0;

  // Calculate percentages
  const totalVotesCast = currentProposal.yesVotes + currentProposal.noVotes + currentProposal.abstainVotes;
  const yesPercentage = totalVotesCast > 0 ? ((currentProposal.yesVotes / totalVotesCast) * 100).toFixed(1) : "0.0";
  const noPercentage = totalVotesCast > 0 ? ((currentProposal.noVotes / totalVotesCast) * 100).toFixed(1) : "0.0";
  const abstainPercentage = totalVotesCast > 0 ? ((currentProposal.abstainVotes / totalVotesCast) * 100).toFixed(1) : "0.0";

  const handleCastVote = () => {
    if (!wallet.account) {
      alert("Please connect your MetaMask wallet to cast your token-weighted vote.");
      return;
    }

    if (userVotingPower <= 0) {
      alert("You need fractional tokens in this property to vote. Acquire shares from the Marketplace first.");
      return;
    }

    // Record vote
    setProposals((prev) =>
      prev.map((p) => {
        if (p.id === currentProposal.id) {
          const updatedYes = selectedVoteDecision === "YES" ? p.yesVotes + userVotingPower : p.yesVotes;
          const updatedNo = selectedVoteDecision === "NO" ? p.noVotes + userVotingPower : p.noVotes;
          const updatedAbstain = selectedVoteDecision === "ABSTAIN" ? p.abstainVotes + userVotingPower : p.abstainVotes;

          const newVoter = {
            address: wallet.account,
            decision: selectedVoteDecision,
            power: userVotingPower,
            tx: `0x${Math.random().toString(16).slice(2, 6)}...${Math.random().toString(16).slice(2, 6)}`
          };

          return {
            ...p,
            yesVotes: updatedYes,
            noVotes: updatedNo,
            abstainVotes: updatedAbstain,
            voters: [newVoter, ...p.voters]
          };
        }
        return p;
      })
    );

    setUserVoted((prev) => ({ ...prev, [currentProposal.id]: selectedVoteDecision }));
    setVoteModalOpen(false);
    setVoteSuccessMessage(`Vote recorded with ${userVotingPower} ERC-1155 tokens power!`);
    setTimeout(() => setVoteSuccessMessage(""), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Proposal Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Vote className="w-6 h-6 text-indigo-400" />
            Decentralized Property Governance (GovDAO)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Token-weighted asset voting powered by on-chain ERC-1155 snapshot checkpoints
          </p>
        </div>

        {/* Proposal Switcher Tabs */}
        <div className="flex p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold">
          {proposals.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedProposalId(p.id)}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                selectedProposalId === p.id
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Prop #{p.id}
            </button>
          ))}
        </div>
      </div>

      {voteSuccessMessage && (
        <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-800/80 text-emerald-200 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{voteSuccessMessage}</span>
        </div>
      )}

      {/* Main GovDAO Split View (Matching Image 3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Proposal Details & Votes Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800/90 space-y-5">
            {/* Status & ID Header */}
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {currentProposal.status}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Asset: {currentProposal.propertyName}
              </span>
            </div>

            {/* Proposal Title */}
            <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight">
              {currentProposal.title}
            </h2>

            {/* Metadata Pills */}
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
              <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-slate-300">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                <span>Issuer: {currentProposal.author.slice(0, 6)}...{currentProposal.author.slice(-4)}</span>
              </div>

              <a
                href={currentProposal.forumUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors"
              >
                <span>Forum Discussion</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>

              <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 font-mono text-[11px]">
                <FileText className="w-3 h-3 text-indigo-400" />
                <span className="truncate max-w-[150px]">{currentProposal.ipfsHash}</span>
              </div>
            </div>

            {/* Simple Summary */}
            <div className="pt-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Simple Summary
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80">
                {currentProposal.summary}
              </p>
            </div>

            {/* Motivation */}
            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Motivation & Financial Impact
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {currentProposal.motivation}
              </p>
            </div>
          </div>

          {/* Votes History Table (Matching GovDAO Bottom Table - Image 3) */}
          <div className="glass-panel rounded-3xl border border-slate-800/90 overflow-hidden space-y-2">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-white">Votes Cast</h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300">
                  {currentProposal.voters.length}
                </span>
              </div>
              <span className="text-xs text-slate-400">Total Weight: {totalVotesCast.toLocaleString()} Tokens</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-3.5 pl-6">Voters</th>
                    <th className="p-3.5">Decision</th>
                    <th className="p-3.5">Voting Power</th>
                    <th className="p-3.5 pr-6 text-right">Transaction</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-mono">
                  {currentProposal.voters.map((v, i) => (
                    <tr key={i} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-3.5 pl-6 font-medium text-slate-200">
                        {v.address.slice(0, 6)}...{v.address.slice(-4)}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            v.decision === "YES"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              : v.decision === "NO"
                              ? "bg-red-500/20 text-red-300 border border-red-500/40"
                              : "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                          }`}
                        >
                          {v.decision}
                        </span>
                      </td>
                      <td className="p-3.5 font-bold text-indigo-300">
                        {v.power.toLocaleString()} Tokens
                      </td>
                      <td className="p-3.5 pr-6 text-right text-slate-400 font-mono text-[11px]">
                        {v.tx}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Proposal Information & Voting Results (Matching Image 3) */}
        <div className="space-y-6">
          {/* Card 1: Proposal Information */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800/90 space-y-4">
            <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3">
              Proposal Information
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center text-slate-400">
                <span>Start Date:</span>
                <span className="font-semibold text-slate-200">{currentProposal.startDate}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>End Date:</span>
                <span className="font-semibold text-slate-200">{currentProposal.endDate}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400 pt-2 border-t border-slate-800">
                <span>Snapshot Contract:</span>
                <span className="font-mono text-indigo-300">AssetToken.sol</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Your Voting Power:</span>
                <span className="font-bold text-emerald-400 text-sm">
                  {userVotingPower.toLocaleString()} Tokens
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Voting Results (Matching GovDAO Progress Bars - Image 3) */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800/90 space-y-5">
            <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3 flex items-center justify-between">
              <span>Voting Results</span>
              <span className="text-[11px] font-normal text-slate-400 font-mono">
                {totalVotesCast.toLocaleString()} votes
              </span>
            </h3>

            {/* YES Result Bar with Neon Cyan #00E5FF */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-[#00E5FF]">YES</span>
                <span className="text-white">{yesPercentage}% ({currentProposal.yesVotes.toLocaleString()})</span>
              </div>
              <div className="h-2.5 w-full bg-[#090D22] rounded-full overflow-hidden border border-[#94A3BB]/20">
                <div
                  className="h-full bg-[#00E5FF] rounded-full transition-all duration-700 shadow-sm shadow-[#00E5FF]/40"
                  style={{ width: `${yesPercentage}%` }}
                />
              </div>
            </div>

            {/* NO Result Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-red-400">NO</span>
                <span className="text-white">{noPercentage}% ({currentProposal.noVotes.toLocaleString()})</span>
              </div>
              <div className="h-2.5 w-full bg-[#090D22] rounded-full overflow-hidden border border-[#94A3BB]/20">
                <div
                  className="h-full bg-red-500 rounded-full transition-all duration-700"
                  style={{ width: `${noPercentage}%` }}
                />
              </div>
            </div>

            {/* ABSTAIN Result Bar with Indigo #4F46E5 */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-[#94A3BB]">ABSTAIN</span>
                <span className="text-white">{abstainPercentage}% ({currentProposal.abstainVotes.toLocaleString()})</span>
              </div>
              <div className="h-2.5 w-full bg-[#090D22] rounded-full overflow-hidden border border-[#94A3BB]/20">
                <div
                  className="h-full bg-[#4F46E5] rounded-full transition-all duration-700"
                  style={{ width: `${abstainPercentage}%` }}
                />
              </div>
            </div>

            {/* Action Button: VOTE */}
            <div className="pt-3">
              {userVoted[currentProposal.id] ? (
                <div className="p-3 rounded-xl bg-[#4F46E5]/15 border border-[#4F46E5]/40 text-center text-xs text-[#00E5FF] font-medium">
                  You voted <strong>{userVoted[currentProposal.id]}</strong> on this proposal.
                </div>
              ) : (
                <button
                  onClick={() => setVoteModalOpen(true)}
                  disabled={userVotingPower === 0}
                  className="w-full py-3.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-sm shadow-lg shadow-[#4F46E5]/40 transition-all cursor-pointer disabled:opacity-50"
                >
                  {userVotingPower > 0 ? "CAST YOUR VOTE" : "NO VOTING POWER (0 TOKENS)"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Voting Modal */}
      {voteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md glass-panel p-6 rounded-3xl border border-slate-700/80 shadow-2xl space-y-5">
            <h3 className="text-lg font-bold text-white">Cast On-Chain Vote</h3>
            <p className="text-xs text-slate-400">
              Your voting power is determined by your fractional token holdings in{" "}
              <strong>{currentProposal.propertyName}</strong>:
            </p>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center text-xs">
              <span className="text-slate-400">Your Voting Power:</span>
              <span className="font-bold text-emerald-400 text-sm">
                {userVotingPower.toLocaleString()} Tokens
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Select Decision:</label>
              <div className="grid grid-cols-3 gap-2">
                {["YES", "NO", "ABSTAIN"].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setSelectedVoteDecision(opt)}
                    className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedVoteDecision === opt
                        ? opt === "YES"
                          ? "bg-emerald-600 text-white"
                          : opt === "NO"
                          ? "bg-red-600 text-white"
                          : "bg-blue-600 text-white"
                        : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => setVoteModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCastVote}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                Confirm Vote
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
