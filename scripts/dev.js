const fs = require('fs');

// Normalisasi path casing di Windows agar konsisten dengan filesystem NTFS
// Mencegah Webpack menduplikasi modul Next.js internal (seperti LayoutRouterContext)
// yang menyebabkan error 'invariant expected layout router to be mounted'
if (process.platform === 'win32' && fs.realpathSync.native) {
  try {
    const canonicalCwd = fs.realpathSync.native(process.cwd());
    if (canonicalCwd !== process.cwd()) {
      process.chdir(canonicalCwd);
    }
  } catch {}
}

require('next/dist/bin/next');
