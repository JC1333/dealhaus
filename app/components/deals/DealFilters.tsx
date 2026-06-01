type DealFiltersProps = {
  searchTerm: string
  setSearchTerm: (value: string) => void
  sortOption: string
  setSortOption: (value: string) => void
}

export default function DealFilters({
  searchTerm,
  setSearchTerm,
  sortOption,
  setSortOption,
}: DealFiltersProps) {
  return (
    <div className="flex flex-col md:flex-row gap-3">
      <input
        type="text"
        placeholder="Search inventory..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-white outline-none"
      />

      <select
        value={sortOption}
        onChange={(e) => setSortOption(e.target.value)}
        className="rounded-xl border border-zinc-800 bg-black px-4 py-3 text-white outline-none"
      >
        <option>Newest</option>
        <option>Highest Price</option>
        <option>Lowest Price</option>
      </select>
    </div>
  )
}