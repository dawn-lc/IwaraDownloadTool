const tests = [];
let currentGroup = null;
const hooks = {
  beforeEach: [],
  afterEach: []
};

/**
 * 定义测试分组
 * @param {string} name 分组名称
 * @param {Function} fn 分组内回调
 */
export function describe(name, fn) {
  const parentGroup = currentGroup;
  currentGroup = name;
  fn();
  currentGroup = parentGroup;
}

/**
 * 注册 beforeEach 钩子
 * @param {Function} fn 钩子函数
 */
export function beforeEach(fn) {
  hooks.beforeEach.push(fn);
}

/**
 * 注册 afterEach 钩子
 * @param {Function} fn 钩子函数
 */
export function afterEach(fn) {
  hooks.afterEach.push(fn);
}

/**
 * 定义一个测试用例
 * @param {string} name 测试名称
 * @param {Function} fn 测试函数，同步或返回 Promise
 */
export function test(name, fn) {
  tests.push({ name, fn, group: currentGroup });
}

/**
 * 断言失败时抛出异常
 */
function fail(message) {
  throw new Error(`断言失败: ${message}`);
}

/**
 * 断言相等
 * @param {*} actual 实际值
 * @param {*} expected 预期值
 * @param {string} [message] 可选错误信息
 */
export function assertEqual(actual, expected, message) {
  if (actual !== expected) fail(message || `预期 ${expected}，但得到 ${actual}`);
}

/**
 * 断言函数抛出错误
 * @param {Function} fn 要执行的函数
 * @param {string} [expectedMessage] 可选的错误信息匹配
 */
export function assertThrows(fn, expectedMessage) {
  try {
    fn();
  } catch (err) {
    if (expectedMessage && !err.message.includes(expectedMessage)) {
      fail(`预期错误信息包含 '${expectedMessage}'，但得到 '${err.message}'`);
    }
    return;
  }
  fail('预期函数抛出错误，但未抛出');
}

/**
 * 运行所有测试并输出结果
 */
export async function run() {
  console.log(`\n\x1b[1m开始运行 ${tests.length} 个测试\x1b[0m`);
  let passed = 0;
  let failed = 0;

  for (const { name, fn, group } of tests) {
    // 打印分组名
    if (group) console.log(`\n\x1b[4m${group}\x1b[0m`);

    // 执行 beforeEach 钩子
    for (const hook of hooks.beforeEach) hook();

    try {
      const result = fn();
      if (result instanceof Promise) await result;
      console.log(`\x1b[32m✓ ${name}\x1b[0m`);
      passed++;
    } catch (err) {
      console.log(`\x1b[31m𐄂 ${name}\x1b[0m`);
      console.error(err);
      failed++;
    }

    // 执行 afterEach 钩子
    for (const hook of hooks.afterEach) hook();
  }

  console.log(`\n\x1b[1m测试结束: ${passed} 通过, ${failed} 失败\x1b[0m`);
  if (failed > 0) process.exitCode = 1;
}

// 如果直接用 node 执行此文件，则运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  run();
}
