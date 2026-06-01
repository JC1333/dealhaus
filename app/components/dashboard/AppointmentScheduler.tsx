export default function AppointmentScheduler() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">

      <h3 className="text-xl font-semibold mb-4">
        Appointment Scheduler
      </h3>

      <div className="space-y-4">

        <div className="bg-black border border-zinc-800 rounded-2xl p-4">
          <p className="font-semibold">
            Luxury Sofa Pickup
          </p>

          <p className="text-zinc-400 text-sm mt-1">
            Today • 4:30 PM • Summerlin
          </p>
        </div>

        <div className="bg-black border border-zinc-800 rounded-2xl p-4">
          <p className="font-semibold">
            Rolex Authentication Meeting
          </p>

          <p className="text-zinc-400 text-sm mt-1">
            Tomorrow • 1:00 PM • Henderson
          </p>
        </div>

      </div>

    </div>
  )
}