/**
 * Tests for lib/helper/test/project.js
 *
 * @author Nabil Krause <nabil.krause@silberlicht.eu>
 */

var should      = require('should');
var path        = require('path');
var fs          = require('fs');
var root        = path.resolve('./');
var TestProject = require(root + '/tests/helper/project');
var tp          = null;

describe('project helper for tests', function() {

    describe('creating a test project', function() {
        this.timeout(0);

        it('should have a default path configured', function() {
            tp = new TestProject();

            tp.path.should.be.a('string');
            tp.path.should.match(/\/$/);
        });

        it('should init a default directory, if no folder was specified', function(done) {
            tp = new TestProject();

            var path = tp.getTargetPath();

            // somehow, exists only seems to work when called more than once (at least on my system)
            // so this needs to be reworked in the future
            var result = fs.existsSync(path);
            fs.exists(path, function(exists) {
                exists.should.be.true;
                done();
            });
        });

        it('should create a test-project', function(done) {
            tp = new TestProject();

            tp.createProject(function(exitCode) {
                exitCode.should.equal(0);
                tp.remove();
                done();
            });
        });
    });
});

