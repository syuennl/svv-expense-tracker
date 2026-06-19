describe('2.6 Budget Tracking Test Procedure', () => {

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

  it('TP-06-001: Budget Tracking Main Flow, Invalid Inputs, and Cancel Edit', () => {
    const currentMonth = new Date().getMonth() + 1;

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

    let currentBudget = 1500;

    cy.intercept('GET', '**/mywallet/budget/get*', (req) => {
      req.reply({
        statusCode: 200,
        body: { status: 'SUCCESS', response: currentBudget }
      });
    }).as('getBudget');

    cy.intercept('POST', '**/mywallet/budget/create', (req) => {
      currentBudget = Number(req.body.amount);
      req.reply({
        statusCode: 200,
        body: { status: 'SUCCESS', response: null }
      });
    }).as('createBudget');

    cy.intercept('GET', '**/mywallet/report/getTotalByCategory*', {
      statusCode: 200,
      body: { status: 'SUCCESS', response: 1200 }
    }).as('getTotalByCategory');

    cy.intercept('GET', '**/mywallet/report/getTotalIncomeOrExpense*', (req) => {
      if (req.query.transactionTypeId === '2') {
        req.reply({ status: 'SUCCESS', response: 5000.00 });
      } else {
        req.reply({ status: 'SUCCESS', response: 2500.00 });
      }
    }).as('getIncomeExpense');

    cy.intercept('GET', '**/mywallet/report/getTotalNoOfTransactions*', {
      statusCode: 200,
      body: { status: 'SUCCESS', response: 12 }
    }).as('getTransactionCount');

    cy.visit('http://localhost:3000/user/dashboard');
    cy.wait(['@getCategories', '@getBudget', '@getIncomeExpense', '@getTransactionCount']);

    cy.contains('button', 'Edit').should('be.visible').click();
    cy.get('.budget-form.active').should('exist');

    // TC-06-003: Empty amount validation
    cy.get('.budget-form.active input[type="text"]').clear();
    cy.get('.budget-form.active input[type="submit"][value="Save"]').click();
    cy.contains('small', 'Amount is required!').should('be.visible');

    // TC-06-003: Non-numeric amount validation
    cy.get('.budget-form.active input[type="text"]').clear().type('RM20');
    cy.get('.budget-form.active input[type="submit"][value="Save"]').click();
    cy.contains('small', 'Invalid amount!').should('be.visible');

    // TC-06-003: Negative amount validation
    cy.get('.budget-form.active input[type="text"]').clear().type('-20.00');
    cy.get('.budget-form.active input[type="submit"][value="Save"]').click();
    cy.contains('small', 'Invalid amount!').should('be.visible');

    // TC-06-002: Cancel edit with valid amount input
    cy.get('.budget-form.active input[type="text"]').clear().type('50.00');
    cy.get('.budget-form.active input[type="submit"][value="Cancel"]').click();
    cy.get('.budget-form').should('not.have.class', 'active');
    cy.contains('Budget: 1500').should('be.visible');

    // TC-06-001: Save valid zero amount
    cy.contains('button', 'Edit').click();
    cy.get('.budget-form.active input[type="text"]').clear().type('0.00');
    cy.get('.budget-form.active input[type="submit"][value="Save"]').click();
    cy.wait('@createBudget');
    cy.wait('@getBudget');
    cy.get('.budget-form').should('not.have.class', 'active');
    cy.contains('Budget: 0').should('be.visible');
    cy.contains('Remaining: -2500').should('be.visible');

    // TC-06-001: Save a large valid amount
    cy.contains('button', 'Edit').click();
    cy.get('.budget-form.active input[type="text"]').clear().type('9999999.99');
    cy.get('.budget-form.active input[type="submit"][value="Save"]').click();
    cy.wait('@createBudget');
    cy.wait('@getBudget');
    cy.get('.budget-form').should('not.have.class', 'active');
    cy.contains('Budget: 9999999.99').should('be.visible');
    cy.contains('Remaining: 9997499.99').should('be.visible');
  });

});