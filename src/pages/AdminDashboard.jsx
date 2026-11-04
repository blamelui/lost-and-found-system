import React from 'react';

export default function AdminDashboard() {
  const pendingClaims = [
    { id: 1, item: 'Black Leather Wallet', claimant: 'Maria Santos', proof: 'Has ID inside', date: 'Oct 24, 2026' },
    { id: 2, item: 'Blue Hydro Flask', claimant: 'Juan Dela Cruz', proof: 'Has sticker on bottom', date: 'Oct 25, 2026' },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="mt-2 text-sm text-[#A0B0D0]">Review and verify pending item claims.</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-white">
            <thead className="border-b border-white/10 bg-white/[0.02] text-xs uppercase tracking-wider text-[#A0B0D0]">
              <tr>
                <th className="px-6 py-4 font-medium">Item Name</th>
                <th className="px-6 py-4 font-medium">Claimant</th>
                <th className="px-6 py-4 font-medium">Proof Provided</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {pendingClaims.map(claim => (
                <tr key={claim.id} className="transition hover:bg-white/[0.02]">
                  <td className="px-6 py-4 font-medium">{claim.item}</td>
                  <td className="px-6 py-4">{claim.claimant}</td>
                  <td className="px-6 py-4 text-[#A0B0D0]">{claim.proof}</td>
                  <td className="px-6 py-4 text-[#A0B0D0]">{claim.date}</td>
                  <td className="px-6 py-4 text-right space-x-3">
                    <button className="rounded-lg bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-400 transition hover:bg-green-500/20 hover:text-green-300">
                      Approve
                    </button>
                    <button className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/20 hover:text-red-300">
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}