describe('2.14 Admin Transaction Monitoring Test Procedure', () => {
    const API_BASE = '**/mywallet';
    const VALID_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTl9.signature';

    beforeEach(() => {
        // dynamic get transactions mock api to support search and pagination scenarios
        cy.intercept('GET', `${API_BASE}/transaction/getAll*`, (req) => {
            const query = req.query;
            const searchKey = query.searchKey || '';
            const pageNumber = parseInt(query.pageNumber || '0');

            if (searchKey === 'nonexistentkeyword123') {
                req.reply({
                    statusCode: 200,
                    body: {
                        status: 'SUCCESS',
                        response: {
                            data: [],
                            totalNoOfPages: 0,
                            totalNoOfRecords: 0
                        }
                    }
                });
            } else if (searchKey === 'user1@example.com' || searchKey === 'Food') {
                req.reply({
                    statusCode: 200,
                    body: {
                        status: 'SUCCESS',
                        response: {
                            data: [
                                {
                                    transactionId: 1,
                                    userEmail: 'user1@example.com',
                                    description: 'Lunch with client',
                                    amount: 25.50,
                                    transactionType: 1,
                                    categoryName: 'Food',
                                    date: '2026-06-03T00:00:00'
                                }
                            ],
                            totalNoOfPages: 1,
                            totalNoOfRecords: 1
                        }
                    }
                });
            } else { // search field empty
                // return multi-page mock database (12 records total, 10 on page 0, 2 on page 1)
                if (pageNumber === 0) {
                    const page0Data = [];
                    for (let i = 1; i <= 10; i++) {
                        page0Data.push({
                            transactionId: i,
                            userEmail: `user${i}@example.com`,
                            description: `Transaction ${i}`,
                            amount: 10.00 * i,
                            transactionType: 1,
                            categoryName: i % 2 === 0 ? 'Salary' : 'Food',
                            date: '2026-06-03T00:00:00'
                        });
                    }
                    req.reply({
                        statusCode: 200,
                        body: {
                            status: 'SUCCESS',
                            response: {
                                data: page0Data,
                                totalNoOfPages: 2,
                                totalNoOfRecords: 12
                            }
                        }
                    });
                } else {
                    const page1Data = [
                        {
                            transactionId: 11,
                            userEmail: 'user11@example.com',
                            description: 'Transaction 11',
                            amount: 110.00,
                            transactionType: 2,
                            categoryName: 'Salary',
                            date: '2026-06-03T00:00:00'
                        },
                        {
                            transactionId: 12,
                            userEmail: 'user12@example.com',
                            description: 'Transaction 12',
                            amount: 120.00,
                            transactionType: 1,
                            categoryName: 'Food',
                            date: '2026-06-03T00:00:00'
                        }
                    ];
                    req.reply({
                        statusCode: 200,
                        body: {
                            status: 'SUCCESS',
                            response: {
                                data: page1Data,
                                totalNoOfPages: 2,
                                totalNoOfRecords: 12
                            }
                        }
                    });
                }
            }
        }).as('getAllTransactions');

        // programmatic admin login and navigate to the admin transactions page
        cy.visit('/admin/transactions', {
            onBeforeLoad: (win) => {
                win.localStorage.setItem('user', JSON.stringify({
                    email: 'admin@example.com',
                    token: VALID_TOKEN,
                    id: 1,
                    roles: ['ROLE_ADMIN']
                }));
            }
        });

        // wait for the initial page load to stabilise
        cy.get('table').should('be.visible');
        cy.get('table tr').should('have.length', 11);
    });

    it('TP-14-001: Admin Transaction Monitoring Main Flow (Valid Inputs)', () => {
        // ==================================
        // Step 1: Verify all records table loaded (1 header row + 10 data rows)
        // ==================================
        cy.get('table').should('be.visible');
        cy.get('table tr').should('have.length', 11);

        // ==================================
        // Step 2: Search with valid keyword (e.g. Email) (1 header row + 1 data row)
        // ==================================
        cy.get('input[placeholder="Search transactions"]').type('user1@example.com');
        cy.get('table tr').should('have.length', 2);
        cy.get('table tr').eq(1).contains('user1@example.com');

        // ==================================
        // Step 3: Verify Pagination Arrow Navigation
        // ==================================
        // clear search to reset table to show all transactions
        cy.get('input[placeholder="Search transactions"]').clear();
        cy.get('table tr').should('have.length', 11);

        // click next page arrow (eq(1) is the second button inside page-info)
        cy.get('.page-info button').eq(1).click();
        cy.get('table tr').should('have.length', 3); // 1 header row + 2 data rows
        cy.get('.page-info span').should('contain', '11 to 12 of 12 records');

        // click previous page arrow
        cy.get('.page-info button').eq(0).click();
        cy.get('table tr').should('have.length', 11);
        cy.get('.page-info span').should('contain', '1 to 10 of 12 records');

        // ==================================
        // Step 4: Wrap Up - Clear search bar (already cleared)
        // ==================================
        cy.get('input[placeholder="Search transactions"]').should('have.value', '');
    });

    it('TP-14-002: Admin Transaction Monitoring No Search Results Found', () => {
        // ==================================
        // Step 1: Enter non-existent keyword
        // ==================================
        cy.get('input[placeholder="Search transactions"]').type('nonexistentkeyword123');

        // ==================================
        // Step 2: Wrap Up - Verify table cleared and placeholder message shown
        // ==================================
        cy.get('table').should('not.exist');
        cy.contains('No transactions found!').should('be.visible');
        cy.url().should('include', '/admin/transactions');
    });

    it('TP-14-003: Admin Transaction Monitoring Search Field Cleared', () => {
        // ==================================
        // Step 1: Start from filtered/empty state (following TP-14-002 state)
        // ==================================
        cy.get('input[placeholder="Search transactions"]').type('nonexistentkeyword123');
        cy.contains('No transactions found!').should('be.visible');

        // ==================================
        // Step 2: Clear search input
        // ==================================
        cy.get('input[placeholder="Search transactions"]').clear();

        // ==================================
        // Step 3: Verify table reset to display all records across all pages
        // ==================================
        cy.get('table').should('be.visible');
        cy.get('table tr').should('have.length', 11);
        cy.get('.page-info').should('contain', '1 to 10 of 12 records');
    });

    it('TP-14-004: Admin Transaction Monitoring Beginning of Records (Pagination)', () => {
        // ==================================
        // Step 1: Verify on first page
        // ==================================
        cy.get('.page-info').should('contain', '1 to 10 of 12 records');

        // ==================================
        // Step 2: Verify Previous arrow is disabled and visually inactive
        // ==================================
        cy.get('.page-info button').eq(0).should('have.class', 'disable');
        
        // ==================================
        // Step 3: Wrap Up - Verify remaining on first page
        // ==================================
        cy.get('.page-info').should('contain', '1 to 10 of 12 records');
    });

    it('TP-14-005: Admin Transaction Monitoring End of Records (Pagination)', () => {
        // ==================================
        // Step 1: Verify on first page
        // ==================================
        cy.get('.page-info').should('contain', '1 to 10 of 12 records');

        // ==================================
        // Step 2: Navigate to final page of records
        // ==================================
        cy.get('.page-info button').eq(1).click();
        cy.get('table tr').should('have.length', 3); // 1 header row + 2 data rows
        cy.get('.page-info').should('contain', '11 to 12 of 12 records');

        // ==================================
        // Step 3: Verify Next arrow is disabled and visually inactive
        // ==================================
        cy.get('.page-info button').eq(1).should('have.class', 'disable');

        // ==================================
        // Step 4: Wrap Up - Verify remaining on final page
        // ==================================
        cy.get('.page-info').should('contain', '11 to 12 of 12 records');
    });
});
