const webpack = require('webpack');
const path = require('path');

module.exports = {
    entry: {
        print: './js/print.js',
        index: './js/index.js'
    },
    output: {
        filename: '[name].js',
        path: __dirname + '/dist'
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            },
            {
                test: /\.worker\.(c|m)?js$/i,
                use: 'worker-loader'
            }
        ]
    },
    plugins:[//這邊以下是新增
        new webpack.ProvidePlugin({
            $: 'jquery',
            jQuery: 'jquery'//這邊以上是新增
        }),
    ]
};