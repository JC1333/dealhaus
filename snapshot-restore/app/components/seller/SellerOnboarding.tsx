type SellerOnboardingProps = {
  form: any
  setForm: (value: any) => void
  onSubmit: () => void
}

export default function SellerOnboarding({
  form,
  setForm,
  onSubmit,
}: SellerOnboardingProps) {
  const updateField = (field: string, value: any) => {
    setForm({
      ...form,
      [field]: value,
    })
  }

  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
      <div className="mb-8">
        <h2 className="text-4xl font-bold tracking-tight">
          Seller Onboarding
        </h2>

        <p className="text-zinc-400 mt-2">
          Submit an item and allow DealHaus AI to find buyers for a commission.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          placeholder="Seller name"
          value={form.seller_name}
          onChange={(e) => updateField("seller_name", e.target.value)}
          className="rounded-xl border border-zinc-800 bg-black px-4 py-3 text-white outline-none"
        />

        <input
          placeholder="Seller email"
          value={form.seller_email}
          onChange={(e) => updateField("seller_email", e.target.value)}
          className="rounded-xl border border-zinc-800 bg-black px-4 py-3 text-white outline-none"
        />

        <input
          placeholder="Seller phone"
          value={form.seller_phone}
          onChange={(e) => updateField("seller_phone", e.target.value)}
          className="rounded-xl border border-zinc-800 bg-black px-4 py-3 text-white outline-none"
        />

        <input
          placeholder="Item title"
          value={form.item_title}
          onChange={(e) => updateField("item_title", e.target.value)}
          className="rounded-xl border border-zinc-800 bg-black px-4 py-3 text-white outline-none"
        />

        <input
          placeholder="Asking price"
          type="number"
          value={form.asking_price}
          onChange={(e) => updateField("asking_price", e.target.value)}
          className="rounded-xl border border-zinc-800 bg-black px-4 py-3 text-white outline-none"
        />

        <input
          placeholder="City"
          value={form.city}
          onChange={(e) => updateField("city", e.target.value)}
          className="rounded-xl border border-zinc-800 bg-black px-4 py-3 text-white outline-none"
        />

        <input
          placeholder="State"
          value={form.state}
          onChange={(e) => updateField("state", e.target.value)}
          className="rounded-xl border border-zinc-800 bg-black px-4 py-3 text-white outline-none"
        />

        <input
          placeholder="ZIP"
          value={form.zip}
          onChange={(e) => updateField("zip", e.target.value)}
          className="rounded-xl border border-zinc-800 bg-black px-4 py-3 text-white outline-none"
        />
      </div>

      <textarea
        placeholder="Item description"
        rows={5}
        value={form.item_description}
        onChange={(e) => updateField("item_description", e.target.value)}
        className="mt-4 w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-white outline-none"
      />

      <label className="mt-5 flex items-start gap-3 rounded-2xl border border-zinc-800 bg-black p-4">
        <input
          type="checkbox"
          checked={form.agreement_accepted}
          onChange={(e) => updateField("agreement_accepted", e.target.checked)}
          className="mt-1"
        />

        <span className="text-zinc-300">
          I agree that DealHaus may market this item to buyers and collect a{" "}
          <strong className="text-white">15% commission</strong> only after a
          successful sale.
        </span>
      </label>

      <button
        onClick={onSubmit}
        className="mt-6 w-full rounded-xl bg-green-500 px-4 py-3 font-semibold text-black hover:bg-green-400 transition"
      >
        Submit Seller Item
      </button>
    </div>
  )
}