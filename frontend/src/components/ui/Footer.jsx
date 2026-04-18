export default function Footer()
{
    const logoUrl = "https://horizons-cdn.hostinger.com/a6afdcf9-aaa7-4281-ba79-be0f31c772d0/384adb0a13bc13709264589f14f2ae52.jpg";
     const stats = [
    { value: '50K+', label: 'Active Citizens' },
    { value: '15K+', label: 'Issues Resolved' },
    { value: '89%', label: 'Success Rate' },
    { value: '200+', label: 'Cities Covered' }
  ];
    return <>

        <footer className="border-t border-slate-800 bg-white/10 transparent backdrop-blur-sm py-12 px-4">
          <div className="container mx-auto max-w-7xl">
            <div className="flex flex-col items-center gap-6">
              <div className="flex items-center gap-3">
                <img src={logoUrl} alt="CITIFIX Logo" className="w-10 h-10 rounded-xl" />
                <span className="text-2xl font-bold text-slate-100">CITIFIX</span>
              </div>
              <p className="text-white/70 text-center">
                © 2025 CITIFIX. Building better communities together.
              </p>
            </div>
          </div>
        </footer>
    </>
}