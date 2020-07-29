#!/usr/bin/env node

let program = require("commander");
let check = require("./dist/main");
let package = require("./package.json");
let logger = require("./dist/logger");

function main() {
    program
        .version(package.version)
        .option('-e, --endpoint <value>', '上报API')
        .option('-t, --target <path>', '项目所在目录', process.cwd())
        .option('-s, --severity-level <value>', '威胁等级 [High|Medium|Low]', 'High')
        .option('--only-provenance', '仅检查直接依赖', false)
        .option('--with-dev', '包括devDependency', false)
        .parse(process.argv);

    check
        .checkProject(program.target, program.endpoint, program.severityLevel, program.onlyProvenance, program.withDev)
        .catch(function (e) {
            logger.error(e.message);
        });

}

main();
