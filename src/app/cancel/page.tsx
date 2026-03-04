export default function CancelPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center justify-center px-6">
      <div className="w-full rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
        <h1 className="text-2xl font-semibold text-amber-900">Payment canceled</h1>
        <p className="mt-3 text-amber-800">
          You canceled checkout. You can return and try again anytime.
        </p>
      </div>
    </main>
  );
}
