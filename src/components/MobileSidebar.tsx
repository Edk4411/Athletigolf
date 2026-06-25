import { useState } from "react";
import { Link, useLocation } from "wouter";

export default function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const [gymOpen, setGymOpen] = useState(false);
  const [golfOpen, setGolfOpen] = useState(false);

  const closeMenu = () => setOpen(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed right-5 top-5 z-50 rounded-xl bg-slate-950 px-4 py-3 text-white shadow-lg"
      >
        Menu
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div onClick={closeMenu} className="absolute inset-0 bg-black/50" />

          <aside className="relative ml-auto h-full w-80 max-w-[85vw] bg-slate-950 p-6 shadow-2xl">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">AthletiGolf</h2>
              <button
                onClick={closeMenu}
                className="rounded-lg px-3 py-2 text-2xl text-white/70 transition hover:text-white"
              >
                X
              </button>
            </div>

            <nav className="flex h-[calc(100%-80px)] flex-col justify-between">
              <div className="space-y-1 text-lg">
                <MenuLink href="/dashboard" onClick={closeMenu}>
                  Dashboard
                </MenuLink>

                <MenuLink href="/profile" onClick={closeMenu}>
                  Profile
                </MenuLink>

                <Dropdown title="Gym" open={gymOpen} setOpen={setGymOpen}>
                  <MenuLink href="/workouts" onClick={closeMenu}>
                    Create Split
                  </MenuLink>

                  <MenuLink href="/workouts/submit" onClick={closeMenu}>
                    Submit Workout
                  </MenuLink>

                  <MenuLink href="/gym/history" onClick={closeMenu}>
                    Workout History
                  </MenuLink>
                </Dropdown>

                <Dropdown title="Golf" open={golfOpen} setOpen={setGolfOpen}>
                  <MenuLink href="/golf/submit" onClick={closeMenu}>
                    Submit Round
                  </MenuLink>

                  <MenuLink href="/golf" onClick={closeMenu}>
                    Round History
                  </MenuLink>

                  <MenuLink href="/golf/practice" onClick={closeMenu}>
                    Log Practice
                  </MenuLink>

                  <MenuLink href="/golf/practice-history" onClick={closeMenu}>
                    Practice History
                  </MenuLink>
                </Dropdown>

                <GoldMenuLink href="/analytics" onClick={closeMenu}>
                  Analytics
                </GoldMenuLink>

                <MenuLink href="/memberships" onClick={closeMenu}>
                  Memberships
                </MenuLink>
              </div>

              <div className="space-y-1 border-t border-white/10 pt-4 text-sm">
                <MenuLink href="/settings" onClick={closeMenu}>
                  Settings
                </MenuLink>

                <MenuLink href="/contact" onClick={closeMenu}>
                  Contact Us
                </MenuLink>

                <MenuLink href="/follow" onClick={closeMenu}>
                  Follow Us
                </MenuLink>
              </div>
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}

function MenuLink({
  href,
  children,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  const [location] = useLocation();
  const isActive = location === href;

  return (
    <Link href={href}>
      <a
        onClick={onClick}
        className={`block rounded-xl px-4 py-3 transition ${
          isActive
            ? "bg-white/10 text-white"
            : "text-white/80 hover:bg-white/10 hover:text-white"
        }`}
      >
        {children}
      </a>
    </Link>
  );
}

function GoldMenuLink({
  href,
  children,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  const [location] = useLocation();
  const isActive = location === href;

  return (
    <Link href={href}>
      <a
        onClick={onClick}
        className={`block rounded-xl px-4 py-3 font-semibold transition ${
          isActive
            ? "bg-[#D4AF37]/15 text-[#D4AF37]"
            : "text-[#D4AF37] hover:bg-[#D4AF37]/10"
        }`}
      >
        {children}
      </a>
    </Link>
  );
}

function Dropdown({
  title,
  open,
  setOpen,
  children,
}: {
  title: string;
  open: boolean;
  setOpen: (value: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-white/80 transition hover:bg-white/10 hover:text-white"
      >
        <span>{title}</span>
        <span>{open ? "-" : "+"}</span>
      </button>

      {open && (
        <div className="ml-4 mt-1 space-y-1 border-l border-white/10 pl-3 text-base text-white/60">
          {children}
        </div>
      )}
    </div>
  );
}
