module.exports = {
    ci: {
        collect: {
            // URL de tu web en producción
            url: ['https://web-multiusos.vercel.app'],
            // Número de ejecuciones para obtener una media
            numberOfRuns: 3,
            // Usar el modo headless (sin interfaz gráfica)
            headless: true,
            // Esperar a que la página cargue completamente
            waitUntil: 'networkidle0',
        },
        upload: {
            // Guardar los resultados en un archivo local
            target: 'filesystem',
            outputDir: './lighthouse-reports',
            reportFilenamePattern: 'lighthouse-report-%%PATHNAME%%-%%DATETIME%%.html',
        },
        assert: {
            // Umbrales mínimos para pasar el test (puedes ajustarlos)
            assertions: {
                // Performance: mínimo 80
                'categories:performance': ['warn', { minScore: 0.8 }],
                // Accessibility: mínimo 85
                'categories:accessibility': ['warn', { minScore: 0.85 }],
                // Best Practices: mínimo 80
                'categories:best-practices': ['warn', { minScore: 0.8 }],
                // SEO: mínimo 75
                'categories:seo': ['warn', { minScore: 0.75 }],
                // PWA: mínimo 0 (no obligatorio)
                'categories:pwa': ['off', { minScore: 0 }],
            },
        },
    },
};