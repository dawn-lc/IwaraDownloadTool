import { describe, beforeEach, test, assertEqual, run } from './framework.js';
import '../src/env.ts';
import Moment from "moment";
Date.prototype.format = function (format) {
  return Moment(this).format(format)
}
describe('String.replaceVariable测试', () => {
  let date;
  beforeEach(() => {
    date = new Date('2023-01-01T12:34:56');
  });

  test('简单变量替换', () => {
    const template = 'Hello %#name#%, welcome to %#city#%';
    const result = template.replaceVariable({ name: 'John', city: 'New York' });
    assertEqual(result, 'Hello John, welcome to New York');
  });

  test('日期格式化', () => {
    const template = 'Today is %#date:YYYY-MM-DD#%';
    const result = template.replaceVariable({ date });
    assertEqual(result, 'Today is 2023-01-01');
  });

  test('特殊字符格式化', () => {
    const template = 'Today is %#date:YYYY-MM-DD HH:mm#%';
    const result = template.replaceVariable({ date });
    assertEqual(result, 'Today is 2023-01-01 12:34');
  });

  test('递归替换', () => {
    const template = 'First: %#first#%, Second: %#second#%, Last: %#last#%';
    const result = template.replaceVariable({
      first: '1st',
      second: '2nd',
      last: 'first is %#first#%'
    });
    assertEqual(result, 'First: 1st, Second: 2nd, Last: first is 1st');
  });

  test('日期默认格式化', () => {
    const template = 'Today is %#date#%';
    const result = template.replaceVariable({ date });
    assertEqual(result, 'Today is 2023-01-01');
  });

  test('短键优先级', () => {
    const template = `User: %#user#%, UserName: %#userName#%\n` +
                     `UserName: %#userName#%, User: %#user#%\n` +
                     `User: %#user#%, UserName: %#userName#%`;
    const result = template.replaceVariable({ user: 'short', userName: 'longname' });
    const expected = `User: short, UserName: longname\n` +
                     `UserName: longname, User: short\n` +
                     `User: short, UserName: longname`;
    assertEqual(result, expected);
  });

  test('循环引用检测', () => {
    let warned = false;
    const originalWarn = console.warn;
    console.warn = () => { warned = true; };

    const template = 'Circular: %#a#%';
    const result = template.replaceVariable({ a: '%#c#%', b: '%#a#%', c: '%#b#%' });

    console.warn = originalWarn;
    // 验证警告已触发且部分结果正确
    assertEqual(warned, true, '应检测到循环引用');
    assertEqual(result.includes('Circular:'), true, '应包含部分替换结果');
  });
});

// 执行所有测试
run();