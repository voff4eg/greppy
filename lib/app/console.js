/**
 * Console Application
 *
 * @module greppy/app/console
 * @author Hermann Mayer <hermann.mayer92@gmail.com>
 */

var colors = require('colors');
var async  = require('async');

/**
 * @constructor
 */
var Console = function()
{
}

/**
 * Simple process.stdout.write wrapper.
 *
 * @param {String} str - String to print
 * @return void
 */
Console.prototype.print = function(str)
{
    process.stdout.write(new String(str || '\n').white);
}

/**
 * Print a given message as a section.
 *
 * @param {String} str - String to print as section
 * @return void
 */
Console.prototype.section = function(str)
{
    this.print('\n  ' + msg.yellow + '\n');
}

/**
 * Print a given message as a heading.
 *
 * @param {String} str - String to print as heading
 * @return void
 */
Console.prototype.heading = function(str)
{
    var sep = '+-';
    for (var i = 0; i < str.length; i += 1) {
        sep += '-';
    }
    sep += '-+';

    this.print(
        new String(sep + '\n' + '| ').white
        + str.red.bold +
        new String(' |' + '\n' + sep).white
        + '\n\n'
    );
}

/**
 * Clear the terminal.
 *
 * @return void
 */
Console.prototype.clear = function()
{
    process.stdout.write('\033[2J\033[;H');
}

/**
 * Ask a question.
 *
 * @param {Object} options - Options to use
 * @param {Function} callback - Function to call on finish
 * @param {Function} abort - Function to call on abort
 * @return void
 */
Console.prototype.ask = function(options, callback, abort)
{
    var self       = this;
    options.prompt = options.prompt || '';

    var completion = function(line)
    {
        var hits = (options.values || []).filter(function(c) {
            return c.indexOf(line) == 0;
        });

        return [hits.length ? hits : options.values, line];
    }

    // process.stdin.removeAllListeners('data');
    // console.log(process.stdout.listeners('data'));

    var rl = (require('readline')).createInterface({
        input     : process.stdin,
        output    : process.stdout,
        completer : completion
    });

    var sawSIGINT = false;

    rl.on('SIGINT', function() {

        rl.clearLine();

        if (sawSIGINT) {
            rl.close();
            return callback && callback('Aborted');
        }

        if (!sawSIGINT) {
            self.print('(^C again to break)\n');
            sawSIGINT = true;
        }
    });

    if (options.values) {

        this.print(
            'Available values:\n' + ' * '.red
            + options.values.join('\n * '.red)
            + '\n\n'
        );
    }

    if (options.hint || options.validator) {

        this.print('    Hint: '.yellow.bold);

        if (options.hint) {
            this.print(options.hint);
        }

        if (options.validator && options.validator instanceof RegExp) {
            this.print(' - Regex: ' + new String(options.validator).bold.green);
        }

        this.print('\n\n')
    }

    var validator = options.validator || null;
    var prompt = ' ' + options.prompt;

    if (options.default) {
        prompt += ' [' + options.default + ']'
    }

    prompt += ': ';

    var handler = function(input)
    {
        input = input.trim();

        // Set default on empty inputs or false
        // if no default value was specified
        if ('' === input) {
            input = options.default ? options.default : '';
        }

        // Check for a regex validator callback
        if (validator) {

            if (validator instanceof RegExp) {

                if (null !== input.match(validator)) {

                    rl.close();
                    return callback && callback(undefined, input);

                } else {

                    self.print(
                        '\n[Error]'.red.bold
                        + '  Input ' + input.green.bold + ' is not valid ('
                        + new String(validator).green.bold
                        + ').\n\n'
                    );

                    // Start a recursive copy on faulty inputs to prompt again
                    return rl.question(prompt, handler);
                }
            }

            if (validator instanceof Function) {

                if (true === validator(input)) {

                    rl.close();
                    return callback && callback(undefined, input);

                } else {

                    self.print(
                        '\n[Error]'.red.bold
                        + '  Input ' + input.green.bold + ' is not valid.\n\n'
                    );

                    // Start a recursive copy on faulty inputs to prompt again
                    return rl.question(prompt, handler);
                }
            }
        }

        // No input and no default value was given, repeat the question
        if ('' === input) {

            self.print(
                '\n[Error]'.red.bold
                + '  Input was empty.\n\n'
            );

            // Start a recursive copy on faulty inputs to prompt again
            return rl.question(prompt, handler);
        }

        if (options.values) {

            // If we find input in the given values everything went well
            if (-1 !== options.values.indexOf(input)) {

                rl.close();
                return callback && callback(undefined, input);
            }

            self.print(
                '\n[Error]'.red.bold
                + ' Input "' + new String(input).green.bold
                + '" is no valid option.\n\n'
            );

            // Start a recursive copy on faulty inputs to prompt again
            return rl.question(prompt, handler);
        }

        rl.close();
        return callback && callback(undefined, input);
    };

    rl.question(prompt, handler);
}

