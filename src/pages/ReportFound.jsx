import React, { useState } from 'react';

export default function ReportFound() {
  const [formData, setFormData] = useState({
    itemName: '',
    category: '',
    location: '',
    description: ''
  });

  // State for image upload
  const [image, setImage] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- Drag and Drop Events ---
  const handleDragOver = (e) => {
    e.preventDefault(); // Necessary to allow dropping
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // --- File Input Event ---
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file) => {
    // Create a preview URL for the image
    const imageUrl = URL.createObjectURL(file);
    setImage(imageUrl);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('Found Item Reported! Check console.');
    console.log('Report Found Data:', formData);
    console.log('Image File attached:', image ? 'Yes' : 'No');
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Report a Found Item</h1>
        <p className="mt-2 text-sm text-[#A0B0D0]">Found something? Help it find its way back to its owner.</p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:p-10 space-y-6">
        
        <div>
          <label className="mb-2 block text-sm font-medium text-[#A0B0D0]">Item Name</label>
          <input 
            type="text" name="itemName" required onChange={handleChange}
            placeholder="e.g., Black Leather Wallet"
            className="w-full rounded-xl border border-white/10 bg-[#0A1128]/60 px-4 py-3 text-sm text-white placeholder-[#A0B0D0]/50 outline-none transition duration-200 focus:border-[#2A5CFF] focus:ring-2 focus:ring-[#2A5CFF]/40" 
          />
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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

          <div>
            <label className="mb-2 block text-sm font-medium text-[#A0B0D0]">Location Found</label>
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

        <div>
          <label className="mb-2 block text-sm font-medium text-[#A0B0D0]">Description & Turn-in Location</label>
          <textarea 
            name="description" required onChange={handleChange} rows="4"
            placeholder="Describe where you found it and where you dropped it off (e.g., Guard House)..."
            className="w-full rounded-xl border border-white/10 bg-[#0A1128]/60 px-4 py-3 text-sm text-white placeholder-[#A0B0D0]/50 outline-none transition duration-200 focus:border-[#2A5CFF] focus:ring-2 focus:ring-[#2A5CFF]/40"
          ></textarea>
        </div>

        {/* --- DRAG AND DROP UPLOAD --- */}
        <div>
          <label className="mb-2 block text-sm font-medium text-[#A0B0D0]">Upload Proof of Item (Photo)</label>
          
          {!image ? (
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`mt-1 flex justify-center rounded-xl border border-dashed px-6 py-10 transition duration-200 cursor-pointer ${
                isDragging ? 'border-[#2A5CFF] bg-[#2A5CFF]/10' : 'border-white/20 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="text-center">
                <svg className="mx-auto h-10 w-10 text-[#A0B0D0]/50" stroke="currentColor" fill="none" viewBox="0 0 48 48"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <div className="mt-4 flex text-sm text-[#A0B0D0] justify-center">
                  <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-semibold text-[#2A5CFF] focus-within:outline-none hover:text-blue-400">
                    <span>Click to upload</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-[#A0B0D0]/50">PNG, JPG up to 5MB</p>
              </div>
            </div>
          ) : (
            // Image Preview
            <div className="mt-1 relative rounded-xl border border-white/10 bg-black/40 p-2 overflow-hidden flex justify-center">
              <img src={image} alt="Uploaded proof" className="max-h-64 rounded-lg object-contain" />
              <button 
                type="button" 
                onClick={() => setImage(null)}
                className="absolute top-4 right-4 bg-red-500/80 hover:bg-red-500 text-white rounded-full p-2 backdrop-blur-md transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
          )}
        </div>

        <button type="submit" className="w-full rounded-xl bg-[#1C3F95] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_0_30px_rgba(42,92,255,0.45)] transition duration-200 hover:scale-[1.02] hover:bg-[#2A5CFF] hover:shadow-[0_0_44px_rgba(42,92,255,0.65)] active:scale-[0.99]">
          Submit Found Item
        </button>
      </form>
    </div>
  );
}