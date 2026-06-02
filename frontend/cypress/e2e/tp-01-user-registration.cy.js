describe('2.1 User Registration Test Procedure', () => {

  beforeEach(() => {
    cy.visit('http://localhost:3000/auth/register');
  });

  it('TP-01-001: User Registration Main Flow (Valid Inputs)', () => {
    // ==================================
    // Step 1: Mock APIs
    // ==================================

    // 1. Setup mock data for the initial signup API
    cy.intercept('POST', '**/mywallet/auth/signup', {
      statusCode: 200,
      body: { status: 'SUCCESS' } 
    }).as('registerRequest');

    // 2. Setup mock data for the code verification API
    cy.intercept('GET', '**/mywallet/auth/signup/verify*', {
      statusCode: 200,
      body: { status: 'SUCCESS' }
    }).as('verifyRequest');

    // ==================================
    // Step 2: Fill Registration Form
    // ==================================

    // 1. Enter valid registration details
    cy.get('input[name="username"]').type('johndoe');
    cy.get('input[name="email"]').type('tester01@example.com');
    cy.get('input[name="password"]').type('Pass1234');
    cy.get('input[name="cpassword"]').type('Pass1234');

    // 2. Click the register button
    cy.get('input[type="submit"]').click();

    // 3. Wait for the signup API call to complete
    cy.wait('@registerRequest');

    // ==================================
    // Step 3: Verification Step
    // ==================================

    // 1. Enter the valid 6-digit verification code
    cy.get('input[name="code"]').type('123456');

    // 2. Click the verify button
    cy.get('input[type="submit"]').click();

    // 3. Wait for the verification API call to complete
    cy.wait('@verifyRequest');

    // 4. Verify successful registration redirects user to the success page
    cy.url().should('include', '/auth/success-registration');
    
  });

  it('TP-01-002: User Registration Form Validation Errors', () => {

    // ==================================
    // Step 2 & 3: Empty Username Validation
    // ==================================

    // 1. Fill other fields and leave Username empty
    cy.get('input[name="email"]').type('tester02@example.com');
    cy.get('input[name="password"]').type('Pass1234');
    cy.get('input[name="cpassword"]').type('Pass1234');

    // 2. Click submit and verify error
    cy.get('input[type="submit"]').click();
    cy.contains('small', 'Username is required!').should('be.visible');

    // ==================================
    // Step 4 & 5: Username Length Validation
    // ==================================

    // 1. Mock API and verify short username error
    cy.intercept('POST', '**/mywallet/auth/signup', {
      statusCode: 400,
      body: { response: 'Username must have atleast 3 characters!' }
    }).as('shortUsernameError');

    cy.get('input[name="username"]').type('jo');
    cy.get('input[type="submit"]').click();
    cy.wait('@shortUsernameError');
    cy.contains('.auth-form p', 'Username must have atleast 3 characters!').should('be.visible');

    // 2. Mock API and verify long username error
    cy.intercept('POST', '**/mywallet/auth/signup', {
      statusCode: 400,
      body: { response: 'Username can have atmost 20 characters!' }
    }).as('longUsernameError');

    cy.get('input[name="username"]').clear().type('johndoesmith123456789');
    cy.get('input[type="submit"]').click();
    cy.wait('@longUsernameError');
    cy.contains('.auth-form p', 'Username can have atmost 20 characters!').should('be.visible');

    // ==================================
    // Step 6 & 7: Empty Email Validation
    // ==================================

    // 1. Clear email field and fill valid username
    cy.get('input[name="username"]').clear().type('johndoe');
    cy.get('input[name="email"]').clear(); 
    
    // 2. Click submit and verify error
    cy.get('input[type="submit"]').click();
    cy.contains('small', 'Email is required!').should('be.visible');

    // ==================================
    // Step 8 & 9: Email Format & Duplication Validation
    // ==================================

    // 1. Enter invalid email format and verify error
    cy.get('input[name="email"]').type('johnexample.com');
    cy.get('input[type="submit"]').click();
    cy.contains('small', 'Invalid email address!').should('be.visible');

    // 2. Mock API and verify already taken email error
    cy.intercept('POST', '**/mywallet/auth/signup', {
      statusCode: 400,
      body: { response: 'Registration Failed: email is already taken!' }
    }).as('emailTakenRequest');
    
    cy.get('input[name="email"]').clear().type('existinguser@example.com');
    cy.get('input[type="submit"]').click();
    cy.wait('@emailTakenRequest');
    cy.contains('.auth-form p', 'Registration Failed: email is already taken!').should('be.visible');

    // ==================================
    // Step 10 & 11: Empty Password Validation
    // ==================================

    // 1. Clear password fields and fill valid email
    cy.get('input[name="email"]').clear().type('tester04@example.com');
    cy.get('input[name="password"]').clear();
    cy.get('input[name="cpassword"]').clear();
    
    // 2. Click submit and verify error
    cy.get('input[type="submit"]').click();
    cy.contains('small', 'Password is required!').should('be.visible');

    // ==================================
    // Step 12 & 13: Password Length Validation
    // ==================================

    // 1. Enter short password and verify error
    cy.get('input[name="password"]').type('Pass123');
    cy.get('input[name="cpassword"]').type('Pass123');
    cy.get('input[type="submit"]').click();
    cy.contains('small', 'Password must have atleast 8 characters').should('be.visible');

    // 2. Mock API and verify long password error
    cy.intercept('POST', '**/mywallet/auth/signup', {
      statusCode: 400,
      body: { response: 'Password can have atmost 20 characters!' } 
    }).as('longPasswordError');

    cy.get('input[name="password"]').clear().type('SecurePassword1234567');
    cy.get('input[name="cpassword"]').clear().type('SecurePassword1234567');
    cy.get('input[type="submit"]').click();
    cy.wait('@longPasswordError');
    cy.contains('.auth-form p', 'Password can have atmost 20 characters!').should('be.visible');
    
  });

  it('TP-01-003: User Registration Invalid Verification Code', () => {
    // ==================================
    // Step 1 - 3: Navigate to Verification Screen
    // ==================================

    // Mock initial signup API to succeed so the frontend routes us to the verification screen
    cy.intercept('POST', '**/mywallet/auth/signup', {
      statusCode: 200,
      body: { status: 'SUCCESS' }
    }).as('registerToVerify');

    // Enter valid registration details
    cy.get('input[name="username"]').type('johndoe');
    cy.get('input[name="email"]').type('tester05@example.com');
    cy.get('input[name="password"]').type('Pass1234');
    cy.get('input[name="cpassword"]').type('Pass1234');

    // Click register to proceed
    cy.get('input[type="submit"]').click();
    cy.wait('@registerToVerify');

    // ==================================
    // Step 4: Empty Verification Code
    // ==================================

    // Leave the Verification Code field empty and click Verify
    cy.get('input[type="submit"]').click();

    // Verify the verification code required error message
    cy.contains('small', 'Code is required!').should('be.visible');

    // ==================================
    // Step 5: Less than 6 digits error (Triggered by Backend)
    // ==================================

    // 1. Mock the GET request to return a short code error
    cy.intercept('GET', '**/mywallet/auth/signup/verify*', {
      statusCode: 400,
      body: { response: 'Verification code must be exactly 6 digits!' } 
    }).as('shortCodeError');

    // 2. Clear the field, enter 5 digits, and click verify
    cy.get('input[name="code"]').clear().type('12345');
    cy.get('input[type="submit"]').click();

    // 3. Wait for API and verify the error message
    cy.wait('@shortCodeError');
    cy.contains('.auth-form p', 'Verification code must be exactly 6 digits!').should('be.visible');

    // ==================================
    // Step 6: Exceed 6 digits error (Triggered by Backend)
    // ==================================

    // 1. Mock the GET request to return a long code error
    cy.intercept('GET', '**/mywallet/auth/signup/verify*', {
      statusCode: 400,
      body: { response: 'Verification code cannot exceed 6 digits!' }
    }).as('longCodeError');

    // 2. Clear the field, enter 7 digits, and click verify
    cy.get('input[name="code"]').clear().type('1234567');
    cy.get('input[type="submit"]').click();

    // 3. Wait for API and verify the error message
    cy.wait('@longCodeError');
    cy.contains('.auth-form p', 'Verification code cannot exceed 6 digits!').should('be.visible');

    // ==================================
    // Step 7: Numbers only error (Triggered by Backend)
    // ==================================

    // 1. Mock the GET request to return a numbers-only error
    cy.intercept('GET', '**/mywallet/auth/signup/verify*', {
      statusCode: 400,
      body: { response: 'Verification code must contain numbers only!' }
    }).as('numbersOnlyError');

    // 2. Clear the field, enter letters, and click verify
    cy.get('input[name="code"]').clear().type('123ABC');
    cy.get('input[type="submit"]').click();

    // 3. Wait for API and verify the error message
    cy.wait('@numbersOnlyError');
    cy.contains('.auth-form p', 'Verification code must contain numbers only!').should('be.visible');

    // ==================================
    // Step 8: Invalid verification code (Triggered by Backend)
    // ==================================

    // 1. Mock the GET request to return an invalid code error
    cy.intercept('GET', '**/mywallet/auth/signup/verify*', {
      statusCode: 400,
      body: { response: 'Invalid verification code!' }
    }).as('invalidCodeError');

    // 2. Clear the field, enter wrong 6 digits, and click verify
    cy.get('input[name="code"]').clear().type('999999');
    cy.get('input[type="submit"]').click();

    // 3. Wait for API and verify the error message
    cy.wait('@invalidCodeError');
    cy.contains('.auth-form p', 'Invalid verification code!').should('be.visible');

  });

});