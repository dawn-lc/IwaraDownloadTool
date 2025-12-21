import { Test, TestGroup } from './framework.ts';
import '../src/env.ts';
import dayjs from "dayjs";

Date.prototype.format = function (format) {
    return dayjs(this).format(format)
}

const emojiTestGroup = new TestGroup('emoji匹配测试');

// 基本表情符号测试
emojiTestGroup.add(new Test('💕❤️替换', 'async', function () {
    const template = '💕❤️';
    const result = template.replaceEmojis('_');
    this.assertEqual(result, '__');
}));

emojiTestGroup.add(new Test('单个表情符号', 'async', function () {
    const template = 'Hello 😊 World';
    const result = template.replaceEmojis('');
    this.assertEqual(result, 'Hello  World');
}));

emojiTestGroup.add(new Test('多个表情符号', 'async', function () {
    const template = '😀😃😄😁😆';
    const result = template.replaceEmojis('*');
    this.assertEqual(result, '*****');
}));

// 表情符号序列测试（零宽度连接符）
emojiTestGroup.add(new Test('家庭表情序列', 'async', function () {
    const template = '家庭: 👨‍👩‍👧‍👦';
    const result = template.replaceEmojis('');
    this.assertEqual(result, '家庭: ');
}));

emojiTestGroup.add(new Test('职业性别序列', 'async', function () {
    const template = '👩‍⚕️👨‍⚕️';
    const result = template.replaceEmojis('_');
    this.assertEqual(result, '__');
}));

// 国旗/区域标志测试
emojiTestGroup.add(new Test('国旗表情', 'async', function () {
    const template = '中国🇨🇳 美国🇺🇸 日本🇯🇵';
    const result = template.replaceEmojis('');
    this.assertEqual(result, '中国 美国 日本');
}));

// 标签序列测试
emojiTestGroup.add(new Test('标签序列', 'async', function () {
    // 英格兰国旗标签序列
    const template = '🏴󠁧󠁢󠁥󠁮󠁧󠁿';
    const result = template.replaceEmojis('');
    this.assertEqual(result, '');
}));

// 混合内容测试
emojiTestGroup.add(new Test('混合文本和表情', 'async', function () {
    const template = '今天天气真好！☀️ 我想去公园🌳玩🎮';
    const result = template.replaceEmojis('*');
    this.assertEqual(result, '今天天气真好！* 我想去公园*玩*');
}));

emojiTestGroup.add(new Test('表情在开头和结尾', 'async', function () {
    const template = '🎉派对开始🎊';
    const result = template.replaceEmojis('');
    this.assertEqual(result, '派对开始');
}));

// 边界情况测试
emojiTestGroup.add(new Test('空字符串', 'async', function () {
    const template = '';
    const result = template.replaceEmojis('_');
    this.assertEqual(result, '');
}));

emojiTestGroup.add(new Test('无表情符号的字符串', 'async', function () {
    const template = '这是一个普通字符串';
    const result = template.replaceEmojis('_');
    this.assertEqual(result, '这是一个普通字符串');
}));

emojiTestGroup.add(new Test('仅表情符号', 'async', function () {
    const template = '😂🤣😭😍';
    const result = template.replaceEmojis('E');
    this.assertEqual(result, 'EEEE');
}));

// 替换参数测试
emojiTestGroup.add(new Test('替换为空字符串', 'async', function () {
    const template = '测试😊表情🎮替换';
    const result = template.replaceEmojis('');
    this.assertEqual(result, '测试表情替换');
}));

emojiTestGroup.add(new Test('替换为多个字符', 'async', function () {
    const template = '😀😃😄';
    const result = template.replaceEmojis('[EMOJI]');
    this.assertEqual(result, '[EMOJI][EMOJI][EMOJI]');
}));

emojiTestGroup.add(new Test('默认替换参数', 'async', function () {
    const template = '默认😊测试🎮';
    const result = template.replaceEmojis();
    this.assertEqual(result, '默认测试');
}));

emojiTestGroup.add(new Test('替换为null', 'async', function () {
    const template = '测试😊null🎮';
    const result = template.replaceEmojis(null);
    this.assertEqual(result, '测试null');
}));

// Unicode 边界情况
emojiTestGroup.add(new Test('变异选择器', 'async', function () {
    // 带变异选择器的表情符号
    const template = '❤️ vs ❤';
    const result = template.replaceEmojis('');
    this.assertEqual(result, ' vs ');
}));

