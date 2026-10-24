import { useSearchParams } from 'react-router-dom';
import AttendanceCalendar from './AttendanceCalendar';
import AttendanceDaily from './AttendanceDaily';

/**
 * /attendance
 *   ?view=month&month=YYYY-MM  -> month calendar (default)
 *   ?view=day&date=YYYY-MM-DD  -> day sheet (also used when only ?date= is given)
 */
export default function AttendancePage() {
  const [params] = useSearchParams();
  const view = params.get('view') || (params.get('date') ? 'day' : 'month');
  return view === 'day' ? <AttendanceDaily /> : <AttendanceCalendar />;
}
