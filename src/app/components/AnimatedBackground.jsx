export default function AnimatedBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-blue-900/20 animate-pulse-slow" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-float-delayed" />
    </div>
  );
}
