import { Logo, GridShape, ThemeToggleButton } from '../components/common/Common';

/** Split-screen auth page from signin.html / signup.html */
export default function AuthLayout({ children }) {
  return (
    <div className="relative z-1 bg-white p-6 sm:p-0 dark:bg-gray-900">
      <div className="relative flex min-h-screen w-full flex-col justify-center sm:p-0 lg:flex-row dark:bg-gray-900">
        <div className="flex w-full flex-1 flex-col lg:w-1/2">{children}</div>

        <div className="bg-brand-950 relative hidden min-h-screen w-full items-center lg:grid lg:w-1/2 dark:bg-white/5">
          <div className="z-1 flex items-center justify-center">
            <GridShape />
            <div className="flex max-w-xs flex-col items-center">
              <div className="mb-4 block">
                <Logo dark />
              </div>
              <p className="text-center text-gray-400 dark:text-white/60">Employee Management System — manage your people, roles and access in one place.</p>
            </div>
          </div>
        </div>

        <div className="fixed right-6 bottom-6 z-50">
          <ThemeToggleButton floating />
        </div>
      </div>
    </div>
  );
}
