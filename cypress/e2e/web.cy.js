describe('Pruebas WEB Multiusos', () => {
    beforeEach(() => {
        cy.visit('/')
    })

    it('Carga la página principal', () => {
        cy.contains('DP-SYS').should('be.visible')
    })

    it('Navega a la sección de juegos', () => {
        cy.contains('EXPLORAR JUEGOS').click()
        cy.url().should('include', '/juegos')
        cy.contains('Tendencias').should('be.visible', { timeout: 10000 })
    })

    it('Busca un juego', () => {
        cy.get('input[placeholder*="buscar"]').type('The Witcher{enter}')
        cy.contains('The Witcher', { timeout: 10000 }).should('be.visible')
    })
})