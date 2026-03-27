import { Link, NavLink } from "react-router-dom";
import { useTheme } from "../../hooks/useTheme";
import { StatusPill } from "../ui/StatusPill";

const NAV_LINKS = [
  { to: "/", label: "Bosh sahifa" },
  { to: "/earthquakes", label: "Zilzilalar" },
  { to: "/alerts", label: "Ogohlantirishlar" },
  { to: "/lab", label: "3D Laboratoriya" },
  { to: "/safety", label: "Xavfsizlik" },
  { to: "/about", label: "Haqida" },
];

interface NavbarProps {
  connected: boolean;
}

export function Navbar({ connected }: NavbarProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="sticky top-0 z-50 bg-gray-900 border-b border-gray-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-1 select-none">
            <span className="text-2xl font-bold text-white tracking-wider font-['Oswald']">
              SEIS
            </span>
            <span className="text-2xl font-bold text-red-500 tracking-wider font-['Oswald']">
              MON
            </span>
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  [
                    "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-gray-700 text-white"
                      : "text-gray-400 hover:text-white hover:bg-gray-800",
                  ].join(" ")
                }
              >
                {label}
              </NavLink>
            ))}
          </div>

          {/* Right side: status + theme toggle */}
          <div className="flex items-center gap-4">
            <StatusPill online={connected} label={connected ? "Online" : "Offline"} />

            <button
              onClick={toggleTheme}
              aria-label="Temani almashtirish"
              className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              {theme === "dark" ? (
                /* Sun icon */
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m8.485-8.485h-1M4.515 12H3.515m15.364-6.364-.707.707M6.343 17.657l-.707.707m12.728 0-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                </svg>
              ) : (
                /* Moon icon */
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
