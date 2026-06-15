/// <reference types="cypress" />

describe('A03 Admin Categories Management (Report 3 Test Procedures)', () => {

  beforeEach(() => {
    // ==========================================
    // 步骤 1：真实的物理登录 (使用你 tp-13 中验证过的完美代码)
    // ==========================================
    cy.visit('http://localhost:3000/auth/login');
    cy.get('input[name="email"]').type('1211112202@student.mmu.edu.my');
    cy.get('input[name="password"]').type('Kcl_4201');
    cy.get('input[type="submit"]').click();
    
    // 断言登录成功
    cy.url().should('not.include', '/auth/login');

    // ==========================================
    // 步骤 2：通过侧边栏导航到 Categories 页面
    // ==========================================
    // 提前安装好 Categories 页面的 API 窃听器 (用来做智能等待)
    cy.intercept('GET', '**/category/getAll*').as('getCategories');

    // 使用侧边栏点击进入 Categories 页面
    cy.get('.side-bar').should('be.visible').contains('Categories').click();
    
    // 验证确实进入了 Categories 页面
    cy.url().should('include', '/admin/categories');
    
    // 智能等待：等页面第一次加载出分类数据后再开始跑 Test Cases
    cy.wait('@getCategories');
  });

  // ====================================================================
  // TP-15-001: Form Validation Errors (空字段与超长字符拦截)
  // ====================================================================
  // [TC-15-014]
  it('TP-15-001: Verify form validation by attempting to save with empty fields and exceeding limits', () => {
    // 1. 点击 "+ New category" 进入表单
    cy.contains('a', 'New category').click(); 
    cy.url().should('include', '/admin/newCategory');

    // 2. [TC-15-001/TC-15-005 & TC-15-003] 什么都不填，直接点击 Save
    cy.get('input[type="submit"][value="Save category"]').click(); 
    cy.get('small').should('contain', 'Category name is required!');
    cy.get('small').should('contain', 'Transaction type is required!');

    // 3. 只填名字，不选 Transaction Type
    cy.get('input[type="text"]').first().type('Marketing');
    cy.get('input[type="submit"][value="Save category"]').click();
    cy.get('small').should('contain', 'Transaction type is required!');

    // 4. [TC-15-009] 输入 31 个字符的超长名字 (Upper Boundary Edge)
    cy.get('input[type="text"]').first().clear().type('Monthly Office Supply Expenses!'); 
    cy.get('input[type="radio"][value="1"]').check(); // 选中 Expense
    cy.get('input[type="submit"][value="Save category"]').click();
    cy.contains('Category name can have at most 30 characters!').should('be.visible');
    
    // 退出表单
    cy.contains('a.button.outline', 'Cancel').click();
  });

  // ====================================================================
  // TP-15-002: Valid Boundaries (1, 15, 30 characters & Alphanumeric)
  // 对应 Test Cases: TC-15-002, TC-15-004, TC-15-006, TC-15-007, TC-15-008
  // ====================================================================
  it('TP-15-002: Verify system accepts valid boundary values for category name lengths and alphanumeric characters', () => {
    
    const validCategories = [
      { name: 'F', id: 'TC-15-006' }, 
      { name: 'Monthly Utility', id: 'TC-15-007' }, 
      { name: 'Monthly Office Supply Expenses', id: 'TC-15-008' }, 
      { name: 'Office Supplies', id: 'TC-15-002' }, 
      { name: 'Marketing', id: 'TC-15-004' } 
    ];

    cy.intercept('POST', '**/category/new*').as('addValidCategory');

    validCategories.forEach((category) => {
      // 1. 进入表单
      cy.contains('a', 'New category').click(); 
      cy.url().should('include', '/admin/newCategory');

      // 2. 输入数据
      cy.get('input[type="text"]').first().clear().type(category.name);
      cy.get('input[type="radio"][value="1"]').check(); 

      // 3. 点击保存
      cy.get('input[type="submit"][value="Save category"]').click(); 

      // 4. 验证是否成功跳转回 Dashboard
      cy.wait('@addValidCategory');
      cy.url().should('include', '/admin/categories');
      
      // 5. 智能等待列表重新加载
      cy.wait('@getCategories');

      // 🌟 高级 QA 补充断言：强力验证新建的 Category 确实渲染在了页面的表格中！
      cy.contains('td', category.name).should('be.visible'); 
    });
  });


  // ====================================================================
  // TP-15-003: Main Flow - Add valid category and Cancel edit
  // ====================================================================
  it('TP-15-003: Execute main flow to successfully add a valid category, followed by canceling an edit process', () => {
    // 拦截新增 API
    cy.intercept('POST', '**/category/new*').as('addCategory');

    // 1. [TC-15-011] 新建一个正常的 Category: "Hardware Maintenance"
    cy.contains('a', 'New category').click();
    cy.get('input[type="text"]').first().type('Hardware Maintenance');
    cy.get('input[type="radio"][value="1"]').check(); // 选中 Expense
    
    // 2. 保存并验证是否成功跳回 Dashboard
    cy.get('input[type="submit"][value="Save category"]').click(); 
    cy.wait('@addCategory');
    cy.url().should('include', '/admin/categories');

    // 等待列表刷新
    cy.wait('@getCategories');

    // 3. 在列表中找到刚刚创建的 "Hardware Maintenance"，并点击 Edit 按钮
    cy.contains('tr', 'Hardware Maintenance').contains('button', 'Edit').click(); 
    cy.url().should('include', '/admin/editCategory');

    // 4. [TC-15-013] 不做修改，直接点击 Cancel，验证是否安全返回
    cy.contains('a.button.outline', 'Cancel').click(); 
    cy.url().should('include', '/admin/categories');
  });

  // ====================================================================
  // TP-15-004: State Transition & Toggle Status (模仿你 TP-13 的暴力刷新等待逻辑)
  // ====================================================================
  // [TC-15-010, TC-15-012]
  it('TP-15-004: Verify state transition by toggling a category status', () => {
    
    const targetCategory = 'Hardware Maintenance';

    // Step 1: 找到目标并确保她当前是 Enabled (绿色)
    cy.contains('tr', targetCategory).as('firstEncounter');
    cy.get('@firstEncounter').within(() => {
      cy.contains('td', 'Enabled').should('have.css', 'color', 'rgb(106, 164, 18)');
      // 点击 Disable 按钮
      cy.contains('button', 'Disable').click();
    });

    // Step 2: 等待新的列表数据加载完毕
    cy.wait('@getCategories');

    // Step 3: 重新寻找目标并验证状态是否变成 Disabled (红色)
    cy.contains('tr', targetCategory).as('secondEncounter');
    cy.get('@secondEncounter').within(() => {
      cy.contains('td', 'Disabled').should('have.css', 'color', 'rgb(255, 0, 0)');
      
      // 再次点击 Enable 按钮，把状态恢复
      cy.contains('button', 'Enable').click();
    });

    // Step 4: 等待新的列表数据加载完毕并验证恢复 Enabled
    cy.wait('@getCategories');
    cy.contains('tr', targetCategory).within(() => {
      cy.contains('td', 'Enabled').should('have.css', 'color', 'rgb(106, 164, 18)');
    });
  });

});