/**
 * Build a new Question Object.
 *
 * @return {Object}
 */
Console.prototype.buildQuestion = function()
{
    var args = [Question];
    for (arg in arguments) {
        args.push(arguments[arg]);
    }

    return new (Question.constructor.bind.apply(Question, args))();
}

/**
 * Build a new QuestionSet Object.
 *
 * @return {Object}
 */
Console.prototype.buildQuestionSet = function()
{
    var args = [QuestionSet];
    for (arg in arguments) {
        args.push(arguments[arg]);
    }

    return new (QuestionSet.constructor.bind.apply(QuestionSet, args))();
}

/**
 * @constructor
 */
var QuestionSet = function(options, questions)
{
    if (!options) {

        throw new Error('No options was specified');
        return;
    }

    if (!options.id) {

        throw new Error('No question id was specified');
        return;
    }

    if (!options.description) {

        throw new Error('No description was specified');
        return;
    }

    if (!questions) {

        throw new Error('No question was specified');
        return;
    }

    var self         = this;
    this.console     = new Console();
    this.options     = options;
    this.id          = options.id;
    this.description = options.description;
    this.repeat      = options.repeat || false;
    this.questions   = questions;
    this.answers     = [];
}

/**
 * Ask the questions of the question set.
 *
 * @param {Function} callback - Function to call on finish
 * @return void
 */
QuestionSet.prototype.ask = function(callback)
{
    this.console.print('\n[Question Set] '.red + this.description.white + '\n');

    var self = this;

    async.forever(function(feCallback) {

        async.mapSeries(self.questions, function(question, callback) {

            question.ask(function(err, data) {

                if (err) {
                    return callback && callback(err);
                }

                callback && callback(undefined, {
                    id    : question.id,
                    value : data
                });
            });

        }, function(err, results) {

            if (err) {
                return feCallback && feCallback(err);
            }

            var resultSet = {};

            results.forEach(function(result) {
                resultSet[result.id] = result.value;
            });

            self.answers.push(resultSet);

            if (!self.repeat) {
                return feCallback && feCallback('Done');
            }

            // Next run for the forever loop
            feCallback && feCallback();
        });

    }, function() {

        var results = [];

        self.answers.forEach(function(result) {

            var entry = {};

            Object.keys(result).forEach(function(key) {
                entry[key] = result[key].result;
            });

            results.push(entry);
        });

        callback && callback(undefined, {
            id     : self.id,
            result : results
        });
    });
}

/**
 * @constructor
 */
var Question = function(options)
{
    if (!options) {

        throw new Error('No options was specified');
        return;
    }

    if (!options.question) {

        throw new Error('No question was specified');
        return;
    }

    if (!options.id) {

        throw new Error('No question id was specified');
        return;
    }

    this.id      = options.id;
    this.console = new Console();
    this.options = options || {};
}

/**
 * Ask the question.
 *
 * @param {Function} callback - Function to call on finish
 * @return void
 */
Question.prototype.ask = function(callback)
{
    var self = this;

    this.console.print('\n -- ' + this.options.question.yellow + '\n\n');
    this.console.ask(this.options, function(err, data) {

        callback && callback(err, {
            id     : self.id,
            result : data
        });
    });
}

module.exports = Console;
