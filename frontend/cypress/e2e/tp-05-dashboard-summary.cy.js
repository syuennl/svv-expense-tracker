describe('2.5 Dashboard Summary Test Procedure', () => {

  beforeEach(() => {
    // ==================================
    // Pre-requisite: Quick Login via Mock
    // ==================================
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

    cy.visit('http://localhost:3000/auth/login');
    cy.get('input[name="email"]').type('active_user@example.com');
    cy.get('input[name="password"]').type('SecurePass123');
    cy.get('input[type="submit"]').click();
    cy.wait('@loginRequest');
  });

  it('TP-05-001: Dashboard Summary Main Flow, Change Month Filter, and Empty Month', () => {
    const currentMonth = new Date().getMonth() + 1;
    const mayMonth = 5;
    const aprilMonth = 4;

    // ==================================
    // Mock all dashboard backend APIs inside it()
    // ==================================
    cy.intercept('GET', '**/mywallet/category/getAll', {
      statusCode: 200,
      body: {
        status: 'SUCCESS',
        response: [
          { categoryId: 1, categoryName: 'Groceries', transactionType: { transactionTypeId: 1 } },
          { categoryId: 2, categoryName: 'Salary', transactionType: { transactionTypeId: 2 } }
        ]
      }
    }).as('getCategories');

    cy.intercept('GET', '**/mywallet/budget/get*', {
      statusCode: 200,
      body: { status: 'SUCCESS', response: 1500 }
    }).as('getBudget');

    cy.intercept('GET', '**/mywallet/report/getTotalByCategory*', {
      statusCode: 200,
      body: { status: 'SUCCESS', response: 1200 }
    }).as('getTotalByCategory');

    cy.intercept('GET', '**/mywallet/report/getTotalIncomeOrExpense*', (req) => {
      const month = Number(req.query.month);
      const typeId = req.query.transactionTypeId;

      if (typeId === '2') {
        if (month === currentMonth) req.reply({ status: 'SUCCESS', response: 5000.00 });
        else if (month === mayMonth) req.reply({ status: 'SUCCESS', response: 8000.00 });
        else if (month === aprilMonth) req.reply({ status: 'SUCCESS', response: 0 });
        else req.reply({ status: 'SUCCESS', response: 0 });
      } else {
        if (month === currentMonth) req.reply({ status: 'SUCCESS', response: 2500.00 });
        else if (month === mayMonth) req.reply({ status: 'SUCCESS', response: 1000.00 });
        else if (month === aprilMonth) req.reply({ status: 'SUCCESS', response: 0 });
        else req.reply({ status: 'SUCCESS', response: 0 });
      }
    }).as('getIncomeExpense');

    cy.intercept('GET', '**/mywallet/report/getTotalNoOfTransactions*', (req) => {
      const month = Number(req.query.month);
      if (month === currentMonth) req.reply({ status: 'SUCCESS', response: 12 });
      else if (month === mayMonth) req.reply({ status: 'SUCCESS', response: 5 });
      else if (month === aprilMonth) req.reply({ status: 'SUCCESS', response: 0 });
      else req.reply({ status: 'SUCCESS', response: 0 });
    }).as('getTransactionCount');

    // Visit dashboard after all mocks are in place
    cy.visit('http://localhost:3000/user/dashboard');

    // Wait for the first dashboard load
    cy.wait(['@getCategories', '@getBudget', '@getIncomeExpense', '@getTransactionCount']);

    cy.get('select').should('exist');
    cy.contains('Rs. 5000').should('be.visible');
    cy.contains('Rs. 2500').should('be.visible');
    cy.contains('12').should('be.visible');

    // Select May and verify updated results
    cy.get('select').select(`${mayMonth}`);
    cy.wait(['@getIncomeExpense', '@getTransactionCount']);
    cy.contains('Rs. 8000').should('be.visible');
    cy.contains('Rs. 1000').should('be.visible');
    cy.contains('5').should('be.visible');

    // Select April and verify empty state message
    cy.get('select').select(`${aprilMonth}`);
    cy.wait(['@getIncomeExpense', '@getTransactionCount']);
    cy.contains('You have no expenses in this month!').should('be.visible');
  });

});