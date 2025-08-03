import { Test, TestGroup } from './framework.ts';
import '../src/env.ts';
import Moment from "moment";

Date.prototype.format = function (format) {
  return Moment(this).format(format)
}

const testGroup = new TestGroup('String.replaceVariable');
let date: Date;

testGroup.beforeEach(() => {
  date = new Date('2023-01-01T12:34:56');
});

// 简单变量替换测试
testGroup.add('简单变量替换', new Test('简单变量替换', 'sync', function () {
  const template = 'Hello %#name#%, welcome to %#city#%';
  const result = template.replaceVariable({ name: 'John', city: 'New York' });
  this.assertEqual(result, 'Hello John, welcome to New York');
}));

// 日期格式化测试
testGroup.add('日期格式化', new Test('日期格式化', 'sync', function () {
  const template = 'Today is %#date:YYYY-MM-DD#%';
  const result = template.replaceVariable({ date });
  this.assertEqual(result, 'Today is 2023-01-01');
}));

// 特殊字符格式化测试
testGroup.add('特殊字符格式化', new Test('特殊字符格式化', 'sync', function () {
  const template = 'Today is %#date:YYYY-MM-DD+HH.mm.ss .*+?^${}()|[]#%';
  const result = template.replaceVariable({ date });
  this.assertEqual(result, 'Today is 2023-01-01+12.34.56 .*+?^${}()|[]');
}));

// 递归替换测试
testGroup.add('递归替换', new Test('递归替换', 'sync', function () {
  const template = 'First: %#first#%, Second: %#second#%, Last: %#last#%';
  const result = template.replaceVariable({
    first: '1st',
    second: 'first is %#first#%',
    last: 'second is %#second#%'
  });
  this.assertEqual(result, 'First: 1st, Second: first is 1st, Last: second is first is 1st');
}));

// 日期默认格式化测试
testGroup.add('日期默认格式化', new Test('日期默认格式化', 'sync', function () {
  const template = 'Today is %#date#%';
  const result = template.replaceVariable({ date });
  this.assertEqual(result, 'Today is 2023-01-01');
}));

// 短键优先级测试
testGroup.add('短键优先级', new Test('短键优先级', 'sync', function () {
  const template = `User: %#user#%, UserName: %#userName#%\n` +
    `UserName: %#userName#%, User: %#user#%\n` +
    `User: %#user#%, UserName: %#userName#%`;
  const result = template.replaceVariable({ user: 'short', userName: 'longname' });
  const expected = `User: short, UserName: longname\n` +
    `UserName: longname, User: short\n` +
    `User: short, UserName: longname`;
  this.assertEqual(result, expected);
}));

// 循环引用检测测试
testGroup.add('循环引用检测', new Test('循环引用检测', 'sync', function () {
  let warned = false;
  const originalWarn = console.warn;
  console.warn = () => { warned = true; };

  const template = 'Circular: %#a#%';
  const result = template.replaceVariable({ a: '%#c#%', b: '%#a#%', c: '%#b#%' });

  console.warn = originalWarn;
  // 验证警告已触发且部分结果正确
  this.assertEqual(warned, true, '应检测到循环引用');
  this.assertTrue(result.includes('Circular:'), '应包含部分替换结果');
}));

// 性能测试组
const performanceGroup = new TestGroup('String.replaceVariable性能测试');

// 生成测试数据
function generateTestData(size: number) {
  const variables: Record<string, string> = {};
  const templateParts: string[] = ['Template:'];

  for (let i = 0; i < size; i++) {
    const key = `var${i}`;
    variables[key] = `value${i}`;
    templateParts.push(` %#${key}#%`);
  }

  return {
    template: templateParts.join(''),
    variables
  };
}

// 简单替换性能测试 (10个变量)
performanceGroup.add('简单替换性能(10变量)', new Test('简单替换性能(10变量)', 'sync', function () {
  const { template, variables } = generateTestData(10);
  const startTime = Date.now();

  // 执行100次替换
  for (let i = 0; i < 100; i++) {
    template.replaceVariable(variables);
  }

  const duration = Date.now() - startTime;
  console.log(`10变量x100次替换耗时: ${duration}ms (平均${duration / 100}ms/次)`);
  this.assertTrue(duration < 1000, '性能测试应在1秒内完成');
}));

// 中等替换性能测试 (100个变量)
performanceGroup.add('中等替换性能(100变量)', new Test('中等替换性能(100变量)', 'sync', function () {
  const { template, variables } = generateTestData(100);
  const startTime = Date.now();

  // 执行50次替换
  for (let i = 0; i < 50; i++) {
    template.replaceVariable(variables);
  }

  const duration = Date.now() - startTime;
  console.log(`100变量x50次替换耗时: ${duration}ms (平均${duration / 50}ms/次)`);
  this.assertTrue(duration < 1000, '性能测试应在1秒内完成');
}));

// 大量替换性能测试 (1000个变量)
performanceGroup.add('大量替换性能(1000变量)', new Test('大量替换性能(1000变量)', 'sync', function () {
  const { template, variables } = generateTestData(1000);
  const startTime = Date.now();

  // 执行10次替换
  for (let i = 0; i < 10; i++) {
    template.replaceVariable(variables);
  }

  const duration = Date.now() - startTime;
  console.log(`1000变量x10次替换耗时: ${duration}ms (平均${duration / 10}ms/次)`);
  this.assertTrue(duration < 2000, '性能测试应在2秒内完成');
}));

// 深度嵌套性能测试
performanceGroup.add('深度嵌套替换性能', new Test('深度嵌套替换性能', 'sync', function () {
  const variables: Record<string, string> = {};
  let template = 'Start: %#var0#%';

  // 创建10层深度的嵌套替换
  for (let i = 0; i < 10; i++) {
    variables[`var${i}`] = `Level${i}: %#var${i + 1}#%`;
  }
  variables['var10'] = 'End';

  const startTime = Date.now();

  // 执行20次嵌套替换
  for (let i = 0; i < 20; i++) {
    template.replaceVariable(variables);
  }

  const duration = Date.now() - startTime;
  console.log(`10层嵌套x20次替换耗时: ${duration}ms (平均${duration / 20}ms/次)`);
  this.assertTrue(duration < 1000, '性能测试应在1秒内完成');
}));

// 运行所有测试并输出报告
async function runTests() {
  const summary = await testGroup.runAll();
  console.log(testGroup.formatTestReport(summary));
}

async function runPerformanceTests() {
  const summary = await performanceGroup.runAll();
  console.log('\n性能测试报告:');
  console.log(performanceGroup.formatTestReport(summary));
}

// 执行测试
Promise.all([
  runTests(),
  runPerformanceTests()
]).catch(console.error);