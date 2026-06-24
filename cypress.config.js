import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "https://dpsys-nexus.netlify.app",
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
  // Configuración para que Cypress ignore errores de módulos
  experimentalModifyObstructiveThirdPartyCode: true,
});