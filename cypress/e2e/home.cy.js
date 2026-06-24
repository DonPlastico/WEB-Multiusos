describe('Home page', () => {
    it('loads successfully', () => {
        cy.visit('/')
        // Esperamos que cargue la página
        cy.get('body').should('be.visible')
        // Verificamos que el título esté presente
        cy.title().should('include', 'DP-SYS')
    })
})