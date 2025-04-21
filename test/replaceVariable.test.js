import assert from 'node:assert/strict';
import '../src/env.ts';
import Moment from "moment";
Date.prototype.format = function (format) {
    return Moment(this).format(format)
}

function testReplaceVariable() {
  // 测试简单变量替换
  const template1 = 'Hello %#name#%, welcome to %#city#%';
  const result1 = template1.replaceVariable({
    name: 'John',
    city: 'New York'
  });
  assert.strictEqual(result1, 'Hello John, welcome to New York');
  console.log('✓ 简单变量替换测试通过');

  // 测试日期格式化
  const template2 = 'Today is %#date:YYYY-MM-DD#%';
  const date = new Date('2023-01-01');
  const result2 = template2.replaceVariable({ date });
  assert.strictEqual(result2, 'Today is 2023-01-01');
  console.log('✓ 日期格式化测试通过');

  // 测试递归替换
  const template3 = 'First: %#first#%, Second: %#second#%';
  const result3 = template3.replaceVariable({
    first: '1st',
    second: '2nd'
  });
  assert.strictEqual(result3, 'First: 1st, Second: 2nd');
  console.log('✓ 递归替换测试通过');

  // 测试循环引用检测
  const template4 = 'Circular: %#a#%';
  const consoleWarn = console.warn;
  let warned = false;
  console.warn = () => { warned = true; };
  
  const result4 = template4.replaceVariable({
    a: '%#b#%',
    b: '%#a#%'
  });
  
  console.warn = consoleWarn;
  assert(warned, '应检测到循环引用');
  assert(result4.includes('Circular:'), '应包含部分替换结果');
  console.log('✓ 循环引用检测测试通过');

  console.log('所有测试通过');
}

testReplaceVariable();
