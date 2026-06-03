describe('2.10 Delete Transaction Test Procedure', () => {

  beforeEach(() => {
    // ==================================
    // Pre-requisite: Login & Mock Data
    // ==================================
    
    // 1. Mock Login
    cy.intercept('POST', '**/mywallet/auth/signin', {
      statusCode: 200,
      body: { 
        id: 1, 
        email: 'active_user@example.com', 
        roles: ['ROLE_USER'], 
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE4OTM0NTYwMDB9.signature', 
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE4OTM0NTYwMDB9.signature' 
      }
    }).as('loginRequest');

    // 2. Mock Category API (for the Edit form to render)
    cy.intercept('GET', '**/mywallet/category/getAll', {
      statusCode: 200,
      body: {
        status: "SUCCESS",
        response: [
          { categoryId: 1, categoryName: "Food", enabled: true, transactionType: { transactionTypeId: 1 } }
        ]
      }
    }).as('getCategories');

    // 3. Mock the GET Transactions List API
    cy.intercept('GET', '**/mywallet/transaction/getByUser*', {
      statusCode: 200,
      body: {
        status: "SUCCESS",
        data: {
          "2026-06-03": [
            { 
              transactionId: 123, 
              categoryName: "Food", 
              description: "Lunch", 
              transactionType: 1, 
              amount: 15.50, 
              date: "2026-06-03T00:00:00"
            }
          ]
        },
        response: {
          data: {
            "2026-06-03": [
              { 
                transactionId: 123, 
                categoryName: "Food", 
                description: "Lunch", 
                transactionType: 1, 
                amount: 15.50, 
                date: "2026-06-03T00:00:00" 
              }
            ]
          },
          totalNoOfPages: 1, 
          totalNoOfRecords: 1
        }
      }
    }).as('getTransactions');

    // 4. Mock the GET Single Transaction API. Match exact ID '123' to prevent intercept conflicts.
    cy.intercept('GET', '**/mywallet/transaction/123', {
      statusCode: 200,
      body: {
        status: "SUCCESS",
        response: { 
          transactionId: 123, 
          categoryName: "Food", 
          description: "Lunch", 
          transactionType: 1, 
          amount: 15.50, 
          date: "2026-06-03" 
        }
      }
    }).as('getSingleTransaction');

    // 5. Perform Login and navigate to History
    cy.visit('http://localhost:3000/auth/login');
    cy.get('input[name="email"]').type('active_user@example.com');
    cy.get('input[name="password"]').type('SecurePass123');
    cy.get('input[type="submit"]').click();
    
    cy.wait('@loginRequest');
    cy.visit('http://localhost:3000/user/transactions');
    cy.wait('@getTransactions');
  });

  it('TP-10-001: Delete Transaction Main Flow', () => {
    // ==================================
    // Main Flow - Successful Deletion [TC-10-001]
    // ==================================

    // 1. Click on an existing transaction record.
    cy.get('.t-row').should('be.visible').first().click();

    // 2. Verify redirect and wait for the Edit form to fetch data
    cy.url().should('include', '/user/editTransaction/123');
    // Wait for the categories to load so the form renders!
    cy.wait('@getCategories'); 

    // 3. Verify the Delete button is displayed.
    cy.get('.delete').should('be.visible').and('contain', 'Delete transaction');

    // 4. Mock the DELETE API endpoint
    cy.intercept('DELETE', '**/mywallet/transaction/delete*', {
      statusCode: 200,
      body: {
        status: 'SUCCESS',
        response: 'Transaction has been successfully deleted!'
      }
    }).as('deleteTransaction');

    // 5. Click the "Delete transaction" button.
    cy.get('.delete').click();
    cy.wait('@deleteTransaction');

    // 6. Verify the success toast message and redirection back to History
    cy.url().should('include', '/user/transactions');
    cy.contains('Transaction has been successfully deleted!').should('be.visible');
  });

});