import Decimal from "decimal.js"
Decimal.prototype.toPercent = function(){
    return this.mul(Decimal(100)).toString() + "%";
};
let data = [];
let env = [];
let config = [
    {
        name: "星星",
        probability: new Decimal(0.239)
    }, {
        name: "没有中奖",
        probability: new Decimal(100)
    }
];
let count = 400000;
for (const i of config) {
    if (env.length != 0) {
        env.push({ name: i.name, probability: env[env.length - 1].probability.add(i.probability)});
    } else {
        env.push({ name: i.name, probability: i.probability });
    }
}
function lottery(config) {
    let ticket = Decimal.random().mul(Decimal(100));
    for (const i of config) {
        if (ticket.lte(i.probability)) {
            return { name: i.name, ticket: ticket };
        }
    }
}
for (let index = 0; index < count; index++) {
    data.push(lottery(env));
}
for (const i of config) {
    let c = new Decimal(data.filter(x => x.name === i.name).length);
    console.log(i.name, c.toString(), c.div(Decimal(count)).toPercent());
}