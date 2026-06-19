describe('2.7 Transaction History Test Procedure', () => {
  const API_BASE = '**/mywallet';
  
  // FIX 1: We use a properly formatted fake JWT so the frontend decoder doesn't crash on 'exp'
  const fakeJwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTl9.signature';
  
  const loginUser = {
    email: 'tester01@example.com',
    id: 1,
    roles: ['ROLE_USER']
  };

  beforeEach(() => {
    cy.intercept('POST', `${API_BASE}/auth/signin`, {
      statusCode: 200,
      body: {
        id: 1,
        email: 'tester01@example.com',
        roles: ['ROLE_USER'],
        accessToken: fakeJwtToken,
        token: fakeJwtToken
      }
    }).as('loginRequest');
  });

  it('TP-07-001: View Transaction History Main Flow, No Search Results, and Pagination Boundaries', () => {
    const page0 = {
      data: {
        '2026-06-01': [
          { transactionId: 1, categoryName: 'Food', description: 'Page 1 - Lunch', transactionType: 1, amount: 10.00, date: '2026-06-01T00:00:00' }
        ]
      },
      totalNoOfPages: 3,
      totalNoOfRecords: 25
    };
    const page1 = {
      data: {
        '2026-06-02': [
          { transactionId: 2, categoryName: 'Transport', description: 'Page 2 - Bus fare', transactionType: 1, amount: 5.00, date: '2026-06-02T00:00:00' }
        ]
      },
      totalNoOfPages: 3,
      totalNoOfRecords: 25
    };
    const page2 = {
      data: {
        '2026-06-03': [
          { transactionId: 3, categoryName: 'Salary', description: 'Page 3 - Bonus', transactionType: 2, amount: 1000.00, date: '2026-06-03T00:00:00' }
        ]
      },
      totalNoOfPages: 3,
      totalNoOfRecords: 25
    };

    cy.intercept('GET', `${API_BASE}/transaction/getByUser*`, (req) => {
      const pageNumber = Number(req.query.pageNumber || 0);
      const searchKey = (req.query.searchKey || '').trim().toLowerCase();

      // FIX 2: If the search key has ANY text in it, return the empty state.
      // This handles the typing character-by-character issue.
      if (searchKey.length > 0) {
        req.reply({
          statusCode: 200,
          body: {
            status: 'SUCCESS',
            response: {
              data: [],
              totalNoOfPages: 0, // Set to 0 to simulate empty data
              totalNoOfRecords: 0
            }
          }
        });
        return;
      }

      if (pageNumber === 0) {
        req.reply({ statusCode: 200, body: { status: 'SUCCESS', response: page0 } });
        return;
      }
      if (pageNumber === 1) {
        req.reply({ statusCode: 200, body: { status: 'SUCCESS', response: page1 } });
        return;
      }
      req.reply({ statusCode: 200, body: { status: 'SUCCESS', response: page2 } });
    }).as('getTransactions');

    // FIX 3: Ensure full URL to avoid 404
    cy.visit('http://localhost:3000/user/transactions', {
      onBeforeLoad: (win) => {
        // Using the new fakeJwtToken here as well for local storage
        win.localStorage.setItem('user', JSON.stringify({ ...loginUser, token: fakeJwtToken }));
      }
    });

    cy.wait('@getTransactions');

    cy.contains('Page 1 - Lunch').should('be.visible');
    cy.get('.page-info button').eq(0).should('have.class', 'disable');
    cy.get('.page-info button').eq(1).should('not.have.class', 'disable').click();
    
    cy.wait('@getTransactions');
    cy.contains('Page 2 - Bus fare').should('be.visible');
    cy.get('.page-info span').should('contain', '11 to 20 of 25 records');

    const clickNextUntilEnd = () => {
      cy.get('.page-info button').eq(1).then(($btn) => {
        if (!$btn.hasClass('disable')) {
          cy.wrap($btn).click();
          cy.wait('@getTransactions');
          clickNextUntilEnd();
        }
      });
    };

    clickNextUntilEnd();
    cy.get('.page-info button').eq(1).should('have.class', 'disable');
    cy.contains('Page 3 - Bonus').should('be.visible');

    cy.get('input[placeholder="Search transactions"]').clear().type('Unknown');
    
    // Wait for the UI to settle after typing
    cy.wait('@getTransactions');
    
    // 1. Check if the empty message appears
    cy.contains('No transactions found!').should('be.visible');
    cy.get('.t-row').should('not.exist');

    // 2. THIS WILL CATCH THE PAGINATION BUG
    // Cypress expects these to be disabled. If the app doesn't disable them, this fails!
    cy.get('.page-info button').eq(0).should('have.class', 'disable');
    cy.get('.page-info button').eq(1).should('have.class', 'disable');
  });

  it('TP-07-002: View Transaction History Empty State and Pagination Disabled', () => {
    cy.intercept('GET', `${API_BASE}/transaction/getByUser*`, {
      statusCode: 200,
      body: {
        status: 'SUCCESS',
        response: {
          data: [],
          totalNoOfPages: 0, // Ensure empty state pages are 0
          totalNoOfRecords: 0
        }
      }
    }).as('getTransactions');

    cy.visit('http://localhost:3000/user/transactions', {
      onBeforeLoad: (win) => {
        win.localStorage.setItem('user', JSON.stringify({ ...loginUser, token: fakeJwtToken }));
      }
    });

    cy.wait('@getTransactions');
    cy.contains('No transactions found!').should('be.visible');
    
    // This will catch the bug if initial empty state also fails to disable buttons
    cy.get('.page-info button').eq(0).should('have.class', 'disable');
    cy.get('.page-info button').eq(1).should('have.class', 'disable');
  });
});