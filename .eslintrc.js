module.exports = {
    'env': {
        'browser': true,
        'es6': true,
        'node': true
    },
    'plugins': ['prettier'],
    'extends': 'eslint:recommended',
    'globals': {
        'Atomics': 'readonly',
        'SharedArrayBuffer': 'readonly'
    },
    'parserOptions': {
        'ecmaVersion': 2018
    },
    'rules': {
        'indent': [
            'error',
            2,
            { "SwitchCase": 1 }
        ],
        'linebreak-style': [
            'error',
            'unix'
        ],
        'quotes': [
            'error',
            'single'
        ],
        'semi': [
            'error',
            'never'
        ],
        'prettier/prettier': [
            'error',
            {
                trailingComma: 'es5',
                singleQuote: true,
                tabWidth: 2,
                semi: false,
                printWidth: 100,
            },
        ],
    }
}