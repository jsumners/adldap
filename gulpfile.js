'use strict';

const gulp = require('gulp');
const $ = require('gulp-load-plugins')();

const srcIncludes = [
  '**/*.js',
  '!foo.js',
  '!node_modules/**',
  '!coverage/**',
  '!test/**' // tests can be wonky
];

gulp.task('lint', function lintTask() {
  return gulp
    .src(srcIncludes)
    .pipe($.eslint())
    .pipe($.eslint.formatEach())
    .pipe($.eslint.failAfterError());
});

gulp.task('pre-test', function preTest() {
  return gulp
    .src(srcIncludes)
    .pipe($.istanbul())
    .pipe($.istanbul.hookRequire());
});

gulp.task('test', ['lint', 'pre-test'], function testTask() {
  return gulp
    .src(['test/*.js'])
    .pipe($.mocha({ui: 'qunit', reporter: 'min'}))
    .pipe($.istanbul.writeReports());
});

gulp.task('docs', function gendocs() {
  return gulp
    .src([
      'lib/*.js'
    ])
    .pipe($.concat('api.md'))
    .pipe($.jsdocToMarkdown())
    .on('error', function docError(err) {
      console.error('jsdoc2md failed:', err.message);
    })
    .pipe(gulp.dest('.'));
});

gulp.task('default', ['test', 'docs']);
