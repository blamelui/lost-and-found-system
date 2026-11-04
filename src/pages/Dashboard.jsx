import React from 'react';

export default function Dashboard() {
  return (
    <div className="grid min-h-[60vh] place-items-center rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center backdrop-blur-xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome to your Dashboard</h1>
        <p className="mt-2 text-sm text-[#A0B0D0]">This is where the stats and recent items will go.</p>
      </div>
    </div>
  );
}