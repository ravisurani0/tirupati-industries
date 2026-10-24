// Apply the saved light/dark theme before React mounts to avoid a flash
try {
  if (JSON.parse(localStorage.getItem('darkMode'))) document.documentElement.classList.add('dark');
} catch (e) {
  /* storage unavailable */
}
