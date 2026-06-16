describe('2.9 Edit Existing Transaction Test Procedure', () => {
    const API_BASE = '**/mywallet';

    beforeEach(() => {
        // mock api
        // categories for edit transaction form
        cy.intercept('GET', `${API_BASE}/category/getAll`, {
            statusCode: 200,
            body: {
                status: "SUCCESS",
                response: [
                    { categoryId: 1, categoryName: "Food", enabled: true, transactionType: { transactionTypeId: 1 } },
                    { categoryId: 2, categoryName: "Leisure", enabled: true, transactionType: { transactionTypeId: 1 } },
                    { categoryId: 3, categoryName: "Salary", enabled: true, transactionType: { transactionTypeId: 2 } }
                ]
            }
        }).as('getCategories');

        // get transactions list
        cy.intercept('GET', `${API_BASE}/transaction/getByUser*`, {
            statusCode: 200,
            body: {
                status: "SUCCESS",
                response: {
                    data: {
                        "2026-06-03": [
                            {
                                transactionId: 123,
                                categoryName: "Food",
                                description: "Lunch",
                                transactionType: 1,
                                amount: 20.00,
                                date: "2026-06-03T00:00:00"
                            }
                        ]
                    },
                    totalNoOfPages: 1,
                    totalNoOfRecords: 1
                }
            }
        }).as('getTransactions');

        // get single transaction
        cy.intercept('GET', `${API_BASE}/transaction/getById*`, {
            statusCode: 200,
            body: {
                status: "SUCCESS",
                response: {
                    transactionId: 123,
                    categoryName: "Food",
                    categoryId: 1,
                    description: "Lunch",
                    transactionType: 1,
                    amount: 20.00,
                    date: "2026-06-03"
                }
            }
        }).as('getSingleTransaction');

        // programmatic login with a valid JWT format to prevent AuthVerify exp checks from crashing
        // go to transactions history page
        cy.visit('/user/transactions', {
            onBeforeLoad: (win) => {
                const payloadBase64 = win.btoa(JSON.stringify({ exp: 9999999999 })); // expiration date in 2286, btoa encodes it into a base64 token
                const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${payloadBase64}.signature`;
                win.localStorage.setItem('user', JSON.stringify({
                    email: 'tester01@example.com',
                    token: token,
                    id: 1,
                    roles: ['ROLE_USER']
                }));
            }
        });
        cy.wait('@getTransactions'); // ensure the list loads before the test starts

        // select an existing transaction to edit
        cy.get('.t-row').first().click();
        cy.wait('@getSingleTransaction'); // wait for form to auto-populate
        cy.wait('@getCategories'); // wait for categories to load
    });

    it('TP-09-001: Edit Existing Transaction Main Flow (Valid Inputs)', () => {
        // ==================================
        // Step 1: Mock APIs
        // ==================================
        // update transaction
        cy.intercept('PUT', `${API_BASE}/transaction/update*`, {
            statusCode: 200,
            body: {
                status: 'SUCCESS',
                response: 'Transaction has been successfully updated!'
            }
        }).as('updateTransactionReq');

        // ==================================
        // Step 2: Modify Inputs and Save
        // ==================================
        cy.get('input[type="radio"][id="Leisure"]').check({ force: true });
        cy.get('input[name="description"]').clear().type('Bouldering day');
        cy.get('input[name="amount"]').clear().type('38.00');

        cy.get('input[value="Save transaction"]').click();
        cy.wait('@updateTransactionReq');
        cy.contains('Transaction has been successfully updated!').should('be.visible');

        // ==================================
        // Step 3: Wrap Up - Verify Redirect to Transactions History page
        // ==================================
        cy.url().should('include', '/user/transactions');
    });

    it('TP-09-002: Edit Existing Transaction Empty Transaction Category', () => {
        // ==================================
        // Step 1: Change Transaction Type to trigger the category reset
        // ==================================
        cy.contains('div', 'Income').click();

        // ==================================
        // Step 2: Leave Category Empty and Save
        // ==================================
        cy.get('input[value="Save transaction"]').click();
        cy.contains('small', 'category is required').should('be.visible');

        // ==================================
        // Step 3: Wrap Up - Verify Submission Halted
        // ==================================
        cy.contains('Transaction has been successfully updated!').should('not.exist');
        cy.url().should('include', '/user/editTransaction');
    });

    it('TP-09-003: Edit Existing Transaction Invalid Amount Input', () => {
        // ==================================
        // Step 1: Test Negative Value
        // ==================================
        cy.get('input[name="amount"]').clear().type('-50.00');
        cy.get('input[value="Save transaction"]').click();
        cy.contains('small', 'Invalid amount!').should('be.visible');

        // ==================================
        // Step 2: Test Non-numeric Value
        // ==================================
        cy.get('input[name="amount"]').clear().type('RM50');
        cy.get('input[value="Save transaction"]').click();
        cy.contains('small', 'Invalid amount!').should('be.visible');

        // ==================================
        // Step 3: Wrap Up - Verify Submission Halted
        // ==================================
        cy.contains('Transaction has been successfully updated!').should('not.exist');
        cy.url().should('include', '/user/editTransaction');
    });

    it('TP-09-004: Edit Existing Transaction Missing Amount', () => {
        // ==================================
        // Step 1: Clear Amount Field Entirely
        // ==================================
        cy.get('input[name="amount"]').clear();

        // ==================================
        // Step 2: Click Save Transaction Button
        // ==================================
        cy.get('input[value="Save transaction"]').click();

        // ==================================
        // Step 3: Observe Required Validation Message
        // ==================================
        cy.contains('small', 'Amount is required!').should('be.visible');

        // ==================================
        // Step 4: Wrap Up - Verify Submission Halted
        // ==================================
        cy.contains('Transaction has been successfully updated!').should('not.exist');
        cy.url().should('include', '/user/editTransaction');
    });

    it('TP-09-005: Edit Existing Transaction Cancel Changes', () => {
        // ==================================
        // Step 1: Modify Description and Amount
        // ==================================
        cy.get('input[name="description"]').clear().type('Dinner with colleague');
        cy.get('input[name="amount"]').clear().type('45.00');

        // ==================================
        // Step 2: Click Cancel Button
        // ==================================
        cy.get('input[value="Cancel"]').click();

        // ==================================
        // Step 3: Wrap Up - Verify Redirect to Transactions History Page
        // ==================================
        cy.contains('Transaction has been successfully updated!').should('not.exist');
        cy.url().should('include', '/user/transactions');
    });

});
