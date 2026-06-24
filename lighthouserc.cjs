module.exports = {
  ci: {
    collect: {
      url: ['https://web-multiusos.vercel.app'],
      numberOfRuns: 3,
      headless: true,
      waitUntil: 'networkidle0',
      // Usar Puppeteer para manejar Chrome
      puppeteer: {
        executablePath: 'node_modules/puppeteer/.local-chromium/win64-*/chrome-win64/chrome.exe',
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: './lighthouse-reports',
      reportFilenamePattern: 'lighthouse-report-%%PATHNAME%%-%%DATETIME%%.html',
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.8 }],
        'categories:accessibility': ['warn', { minScore: 0.85 }],
        'categories:best-practices': ['warn', { minScore: 0.8 }],
        'categories:seo': ['warn', { minScore: 0.75 }],
        'categories:pwa': ['off', { minScore: 0 }],
      },
    },
  },
};