emojiTestGroup.add(new Test('肤色修饰符', 'async', function () {
    const template = '👍🏿👍🏽👍🏻';
    const result = template.replaceEmojis('_');
    this.assertEqual(result, '___');
}));

// 复杂混合测试
emojiTestGroup.add(new Test('复杂混合场景', 'async', function () {
    const template = '会议📅 时间: 14:00 ⏰ 地点: 办公室🏢 主题: 项目🎯 进展📈';
    const result = template.replaceEmojis('*');
    this.assertEqual(result, '会议* 时间: 14:00 * 地点: 办公室* 主题: 项目* 进展*');
}));

emojiTestGroup.add(new Test('重复表情符号', 'async', function () {
    const template = '😂😂😂重复😂😂😂';
    const result = template.replaceEmojis('X');
    this.assertEqual(result, 'XXX重复XXX');
}));

emojiTestGroup.add(new Test('特殊符号误伤测试', 'async', function () {
    const template = '版权符号: © 注册商标: ® 商标: ™';
    const result = template.replaceEmojis('_');
    this.assertEqual(result, '版权符号: _ 注册商标: _ 商标: _');
}));

emojiTestGroup.add(new Test('数学符号误伤测试', 'async', function () {
    const template = '数学符号: ∑ ∏ √ ∫ ∞ ≠ ≤ ≥';
    const result = template.replaceEmojis('_');
    this.assertEqual(result, '数学符号: ∑ ∏ √ ∫ ∞ ≠ ≤ ≥');
}));

emojiTestGroup.add(new Test('箭头符号误伤测试', 'async', function () {
    const template = '箭头: → ← ↑ ↓ ↔ ↕ ↖ ↗ ↘ ↙';
    const result = template.replaceEmojis('_');
    this.assertEqual(result, '箭头: → ← ↑ ↓ _ _ _ _ _ _');
}));

emojiTestGroup.add(new Test('货币符号误伤测试', 'async', function () {
    const template = '货币: € £ ¥ $ ¢ ₩ ₽ ₹';
    const result = template.replaceEmojis('_');
    this.assertEqual(result, '货币: € £ ¥ $ ¢ ₩ ₽ ₹');
}));

emojiTestGroup.add(new Test('标点符号误伤测试', 'async', function () {
    const template = '标点: 。，、；：「」『』【】《》〈〉！？';
    const result = template.replaceEmojis('_');
    this.assertEqual(result, '标点: 。，、；：「」『』【】《》〈〉！？');
}));

emojiTestGroup.add(new Test('数字和字母误伤测试', 'async', function () {
    const template = '1234567890 ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz';
    const result = template.replaceEmojis('_');
    this.assertEqual(result, '1234567890 ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz');
}));

emojiTestGroup.add(new Test('混合误伤测试', 'async', function () {
    const template = '测试©️与®️和™️符号😊混合🎮场景';
    const result = template.replaceEmojis('*');
    this.assertEqual(result, '测试*与*和*符号*混合*场景');
}));

// 性能测试
emojiTestGroup.add(new Test('大量表情符号性能', 'async', function () {
    const emojis = '😀😃😄😁😆😅😂🤣😊😇🙂🙃😉😌😍🥰😘😗😙😚😋😛😝😜🤪🤨🧐🤓😎🤩🥳😏😒😞😔😟😕🙁☹️😣😖😫😩🥺😢😭😤😠😡🤬🤯😳🥵🥶😱😨😰😥😓🤗🤔🤭🤫🤥😶😐😑😬🙄😯😦😧😮😲🥱😴🤤😪😵🤐🥴🤢🤮🤧😷🤒🤕🤑🤠😈👿👹👺🤡💩👻💀☠️👽👾🤖🎃😺😸😹😻😼😽🙀😿😾';
    const startTime = Date.now();
    const result = emojis.replaceEmojis('');
    const duration = Date.now() - startTime;

    this.assertEqual(result, '');
    this.assertTrue(duration < 100, `处理大量表情符号应在100ms内完成，实际耗时: ${duration}ms`);
}));


const testGroup = new TestGroup('String.replaceVariable边界情况测试');
let date: Date;

testGroup.beforeEach(() => {
    date = new Date('2023-01-01T12:34:56');
});

// 简单变量替换测试
testGroup.add(new Test('简单变量替换', 'async', function () {
    const template = 'Hello %#name#%, welcome to %#city#%';
    const result = template.replaceVariable({ name: 'John', city: 'New York' });
    this.assertEqual(result, 'Hello John, welcome to New York');
}));

