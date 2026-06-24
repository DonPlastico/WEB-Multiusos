// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'

// Ignorar errores de módulos que no se cargan en los tests
Cypress.on('uncaught:exception', (err, runnable) => {
    // Ignorar errores de módulos no encontrados
    if (err.message.includes('Failed to resolve module specifier')) {
        return false
    }
    // Ignorar errores de Google Analytics
    if (err.message.includes('gtag')) {
        return false
    }
    // Dejar pasar otros errores
    return true
})