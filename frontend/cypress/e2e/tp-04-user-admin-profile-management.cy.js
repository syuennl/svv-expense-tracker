describe('2.4 User/Admin Profile Management Test Procedure', () => {
    const API_BASE = '**/mywallet';
    const VALID_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTl9.signature';

    let isDeleted = false;

    // goes to login page first
    beforeEach(() => {
        isDeleted = false; // reset the deleted flag for every test case

        // get profile image on page load 
        cy.intercept('GET', `${API_BASE}/user/settings/profileImg*`, (req) => {
            if (!isDeleted) {
                req.reply({
                    statusCode: 200,
                    body: {
                        status: 'SUCCESS',
                        response: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
                        // base64 code for a 1x1 transparent png
                    }
                });
            } else {
                req.reply({
                    statusCode: 200,
                    body: { status: 'SUCCESS', response: null }
                });
            }
        }).as('getProfileImg');

        // start every test on the settings page with correct programmatic login
        cy.visit('/user/settings', {
            onBeforeLoad: (win) => { // intercepting page load, win = window obj
                win.localStorage.setItem('user', JSON.stringify({
                    email: 'tester01@example.com',
                    token: VALID_TOKEN,
                    id: 1,
                    roles: ['ROLE_USER']
                }));
            }
        });
        cy.url().should('include', '/user/settings');
        cy.wait('@getProfileImg');
    });

    it('TP-04-001: Profile Management Main Flow (Valid Inputs)', () => {
        // ==================================
        // Step 1: Mock APIs
        // ==================================

        // upload profile image
        cy.intercept('POST', `${API_BASE}/user/settings/profileImg`, {
            statusCode: 200,
            body: { status: 'SUCCESS' }
        }).as('uploadProfileImgRequest');

        // change password
        cy.intercept('POST', `${API_BASE}/user/settings/changePassword`, {
            statusCode: 200,
            body: { status: 'SUCCESS', response: 'Reset successful: Password has been successfully reset!' }
        }).as('changePasswordRequest');

        // ==================================
        // Step 2: Change Profile Picture
        // ==================================
        cy.get('input[type="file"]').selectFile({
            contents: Cypress.Buffer.from('mock image data'),
            fileName: 'newPfp.jpeg',
            mimeType: 'image/jpeg'
        }, { force: true });
        cy.wait('@uploadProfileImgRequest');

        // ==================================
        // Step 3: Change Password
        // ==================================
        cy.get('input[name="currentPassword"]').type('OldPass123');
        cy.get('input[name="newPassword"]').type('NewPass123');
        cy.get('input[name="cpassword"]').type('NewPass123');
        cy.get('input[type="submit"]').click();

        cy.wait('@changePasswordRequest');
        cy.contains('Reset successful: Password has been successfully reset!').should('be.visible');

        // ==================================
        // Step 4: Wrap Up - Verify on the same page
        // ==================================
        cy.url().should('include', '/user/settings');
    });

    it('TP-04-002: Profile Management Remove Profile Picture', () => {
        // ==================================
        // Step 1: Mock APIs
        // ==================================
        cy.intercept('DELETE', `${API_BASE}/user/settings/profileImg*`, (req) => {
            isDeleted = true; // set the flag so subsequent getProfileImg requests return null
            req.reply({
                statusCode: 200,
                body: {}
            });
        }).as('removeProfileImgRequest');

        // ==================================
        // Step 2: Remove Profile Picture
        // ==================================
        cy.contains('Remove image').should('be.visible').click();
        cy.wait('@removeProfileImgRequest');

        // ==================================
        // Step 3: Wrap Up - Verify Default Avatar Placeholder
        // ==================================
        cy.get('.profile-img img').should('have.attr', 'src').and('include', 'data:image/');
        cy.contains('Remove image').should('not.exist');
    });

    it('TP-04-003: Profile Management Unsupported File Format', () => {
        // ==================================
        // Step 1: Verify Input Accept Attributes
        // ==================================
        cy.get('input[type="file"]')
            .should('have.attr', 'accept')
            .and('include', '.jpg')
            .and('include', '.jpeg')
            .and('include', '.png');

        // ==================================
        // Step 2: Select Unsupported document.pdf
        // ==================================
        // capture the initial image source
        cy.get('.profile-img img').invoke('attr', 'src').then((initialSrc) => {
            cy.get('input[type="file"]').selectFile({
                contents: Cypress.Buffer.from('mock pdf'),
                fileName: 'document.pdf',
                mimeType: 'application/pdf'
            }, { force: true });

            // ==================================
            // Step 3: Wrap Up - Verify pfp remains unchanged
            // ==================================
            cy.get('.profile-img img').should('have.attr', 'src', initialSrc);
        });
    });

    it('TP-04-004: Profile Management File Size Exceeds Limit', () => {
        // ==================================
        // Step 1: Attempt Uploading a File > 10MB (11MB)
        // ==================================
        const bigBuffer = Cypress.Buffer.alloc(11 * 1024 * 1024); // 11 MB

        // capture the initial image source
        cy.get('.profile-img img').invoke('attr', 'src').then((initialSrc) => {
            cy.get('input[type="file"]').selectFile({
                contents: bigBuffer,
                fileName: '11MB.jpg',
                mimeType: 'image/jpeg'
            }, { force: true });

            // ==================================
            // Step 2: Wrap Up - Verify pfp remains unchanged 
            // ==================================
            cy.get('.profile-img img').should('have.attr', 'src', initialSrc);
        });
    });

    it('TP-04-005: Profile Management Empty Fields', () => {
        // ==================================
        // Step 1: Enter Current Password & Submit Blank Fields
        // ==================================
        cy.get('input[type="submit"]').click();

        // ==================================
        // Step 2: Observe Required Error Messages
        // ==================================
        cy.contains('small', 'Current password is required!').should('be.visible');
        cy.contains('small', 'Password is required!').should('be.visible');
        cy.contains('small', 'Confirm password is required!').should('be.visible');

        // ==================================
        // Step 3: Wrap up - Verify the submission is halted
        // ==================================
        cy.contains('Reset successful: Password has been successfully reset!').should('not.exist');
        cy.url().should('include', '/user/settings');
    });

    it('TP-04-006: Profile Management Invalid Password Format', () => {
        // ==================================
        // Step 1: Password below 8-character limit
        // ==================================
        cy.get('input[name="currentPassword"]').type('OldPass123');
        cy.get('input[name="newPassword"]').type('Pass123');
        cy.get('input[name="cpassword"]').type('Pass123');
        cy.get('input[type="submit"]').click();
        cy.contains('small', 'Password must have atleast 8 characters').should('be.visible');

        // clear password fields
        cy.get('input[name="currentPassword"]').clear();
        cy.get('input[name="newPassword"]').clear();
        cy.get('input[name="cpassword"]').clear();

        // ==================================
        // Step 2: Password exceeding 20-character limit (handled by backend)
        // ==================================
        cy.intercept('POST', `${API_BASE}/user/settings/changePassword`, {
            statusCode: 400,
            body: { response: '[New password can have have atmost 20 characters!]' }
        }).as('longPasswordError');

        cy.get('input[name="currentPassword"]').type('OldPass123');
        cy.get('input[name="newPassword"]').type('SecurePassword1234567');
        cy.get('input[name="cpassword"]').type('SecurePassword1234567');
        cy.get('input[type="submit"]').click();

        cy.wait('@longPasswordError');
        cy.contains('[New password can have have atmost 20 characters!]').should('be.visible');

        // ==================================
        // Step 3: Wrap up - Verify the submission is halted
        // ==================================
        cy.contains('Reset successful: Password has been successfully reset!').should('not.exist');
        cy.url().should('include', '/user/settings');
    });

    it('TP-04-007: Profile Management Incorrect Current Password', () => {
        // ==================================
        // Step 1: Mock incorrect password response
        // ==================================
        cy.intercept('POST', `${API_BASE}/user/settings/changePassword`, {
            statusCode: 400,
            body: { response: 'Reset password not successful: current password is incorrect!!' }
        }).as('incorrectCurrentPasswordRequest');

        // ==================================
        // Step 2: Submit Incorrect Current Password
        // ==================================
        cy.get('input[name="currentPassword"]').type('WrongPass1');
        cy.get('input[name="newPassword"]').type('NewPass123');
        cy.get('input[name="cpassword"]').type('NewPass123');
        cy.get('input[type="submit"]').click();

        cy.wait('@incorrectCurrentPasswordRequest');
        cy.contains('Reset password not successful: current password is incorrect!!').should('be.visible');

        // ==================================
        // Step 3: Wrap up - Verify the submission is halted
        // ==================================
        cy.contains('Reset successful: Password has been successfully reset!').should('not.exist');
        cy.url().should('include', '/user/settings');
    });

    it('TP-04-008: Profile Management New Password Mismatch', () => {
        // ==================================
        // Step 1: Enter Non-matching New and Confirm Passwords
        // ==================================
        cy.get('input[name="currentPassword"]').type('OldPass123');
        cy.get('input[name="newPassword"]').type('NewPass123');
        cy.get('input[name="cpassword"]').type('Mismatch321');
        cy.get('input[type="submit"]').click();

        // ==================================
        // Step 2: Observe Mismatch Error Message
        // ==================================
        cy.contains('small', 'Passwords do not match!').should('be.visible');

        // ==================================
        // Step 3: Wrap up - Verify the submission is halted
        // ==================================
        cy.contains('Reset successful: Password has been successfully reset!').should('not.exist');
        cy.url().should('include', '/user/settings');
    });
});
