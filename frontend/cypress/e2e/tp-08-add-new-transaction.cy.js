describe('2.8 Add New Transaction Test Procedure', () => {

  beforeEach(() => {
    // ==================================
    // Pre-requisite: Quick Login & Navigate via Sidebar
    // ==================================
    // 1. Mock the login API to return a fake valid token
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

    // 2. Mock the categories API so the form renders successfully
    cy.intercept('GET', '**/mywallet/category/getAll', {
      statusCode: 200,
      body: {
        status: "SUCCESS",
        response: [
          {
            categoryId: 1,
            categoryName: "Food",
            enabled: true,
            transactionType: { transactionTypeId: 1 }
          },
          {
            categoryId: 2,
            categoryName: "Salary",
            enabled: true,
            transactionType: { transactionTypeId: 2 }
          }
        ]
      }
    }).as('getCategories');

    // 3. Visit login page and perform login
    cy.visit('http://localhost:3000/auth/login');
    cy.get('input[name="email"]').type('active_user@example.com');
    cy.get('input[name="password"]').type('SecurePass123');
    cy.get('input[type="submit"]').click();
    
    // 4. Wait for API and verify frontend successfully processed the login (Token saved)
    cy.wait('@loginRequest');
    cy.url().should('include', '/user/dashboard');

    // 5. Navigate to New Transaction by clicking the link in the Sidebar
    // We use .contains to find the exact text 'New Transaction' in the sidebar
    cy.get('.side-bar').should('be.visible').contains('New Transaction').click();

    // 6. Wait for categories to load
    cy.wait('@getCategories');

    // 7. Verify we are successfully on the New Transaction page
    cy.url().should('include', '/user/newTransaction');

  });

  it('TP-08-001: Add New Transaction Main Flow & Cancel', () => {
    // ==================================
    // Step 1: Alternate Flow - Cancel Operation (TC-08-002)
    // ==================================

    // 1. Toggle transaction type to Expense
    cy.get('.type-select').should('be.visible').contains('Expense').click({ force: true });

    // 2. Select Category 'Food'
    cy.get('input[type="radio"][id="Food"]').check({ force: true });

    // 3. Fill the remaining fields with valid data
    cy.get('input[name="description"]').type('Lunch');
    cy.get('input[name="amount"]').type('15.50');
    cy.get('input[name="date"]').type('2026-04-30');

    // 4. Click Cancel button
    cy.get('input[type="submit"].outline[value="Cancel"]').click();

    // 5. Verify system aborts and redirects to Transaction History screen
    cy.url().should('include', '/user/transactions');

    // ==================================
    // Step 2: Main Flow - Successful Transaction (TC-08-001)
    // ==================================

    // 1. Navigate back to the New Transaction screen via Sidebar
    cy.get('.side-bar').should('be.visible').contains('New Transaction').click();
    cy.wait('@getCategories'); // Wait for form to populate again

    // 2. Mock the save transaction API with a success response string and status
    cy.intercept('POST', '**/mywallet/transaction/new', {
      statusCode: 200,
      body: { 
        status: 'SUCCESS', 
        response: 'Transaction has been successfully recorded!' 
      }
    }).as('saveTransaction');

    // 3. Toggle type and select Category
    cy.get('.type-select').should('be.visible').contains('Expense').click({ force: true });
    cy.get('input[type="radio"][id="Food"]').check({ force: true });

    // 4. Fill the remaining fields
    cy.get('input[name="description"]').type('Lunch with the client.');
    cy.get('input[name="amount"]').type('15.50');
    cy.get('input[name="date"]').type('2026-04-30');

    // 5. Click Save transaction button
    cy.get('input[type="submit"][value="Save transaction"]').click();
    cy.wait('@saveTransaction');

    // 6. Verify system redirects to Transaction History and displays success toast
    cy.url().should('include', '/user/transactions');
    cy.contains('Transaction has been successfully recorded!').should('be.visible');
  });

  it('TP-08-002: Add New Transaction Form Validation Errors', () => {
    // ==================================
    // Step 1 - 3: Category Unselected [TC-08-003]
    // ==================================
    
    // 1. Navigate to the New Transaction screen.
    // (Because TP-08-001 ended on the History screen, we click Sidebar to go back)
    cy.get('.side-bar').should('be.visible').contains('New Transaction').click();
    cy.wait('@getCategories');

    // 2. Leave Transaction Category unselected. Enter Description (Lunch), Amount (15.50), and Date (2026-04-30).
    cy.get('input[name="description"]').type('Lunch');
    cy.get('input[name="amount"]').type('15.50');
    cy.get('input[name="date"]').type('2026-04-30');

    // 3. Click "Save transaction" and verify the category required error message.
    cy.get('input[type="submit"][value="Save transaction"]').click();
    cy.contains('category is required').should('be.visible');

    // ==================================
    // Step 4 - 5: Description Exceeds Limit [TC-08-004]
    // ==================================
    
    // 4. Select Category (Food). Change Description to exactly 51 characters.
    cy.get('.type-select').should('be.visible').contains('Expense').click({ force: true });
    cy.get('input[type="radio"][id="Food"]').check({ force: true });
    cy.get('input[name="description"]').clear().type('This is a very long description that exceeds limits');

    // 5. Click "Save transaction" and verify the description maximum length limit error message.
    cy.get('input[type="submit"][value="Save transaction"]').click();
    cy.contains('Description can have atmost 50 characters!').should('be.visible');

    // ==================================
    // Step 6 - 7: Amount Field Empty [TC-08-005]
    // ==================================
    
    // 6. Change Description to a valid input (Lunch). Clear the Amount field.
    cy.get('input[name="description"]').clear().type('Lunch');
    cy.get('input[name="amount"]').clear();

    // 7. Click "Save transaction" and verify the amount required error message.
    cy.get('input[type="submit"][value="Save transaction"]').click();
    cy.contains('Amount is required!').should('be.visible');

    // ==================================
    // Step 8 - 10: Invalid Amount [TC-08-006]
    // ==================================
    
    // 8. Enter -10.00 in the Amount field. Click "Save transaction" and verify the invalid amount error message.
    cy.get('input[name="amount"]').type('-10.00');
    cy.get('input[type="submit"][value="Save transaction"]').click();
    cy.contains('Invalid amount!').should('be.visible');

    // 9. Clear the Amount field and enter -0.01. Click "Save transaction" and verify the invalid amount error message.
    cy.get('input[name="amount"]').clear().type('-0.01');
    cy.get('input[type="submit"][value="Save transaction"]').click();
    cy.contains('Invalid amount!').should('be.visible');

    // 10. Clear the Amount field and enter RM20. Click "Save transaction" and verify the invalid amount error message.
    cy.get('input[name="amount"]').clear().type('RM20');
    cy.get('input[type="submit"][value="Save transaction"]').click();
    cy.contains('Invalid amount!').should('be.visible');

    // ==================================
    // Step 11 - 13: Invalid or Empty Date [TC-08-007]
    // ==================================
    
    // 11. Clear the Amount field and enter a valid Amount (15.50). 
    cy.get('input[name="amount"]').clear().type('15.50');
    
    // DOM Manipulation: Bypass native browser date picker restrictions to ensure full BVA test coverage
    cy.get('input[name="date"]').invoke('attr', 'type', 'text').clear().type('2026-13-32');

    // Mock API to return invalid date error
    cy.intercept('POST', '**/mywallet/transaction/new', {
      statusCode: 400,
      body: { response: 'Invalid date format!' } 
    }).as('invalidDateError');

    // 12. Click "Save transaction" and verify the invalid date format error message.
    cy.get('input[type="submit"][value="Save transaction"]').click();
    cy.wait('@invalidDateError');
    cy.contains('Invalid date format!').should('be.visible'); 

    // 13. Clear the Date field. Click "Save transaction" and verify the date required error message.
    cy.get('input[name="date"]').clear(); 

    // Mock API to return empty date error 
    cy.intercept('POST', '**/mywallet/transaction/new', {
      statusCode: 400,
      body: { response: 'Date is required!' } 
    }).as('emptyDateError');

    cy.get('input[type="submit"][value="Save transaction"]').click();
    cy.wait('@emptyDateError');
    cy.contains('Date is required!').should('be.visible');

  });

});