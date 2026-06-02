describe('2.2 User Login & Logout Test Procedure', () => {

  beforeEach(() => {
    cy.visit('http://localhost:3000/auth/login');
  });

  
  it('TP-02-001: User Login & Logout Main Flow', () => {
    // ==================================
    // Step 1: Mock APIs
    // ==================================
    
    // 1. Setup mock data for login API
    // accessToken: 'mock-token-123',
    // token: 'mock-token-123'
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

    // ==================================
    // Log In
    // ==================================

    // 1. Enter valid credentials
    cy.get('input[name="email"]').type('active_user@example.com');
    cy.get('input[name="password"]').type('SecurePass123');

    // 2. Click login button
    cy.get('input[type="submit"]').click();

    // 3. Assert that the login API was called
    cy.wait('@loginRequest');

    // 4. Verify login success redirects to dashboard
    cy.url().should('include', '/user/dashboard');

    // ==================================
    // Log Out
    // ==================================

    // 1. Click logout button
    cy.contains('Log out').click();
    
    // 2. Verify logout success redirects to root URL
    cy.url().should('eq', 'http://localhost:3000/');

    // 3. Attempt to bypass login and access dashboard directly
    cy.visit('http://localhost:3000/user/dashboard');
    cy.url().should('include', '/unauthorized');

    // 4. Verify that the user data/token is cleared from LocalStorage
    cy.window().its('localStorage.user').should('be.undefined');
  });


  it('TP-02-002: User Login Validation and Authentication Errors', () => {
    
    // ==================================
    // Step 2 & 3: Empty Fields Validation
    // ==================================

    // 1. Click the "Login" button directly without typing anything
    cy.get('input[type="submit"]').click();

    // 2. Verify the email and password required error messages
    cy.contains('small', 'Email is required!').should('be.visible');
    cy.contains('small', 'Password is required!').should('be.visible');

    // ==================================
    // Step 4 & 5: Invalid Email Format
    // ==================================

    // 1. Enter invalid email format and a password
    cy.get('input[name="email"]').type('johnexample.com');
    cy.get('input[name="password"]').type('Pass1234');

    // 2. Click login button
    cy.get('input[type="submit"]').click();

    // 3. Verify the invalid email address error message
    cy.contains('small', 'Invalid email address!').should('be.visible');

    // ==================================
    // Step 6 & 7: Unregistered Email (API Error)
    // ==================================

    // 1. Setup mock data for invalid credentials API (401 Unauthorized)
    cy.intercept('POST', '**/mywallet/auth/signin', {
      statusCode: 401,
      body: { message: 'Bad credentials' }
    }).as('invalidCredsRequest');

    // 2. Clear previous inputs and enter unregistered email
    cy.get('input[name="email"]').clear().type('unknown@example.com');
    cy.get('input[name="password"]').clear().type('Pass1234');

    // 3. Click login button
    cy.get('input[type="submit"]').click();

    // 4. Wait for API call and verify the error banner appears
    cy.wait('@invalidCredsRequest');
    cy.contains('.auth-form p', 'Invalid email or password!').should('be.visible');

    // ==================================
    // Step 8 & 9: Incorrect Password (API Error)
    // ==================================

    // 1. Clear previous inputs and enter valid email but wrong password
    cy.get('input[name="email"]').clear().type('active_user@example.com');
    cy.get('input[name="password"]').clear().type('WrongPass123');

    // 2. Click login button
    cy.get('input[type="submit"]').click();

    // 3. Wait for API call and verify the error banner appears (Re-using the same invalidCredsRequest mock)
    cy.wait('@invalidCredsRequest');
    cy.contains('.auth-form p', 'Invalid email or password!').should('be.visible');

    // ==================================
    // Step 10 & 11: Unverified Account Status (API Error)
    // ==================================

    // 1. Setup new mock data for account status issues (e.g., 403 Forbidden)
    cy.intercept('POST', '**/mywallet/auth/signin', {
      statusCode: 403,
      body: { message: 'Something went wrong: Try again later!' }
    }).as('statusIssueRequest');

    // 2. Clear previous inputs and enter unverified email
    cy.get('input[name="email"]').clear().type('unverified@example.com');
    cy.get('input[name="password"]').clear().type('SecurePass123');

    // 3. Click login button
    cy.get('input[type="submit"]').click();

    // 4. Wait for API call and verify the error banner appears
    cy.wait('@statusIssueRequest');
    cy.get('.auth-form p').should('be.visible').and('contain', 'Something went wrong: Try again later!');

    // ==================================
    // Step 12 & 13: Disabled Account Status (API Error)
    // ==================================

    // 1. Clear previous inputs and enter disabled email
    cy.get('input[name="email"]').clear().type('disabled@example.com');
    cy.get('input[name="password"]').clear().type('SecurePass123');

    // 2. Click login button
    cy.get('input[type="submit"]').click();

    // 3. Wait for API call and verify the error banner appears (Re-using the statusIssueRequest mock)
    cy.wait('@statusIssueRequest');
    cy.get('.auth-form p').should('be.visible').and('contain', 'Something went wrong: Try again later!');

  });

});
