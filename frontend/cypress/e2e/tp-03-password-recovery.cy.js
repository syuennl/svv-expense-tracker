describe('2.3 Password Recovery Test Procedure', () => {
    const API_BASE = '**/mywallet';
    const AUTH_API = `${API_BASE}/auth`;

    beforeEach(() => {
        // goes to login page first
        cy.visit('http://localhost:3000/auth/login');

        // reusable mock apis for this test file
        // email verification 
        cy.intercept('GET', `${AUTH_API}/forgotPassword/verifyEmail*`, {
            statusCode: 200,
            body: { status: 'SUCCESS' }
        }).as('verifyEmailRequest');

        // verification code validation 
        cy.intercept('GET', `${AUTH_API}/forgotPassword/verifyCode*`, {
            statusCode: 200,
            body: { status: 'SUCCESS' }
        }).as('verifyCodeRequest');

    });

    it('TP-03-001: Password Recovery Main Flow (Valid Inputs)', () => {
        // ==================================
        // Step 1: Mock APIs
        // ==================================

        // password reset
        cy.intercept('POST', `${AUTH_API}/forgotPassword/resetPassword`, {
            statusCode: 200,
            body: { status: 'SUCCESS' }
        }).as('resetPasswordRequest');


        // ==================================
        // Step 2: Navigate to Forgot Password Page
        // ==================================
        cy.contains('Forgot password?').click();
        cy.url().should('include', '/auth/forgetpassword/verifyEmail');

        // ==================================
        // Step 3: Enter Email
        // ==================================
        cy.get('input[name="email"]').type('tester01@example.com');
        cy.get('input[type="submit"]').click();
        cy.wait('@verifyEmailRequest');

        // ==================================
        // Step 4: Enter Verification Code
        // ==================================
        cy.url().should('include', '/auth/forgotPassword/verifyAccount/tester01@example.com');
        cy.get('input[name="code"]').type('123456');
        cy.get('input[type="submit"]').click();
        cy.wait('@verifyCodeRequest');

        // ==================================
        // Step 5: Reset Password
        // ==================================
        cy.url().should('include', '/auth/forgotPassword/resetPassword/tester01@example.com');
        cy.get('input[name="password"]').type('SecurePass123');
        cy.get('input[name="cpassword"]').type('SecurePass123');
        cy.get('input[type="submit"]').click();
        cy.wait('@resetPasswordRequest');

        // ==================================
        // Step 6: Wrap Up - Verify Redirect
        // ==================================
        cy.url().should('include', '/auth/login');
    });

    it('TP-03-002: Password Recovery Invalid Email', () => {
        // ==================================
        // Step 1: Navigate to Forgot Password Page
        // ==================================
        cy.contains('Forgot password?').click();
        cy.url().should('include', '/auth/forgetpassword/verifyEmail');

        // ==================================
        // Step 2: Enter Invalid Email Format
        // ==================================
        cy.get('input[name="email"]').type('tester01.example.com');
        cy.get('input[type="submit"]').click();
        cy.contains('small', 'Invalid email address!').should('be.visible');

        // ==================================
        // Step 3: Enter Unregistered Email
        // ==================================
        // mock API for unregistered email
        cy.intercept('GET', `${AUTH_API}/forgotPassword/verifyEmail*`, {
            statusCode: 400,
            body: { response: 'Verification failed: User not found with email unregistered@example.com!' }
        }).as('unregisteredEmailRequest');

        cy.get('input[name="email"]').clear().type('unregistered@example.com');
        cy.get('input[type="submit"]').click();
        cy.wait('@unregisteredEmailRequest');
        cy.contains('.auth-form p', 'Verification failed: User not found with email unregistered@example.com!').should('be.visible');

        // ==================================
        // Step 4: Wrap Up - Verify remaining on page
        // ==================================
        cy.url().should('include', '/auth/forgetpassword/verifyEmail');
    });

    it('TP-03-003: Password Recovery Invalid Verification Code', () => {
        // mock api for invalid code error
        cy.intercept('GET', `${AUTH_API}/forgotPassword/verifyCode*`, {
            statusCode: 400,
            body: { response: 'Verification failed: invalid verification code!' }
        }).as('invalidCodeError');

        // ==================================
        // Step 1: Navigate to Email Verification Page
        // ==================================
        cy.contains('Forgot password?').click();
        cy.get('input[name="email"]').type('tester01@example.com');
        cy.get('input[type="submit"]').click();
        cy.wait('@verifyEmailRequest');
        cy.url().should('include', '/auth/forgotPassword/verifyAccount/tester01@example.com');

        // ==================================
        // Step 2: Leave Verification Code Blank
        // ==================================
        cy.get('input[type="submit"]').click();
        cy.contains('small', 'Code is required!').should('be.visible');

        // ==================================
        // Step 3: Enter 7-digit Verification Code
        // ==================================
        cy.get('input[name="code"]').type('1234567');
        cy.get('input[type="submit"]').click();
        cy.wait('@invalidCodeError');
        cy.contains('.auth-form p', 'Verification failed: invalid verification code!').should('be.visible');

        // ==================================
        // Step 4: Enter Code with Letters and Specials
        // ==================================
        cy.get('input[name="code"]').clear().type('12A45!');
        cy.get('input[type="submit"]').click();
        cy.wait('@invalidCodeError');
        cy.contains('.auth-form p', 'Verification failed: invalid verification code!').should('be.visible');

        // ==================================
        // Step 5: Enter Incorrect Verification Code
        // ==================================
        cy.get('input[name="code"]').clear().type('000000');
        cy.get('input[type="submit"]').click();
        cy.wait('@invalidCodeError');
        cy.contains('.auth-form p', 'Verification failed: invalid verification code!').should('be.visible');

        // ==================================
        // Step 6: Wrap Up - Verify remaining on page
        // ==================================
        cy.url().should('include', '/auth/forgotPassword/verifyAccount/tester01@example.com');
    });

    it('TP-03-004: Password Recovery Invalid Password', () => {
        // ==================================
        // Step 1: Navigate to Reset Password Page
        // ==================================
        cy.contains('Forgot password?').click();
        cy.get('input[name="email"]').type('tester01@example.com');
        cy.get('input[type="submit"]').click();
        cy.wait('@verifyEmailRequest');

        cy.get('input[name="code"]').type('123456');
        cy.get('input[type="submit"]').click();
        cy.wait('@verifyCodeRequest');
        cy.url().should('include', '/auth/forgotPassword/resetPassword/tester01@example.com');

        // ==================================
        // Step 2: New Password below Minimum Length (< 8 chars)
        // ==================================
        cy.get('input[name="password"]').type('Pass123');
        cy.get('input[name="cpassword"]').type('Pass123');
        cy.get('input[type="submit"]').click();
        cy.contains('small', 'Password must have atleast 8 characters').should('be.visible'); // react hook form (frontend) can detect

        // ==================================
        // Step 3: New Password above Maximum Length (> 20 chars)
        // ==================================
        // long password is validated by backend, api required
        cy.intercept('POST', `${API_BASE}/auth/forgotPassword/resetPassword`, {
            statusCode: 400,
            body: { response: '[New password can have have atmost 20 characters!]' }
        }).as('longPasswordError');

        cy.get('input[name="password"]').clear().type('SecurePassword1234567');
        cy.get('input[name="cpassword"]').clear().type('SecurePassword1234567');
        cy.get('input[type="submit"]').click();
        cy.wait('@longPasswordError');
        cy.contains('.auth-form p', '[New password can have have atmost 20 characters!]').should('be.visible');

        // ==================================
        // Step 4: Wrap Up - Verify remaining on page
        // ==================================
        cy.url().should('include', '/auth/forgotPassword/resetPassword/tester01@example.com');
    });

    it('TP-03-005: Password Recovery Password Mismatch', () => {
        // ==================================
        // Step 1: Navigate to Reset Password Page
        // ==================================
        cy.contains('Forgot password?').click();
        cy.get('input[name="email"]').type('tester01@example.com');
        cy.get('input[type="submit"]').click();
        cy.wait('@verifyEmailRequest');

        cy.get('input[name="code"]').type('123456');
        cy.get('input[type="submit"]').click();
        cy.wait('@verifyCodeRequest');
        cy.url().should('include', '/auth/forgotPassword/resetPassword/tester01@example.com');

        // ==================================
        // Step 2: Password Mismatch
        // ==================================
        cy.get('input[name="password"]').type('SecurePass123');
        cy.get('input[name="cpassword"]').type('MismatchPass321');
        cy.get('input[type="submit"]').click();
        cy.contains('small', 'Passwords do not match!').should('be.visible');

        // ==================================
        // Step 3: Wrap Up - Verify remaining on page
        // ==================================
        cy.url().should('include', '/auth/forgotPassword/resetPassword/tester01@example.com');
    });

});
