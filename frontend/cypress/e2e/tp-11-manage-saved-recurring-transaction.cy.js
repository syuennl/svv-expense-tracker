/// <reference types="cypress" />

describe('F11 Manage Saved/Recurring Transactions (Report 3 Test Procedures)', () => {

  // ==========================================
  // 提前准备：登录真实 User 账号并进入 F11 页面
  // 参考自 A01 的 beforeEach 逻辑
  // ==========================================
  beforeEach(() => {
    // 1. 访问真实登录页面
    cy.visit('http://localhost:3000/auth/login');
    
    // 2. 输入 User 账号与密码 (来自 Report 2 TC-02-001)
    cy.get('input[name="email"]').type('kuancheeling1024@gmail.com');
    cy.get('input[name="password"]').type('Kcl_4201');
    cy.get('input[type="submit"]').click();

    // 3. 验证登录成功
    cy.url().should('not.include', '/auth/login');

    // 4. 监听 Recurring API (根据情况修改实际 API 路径)
    cy.intercept('GET', '**/recurring*').as('getRecurring');

    // 5. 点击侧边栏进入 Saved/Recurring 页面
    cy.get('.side-bar').should('be.visible').contains('Saved Transactions').click();
    
    // 智能等待
    // cy.wait('@getRecurring');
  });
  
  // ==========================================
  // TP-11-001: Form Validation Errors
  // ==========================================
  it('TP-11-001: Verify form validation by attempting to save with empty and invalid inputs', () => {
    
    // [Step 1] Click the "+ Add new" button
    cy.contains('button', '+ Add new').click();

    // ==========================================
    // [TC-11-006] Verify Empty Mandatory Fields 
    // ==========================================
    
    // [Step 2] Leave Category unselected. Fill other valid data.
    cy.get('.input-box').contains('label', 'Transaction description').parent().find('input[type="text"]').type('Spotify');
    cy.get('.input-box').contains('label', 'Amount').parent().find('input[type="text"]').type('150.50');
    cy.get('select').select('MONTHLY');
    // Start Date default is today, leaving it as is.
    
    cy.get('input[type="submit"][value="Save transaction"]').click();
    cy.get('small').contains('category is required').should('be.visible'); // 捕捉打字错误 Bug

    // [Step 3] Select a Category, Clear Start Date (幽灵数据 Bug)
    cy.get('input[type="radio"]').first().check(); // 随便选一个，比如 Food，消除 Category 报错
    cy.get('input[type="date"]').clear(); // 清空日期变成 dd/mm/yyyy
    
    cy.get('input[type="submit"][value="Save transaction"]').click();
    // 🚨 此时因为其他数据都是合法的，系统才会真正触发幽灵 Bug，跳出 Success 并跳转！
    cy.contains('Transaction has been successfully created!').should('be.visible'); 
    
    // 因为触发了 Bug 跳转回了 Dashboard，我们需要重新进入表单页面继续剩下的测试！
    cy.visit('http://localhost:3000/user/savedTransactions/new');

    // ==========================================
    // [TC-11-003 & TC-11-005] 重新填好基础数据，专攻 Description 和 Amount
    // ==========================================
    
    // 因为重新刷新了页面，我们必须先把其他必填项填好，保证接下来的报错“纯粹”是因为我们要测的那个字段
    cy.get('input[type="radio"]').first().check();
    cy.get('select').select('MONTHLY');
    cy.get('.input-box').contains('label', 'Amount').parent().find('input[type="text"]').type('150.50');

    // [Step 4] Enter Start Date. Change Description to 51 chars. [TC-11-003]
    cy.get('input[type="date"]').type('2026-05-15');
    cy.get('.input-box').contains('label', 'Transaction description').parent().find('input[type="text"]')
      .clear().type('Payment for monthly internet and mobile phone bills'); // 51 chars
    
    cy.get('input[type="submit"][value="Save transaction"]').click();
    cy.get('small').contains('Description can have atmost 50 characters!').should('be.visible');

    // [Step 5] Change Description to valid. Enter Amount "-0.01". [TC-11-005]
    cy.get('.input-box').contains('label', 'Transaction description').parent().find('input[type="text"]').clear().type('Spotify');
    cy.get('.input-box').contains('label', 'Amount').parent().find('input[type="text"]').clear().type('-0.01');
    
    cy.get('input[type="submit"][value="Save transaction"]').click();
    cy.get('small').contains('Invalid amount!').should('be.visible');

    // [Step 6] Enter Amount "10000000.00" (极大值测试). [TC-11-005]
    cy.get('.input-box').contains('label', 'Amount').parent().find('input[type="text"]').clear().type('10000000.00');
    cy.get('input[type="submit"][value="Save transaction"]').click();
    
    // 🚨 架构师预警：原本应该期待报错，但因为有 Bug，它被成功保存了！
    // 记录下这个意外的成功 Toast，作为你 TIR-11-003 罚单的证据！
    cy.contains('Transaction has been successfully created!').should('be.visible');
    cy.url().should('not.include', '/new');

    // 因为它保存成功并跳回了 Dashboard，我们必须让 Cypress 重新进入新建表单，
    // 才能继续测后面的 "abc$123" 和 完全为空 的情况！
    cy.visit('http://localhost:3000/user/savedTransactions/new');

    // 重新填好其他必填项，为了测剩下的 Amount 错误
    cy.get('input[type="radio"]').first().check();
    cy.get('select').select('MONTHLY');
    cy.get('.input-box').contains('label', 'Transaction description').parent().find('input[type="text"]').type('Spotify');

    // [Step 7] Enter Amount "abc$123". [TC-11-005]
    cy.get('.input-box').contains('label', 'Amount').parent().find('input[type="text"]').clear().type('abc$123');
    cy.get('input[type="submit"][value="Save transaction"]').click();
    cy.get('small').contains('Invalid amount!').should('be.visible');

    // [Step 8] Clear Amount completely. [TC-11-005]
    cy.get('.input-box').contains('label', 'Amount').parent().find('input[type="text"]').clear();
    cy.get('input[type="submit"][value="Save transaction"]').click();
    cy.get('small').contains('Amount is required!').should('be.visible');

    // [Wrap Up] Click "Cancel"
    cy.get('input[type="submit"][value="Cancel"]').click();
    
    // 验证确实跳回了 Dashboard
    cy.url().should('not.include', '/new');
  });


  // ==========================================
  // TP-11-002: Valid Boundaries
  // ==========================================
  it('TP-11-002: Verify the system accepts valid boundary values for description, amounts, and dates', () => {

    // ==========================================
    // [TC-11-002] Description Length Boundaries
    // ==========================================

    // [Step 1] Description = "A" (1 char)
    cy.contains('button', '+ Add new').click();
    cy.get('input[type="radio"][id="Food"]').check();
    cy.get('.input-box').contains('label', 'Amount').parent().find('input[type="text"]').type('100.00');
    cy.get('select').select('MONTHLY');
    cy.get('input[type="date"]').type('2026-05-15');
    cy.get('.input-box').contains('label', 'Transaction description').parent().find('input[type="text"]').type('A');
    cy.get('input[type="submit"][value="Save transaction"]').click();
    cy.contains('Transaction has been successfully created!').should('be.visible');

    // [Step 2] Description = "Monthly internet bill fee" (25 chars)
    cy.contains('button', '+ Add new').click();
    cy.get('input[type="radio"][id="Food"]').check();
    cy.get('.input-box').contains('label', 'Amount').parent().find('input[type="text"]').type('100.00');
    cy.get('select').select('MONTHLY');
    cy.get('input[type="date"]').type('2026-05-15');
    cy.get('.input-box').contains('label', 'Transaction description').parent().find('input[type="text"]').type('Monthly internet bill fee');
    cy.get('input[type="submit"][value="Save transaction"]').click();
    cy.contains('Transaction has been successfully created!').should('be.visible');

    // [Step 3] Description = "Payment for monthly internet and mobile phone bill" (50 chars)
    cy.contains('button', '+ Add new').click();
    cy.get('input[type="radio"][id="Food"]').check();
    cy.get('.input-box').contains('label', 'Amount').parent().find('input[type="text"]').type('100.00');
    cy.get('select').select('MONTHLY');
    cy.get('input[type="date"]').type('2026-05-15');
    cy.get('.input-box').contains('label', 'Transaction description').parent().find('input[type="text"]').type('Payment for monthly internet and mobile phone bill');
    cy.get('input[type="submit"][value="Save transaction"]').click();
    cy.contains('Transaction has been successfully created!').should('be.visible');

    // ==========================================
    // [TC-11-004] Amount Boundaries
    // ==========================================

    // [Step 4] Amount = "0.00"
    cy.contains('button', '+ Add new').click();
    cy.get('input[type="radio"][id="Food"]').check();
    cy.get('.input-box').contains('label', 'Transaction description').parent().find('input[type="text"]').type('Test Setup');
    cy.get('select').select('MONTHLY');
    cy.get('input[type="date"]').type('2026-05-15');
    cy.get('.input-box').contains('label', 'Amount').parent().find('input[type="text"]').type('0.00');
    cy.get('input[type="submit"][value="Save transaction"]').click();
    cy.contains('Transaction has been successfully created!').should('be.visible');

    // [Step 5] Amount = "9999999.99"
    cy.contains('button', '+ Add new').click();
    cy.get('input[type="radio"][id="Food"]').check();
    cy.get('.input-box').contains('label', 'Transaction description').parent().find('input[type="text"]').type('Test Setup');
    cy.get('select').select('MONTHLY');
    cy.get('input[type="date"]').type('2026-05-15');
    cy.get('.input-box').contains('label', 'Amount').parent().find('input[type="text"]').type('9999999.99');
    cy.get('input[type="submit"][value="Save transaction"]').click();
    cy.contains('Transaction has been successfully created!').should('be.visible');

    // ==========================================
    // [TC-11-007] Date Edge Cases
    // ==========================================

    // [Step 6] Start Date = "28/02/2026"
    cy.contains('button', '+ Add new').click();
    cy.get('input[type="radio"][id="Food"]').check();
    cy.get('.input-box').contains('label', 'Transaction description').parent().find('input[type="text"]').type('Test Setup');
    cy.get('.input-box').contains('label', 'Amount').parent().find('input[type="text"]').type('100.00');
    cy.get('select').select('MONTHLY');
    cy.get('input[type="date"]').type('2026-02-28');
    cy.get('input[type="submit"][value="Save transaction"]').click();
    cy.contains('Transaction has been successfully created!').should('be.visible');

    // [Step 7] Start Date = "29/02/2024" (Leap Year)
    cy.contains('button', '+ Add new').click();
    cy.get('input[type="radio"][id="Food"]').check();
    cy.get('.input-box').contains('label', 'Transaction description').parent().find('input[type="text"]').type('Test Setup');
    cy.get('.input-box').contains('label', 'Amount').parent().find('input[type="text"]').type('100.00');
    cy.get('select').select('MONTHLY');
    cy.get('input[type="date"]').type('2024-02-29');
    cy.get('input[type="submit"][value="Save transaction"]').click();
    cy.contains('Transaction has been successfully created!').should('be.visible');

    // [Step 8] Start Date = "31/01/2026"
    cy.contains('button', '+ Add new').click();
    cy.get('input[type="radio"][id="Food"]').check();
    cy.get('.input-box').contains('label', 'Transaction description').parent().find('input[type="text"]').type('Test Setup');
    cy.get('.input-box').contains('label', 'Amount').parent().find('input[type="text"]').type('100.00');
    cy.get('select').select('MONTHLY');
    cy.get('input[type="date"]').type('2026-01-31');
    cy.get('input[type="submit"][value="Save transaction"]').click();
    cy.contains('Transaction has been successfully created!').should('be.visible');

  });

  // ==========================================
  // TP-11-003: Manage Transaction Main Flow
  // ==========================================
  it('TP-11-003: Execute the main operational flow: Add, Edit, and Delete', () => {
    
    const testDesc = 'Monthly Income';

    // ==========================================
    // [TC-11-001 & TC-11-008] 添加一个正常的新 Recurring Transaction
    // ==========================================
    cy.contains('button', '+ Add new').click();
    
    // 切换到 Income 选项卡，才能找到 Salary 分类
    cy.get('.type-select.form').contains('div', 'Income').click();
    cy.get('input[type="radio"][id="Salary"]').check(); 
    
    cy.get('.input-box').contains('label', 'Transaction description').parent().find('input[type="text"]').type(testDesc);
    cy.get('.input-box').contains('label', 'Amount').parent().find('input[type="text"]').type('5000.00');
    cy.get('select').select('MONTHLY');
    cy.get('input[type="date"]').type('2026-06-01');
    
    cy.get('input[type="submit"][value="Save transaction"]').click();
    
    // 🌟 对齐 SRS: Created
    cy.contains('Transaction has been successfully created!').should('be.visible');

    // ==========================================
    // [TC-11-010] 找到刚才那张卡片并修改它 (Edit)
    // ==========================================
    cy.contains('.st-card', testDesc).within(() => { 
      cy.contains('button', 'Edit').click();
    });
    
    cy.url().should('include', '/editSavedTransaction/');
    
    cy.get('.input-box').contains('label', 'Amount').parent().find('input[type="text"]').clear().type('6000.00');
    cy.get('input[type="submit"][value="Save transaction"]').click();
    
    // 🌟 对齐 SRS: Edited
    cy.contains('Transaction has been successfully edited!').should('be.visible'); 

    // ==========================================
    // [TC-11-011] 再次找到并彻底删除 (Delete)
    // ==========================================
    cy.contains('.st-card', testDesc).within(() => {
      cy.contains('button', 'Edit').click();
    });
    
    cy.url().should('include', '/editSavedTransaction/');
    cy.get('button.delete').click();
    
    // 🌟 对齐 SRS: Deleted
    cy.contains('Transaction deleted successfully!').should('be.visible'); 

    // 验证卡片确实从 Dashboard 消失了
    cy.contains('.st-card', testDesc).should('not.exist');
  });

  // ==========================================
  // TP-11-004: Status Transition & Quick Actions
  // ==========================================
  it('TP-11-004: Verify automated status transitions and dashboard quick actions (Confirm)', () => {
    
    const pastDateDesc = 'Past Due Daily Sub';

    // 🌟 神之一手：利用你发现的“回溯功能”，亲自制造 Overdue 状态卡片！
    cy.contains('button', '+ Add new').click();
    cy.get('input[type="radio"]').first().check(); 
    cy.get('.input-box').contains('label', 'Transaction description').parent().find('input[type="text"]').type(pastDateDesc);
    cy.get('.input-box').contains('label', 'Amount').parent().find('input[type="text"]').type('15.50');
    cy.get('select').select('DAILY');
    
    // 输入一个过去的日期（假设今天是2026年6月中旬，这里直接写一个绝对的过去时间）
    cy.get('input[type="date"]').type('2026-06-01'); 
    
    cy.get('input[type="submit"][value="Save transaction"]').click();
    cy.contains('Transaction has been successfully created!').should('be.visible');

    // [TC-11-012] 验证状态是否被系统自动计算为 over due
    cy.contains('.st-card', pastDateDesc).within(() => {
      // 模糊匹配包含 over due 的字眼即可（兼容 2 days over due 等动态文字）
      cy.contains('overdue', { matchCase: false }).should('be.visible');
      
      // [TC-11-009] 在这张确定的卡片上点击 Confirm 快捷操作
      cy.contains('button', 'Confirm').click();
    });

    // 验证符合 SRS 的 Confirm 成功提示
    cy.contains('Transaction has been successfully saved!').should('be.visible');
  });

});