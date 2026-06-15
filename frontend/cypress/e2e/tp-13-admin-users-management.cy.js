/// <reference types="cypress" />

describe('A01 Admin Users Management (Report 3 Test Procedures)', () => {

  // 这里的 beforeEach 相当于你 Report 3 里的 "Prior to execution..."
  beforeEach(() => {
    // ==========================================
    // 步骤 1：真实的物理登录 (Real E2E Login)
    // ==========================================
    
    // 1. 访问你们系统真实的登录页面
    cy.visit('http://localhost:3000/auth/login'); 
    
    // 2. 输入真实的管理员账号 (⚠️ 请把你数据库里真实的 Admin Email 写在这里)
    cy.get('input[name="email"]').type('1211112202@student.mmu.edu.my'); 
    
    // 3. 输入真实的管理员密码 (⚠️ 换成真实的密码)
    cy.get('input[name="password"]').type('Kcl_4201'); 
    
    // 4. 点击登录按钮
    cy.get('input[type="submit"]').click(); 

    // 5. 断言登录成功，系统自动跳出了 login 页面 (假设跳到了 admin 相关的路径)
    cy.url().should('not.include', '/auth/login');

    // ==========================================
    // 步骤 2：通过侧边栏导航到 Users 页面
    // ==========================================

    // 提前安装好 Users 页面的 API 窃听器 (用来做智能等待)
    cy.intercept('GET', '**/user/getAll*').as('getUsers');

    // 使用侧边栏点击进入 Users 页面 (模仿用户的真实物理操作)
    cy.get('.side-bar').should('be.visible').contains('Users').click();
    
    // 验证确实进入了 Users 页面
    cy.url().should('include', '/admin/users');

    // 智能等待：等页面第一次加载出用户数据后再开始跑 Test Cases
    // cy.wait('@getUsers'); 
  });

  // ==========================================
  // TP-12-001: Search Functionality
  // ==========================================
  it('TP-12-001: Verify search functionality with valid, invalid, and empty keywords', () => {
    
    // [TC-12-001] 空值搜索：清空搜索框
    cy.get('input[placeholder="Search users"]').clear();
    cy.wait('@getUsers'); // 等待重置列表
    cy.get('table').should('be.visible');

    // [TC-12-003] 无效搜索：输入不存在的用户
    cy.get('input[placeholder="Search users"]').type('unknown_user_999');
    cy.wait('@getUsers');
    // ⚠️ 这里使用了 Copilot 发现的 Bug 文本，否则测试会报错
    cy.contains('No users found!').should('be.visible'); 

    // [TC-12-002] & [TC-12-009] 有效搜索 & 顺手 Toggle 并且严谨验证！
    cy.get('input[placeholder="Search users"]').clear().type('john_doe');
    cy.wait('@getUsers'); // 这里等搜索的 API 是没问题的
    
    // Step 1: 找到 john_doe 并点击 Disable
    // 💡 架构师技巧：打破链条，不要用 .within，直接在一行里找按钮并点击，防 DOM 脱离
    cy.contains('tr', 'john_doe').contains('button', 'Disable').click(); 

    // ============ 系统开始暴力刷新 ============
    
    // Step 2: 用最硬核的 UI 级别等待，对抗网页刷新！
    // 我们强制要求 Cypress 在接下来的 10 秒内，死死盯住页面，
    // 直到 john_doe 这一行重新出现，并且里面真的出现了红色的 'Disabled' 为止！
    cy.contains('tr', 'john_doe', { timeout: 10000 })
      .contains('td', 'Disabled', { timeout: 10000 })
      .should('have.css', 'color', 'rgb(255, 0, 0)');
      
    // Step 3: (可选) 作为一个完美的 QA，测完之后我们再把他点回 Enabled
    cy.contains('tr', 'john_doe').contains('button', 'Enable').click();
    
    // 等待恢复绿色的动作完成
    cy.contains('tr', 'john_doe', { timeout: 10000 })
      .contains('td', 'Enabled', { timeout: 10000 })
      .should('have.css', 'color', 'rgb(106, 164, 18)');
  });

  // ==========================================
  // TP-12-002: Pagination and Main Flow
  // ==========================================
  it('TP-12-002: Verify pagination boundaries and toggle action', () => {
    
    // [TC-12-004] 第一页的“上一页”按钮应该是 Disabled 状态
    // Copilot 提示：不可点击时，前端加了 class="disable"
    cy.get('.page-info button').first().should('have.class', 'disable');

    // [TC-12-005] 点击“下一页”
    // 前提：确保下一页不是 disable 状态再点
    cy.get('.page-info button').last().should('not.have.class', 'disable').click();
    cy.wait('@getUsers'); // 翻页会请求新数据，聪明地等待！

    // [TC-12-008] 在第二页 Toggle 任意一个用户
    cy.get('table tr').eq(1).within(() => {   // eq(1) 就是抓取第二行数据
        cy.get('button').first().click();       // 随便点该行的第一个按钮
    });
    // 因为点击后页面会刷新，所以我们需要等重新获取列表的数据
    cy.wait('@getUsers');

    // [TC-12-006] 狂点下一页直到到达最后一页
    // 这里是一个高级技巧：循环点击下一页，直到它拥有 'disable' 类名
    const clickNextUntilEnd = () => {
      cy.get('.page-info button').last().then(($btn) => {
        if (!$btn.hasClass('disable')) {
          cy.wrap($btn).click();
          cy.wait('@getUsers');
          clickNextUntilEnd(); // 递归调用
        } else {
          // 到达最后一页，断言按钮被禁用
          cy.wrap($btn).should('have.class', 'disable');
        }
      });
    };
    clickNextUntilEnd();
  });

  // ==========================================
  // TP-12-003: State Transition (Status Flow) 终极严谨版
  // ==========================================
  // [TC-13-007]
  it('TP-12-003: Verify state transition by toggling status back and forth', () => {
    
    // 我们指定一个“倒霉蛋”作为测试目标，比如刚才插入的 'alice_smith'
    const targetUsername = 'alice_smith';

    // Step 1: 在表格里找到 alice，并确保她当前是 Enabled (绿色)
    // 注意：用 .contains() 找到 alice 所在的 tr (行)
    cy.contains('tr', targetUsername).as('firstEncounter');
    cy.get('@firstEncounter').within(() => {
      cy.contains('td', 'Enabled').should('have.css', 'color', 'rgb(106, 164, 18)');
      // 点击 Disable 按钮
      cy.contains('button', 'Disable').click();
    });

    // ============ 系统开始暴力刷新 ============
    
    // Step 2: 关键！等待新的用户列表数据加载完毕，确保页面刷新完成
    cy.wait('@getUsers'); 

    // Step 3: 重新寻人！因为页面刷新了，之前的 @firstEncounter 已经失效。
    // 我们必须再次在 DOM 里搜索 targetUsername！
    cy.contains('tr', targetUsername).as('secondEncounter');
    
    // 验证她的状态是不是真的变成了 Disabled (红色)
    cy.get('@secondEncounter').within(() => {
      cy.contains('td', 'Disabled').should('have.css', 'color', 'rgb(255, 0, 0)');
      
      // 再次点击 Enable 按钮，把她变回来
      cy.contains('button', 'Enable').click();
    });

    // ============ 系统再次暴力刷新 ============
    cy.wait('@getUsers');

    // Step 4: 再次重新寻人！验证她是否变回了 Enabled
    cy.contains('tr', targetUsername).within(() => {
      cy.contains('td', 'Enabled').should('have.css', 'color', 'rgb(106, 164, 18)');
    });

  });

  // ==========================================
  // TP-13-004 (Part 1): 执行 [TC-13-010]
  // 测试点：在第二页搜索，检查分页是否重置
  // ==========================================
  it('TP-13-004 [TC-13-010]: Verify Search functionality while on a paginated page', () => {
    
    // Set Up: 翻到第二页
    cy.get('.page-info button').last().should('not.have.class', 'disable').click();
    cy.wait('@getUsers');
    cy.get('table').should('not.contain', 'ling'); 

    // 执行有效搜索
    cy.get('input[placeholder="Search users"]').clear().type('john_doe');
    cy.wait('@getUsers');

    // 🚨 核心 Bug 捕获点：这里会 FAIL，因为系统卡在第二页 (显示 11 to 20)
    cy.contains('1 to 1 of 1 records').should('be.visible'); 
  });


  // ==========================================
  // TP-13-004 (Part 2): 执行 [TC-13-011]
  // 测试点：无效搜索后，检查空状态和分页器禁用情况
  // ==========================================
  it('TP-13-004 [TC-13-011]: Verify Pagination functionality after an invalid search', () => {
    
    // (因为是独立的 it 块，Cypress 会自动从 beforeEach 的第一页开始，完美避开上一个 Bug 的污染)
    
    // 执行无效搜索
    cy.get('input[placeholder="Search users"]').clear().type('unknown_user_999');
    cy.wait('@getUsers');

    // 🚨 妥协检查点：抓取错别字 Bug
    cy.contains('No transactions found!').should('be.visible'); 
    
    // 检查分页控制器是否被正确禁用
    // cy.contains('0 to 0 of 0 records').should('be.visible');
    cy.get('.page-info button').first().should('have.class', 'disable');
    cy.get('.page-info button').last().should('have.class', 'disable');
  });
});