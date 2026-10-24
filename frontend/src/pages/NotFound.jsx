import { Link } from 'react-router-dom';
import { GridShape } from '../components/common/Common';

export default function NotFound() {
  return (
    <div className="relative z-1 flex min-h-screen flex-col items-center justify-center overflow-hidden p-6">
      <GridShape />
      <div className="mx-auto w-full max-w-[472px] text-center">
        <h1 className="text-title-md xl:text-title-2xl mb-8 font-bold text-gray-800 dark:text-white/90">404</h1>
        <p className="mt-10 mb-6 text-base text-gray-700 sm:text-lg dark:text-gray-400">We can&apos;t seem to find the page you are looking for!</p>
        <Link
          to="/"
          className="shadow-theme-xs inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-3.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
        >
          Back to Home Page
        </Link>
      </div>
    </div>
  );
}
