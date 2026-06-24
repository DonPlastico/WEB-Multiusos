describe('Pruebas de API', () => {
    it('La API de IGDB responde', () => {
        cy.request('/api/igdb?limit=5')
            .then((response) => {
                expect(response.status).to.eq(200)
                expect(response.body).to.be.an('array')
            })
    })

    it('La API de TMDB responde', () => {
        cy.request('/api/tmdb?tipo=movie&page=1')
            .then((response) => {
                expect(response.status).to.eq(200)
                expect(response.body).to.be.an('array')
            })
    })
})