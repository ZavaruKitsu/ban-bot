// import {blueBright, bold, redBright, underline, yellowBright} from "chalk";
import chalk from 'chalk';

const _log = console.log

function log(prefix: string, message?: string, ...optionalParams: any[]) {
    if (optionalParams && optionalParams.length != 0) {
        _log(`${prefix} ${message}`, optionalParams)
    } else {
        _log(`${prefix} ${message}`)
    }
}

console.log = ((message?, ...optionalParams) => {
    log(chalk.blueBright('[INF]'), message, ...optionalParams)
})
console.warn = ((message?, ...optionalParams) => {
    log(chalk.yellowBright('[WRN]'), chalk.underline(message), ...optionalParams)
})
console.error = ((message?, ...optionalParams) => {
    _log(chalk.redBright(''.padEnd(60, '-')))
    log(chalk.redBright('[ERR]'), chalk.bold(message), ...optionalParams)
    _log(chalk.redBright(''.padEnd(60, '-')))
})
