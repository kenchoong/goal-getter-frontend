export default function SuccessPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center justify-center px-6">
      <div className="w-full rounded-xl border border-green-200 bg-green-50 p-8 text-center">
        <h1 className="text-2xl font-semibold text-green-900">Payment successful</h1>
        <p className="mt-3 text-green-800">
          Stripe redirected here after a completed checkout session.
        </p>
      </div>
    </main>
  );
}
