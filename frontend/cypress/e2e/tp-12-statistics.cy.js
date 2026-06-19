describe('2.12 Statistics Test Procedure', () => {
  beforeEach(() => {
    // This is a fake JWT. 
    // The middle part (eyJleHAiOjk5OTk5OTk5OTl9) translates to {"exp": 9999999999}
    const fakeJwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTl9.signature';

    cy.intercept('POST', '**/mywallet/auth/signin', {
      statusCode: 200,
      body: {
        id: 1,
        email: 'active_user@example.com',
        roles: ['ROLE_USER'],
        accessToken: fakeJwtToken,
        token: fakeJwtToken
      }
    }).as('loginRequest');
  });

  const loginAndOpenStatistics = () => {
    cy.visit('http://localhost:3000/auth/login');
    cy.get('input[name="email"]').type('active_user@example.com');
    cy.get('input[name="password"]').type('SecurePass123');
    cy.get('input[type="submit"]').click();
    cy.wait('@loginRequest');
    cy.url().should('include', '/user/dashboard');
    cy.contains('Statistics').click();
    cy.url().should('include', '/user/statistics');
  };

  it('TP-12-001: Categorised Financial Statistics Main Flow', () => {
    const currentDate = new Date();
    const months = [];

    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      months.push({
        id: date.getMonth() + 1,
        monthName: date.toLocaleString('en-US', { month: 'long' }),
        totalIncome: 1000 + i * 100,
        totalExpense: 500 + i * 50
      });
    }

    cy.intercept('GET', '**/mywallet/report/getMonthlySummaryByUser*', {
      statusCode: 200,
      body: {
        status: 'SUCCESS',
        response: months.map((m) => ({
          month: m.id,
          total_income: m.totalIncome,
          total_expense: m.totalExpense
        }))
      }
    }).as('getMonthlySummary');

    cy.intercept('GET', '**/mywallet/category/getAll', {
      statusCode: 200,
      body: {
        status: 'SUCCESS',
        response: [
          { categoryId: 1, categoryName: 'Food', transactionType: { transactionTypeId: 1 } },
          { categoryId: 2, categoryName: 'Salary', transactionType: { transactionTypeId: 2 } }
        ]
      }
    }).as('getCategories');

    cy.intercept('GET', '**/mywallet/report/getTotalIncomeOrExpense*', {
      statusCode: 200,
      body: { status: 'SUCCESS', response: 0 }
    }).as('getIncomeExpense');

    cy.intercept('GET', '**/mywallet/report/getTotalNoOfTransactions*', {
      statusCode: 200,
      body: { status: 'SUCCESS', response: 0 }
    }).as('getTransactionCount');

    cy.intercept('GET', '**/mywallet/report/getTotalByCategory*', {
      statusCode: 200,
      body: { status: 'SUCCESS', response: 0 }
    }).as('getTotalByCategory');

    cy.intercept('GET', '**/mywallet/budget/get*', {
      statusCode: 200,
      body: { status: 'SUCCESS', response: 0 }
    }).as('getBudget');

    loginAndOpenStatistics();

    cy.wait('@getMonthlySummary');

    cy.contains('Statistics').should('be.visible');
    cy.contains('Income').should('be.visible');
    cy.contains('Expense').should('be.visible');
    cy.get('svg').should('exist');
    cy.contains(months[0].monthName).should('exist');
    cy.contains(months[months.length - 1].monthName).should('be.visible');
  });

  it('TP-12-002: Categorised Financial Statistics No Transaction Data', () => {
    const currentDate = new Date();
    const months = [];

    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      months.push({
        id: date.getMonth() + 1,
        monthName: date.toLocaleString('en-US', { month: 'long' })
      });
    }

    cy.intercept('GET', '**/mywallet/report/getMonthlySummaryByUser*', {
      statusCode: 200,
      body: {
        status: 'SUCCESS',
        response: []
      }
    }).as('getMonthlySummary');

    cy.intercept('GET', '**/mywallet/category/getAll', {
      statusCode: 200,
      body: {
        status: 'SUCCESS',
        response: [
          { categoryId: 1, categoryName: 'Food', transactionType: { transactionTypeId: 1 } },
          { categoryId: 2, categoryName: 'Salary', transactionType: { transactionTypeId: 2 } }
        ]
      }
    }).as('getCategories');

    cy.intercept('GET', '**/mywallet/report/getTotalIncomeOrExpense*', {
      statusCode: 200,
      body: { status: 'SUCCESS', response: 0 }
    }).as('getIncomeExpense');

    cy.intercept('GET', '**/mywallet/report/getTotalNoOfTransactions*', {
      statusCode: 200,
      body: { status: 'SUCCESS', response: 0 }
    }).as('getTransactionCount');

    cy.intercept('GET', '**/mywallet/report/getTotalByCategory*', {
      statusCode: 200,
      body: { status: 'SUCCESS', response: 0 }
    }).as('getTotalByCategory');

    cy.intercept('GET', '**/mywallet/budget/get*', {
      statusCode: 200,
      body: { status: 'SUCCESS', response: 0 }
    }).as('getBudget');

    loginAndOpenStatistics();

    cy.wait('@getMonthlySummary');

    cy.contains('Statistics').should('be.visible');
    cy.contains('Income').should('be.visible');
    cy.contains('Expense').should('be.visible');
    cy.get('svg').should('exist');
    cy.contains(months[0].monthName).should('exist');
    cy.contains(months[months.length - 1].monthName).should('be.visible');
  });
});