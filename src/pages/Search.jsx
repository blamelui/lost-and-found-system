import React, { useState } from 'react';

const MOCK_ITEMS = [
  { id: 1, title: 'Blue Hydro Flask', category: 'Other', location: 'Library', status: 'Found' },
  { id: 2, title: 'Student ID - J. Dela Cruz', category: 'School ID', location: 'Cafeteria', status: 'Lost' },
  { id: 3, title: 'Black Leather Wallet', category: 'Wallet', location: 'Gymnasium', status: 'Found' },
  { id: 4, title: 'Scientific Calculator', category: 'Electronics', location: 'Room 302', status: 'Lost' },
];

export default function Search() {
  const [query, setQuery] = useState('');

  // Filter items based on the search query (Case-insensitive)
  const filteredItems = MOCK_ITEMS.filter(item => 
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.location.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Search Items</h1>
          <p className="mt-2 text-sm text-[#A0B0D0]">Find what you lost or see what others found.</p>
        </div>
        
        {/* Live Search Input */}
        <div className="relative w-full sm:w-72">
          <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A0B0D0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.2-5.2m0 0A7.5 7.5 0 105.2 5.2a7.5 7.5 0 0010.6 10.6z"/></svg>
          <input 
            type="search" 
            placeholder="Search by name or location..." 
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-[#A0B0D0]/60 outline-none transition duration-200 focus:border-[#2A5CFF] focus:ring-2 focus:ring-[#2A5CFF]/40" 
          />
        </div>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map(item => (
          <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-md transition hover:-translate-y-1 hover:border-[#2A5CFF]/50 hover:shadow-[0_0_30px_rgba(42,92,255,0.15)] cursor-pointer">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#A0B0D0]">{item.category}</span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${item.status === 'Lost' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                {item.status}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">{item.title}</h3>
            <p className="text-sm text-[#A0B0D0] flex items-center gap-1">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              {item.location}
            </p>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-20 text-[#A0B0D0]">
          No items found matching "{query}"
        </div>
      )}
    </div>
  );
}