// 日期格式化测试
testGroup.add(new Test('日期格式化', 'async', function () {
    const template = 'Today is %#date:YYYY-MM-DD#%';
    const result = template.replaceVariable({ date });
    this.assertEqual(result, 'Today is 2023-01-01');
}));

// 特殊字符格式化测试
testGroup.add(new Test('日期格式化模板中包含后缀', 'async', function () {
    const template = 'Today is %#date:YYYY-MM-DD#%HH.mm.ss#%';
    const result = template.replaceVariable({ date });
    this.assertEqual(result, 'Today is 2023-01-01HH.mm.ss#%');
}));


// 特殊字符格式化测试
testGroup.add(new Test('特殊字符格式化', 'async', function () {
    const template = 'Today is %#date:YYYY-MM-DD+HH.mm.ss .*+?^${}()|[]#%';
    const result = template.replaceVariable({ date });
    this.assertEqual(result, 'Today is 2023-01-01+12.34.56 .*+?^${}()|[]');
}));

testGroup.add(new Test('路径格式化', 'async', function () {
    const template = '/iwara/%#AUTHOR#%/%#date:YYYY-MM-DD+HH.mm.ss#%_%#ID#%.mp4';
    const result = template.replaceVariable({ date, AUTHOR: 'Test', ID: 'Test123', });
    this.assertEqual(result, '/iwara/Test/2023-01-01+12.34.56_Test123.mp4');
}));


// 递归替换测试
testGroup.add(new Test('递归替换', 'async', function () {
    const template = 'First: %#first#%, Second: %#second#%, Last: %#last#%';
    const result = template.replaceVariable({
        first: '1st',
        second: 'first is %#first#%',
        last: 'second is %#second#%'
    });
    this.assertEqual(result, 'First: 1st, Second: first is 1st, Last: second is first is 1st');
}));

// 日期默认格式化测试
testGroup.add(new Test('日期默认格式化', 'async', function () {
    const template = 'Today is %#date#%';
    const result = template.replaceVariable({ date });
    this.assertEqual(result, 'Today is 2023-01-01');
}));

// 短键优先级测试
testGroup.add(new Test('短键优先级', 'async', function () {
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
testGroup.add(new Test('循环引用检测', 'async', function () {
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
performanceGroup.add(new Test('简单替换性能(10变量)', 'async', function () {
    const { template, variables } = generateTestData(10);
    const startTime = Date.now();

    // 执行100次替换
    for (let i = 0; i < 100; i++) {
        template.replaceVariable(variables);
    }

    const duration = Date.now() - startTime;
    this.comment = `10变量x100次替换耗时: ${duration}ms (平均${duration / 100}ms/次)`;
    this.assertTrue(duration < 1000, '性能测试应在1秒内完成');
}));

// 中等替换性能测试 (100个变量)
performanceGroup.add(new Test('中等替换性能(100变量)', 'async', function () {
    const { template, variables } = generateTestData(100);
    const startTime = Date.now();

    // 执行50次替换
    for (let i = 0; i < 50; i++) {
        template.replaceVariable(variables);
    }

    const duration = Date.now() - startTime;
    this.comment = `100变量x50次替换耗时: ${duration}ms (平均${duration / 50}ms/次)`;
    this.assertTrue(duration < 1000, '性能测试应在1秒内完成');
}));

// 大量替换性能测试 (1000个变量)
performanceGroup.add(new Test('大量替换性能(1000变量)', 'async', function () {
    const { template, variables } = generateTestData(1000);
    const startTime = Date.now();

    // 执行10次替换
    for (let i = 0; i < 10; i++) {
        template.replaceVariable(variables);
    }

    const duration = Date.now() - startTime;
    this.comment = `1000变量x10次替换耗时: ${duration}ms (平均${duration / 10}ms/次)`;
    this.assertTrue(duration < 2000, '性能测试应在2秒内完成');
}));

// 深度嵌套性能测试
performanceGroup.add(new Test('深度嵌套替换性能', 'async', function () {
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
    this.comment = `10层嵌套x20次替换耗时: ${duration}ms (平均${duration / 20}ms/次)`;
    this.assertTrue(duration < 1000, '性能测试应在1秒内完成');
}));

// 执行测试
Promise.all([
    testGroup.runAll(),
    performanceGroup.runAll(),
    emojiTestGroup.runAll()
]).catch(console.error);
