module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'build',
        'chore',
        'ci',
        'docs',
        'feat',
        'fix',
        'perf',
        'refactor',
        'revert',
        'style',
        'test',
        'bug',
      ],
    ],
    'subject-case': [2, 'always', ['sentence-case', 'lower-case']],
    'body-max-line-length': [2, 'always', 100],
  },
};
