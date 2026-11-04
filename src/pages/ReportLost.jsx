import React, { useState } from 'react';

export default function ReportLost() {
  const [formData, setFormData] = useState({
    itemName: '',
    category: '',
    location: '',
    description: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('Lost Item Reported! Check console.');
    console.log('Report Lost Data:', formData);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Report a Lost Item</h1>
        <p className="mt-2 text-sm text-[#A0B0D0]">Fill out the details below so others can help you find it.</p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:p-10 space-y-6">
        
        {/* Item Name */}
        <div>
          <label className="mb-2 block text-sm font-medium text-[#A0B0D0]">Item Name</label>
          <input 
            type="text" name="itemName" required onChange={handleChange}
            placeholder="e.g., Blue Hydro Flask"
            className="w-full rounded-xl border border-white/10 bg-[#0A1128]/60 px-4 py-3 text-sm text-white placeholder-[#A0B0D0]/50 outline-none transition duration-200 focus:border-[#2A5CFF] focus:ring-2 focus:ring-[#2A5CFF]/40" 
          />
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Category */}
          <div>
            <label className="mb-2 block text-sm font-medium text-[#A0B0D0]">Category</label>
            <select 
              name="category" required onChange={handleChange}
              className="w-full rounded-xl border border-white/10 bg-[#0A1128]/60 px-4 py-3 text-sm text-white outline-none transition duration-200 focus:border-[#2A5CFF] focus:ring-2 focus:ring-[#2A5CFF]/40"
            >
              <option value="" className="text-black">Select a category</option>
              <option value="id" className="text-black">School ID</option>
              <option value="wallet" className="text-black">Wallet</option>
              <option value="electronics" className="text-black">Electronics</option>
              <option value="books" className="text-black">Books</option>
              <option value="other" className="text-black">Other</option>
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="mb-2 block text-sm font-medium text-[#A0B0D0]">Location Lost</label>
            <select 
              name="location" required onChange={handleChange}
              className="w-full rounded-xl border border-white/10 bg-[#0A1128]/60 px-4 py-3 text-sm text-white outline-none transition duration-200 focus:border-[#2A5CFF] focus:ring-2 focus:ring-[#2A5CFF]/40"
            >
              <option value="" className="text-black">Select a location</option>
              <option value="library" className="text-black">Library</option>
              <option value="cafeteria" className="text-black">Cafeteria</option>
              <option value="gym" className="text-black">Gymnasium</option>
              <option value="classroom" className="text-black">Classroom</option>
              <option value="other" className="text-black">Other</option>
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="mb-2 block text-sm font-medium text-[#A0B0D0]">Description</label>
          <textarea 
            name="description" required onChange={handleChange} rows="4"
            placeholder="Describe the item (color, brand, distinguishing marks)..."
            className="w-full rounded-xl border border-white/10 bg-[#0A1128]/60 px-4 py-3 text-sm text-white placeholder-[#A0B0D0]/50 outline-none transition duration-200 focus:border-[#2A5CFF] focus:ring-2 focus:ring-[#2A5CFF]/40"
          ></textarea>
        </div>

        {/* Image Upload (Placeholder for now) */}
        <div>
          <label className="mb-2 block text-sm font-medium text-[#A0B0D0]">Upload Image (Optional)</label>
          <div className="mt-1 flex justify-center rounded-xl border border-dashed border-white/20 bg-white/5 px-6 py-10 transition hover:bg-white/10 cursor-pointer">
            <div className="text-center">
              <svg className="mx-auto h-10 w-10 text-[#A0B0D0]/50" stroke="currentColor" fill="none" viewBox="0 0 48 48"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <div className="mt-4 flex text-sm text-[#A0B0D0]">
                <span className="relative cursor-pointer rounded-md font-semibold text-[#2A5CFF] focus-within:outline-none hover:text-blue-400">Click to upload</span>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-[#A0B0D0]/50">PNG, JPG up to 5MB</p>
            </div>
          </div>
        </div>

        <button type="submit" className="w-full rounded-xl bg-[#1C3F95] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_0_30px_rgba(42,92,255,0.45)] transition duration-200 hover:scale-[1.02] hover:bg-[#2A5CFF] hover:shadow-[0_0_44px_rgba(42,92,255,0.65)] active:scale-[0.99]">
          Submit Report
        </button>
      </form>
    </div>
  );
}